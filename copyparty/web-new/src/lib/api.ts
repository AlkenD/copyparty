import type {
  ListingResponse,
  SearchResponse,
  HandshakeRequest,
  HandshakeResponse,
  UploadOptions,
  ShareCreateRequest,
  FsNode,
} from "./types";

// Basic API client for the Copyparty server, intended for same-origin usage.
// If hosting under a subpath, pass basePath (SR) like "/cpp"; otherwise use "/".

export class CopypartyClient {
  private basePath: string;

  constructor(basePath: string = "/") {
    this.basePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  }

  // Build a URL for a virtual path (vpath) and query params
  private buildUrl(vpath: string, query?: Record<string, string | number | undefined>): string {
    const vp = vpath.startsWith("/") ? vpath : `/${vpath}`;
    const url = `${this.basePath}${vp}`;
    const q = new URLSearchParams();
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        q.set(k, String(v));
      }
    }
    const qs = q.toString();
    return qs ? `${url}?${qs}` : url;
  }

  // GET directory listing as JSON
  async list(vpath: string, opts?: { dots?: boolean; filekey?: string }): Promise<ListingResponse> {
    const url = this.buildUrl(vpath, { ls: "json", ...(opts?.dots ? { dots: "y" } : {}), ...(opts?.filekey ? { k: opts.filekey } : {}) });
    const rsp = await fetch(url, { credentials: "include" });
    if (!rsp.ok) {
      let detail = ''
      try { detail = await rsp.text() } catch {}
      throw new Error(`Listing failed: ${rsp.status}${detail ? ` - ${detail}` : ''}`)
    }
    return (await rsp.json()) as ListingResponse;
  }

  // High-level: list and normalize into FsNode[]
  async listNodes(vpath: string, opts?: { dots?: boolean; filekey?: string }): Promise<FsNode[]> {
    const ls = await this.list(vpath, opts)
    const base = vpath.endsWith('/') ? vpath : `${vpath}/`
    const nameFromHref = (href: string): string => {
      const noQuery = href.split('?')[0]
      const parts = noQuery.split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] || '')
    }
    const normalizeVpath = (parent: string, child: string, isDir: boolean): string => {
      const p = parent.endsWith('/') ? parent.slice(0, -1) : parent
      const vp = `${p}/${child}`
      return isDir ? `${vp}/` : vp
    }
    const dirs: FsNode[] = (ls.dirs || []).map((d) => {
      const title = nameFromHref(d.href)
      return {
        title,
        href: d.href.startsWith('/') ? d.href : `/${d.href}`,
        vpath: normalizeVpath(base, title, true),
        isDir: true,
        children: [],
        loaded: false,
      }
    })
    const files: FsNode[] = (ls.files || []).map((f) => {
      const title = nameFromHref(f.href)
      return {
        title,
        href: f.href.startsWith('/') ? f.href : `/${f.href}`,
        vpath: normalizeVpath(base, title, false),
        isDir: false,
      }
    })
    return [...dirs, ...files]
  }

  // Text search
  async search(vpath: string, q: string, n?: number): Promise<SearchResponse> {
    const url = this.buildUrl(vpath);
    const rsp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, ...(n ? { n } : {}) }),
    });
    if (!rsp.ok) throw new Error(`Search failed: ${rsp.status}`);
    return (await rsp.json()) as SearchResponse;
  }

  // Hash search (up2k hashlist)
  async searchByHash(vpath: string, size: number, hash: string[]): Promise<SearchResponse> {
    const url = this.buildUrl(vpath);
    const rsp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ srch: 1, size, hash }),
    });
    if (!rsp.ok) throw new Error(`Search failed: ${rsp.status}`);
    return (await rsp.json()) as SearchResponse;
  }

  // Create a share (returns text body with the share URL)
  async createShare(vpath: string, req: ShareCreateRequest): Promise<string> {
    const url = this.buildUrl(vpath, { share: "" });
    const rsp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!rsp.ok) throw new Error(`Create share failed: ${rsp.status}`);
    return await rsp.text();
  }

  // Delete share or extend expiry
  async modifyShare(action: { remove: { skey: string } } | { extend: { skey: string; minutes: number } }): Promise<void> {
    const base = this.basePath || "";
    if ("remove" in action) {
      const { skey } = action.remove;
      const url = `${base}/?eshare=rm&skey=${encodeURIComponent(skey)}`;
      const rsp = await fetch(url, { method: "POST", credentials: "include" });
      if (!rsp.ok) throw new Error(`Remove share failed: ${rsp.status}`);
      return;
    }
    const { skey, minutes } = action.extend;
    const url = `${base}/?skey=${encodeURIComponent(skey)}&eshare=${encodeURIComponent(String(minutes))}`;
    const rsp = await fetch(url, { method: "POST", credentials: "include" });
    if (!rsp.ok) throw new Error(`Extend share failed: ${rsp.status}`);
  }

  // Delete files/folders (server infers current vpath if body empty). Accepts absolute selection.
  async delete(vpath: string, selection?: string[], lim?: number): Promise<string> {
    const url = this.buildUrl(vpath, { delete: "", ...(lim ? { lim } : {}) });
    const rsp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection ?? []),
    });
    if (!rsp.ok) throw new Error(`Delete failed: ${rsp.status}`);
    return await rsp.text();
  }

  async move(srcVpath: string, dstVpath: string): Promise<void> {
    const url = this.buildUrl(srcVpath, { move: dstVpath });
    const rsp = await fetch(url, { method: "POST", credentials: "include" });
    if (!rsp.ok) throw new Error(`Move failed: ${rsp.status}`);
  }

  async copy(srcVpath: string, dstVpath: string): Promise<void> {
    const url = this.buildUrl(srcVpath, { copy: dstVpath });
    const rsp = await fetch(url, { method: "POST", credentials: "include" });
    if (!rsp.ok) throw new Error(`Copy failed: ${rsp.status}`);
  }

  // Up2k: compute recommended chunk size (mirrors server function).
  computeChunkSize(fileSize: number): number {
    let chunkSize = 1024 * 1024;
    let stepSize = 512 * 1024;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (const mul of [1, 2]) {
        const nChunks = Math.ceil(fileSize / chunkSize);
        if (nChunks <= 256 || (chunkSize >= 32 * 1024 * 1024 && nChunks <= 4096)) {
          return chunkSize;
        }
        chunkSize += stepSize;
        stepSize *= mul;
      }
    }
  }

  // Simple sha512 url-safe base64 of an ArrayBuffer
  private async sha512UrlSafe(buf: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-512", buf);
    const bytes = new Uint8Array(digest);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_");
    return b64;
  }

  // Handshake request
  private async handshake(vpath: string, req: HandshakeRequest): Promise<HandshakeResponse> {
    const url = this.buildUrl(vpath);
    const rsp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!rsp.ok) throw new Error(await rsp.text());
    return (await rsp.json()) as HandshakeResponse;
  }

  // Upload a single file using up2k protocol
  async uploadFile(file: File, options: UploadOptions): Promise<{ url?: string; fk?: string }> {
    const { vpath, lifetimeMinutes, overwrite, randomizeName, updateMtimeInDb, onProgress, signal } = options;

    const chunkSize = this.computeChunkSize(file.size);
    const chunkCount = Math.ceil(file.size / chunkSize);
    const hashes: string[] = [];

    // Hash all chunks sequentially (can be parallelized later)
    for (let i = 0; i < chunkCount; i++) {
      const chunk = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
      const ab = await chunk.arrayBuffer();
      const h = await this.sha512UrlSafe(ab);
      hashes.push(h);
    }

    const hsReq: HandshakeRequest = {
      name: file.name,
      size: file.size,
      lmod: Math.floor(file.lastModified / 1000),
      life: lifetimeMinutes,
      hash: hashes,
      rand: randomizeName,
      umod: updateMtimeInDb,
      replace: overwrite,
    };

    const hs = await this.handshake(vpath, hsReq);
    // Fully deduped
    if (!hs.hash || hs.hash.length === 0) return { fk: hs.fk };

    // Upload required chunks in contiguous ranges. We could stitch contiguous indices; keep simple for now.
    let uploadedBytes = 0;
    for (let idx = 0; idx < hs.hash.length; idx++) {
      const h = hs.hash[idx];
      // Map back to original index in our hash list
      const car = hashes.indexOf(h);
      if (car < 0) continue;
      const start = car * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const body = file.slice(start, end);

      const url = this.basePath + (hs.purl.endsWith("/") ? hs.purl.slice(0, -1) : hs.purl);
      const xhr = new XMLHttpRequest();
      const prom = new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Chunk upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Chunk upload error"));
        if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });
      });

      xhr.open("POST", url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("X-Up2k-Hash", h);
      xhr.setRequestHeader("X-Up2k-Wark", hs.wark);
      xhr.setRequestHeader(
        "X-Up2k-Stat",
        `${0}/${0}/${0}/${0} ${Math.ceil(uploadedBytes / 1024 / 1024)}/${Math.ceil(file.size / 1024 / 1024)} x`
      );
      if (onProgress) {
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const delta = ev.loaded; // per chunk
          onProgress(uploadedBytes + delta, file.size);
        };
      }
      xhr.send(body);
      await prom;
      uploadedBytes = end;
      if (onProgress) onProgress(uploadedBytes, file.size);
    }

    // Final handshake to verify/finish
    const hs2 = await this.handshake(vpath, { ...hsReq, hash: hashes });
    return { fk: hs2.fk };
  }
}

export default CopypartyClient;

