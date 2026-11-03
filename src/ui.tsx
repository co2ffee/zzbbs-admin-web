import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Stack, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api, ApiError, AuthError, Page } from './api'
import { useAuth } from './auth'

// ---------- 全局提示 + 统一错误处理 ----------
interface NotifyCtx { ok: (m: string) => void; fail: (e: unknown) => void; run: (fn: () => Promise<unknown>, okMsg?: string) => Promise<boolean> }
const Notify = createContext<NotifyCtx>(null as any)
export const useNotify = () => useContext(Notify)

export function NotifyProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth()
  const [msg, setMsg] = useState<{ s: 'success' | 'error'; t: string } | null>(null)
  const ok = (t: string) => setMsg({ s: 'success', t })
  const fail = (e: unknown) => {
    if (e instanceof AuthError) { logout(); return }
    setMsg({ s: 'error', t: e instanceof Error ? e.message : String(e) })
  }
  const run = async (fn: () => Promise<unknown>, okMsg = '操作成功') => {
    try { await fn(); ok(okMsg); return true } catch (e) { fail(e); return false }
  }
  return (
    <Notify.Provider value={{ ok, fail, run }}>
      {children}
      <Snackbar open={!!msg} autoHideDuration={msg?.s === 'error' ? 8000 : 3500} onClose={() => setMsg(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {msg ? <Alert severity={msg.s} onClose={() => setMsg(null)}>{msg.t}</Alert> : undefined}
      </Snackbar>
    </Notify.Provider>
  )
}

// ---------- 分页列表 hook ----------
export function usePagedList<T>(url: string, query: Record<string, string | number | undefined> = {}) {
  const { fail } = useNotify()
  const [pageNo, setPageNo] = useState(1)
  const [data, setData] = useState<Page<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(query)
  // 筛选条件变化回到第一页
  useEffect(() => setPageNo(1), [key])
  useEffect(() => {
    let alive = true
    setLoading(true)
    api.get<Page<T>>(url, { ...query, pageNo }).then((d) => alive && setData(d)).catch((e) => alive && fail(e)).finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, pageNo, tick])
  return { data, loading, pageNo, setPageNo, reload: () => setTick((x) => x + 1) }
}

export function PagedGrid<T extends { id: number | string }>({ list, columns }: {
  list: ReturnType<typeof usePagedList<T>>; columns: GridColDef[]
}) {
  const size = list.data?.size ?? 10
  return (
    <DataGrid
      autoHeight rows={list.data?.records ?? []} columns={columns} loading={list.loading}
      paginationMode="server" rowCount={list.data?.total ?? 0}
      paginationModel={{ page: list.pageNo - 1, pageSize: size }} pageSizeOptions={[size]}
      onPaginationModelChange={(m) => list.setPageNo(m.page + 1)}
      disableRowSelectionOnClick disableColumnFilter disableColumnMenu
      sx={{ bgcolor: 'background.paper' }}
    />
  )
}

// ---------- 确认弹窗 ----------
export function useConfirm() {
  const [state, setState] = useState<{ text: string; onOk: () => void } | null>(null)
  const confirm = useCallback((text: string, onOk: () => void) => setState({ text, onOk }), [])
  const dialog = (
    <Dialog open={!!state} onClose={() => setState(null)}>
      <DialogTitle>确认操作</DialogTitle>
      <DialogContent><Typography>{state?.text}</Typography></DialogContent>
      <DialogActions>
        <Button onClick={() => setState(null)}>取消</Button>
        <Button color="error" onClick={() => { state?.onOk(); setState(null) }}>确定</Button>
      </DialogActions>
    </Dialog>
  )
  return { confirm, dialog }
}

export function FormDialog({ open, title, onClose, onSubmit, children, submitting }: {
  open: boolean; title: string; onClose: () => void; onSubmit: () => void; children: ReactNode; submitting?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{children}</Stack></DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting}>保存</Button>
      </DialogActions>
    </Dialog>
  )
}

export const PageTitle = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
    <Typography variant="h5" sx={{ flex: 1 }}>{children}</Typography>
    {actions}
  </Box>
)

export { ApiError }
