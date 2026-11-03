import { createContext, ReactNode, useContext, useState } from 'react'
import { getToken, setToken } from './api'

interface AdminUser { id: number; username: string }
interface Ctx { admin: AdminUser | null; login: (a: AdminUser, token: string) => void; logout: () => void }
const AuthCtx = createContext<Ctx>(null as any)
export const useAuth = () => useContext(AuthCtx)

const KEY = 'zzbbs_admin_user'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    try { return getToken() ? JSON.parse(localStorage.getItem(KEY) || 'null') : null } catch { return null }
  })
  const login = (a: AdminUser, token: string) => { setToken(token); localStorage.setItem(KEY, JSON.stringify(a)); setAdmin(a) }
  const logout = () => { setToken(null); localStorage.removeItem(KEY); setAdmin(null) }
  return <AuthCtx.Provider value={{ admin, login, logout }}>{children}</AuthCtx.Provider>
}
