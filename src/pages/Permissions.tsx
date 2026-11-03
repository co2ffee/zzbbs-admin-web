import { useEffect, useState } from 'react'
import { Box, Button, List, ListItemButton, ListItemText, Paper, Stack, TextField } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, useConfirm, useNotify } from '../ui'

interface Perm { id: number; name: string; value: string; pid: number }
interface D { permissions: Perm[]; childPermissions: Perm[]; pid: number | null }

export default function Permissions() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [pid, setPid] = useState<number | undefined>()
  const [d, setD] = useState<D | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [edit, setEdit] = useState<{ id?: number; name: string; value: string; pid: number } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<D>('/admin/permission/list', { pid }).then(setD).catch(fail).finally(() => setLoading(false))
  }, [pid, tick]) // eslint-disable-line

  // 当前选中的父权限：未指定时后端返回第一个父权限的子级
  const cur = pid ?? d?.permissions[0]?.id ?? 0

  const columns: GridColDef<Perm>[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: '名称', flex: 1 },
    { field: 'value', headerName: '权限值', flex: 1 },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setEdit({ ...row })}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除权限 ${row.name}？`, () => run(async () => { await api.get('/admin/permission/delete', { id: row.id }); setTick((x) => x + 1) }))}>删除</Button>
      </Stack>) },
  ]

  const save = () => edit && run(async () => {
    const back = await api.post<number>(edit.id ? '/admin/permission/edit' : '/admin/permission/add', edit)
    setEdit(null)
    if (typeof back === 'number') setPid(back)
    setTick((x) => x + 1)
  }, '已保存')

  return (
    <>
      <PageTitle actions={<>
        <Button onClick={() => setEdit({ name: '', value: '', pid: 0 })}>新增父权限</Button>
        <Button variant="contained" onClick={() => setEdit({ name: '', value: '', pid: cur })}>新增子权限</Button>
      </>}>权限管理</PageTitle>
      <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 2 }}>
        <Paper>
          <List dense>
            {d?.permissions.map((p) => (
              <ListItemButton key={p.id} selected={p.id === cur} onClick={() => setPid(p.id)}>
                <ListItemText primary={p.name} secondary={p.value} />
                <Button size="small" onClick={(e) => { e.stopPropagation(); setEdit({ ...p }) }}>编辑</Button>
              </ListItemButton>
            ))}
          </List>
        </Paper>
        <DataGrid autoHeight rows={d?.childPermissions ?? []} columns={columns as GridColDef[]} loading={loading} disableRowSelectionOnClick disableColumnMenu hideFooter sx={{ bgcolor: 'background.paper' }} />
      </Box>
      {dialog}
      <FormDialog open={!!edit} title={edit?.id ? '编辑权限' : '新增权限'} onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="名称" value={edit?.name ?? ''} onChange={(e) => setEdit({ ...edit!, name: e.target.value })} />
        <TextField label="权限值（如 topic:list）" value={edit?.value ?? ''} onChange={(e) => setEdit({ ...edit!, value: e.target.value })} />
      </FormDialog>
    </>
  )
}
