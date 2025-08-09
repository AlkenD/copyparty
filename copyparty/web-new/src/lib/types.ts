export type UnixSeconds = number;

export interface ListingItem {
  lead: string;
  href: string; // navigable URL (relative)
  name: string;
  sz: number;
  ext: string;
  dt: string; // formatted date
  ts: UnixSeconds; // last-modified epoch
  // Optional tags when present in some views
  tags?: Record<string, string | number>;
}

export interface ListingResponse {
  dirs: ListingItem[];
  files: ListingItem[];
  taglist: string[];
  srvinf?: string;
  acct?: string; // username
  perms?: string[]; // [read, write, ...]
  cfg?: Record<string, unknown>;
  dk?: string; // directory key when present
}

export interface SearchHit {
  // Not fully specified; include common fields observed from server
  rp?: string; // result path (may be prefixed with RS by server)
  vp?: string; // virtual path
  rd?: string; // relative dir
  fn?: string; // filename
  sz?: number;
  mt?: number; // timestamp
  [k: string]: unknown;
}

export interface SearchResponse {
  hits: SearchHit[];
  tag_order: string[];
  trunc: boolean;
}

export interface HandshakeRequest {
  name: string;
  size: number;
  lmod: number;
  life?: number;
  hash: string[]; // sha512 urlsafe-b64 per chunk
  srch?: 1;
  rand?: boolean;
  umod?: boolean;
  replace?: boolean | "mt";
}

export interface HandshakeResponse {
  name: string;
  purl: string; // "/vtop/prel/" folder URL
  size: number;
  lmod: number;
  sprs: boolean;
  hash: string[]; // remaining chunks needed (empty => dedup complete)
  dwrk: string;
  wark: string;
  fk?: string;
}

export interface UploadOptions {
  vpath: string; // destination virtual folder, e.g. "/music/"
  lifetimeMinutes?: number;
  overwrite?: boolean | "mt";
  randomizeName?: boolean;
  updateMtimeInDb?: boolean;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  signal?: AbortSignal;
}

export interface ShareCreateRequest {
  k: string; // share key
  vp: string[]; // selection paths (same base folder)
  perms: Array<"read" | "write" | "move" | "delete">;
  pw?: string; // optional password
  exp?: number; // minutes
}

// Normalized FS node used by UI consumers
export interface FsNode {
  title: string
  href?: string
  vpath: string
  isDir: boolean
  children?: FsNode[]
  loaded?: boolean
}

