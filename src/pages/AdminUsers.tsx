import { useEffect, useState } from 'react'
import { Button, MenuItem, Stack, TextField } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, PageTitle, useConfirm, useNotify } from '../ui'

interface Row { id: number; username: string; inTime: string; roleId: number; roleName: string }
interface Role { id: number; name: string }

export default function AdminUsers() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows] = useState<Row[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [edit, setEdit] = useState<{ id?: number; username: string; password: string; roleId: number | '' } | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.get<Row[]>('/admin/admin_user/list'), api.get<Role[]>('/admin/admin_user/add')])
      .then(([r, ro]) => { setRows(r); setRoles(ro) }).catch(fail).finally(() => setLoading(false))
  }, [tick]) // eslint-disable-line

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'username', headerName: '用户名', flex: 1 },
    { field: 'roleName', headerName: '角色', width: 160 },
    { field: 'inTime', headerName: '创建时间', width: 190, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setEdit({ id: row.id, username: row.username, password: '', roleId: row.roleId })}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除后台用户 ${row.username}？`, () => run(async () => { await api.get('/admin/admin_user/delete', { id: row.id }); setTick((x) => x + 1) }))}>删除</Button>
      </Stack>) },
  ]

  const save = () => edit && run(async () => {
    await api.post(edit.id ? '/admin/admin_user/edit' : '/admin/admin_user/add', edit)
    setEdit(null); setTick((x) => x + 1)
  }, '已保存')

  return (
    <>
      <PageTitle actions={<Button variant="contained" onClick={() => setEdit({ username: '', password: '', roleId: '' })}>新增</Button>}>后台用户</PageTitle>
      <DataGrid autoHeight rows={rows} columns={columns as GridColDef[]} loading={loading} disableRowSelectionOnClick disableColumnMenu hideFooter sx={{ bgcolor: 'background.paper' }} />
      {dialog}
      <FormDialog open={!!edit} title={edit?.id ? '编辑后台用户' : '新增后台用户'} onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="用户名" value={edit?.username ?? ''} onChange={(e) => setEdit({ ...edit!, username: e.target.value })} />
        <TextField label={edit?.id ? '新密码（不改请留空）' : '密码'} type="password" value={edit?.password ?? ''} onChange={(e) => setEdit({ ...edit!, password: e.target.value })} />
        <TextField select label="角色" value={edit?.roleId ?? ''} onChange={(e) => setEdit({ ...edit!, roleId: Number(e.target.value) })}>
          {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
        </TextField>
      </FormDialog>
    </>
  )
}
