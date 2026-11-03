import { useState } from 'react'
import { Avatar, Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; username: string; avatar?: string; email?: string; website?: string; bio?: string; score?: number; inTime?: string; active?: boolean; emailNotification?: boolean; token?: string }

export default function Users() {
  const { run, ok } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [username, setUsername] = useState('')
  const [q, setQ] = useState({ username: '' })
  const list = usePagedList<Row>('/admin/user/list', q)
  const [edit, setEdit] = useState<(Row & { password?: string }) | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'avatar', headerName: '头像', width: 70, sortable: false, renderCell: ({ row }) => <Avatar src={row.avatar} sx={{ width: 28, height: 28, mt: 1 }}>{row.username[0]}</Avatar> },
    { field: 'username', headerName: '用户名', width: 140 },
    { field: 'email', headerName: '邮箱', flex: 1, minWidth: 180 },
    { field: 'score', headerName: '积分', width: 80 },
    { field: 'active', headerName: '已激活', width: 90, valueFormatter: (v) => (v ? '是' : '否') },
    { field: 'inTime', headerName: '注册时间', width: 170, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'actions', headerName: '操作', width: 260, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={async () => { const u = await api.get<Row>('/admin/user/edit', { id: row.id }); setEdit({ ...u, password: '' }) }}>编辑</Button>
        <Button size="small" onClick={() => confirm(`刷新 ${row.username} 的 token？对方需重新登录`, () => run(async () => { await api.get('/admin/user/refreshToken', { id: row.id }) }, '已刷新'))}>刷新token</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除用户 ${row.username}？`, () => run(async () => { await api.get('/admin/user/delete', { id: row.id }); list.reload() }))}>删除</Button>
      </Stack>) },
  ]

  const save = () => edit && run(async () => {
    await api.post('/admin/user/edit', {
      id: edit.id, username: edit.username, email: edit.email ?? '', website: edit.website ?? '', bio: edit.bio ?? '',
      score: edit.score ?? 0, active: !!edit.active, emailNotification: !!edit.emailNotification, password: edit.password,
    })
    setEdit(null); list.reload()
  }, '已保存')
  void ok

  return (
    <>
      <PageTitle>用户管理</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="contained" onClick={() => setQ({ username })}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title="编辑用户" onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="用户名" value={edit?.username ?? ''} onChange={(e) => setEdit({ ...edit!, username: e.target.value })} />
        <TextField label="邮箱" value={edit?.email ?? ''} onChange={(e) => setEdit({ ...edit!, email: e.target.value })} />
        <TextField label="个人网站" value={edit?.website ?? ''} onChange={(e) => setEdit({ ...edit!, website: e.target.value })} />
        <TextField label="简介" multiline minRows={2} value={edit?.bio ?? ''} onChange={(e) => setEdit({ ...edit!, bio: e.target.value })} />
        <TextField label="积分" type="number" value={edit?.score ?? 0} onChange={(e) => setEdit({ ...edit!, score: Number(e.target.value) })} />
        <TextField label="新密码（不改请留空）" type="password" value={edit?.password ?? ''} onChange={(e) => setEdit({ ...edit!, password: e.target.value })} />
        <FormControlLabel control={<Checkbox checked={!!edit?.active} onChange={(e) => setEdit({ ...edit!, active: e.target.checked })} />} label="已激活" />
        <FormControlLabel control={<Checkbox checked={!!edit?.emailNotification} onChange={(e) => setEdit({ ...edit!, emailNotification: e.target.checked })} />} label="接收邮件通知" />
      </FormDialog>
    </>
  )
}
