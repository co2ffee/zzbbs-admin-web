// 后端统一返回 { code, description, detail }，code=200 成功
const TOKEN_KEY = 'zzbbs_admin_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {}
export class AuthError extends ApiError {}

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
// 后端 map 查询结果的字段可能是下划线命名，统一转驼峰（保留 topic_count 这类仪表盘字段的两种写法由页面兜底）
export function camelize(v: any): any {
  if (Array.isArray(v)) return v.map(camelize)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [toCamel(k), camelize(x)]))
  return v
}

type Query = Record<string, string | number | undefined | null>
const qs = (q?: Query) => {
  const p = new URLSearchParams()
  Object.entries(q || {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.append(k, String(v)))
  const s = p.toString()
  return s ? `?${s}` : ''
}

async function request<T>(method: string, url: string, body?: BodyInit, contentType?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.token = token
  if (contentType) headers['Content-Type'] = contentType
  const res = await fetch(url, { method, headers, body, credentials: 'include' })
  // 没登录/token 失效时后端会 302 到登录页（返回 HTML），统一当作鉴权失败
  const isJson = (res.headers.get('content-type') || '').includes('json')
  if (res.status === 401 || res.redirected || !isJson) {
    setToken(null)
    throw new AuthError('登录已失效，请重新登录')
  }
  const data = await res.json()
  if (data.code !== 200) throw new ApiError(data.description || '请求失败')
  return data.detail as T
}

// 老接口的 POST 参数都是表单格式（Spring 按参数名绑定），不是 JSON
const form = (data: Record<string, any>) => {
  const p = new URLSearchParams()
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)))
    else p.append(k, String(v))
  })
  return p.toString()
}

export const api = {
  get: <T = any>(url: string, q?: Query) => request<T>('GET', url + qs(q)).then((d) => camelize(d) as T),
  // 表单 POST
  post: <T = any>(url: string, data: Record<string, any> = {}) =>
    request<T>('POST', url, form(data), 'application/x-www-form-urlencoded;charset=UTF-8'),
  // JSON POST（系统设置）
  postJson: <T = any>(url: string, data: unknown) => request<T>('POST', url, JSON.stringify(data), 'application/json'),
  // multipart（标签图标、敏感词导入）
  upload: <T = any>(url: string, data: FormData) => request<T>('POST', url, data),
}

export interface Page<T> { records: T[]; total: number; size: number; current: number }
export const fmtTime = (s?: string | number | null) => {
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(s) : d.toLocaleString()
}
