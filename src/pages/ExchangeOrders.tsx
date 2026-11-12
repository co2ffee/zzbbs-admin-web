import { useState } from 'react'
import { Avatar, Button, Chip, MenuItem, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, PageTitle, PagedGrid, useNotify, usePagedList } from '../ui'

interface Row { id: number; username?: string; productName: string; productImage?: string; score: number; status: number; remark?: string; inTime: string }

const STATUS: Record<number, { label: string; color: 'warning' | 'success' | 'default' }> = {
  // 兑换后自动发放，新记录直接是“已兑换”；0 是老的“待处理”记录
  0: { label: '待处理', color: 'warning' }, 1: { label: '已兑换', color: 'success' }, 2: { label: '已取消', color: 'default' },
}

export default function ExchangeOrders() {
  const { run } = useNotify()
  const [status, setStatus] = useState('')
  const [username, setUsername] = useState('')
  const [q, setQ] = useState<{ status?: string; username?: string }>({})
  const list = usePagedList<Row>('/admin/exchange/order/list', q)
  const [act, setAct] = useState<{ row: Row; kind: 'cancel'; remark: string } | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'username', headerName: '用户', width: 130 },
    { field: 'productName', headerName: '商品', flex: 1, minWidth: 180, renderCell: ({ row }) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
        <Avatar variant="rounded" src={row.productImage} sx={{ width: 28, height: 28 }}>{row.productName[0]}</Avatar><span>{row.productName}</span>
      </Stack>) },
    { field: 'score', headerName: '积分', width: 80 },
    { field: 'status', headerName: '状态', width: 100, renderCell: ({ row }) => <Chip size="small" color={STATUS[row.status]?.color} label={STATUS[row.status]?.label ?? row.status} /> },
    { field: 'remark', headerName: '备注', width: 160 },
    { field: 'inTime', headerName: '兑换时间', width: 180, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'actions', headerName: '操作', width: 130, sortable: false, renderCell: ({ row }) => row.status !== 2 ? (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" color="error" onClick={() => setAct({ row, kind: 'cancel', remark: '' })}>取消并退款</Button>
      </Stack>) : null },
  ]

  const submit = () => act && run(async () => {
    await api.post('/admin/exchange/order/cancel', { id: act.row.id, remark: act.remark })
    setAct(null); list.reload()
  }, '已取消，积分已退还')

  return (
    <>
      <PageTitle>兑换记录</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 2 }}>
        <TextField size="small" select label="状态" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">全部</MenuItem><MenuItem value="0">待处理</MenuItem><MenuItem value="1">已兑换</MenuItem><MenuItem value="2">已取消</MenuItem>
        </TextField>
        <TextField size="small" label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="contained" onClick={() => setQ({ status: status || undefined, username: username || undefined })}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      <FormDialog open={!!act} title="取消兑换" onClose={() => setAct(null)} onSubmit={submit}>
        {act && <>
          <div>用户 <b>{act.row.username}</b> 兑换「{act.row.productName}」（{act.row.score} 积分）</div>
          <div style={{ color: '#d32f2f' }}>取消后会把 {act.row.score} 积分退还给用户，限量商品的库存加回去，用户也看不到兑换到的内容了。</div>
          <TextField label="取消原因（可选，用户能看到）" multiline minRows={2}
            value={act.remark} onChange={(e) => setAct({ ...act, remark: e.target.value })} />
        </>}
      </FormDialog>
    </>
  )
}
