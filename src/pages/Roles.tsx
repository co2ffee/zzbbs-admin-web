import { useEffect, useState } from 'react'
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, useConfirm, useNotify } from '../ui'

interface Role { id: number; name: string }
interface Perm { id: number; name: string; value: string; pid: number }

export default function Roles() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [perms, setPerms] = useState<Perm[]>([])
  const [edit, setEdit] = useState<{ id?: number; name: string; ids: number[] } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<Role[]>('/admin/role/list').then(setRows).catch(fail).finally(() => setLoading(false))
  }, [tick]) // eslint-disable-line

  const open = async (id?: number) => {
    try {
      if (id) {
        const d = await api.get<{ role: Role; currentPermissions: Perm[]; permissions: Perm[] }>('/admin/role/edit', { id })
        setPerms(d.permissions); setEdit({ id, name: d.role.name, ids: d.currentPermissions.map((p) => p.id) })
      } else {
        setPerms(await api.get<Perm[]>('/admin/role/add')); setEdit({ name: '', ids: [] })
      }
    } catch (e) { fail(e) }
  }

  const toggle = (ids: number[], on: boolean) =>
    setEdit((e) => e && { ...e, ids: on ? Array.from(new Set([...e.ids, ...ids])) : e.ids.filter((x) => !ids.includes(x)) })

  const columns: GridColDef<Role>[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: '角色名', flex: 1 },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => open(row.id)}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除角色 ${row.name}？`, () => run(async () => { await api.get('/admin/role/delete', { id: row.id }); setTick((x) => x + 1) }))}>删除</Button>
      </Stack>) },
  ]

  const parents = perms.filter((p) => p.pid === 0)
  const save = () => edit && run(async () => {
    await api.post(edit.id ? '/admin/role/edit' : '/admin/role/add', { id: edit.id, name: edit.name, permissionIds: edit.ids })
    setEdit(null); setTick((x) => x + 1)
  }, '已保存')

  return (
    <>
      <PageTitle actions={<Button variant="contained" onClick={() => open()}>新增</Button>}>角色管理</PageTitle>
      <DataGrid autoHeight rows={rows} columns={columns as GridColDef[]} loading={loading} disableRowSelectionOnClick disableColumnMenu hideFooter sx={{ bgcolor: 'background.paper' }} />
      {dialog}
      <FormDialog open={!!edit} title={edit?.id ? '编辑角色' : '新增角色'} onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="角色名" value={edit?.name ?? ''} onChange={(e) => setEdit({ ...edit!, name: e.target.value })} />
        {parents.map((p) => {
          const kids = perms.filter((c) => c.pid === p.id)
          const all = kids.every((k) => edit?.ids.includes(k.id))
          return (
            <Box key={p.id}>
              <FormControlLabel control={<Checkbox checked={all && kids.length > 0} onChange={(e) => toggle([p.id, ...kids.map((k) => k.id)], e.target.checked)} />} label={<Typography sx={{ fontWeight: "bold" }}>{p.name}</Typography>} />
              <Box sx={{ pl: 4 }}>
                {kids.map((k) => (
                  <FormControlLabel key={k.id} control={<Checkbox checked={!!edit?.ids.includes(k.id)} onChange={(e) => toggle([k.id], e.target.checked)} />} label={k.name} />
                ))}
              </Box>
            </Box>
          )
        })}
      </FormDialog>
    </>
  )
}
