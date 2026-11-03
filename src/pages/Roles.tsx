import { useEffect, useState } from 'react'
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, useConfirm, useNotify } from '../ui'

interface Role { id: number; name: string }
interface Perm { id: number; name: string; value: string; pid: number }
// 后端 add / edit 返回的 permissions 是“分组名 → 子权限列表”的对象（和旧页面一致），只有子权限可以勾选
type Groups = Record<string, Perm[]>

// 兼容：如果后端以后改成扁平数组，就按 pid 自己分组
const toGroups = (raw: unknown): Groups => {
  if (Array.isArray(raw)) {
    const all = raw as Perm[]
    const g: Groups = {}
    all.filter((p) => p.pid === 0).forEach((p) => { g[p.name] = all.filter((c) => c.pid === p.id) })
    return g
  }
  return (raw && typeof raw === 'object' ? raw : {}) as Groups
}

export default function Roles() {
  const { fail, run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [rows, setRows] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const [groups, setGroups] = useState<Groups>({})
  const [edit, setEdit] = useState<{ id?: number; name: string; ids: number[] } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<Role[]>('/admin/role/list').then(setRows).catch(fail).finally(() => setLoading(false))
  }, [tick]) // eslint-disable-line

  const open = async (id?: number) => {
    try {
      if (id) {
        const d = await api.get<{ role: Role; currentPermissions: Perm[]; permissions: unknown }>('/admin/role/edit', { id })
        setGroups(toGroups(d.permissions)); setEdit({ id, name: d.role.name, ids: d.currentPermissions.map((p) => p.id) })
      } else {
        setGroups(toGroups(await api.get<unknown>('/admin/role/add'))); setEdit({ name: '', ids: [] })
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
        {Object.entries(groups).map(([group, kids]) => {
          const all = kids.length > 0 && kids.every((k) => edit?.ids.includes(k.id))
          return (
            <Box key={group}>
              <FormControlLabel control={<Checkbox checked={all} onChange={(e) => toggle(kids.map((k) => k.id), e.target.checked)} />}
                label={<Typography sx={{ fontWeight: 'bold' }}>{group}</Typography>} />
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
