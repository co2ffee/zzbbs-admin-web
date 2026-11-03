import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { PageTitle, useConfirm, useNotify } from '../ui'

interface F { key: string; size: number; lastModified: string; url?: string }
interface D { files: F[]; totalCount: number; totalSize: number; pageNo: number; totalPage: number; sortBy: string; sortOrder: string }

const human = (n: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`
}

const IMG = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i
const VIDEO = /\.(mp4|webm|mov|m4v|ogv)$/i
const AUDIO = /\.(mp3|wav|ogg|m4a|aac|flac)$/i
const PDF = /\.pdf$/i

// 后端返回的是 存储域名 + "/" + key；域名没配置时会是 "null/xxx"，这种不能打开
const fileUrl = (f: F) => {
  if (!f.url || !/^https?:\/\//.test(f.url)) return ''
  // key 里可能有空格、中文，按路径段编码（保留 /）
  const idx = f.url.length - f.key.length
  return f.url.slice(0, idx) + f.key.split('/').map(encodeURIComponent).join('/')
}

function Preview({ file, onClose }: { file: F | null; onClose: () => void }) {
  const url = file ? fileUrl(file) : ''
  let body: ReactNode = <Typography color="text.secondary">此类型文件不支持在线预览，可以在新窗口打开或下载。</Typography>
  if (file && !url) body = <Typography color="error">没有可用的访问地址（请检查系统设置里的存储域名 backblaze_domain）。</Typography>
  else if (file && IMG.test(file.key)) body = <Box component="img" src={url} alt={file.key} sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', mx: 'auto' }} />
  else if (file && VIDEO.test(file.key)) body = <Box component="video" src={url} controls sx={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', mx: 'auto' }} />
  else if (file && AUDIO.test(file.key)) body = <Box component="audio" src={url} controls sx={{ width: '100%' }} />
  else if (file && PDF.test(file.key)) body = <Box component="iframe" src={url} title={file.key} sx={{ width: '100%', height: '70vh', border: 0 }} />
  return (
    <Dialog open={!!file} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ wordBreak: 'break-all' }}>{file?.key}</DialogTitle>
      <DialogContent>
        {file && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{human(file.size)} · {file.lastModified}</Typography>}
        {body}
      </DialogContent>
      <DialogActions>
        {url && <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ mr: 'auto', ml: 2 }}>在新窗口打开</Link>}
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  )
}

export default function Files() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [pageNo, setPageNo] = useState(1)
  const [sort, setSort] = useState<{ field: string; sort: 'asc' | 'desc' }>({ field: 'size', sort: 'desc' })
  const [d, setD] = useState<D | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [preview, setPreview] = useState<F | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<D>('/admin/file/list', { pageNo, sortBy: sort.field, sortOrder: sort.sort })
      .then(setD).catch(fail).finally(() => setLoading(false))
  }, [pageNo, sort, tick]) // eslint-disable-line

  // sortModel / paginationModel 必须稳定引用：DataGrid 发现 sortModel 引用变了就当作“排序变了”，会把页码重置回第 1 页，
  // 每次渲染都传新数组会导致点“下一页”后立刻又被拉回第 1 页（请求序列 2,1,2,1）
  const sortModel = useMemo(() => [sort], [sort])
  const paginationModel = useMemo(() => ({ page: pageNo - 1, pageSize: 50 }), [pageNo])

  const columns: GridColDef<F>[] = [
    { field: 'key', headerName: 'Key', flex: 1, minWidth: 320, renderCell: ({ row }) => (
      <Link component="button" type="button" underline="hover" onClick={() => setPreview(row)} sx={{ textAlign: 'left', wordBreak: 'break-all' }}>{row.key}</Link>) },
    { field: 'size', headerName: '大小', width: 120, valueFormatter: (v) => human(Number(v)) },
    { field: 'lastModified', headerName: '修改时间', width: 200 },
    { field: 'actions', headerName: '操作', width: 150, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setPreview(row)}>预览</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除文件 ${row.key}？`, () => run(async () => { await api.get('/admin/file/delete', { key: row.key }); setTick((x) => x + 1) }))}>删除</Button>
      </Stack>) },
  ]

  return (
    <>
      <PageTitle>文件管理</PageTitle>
      {d && <Typography sx={{ mb: 2 }} color="text.secondary">共 {d.totalCount} 个文件，总大小 {human(d.totalSize)}</Typography>}
      {/* 后端每次要把整个存储桶的文件列表读一遍，通常要几秒；加载完成前表格是空的，明确提示一下，避免误以为没有文件 */}
      {loading && !d && <Typography sx={{ mb: 2 }} color="text.secondary">正在读取存储桶文件列表，通常需要几秒钟…</Typography>}
      <Box>
        <DataGrid autoHeight getRowId={(r) => r.key} rows={d?.files ?? []} columns={columns as GridColDef[]} loading={loading}
          paginationMode="server" rowCount={d?.totalCount ?? 0} paginationModel={paginationModel} pageSizeOptions={[50]}
          onPaginationModelChange={(m) => setPageNo(m.page + 1)}
          sortingMode="server" sortModel={sortModel} sortingOrder={['desc', 'asc']}
          onSortModelChange={(m) => {
            const n = m[0]
            if (!n || !['key', 'size', 'lastModified'].includes(n.field)) return
            const next = n.sort ?? 'desc'
            // 排序没变就不动，避免重复请求；排序真的变了回到第 1 页
            if (n.field === sort.field && next === sort.sort) return
            setSort({ field: n.field, sort: next }); setPageNo(1)
          }}
          disableRowSelectionOnClick disableColumnMenu sx={{ bgcolor: 'background.paper' }} />
      </Box>
      {dialog}
      <Preview file={preview} onClose={() => setPreview(null)} />
    </>
  )
}
