import type { ApiErrorBody } from "./types"

// Browser client for the Machina API (same origin; the session is an httpOnly cookie).

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string> = {}
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    })
  } catch {
    throw new ApiError(0, "Could not reach the server")
  }
  const data = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>
  if (!res.ok)
    throw new ApiError(res.status, data.error ?? "Something went wrong", data.fields ?? {})
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
}

/** Query string from an object, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== undefined && v !== null && v !== false) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ""
}

export const fileUrl = (id: string) => `/api/files/${id}`

export type Upload = { name: string; mime: string; data: string }

/** Read a file as a base64 upload (max 5 MB, like the API). */
export function readUpload(file: File): Promise<Upload> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) return reject(new ApiError(400, "File too large: max 5 MB"))
    const r = new FileReader()
    r.onload = () => {
      const mime = /\.xml$/i.test(file.name)
        ? "application/xml"
        : file.type || "application/octet-stream"
      resolve({ name: file.name, mime, data: String(r.result).split(",")[1] ?? "" })
    }
    r.onerror = () => reject(new ApiError(400, "Could not read the file"))
    r.readAsDataURL(file)
  })
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function downloadFile(id: string, name: string) {
  const res = await fetch(fileUrl(id), { credentials: "same-origin" })
  if (!res.ok) throw new ApiError(res.status, "File not available")
  saveBlob(await res.blob(), name)
}

export function downloadText(name: string, text: string, mime = "text/plain;charset=utf-8") {
  saveBlob(new Blob([text], { type: mime }), name)
}
