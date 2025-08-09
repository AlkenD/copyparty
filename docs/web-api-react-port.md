Copyparty Web API and Client Flows (for React Port)

This document maps the HTTP contracts and client flows between the Copyparty server (Python) and the legacy web UI, distilled for reimplementing the UI in React.

Legend
- SR/RS: Reverse-proxy path prefix handling (server args). When hosting under a subpath, prepend `SR` to client requests and strip `RS` from server responses where noted.
- vpath: Virtual path portion of URL (relative to server root), e.g. `foo/bar/`.

Auth & Sessions
- Cookies: `cppwd` (plaintext over HTTP) or `cppws` (secure over HTTPS). Set by login; read on requests.
  - Set cookies in `get_pwd_cookie` and `set_idp_cookie`.
  - Cookie lifetime controlled by `--logout` and `--idp-cookie`.
- Login (form/multipart): POST `act=login`, field `cppwd` to the current vpath.
  - Handler: `handle_login()` → sets cookie (`cppwd` or `cppws`) and returns an HTML redirect.
- Authorization header: Basic-Auth accepted unless disabled (`--no-bauth`, `--bauth-last`).
- Query param `pw` is permitted and can unlock CORS, but UI should prefer cookies.

Directory Listing
- Endpoint: GET `/<vpath>?ls=json` for JSON, or `?ls=v|t|txt` for text variants.
- Default GET without `ls` returns HTML (browser page) unless UA is CLI-ish (`curl/`, `fetch`), in which case it auto-switches to `ls=v`.
- JSON shape (from `tx_ls`):
  - Top-level: `{ dirs: Item[], files: Item[], taglist: string[], srvinf: string, acct: string, perms: string[], cfg: object }`
  - `Item`: `{ lead: string, href: string, name: string, sz: number, ext: string, dt: string, ts: number }`
    - `lead` can be a rendered action (e.g., "zip") or "-".
    - `href` is the navigable link. May include `?k=...` (filekey) if enabled.
- Options & flags:
  - `dots=y` to include dotfiles (if allowed for user).
  - `k=<filekey>` for file/dir key access when required by volume flags.
  - `zip=crc` / `tar=...` to download archive (blocked by directory-key-only volumes unless `dks`).
  - `doc=<filename>` to embed small text file content in HTML responses.
  - Server can embed OpenGraph metadata (`og_*` flags) and thumbnails via `?th=` params for media.

File Operations
- Delete: POST JSON to current vpath with `?delete`.
  - Body: list of vpaths or server infers current vpath when omitted.
  - Handler: `handle_rm` (up2k), honors `lim` and user delete perms.
- Move: POST to `?move=<dst-vpath>` (full destination path incl. filename).
  - Handler: `_mv` via `handle_mv`.
- Copy: POST to `?copy=<dst-vpath>`.
  - Handler: `_cp` via `handle_cp`.
- Server normalizes paths behind reverse proxy: if `dst` starts with `SR`, it is stripped server-side.

Search
- Endpoint: POST JSON to current vpath with either:
  1) Hash search: `{ srch: 1, size: number, hash: string[] }`
  2) Text search: `{ q: string, n?: number }` (`n` = max hits; default `--srch-hits`)
- Response: `{ hits: Hit[], tag_order: string[], trunc: boolean }`
  - When behind reverse proxy, each `hit.rp` is prefixed with `RS` server-side.
- Requires SQLite index; otherwise returns 500 (disabled or busy).

Up2k Upload Flow (Chunked & Dedup)
1) Handshake (POST JSON)
   - URL: `/<vpath>` (folder) — send to the container directory, not the file.
   - Request:
     ```json
     {
       "name": "file.ext",
       "size": 123456789,
       "lmod": 1710000000,
       "life": 0,              // optional retention minutes
       "hash": ["sha512b64", "sha512b64", ...],
       "srch": 1 | undefined,  // optional: hash-only search
       "rand": true | undefined,// server may randomize filename
       "umod": true | undefined,// allow updating mtime in db/fs
       "replace": true|"mt"|undefined // overwrite policy
     }
     ```
   - Response (200):
     ```json
     {
       "name": "server-filename.ext",
       "purl": "/vtop/prel/",    // normalized path for subsequent requests
       "size": 123456789,
       "lmod": 1710000000,
       "sprs": true,               // sparse-file support
       "hash": ["neededChunkHash1", ...], // empty => full dedup (no upload)
       "dwrk": "...", "wark": "...",   // identifiers
       "fk": "..."              // optional filekey when dedup hits and user can read/upget
     }
     ```
   - Notes:
     - If file contents already exist, `hash` is empty and server may symlink/copy under conditions.
     - Error responses include helpful text; dedup/busy errors may be retried or require user action.

2) Chunk Upload (POST binary)
   - URL: same `purl` as handshake (folder URL).
   - Headers:
     - `Content-Type: application/octet-stream`
     - `X-Up2k-Hash: <firstchunk>[,<plen>,<stitched-hashes>]`
     - `X-Up2k-Wark: <wark>`
     - `X-Up2k-Subc: <offset>` (optional subchunk resume; single-chunk per request for subc)
     - `X-Up2k-Stat: <client-stats>` (optional telemetry)
   - Body: the raw bytes for the contiguous region (one or more chunks).
   - Response: `thank` (text). Server confirms/locks chunks internally and performs integrity checks.
   - After finishing a file’s chunk posts, the client triggers another handshake to verify completion.

Shares (Public Links)
- List/manage shares (HTML): GET `/?shares` (requires login).
- Modify existing share:
  - Delete: POST `/?eshare=rm&skey=<k>`
  - Extend expiry: POST `/?skey=<k>&eshare=<minutes>` (adds minutes; can revive recently expired if allowed)
- Create share (POST JSON): to the current vpath with `?share`
  - Request:
    ```json
    {
      "k": "shareKey",
      "vp": ["/vpath/file1", "/vpath/file2"],
      "perms": ["read", "write", "move", "delete"],
      "pw": "optional password",
      "exp": 60 // minutes to live; 0 for never
    }
    ```
  - Response (201, text): `created share: https://host/SR/<shr><k>/<file?>`
  - Server validates: share key uniqueness, user perms, selection coherence (same folder base), and not sharing the share-root itself.

Media Thumbnails / Previews
- The UI uses `th` query params for thumbnails/transcodes and `.uqe/` paths for query-embedded media URLs (for OG previews/Discord). Example client usage:
  - Prefetch wave preview: GET `...&th=p`
  - Full media load: GET original URL; server may stream/transcode based on `th=opus|mp3|...`.

CORS / CSRF
- Server computes `Access-Control-Allow-Origin` per request. Cookie/WWW-Auth credentials are only allowed for exact origins (or when `--allow-csrf` is enabled). Passing `?pw=` also unlocks some flows.
- For SPA usage, host React app on the same origin and path (or configure allowed origins) to ensure cookies are sent.

Reverse Proxy / Subpath Hosting
- If hosting under a subpath, client URLs should prepend `SR`. Server responses that include `purl` or `rp` may need rewriting with `RS`/`SR` according to configuration.

Implementation Notes for React
- Use `GET /<vpath>?ls=json` as the primary data source for file/folder views.
- Implement uploads using the two-stage handshake + chunk POST protocol above.
- Use POST JSON `?share` for creating shares and the `?eshare` endpoints for managing them.
- Implement file ops with `?delete`, `?move`, and `?copy` query params as described.
- Keep cookies (`cppwd`/`cppws`) attached to fetch/XHR by using same-origin requests; avoid cross-origin unless CORS is configured.
- Respect server feature flags returned in listing `cfg` (e.g., whether to show certain UI elements).

References (server code)
- Request parsing/dispatch: `copyparty/httpcli.py` (e.g., `handle_get`, `handle_post_json`, `handle_post_binary`, `tx_ls`, `tx_browser`).
- Up2k engine & handshake: `copyparty/up2k.py` (`handle_json`, chunk orchestration, dedup logic).
- Auth/session helpers: `copyparty/httpcli.py` (`get_pwd_cookie`, `set_idp_cookie`), `copyparty/authsrv.py`.
- Shares: `copyparty/httpcli.py` (`tx_shares`, `handle_eshare`, `handle_share`); DB initialized in `svchub.setup_share_db()`.

