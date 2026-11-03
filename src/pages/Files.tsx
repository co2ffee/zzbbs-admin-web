import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { PageTitle, useConfirm, useNotify } from '../ui'

interface F { key: string; size: number; lastModified: string }
interface D { files: F[]; totalCount: number; totalSize: number; pageNo: number; totalPage: number; sortBy: string; sortOrder: string }

const human = (n: number) => {
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`
}

export default function Files() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [pageNo, setPageNo] = useState(1)
  const [sort, setSort] = useState<{ field: string; sort: 'asc' | 'desc' }>({ field: 'size', sort: 'desc' })
  const [d, setD] = useState<D | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

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
    { field: 'key', headerName: 'Key', flex: 1, minWidth: 320 },
    { field: 'size', headerName: '大小', width: 120, valueFormatter: (v) => human(Number(v)) },
    { field: 'lastModified', headerName: '修改时间', width: 200 },
    { field: 'actions', headerName: '操作', width: 100, sortable: false, renderCell: ({ row }) => (
      <Button size="small" color="error" onClick={() => confirm(`删除文件 ${row.key}？`, () => run(async () => { await api.get('/admin/file/delete', { key: row.key }); setTick((x) => x + 1) }))}>删除</Button>) },
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
    </>
  )
}
