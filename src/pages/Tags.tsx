import { useState } from 'react'
import { Avatar, Button, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; name: string; description?: string; icon?: string; topicCount: number }

export default function Tags() {
  const { run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [name, setName] = useState('')
  const [q, setQ] = useState({ name: '' })
  const list = usePagedList<Row>('/admin/tag/list', q)
  const [edit, setEdit] = useState<(Row & { file?: File }) | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'icon', headerName: '图标', width: 80, sortable: false, renderCell: ({ row }) => <Avatar variant="rounded" src={row.icon} sx={{ width: 28, height: 28, mt: 1 }}>{row.name[0]}</Avatar> },
    { field: 'name', headerName: '名称', width: 160 },
    { field: 'description', headerName: '描述', flex: 1, minWidth: 200 },
    { field: 'topicCount', headerName: '话题数', width: 90 },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setEdit({ ...row })}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除标签 ${row.name}？`, () => run(async () => { await api.get('/admin/tag/delete', { id: row.id }); list.reload() }))}>删除</Button>
      </Stack>) },
  ]

  const save = () => edit && run(async () => {
    const fd = new FormData()
    fd.append('id', String(edit.id)); fd.append('name', edit.name)
    fd.append('description', edit.description ?? ''); fd.append('topicCount', String(edit.topicCount))
    if (edit.file) fd.append('file', edit.file)
    await api.upload('/admin/tag/edit', fd)
    setEdit(null); list.reload()
  }, '已保存')

  return (
    <>
      <PageTitle actions={<Button onClick={() => run(async () => { await api.get('/admin/tag/async'); list.reload() }, '已同步话题数')}>同步话题数</Button>}>标签管理</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="标签名" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="contained" onClick={() => setQ({ name })}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title="编辑标签" onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="名称" value={edit?.name ?? ''} onChange={(e) => setEdit({ ...edit!, name: e.target.value })} />
        <TextField label="描述" multiline minRows={2} value={edit?.description ?? ''} onChange={(e) => setEdit({ ...edit!, description: e.target.value })} />
        <TextField label="话题数" type="number" value={edit?.topicCount ?? 0} onChange={(e) => setEdit({ ...edit!, topicCount: Number(e.target.value) })} />
        <Button component="label" variant="outlined">{edit?.file ? edit.file.name : '上传新图标（可选）'}
          <input hidden type="file" accept="image/*" onChange={(e) => setEdit({ ...edit!, file: e.target.files?.[0] })} />
        </Button>
      </FormDialog>
    </>
  )
}
