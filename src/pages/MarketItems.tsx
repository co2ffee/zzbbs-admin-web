import { useState } from 'react'
import { Avatar, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, PageTitle, PagedGrid, useNotify, usePagedList } from '../ui'

interface Reward { text?: string | null; type?: 'image' | 'video' | null; url?: string | null }
interface Row {
  id: number; name: string; image?: string | null; description?: string | null; score: number; unlimited: boolean; stock: number
  sold: number; status: number; sellerName?: string; inTime: string; reward?: Reward | null
}

const STATUS: Record<number, { label: string; color: 'success' | 'default' | 'error' }> = {
  0: { label: '上架中', color: 'success' }, 1: { label: '卖家下架', color: 'default' }, 2: { label: '管理员下架', color: 'error' },
}

// 用户集市：用户自己上架的商品。管理员能看到付款后才给买家的内容，违规的下架
export default function MarketItems() {
  const { run } = useNotify()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState<{ status?: string }>({})
  const list = usePagedList<Row>('/admin/market/item/list', q)
  const [view, setView] = useState<Row | null>(null)
  const [act, setAct] = useState<{ row: Row; remove: boolean } | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: '商品', flex: 1, minWidth: 180, renderCell: ({ row }) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
        <Avatar variant="rounded" src={row.image ?? undefined} sx={{ width: 28, height: 28 }}>{row.name[0]}</Avatar><span>{row.name}</span>
      </Stack>) },
    { field: 'sellerName', headerName: '卖家', width: 130 },
    { field: 'score', headerName: '价格', width: 90 },
    { field: 'stock', headerName: '库存', width: 90, valueGetter: (_v, row) => row.unlimited ? '不限量' : row.stock },
    { field: 'sold', headerName: '已卖', width: 80 },
    { field: 'status', headerName: '状态', width: 120, renderCell: ({ row }) => <Chip size="small" color={STATUS[row.status]?.color} label={STATUS[row.status]?.label ?? row.status} /> },
    { field: 'inTime', headerName: '上架时间', width: 170, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'actions', headerName: '操作', width: 170, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setView(row)}>查看内容</Button>
        {row.status === 2
          ? <Button size="small" onClick={() => setAct({ row, remove: false })}>恢复</Button>
          : <Button size="small" color="error" onClick={() => setAct({ row, remove: true })}>下架</Button>}
      </Stack>) },
  ]

  const submit = () => act && run(async () => {
    await api.post(act.remove ? '/admin/market/item/remove' : '/admin/market/item/restore', { id: act.row.id })
    setAct(null); list.reload()
  }, act.remove ? '已下架' : '已恢复')

  return (
    <>
      <PageTitle>用户集市</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2 }}>
        <TextField size="small" select label="状态" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">全部</MenuItem><MenuItem value="0">上架中</MenuItem><MenuItem value="1">卖家下架</MenuItem><MenuItem value="2">管理员下架</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => setQ({ status: status || undefined })}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />

      <FormDialog open={!!view} title={view ? `「${view.name}」的内容` : ''} onClose={() => setView(null)} onSubmit={() => setView(null)}>
        {view && <>
          <div>卖家 <b>{view.sellerName}</b>，价格 {view.score} 积分。{view.description ? `简介：${view.description}` : ''}</div>
          {view.reward?.text && <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>{view.reward.text}</Typography>}
          {view.reward?.url && view.reward.type === 'video' && <Box component="video" src={view.reward.url} controls sx={{ maxWidth: '100%', maxHeight: 320 }} />}
          {view.reward?.url && view.reward.type !== 'video' && <Box component="img" src={view.reward.url} alt="" sx={{ maxWidth: '100%', maxHeight: 320 }} />}
          {!view.reward && <div>没有内容</div>}
        </>}
      </FormDialog>
      <FormDialog open={!!act} title={act?.remove ? '下架商品' : '恢复商品'} onClose={() => setAct(null)} onSubmit={submit}>
        {act && (act.remove
          ? <div>下架「{act.row.name}」（卖家 {act.row.sellerName}）？下架后别人买不了，卖家也不能自己重新上架或修改；已成交的订单不受影响，也不会退款。</div>
          : <div>恢复「{act.row.name}」？恢复后回到“卖家下架”，由卖家自己决定要不要重新上架。</div>)}
      </FormDialog>
    </>
  )
}
