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
  const [edit, setEdit] = useState<(Row & { newIcon?: string; uploading?: boolean }) | null>(null)

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

  // 图标和用户端一样走预签名直传：先向后端要上传地址，浏览器直接 PUT 到存储桶，保存时只提交图标地址
  const pickIcon = async (file?: File) => {
    if (!file || !edit) return
    setEdit((e) => e && { ...e, uploading: true })
    await run(async () => {
      const r = await api.get<{ uploadUrl: string; fileUrl: string }>('/admin/tag/upload_url')
      let res: Response
      try {
        res = await fetch(r.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      } catch {
        throw new Error('上传失败，请检查网络，或检查存储桶的跨域（CORS）设置')
      }
      if (!res.ok) throw new Error(`上传失败 (${res.status})`)
      setEdit((e) => e && { ...e, newIcon: r.fileUrl, icon: r.fileUrl })
    }, '图标已上传，保存后生效')
    setEdit((e) => e && { ...e, uploading: false })
  }

  const save = () => edit && run(async () => {
    // newIcon 为空表示没换图标：不提交 icon，后端保持原图标
    await api.post('/admin/tag/edit', { id: edit.id, name: edit.name, description: edit.description ?? '', topicCount: edit.topicCount, icon: edit.newIcon })
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
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar variant="rounded" src={edit?.icon} sx={{ width: 40, height: 40 }}>{edit?.name?.[0]}</Avatar>
          <Button component="label" variant="outlined" disabled={edit?.uploading}>{edit?.uploading ? '上传中…' : '上传新图标（可选）'}
            <input hidden type="file" accept="image/*" onChange={(e) => { pickIcon(e.target.files?.[0]); e.target.value = '' }} />
          </Button>
        </Stack>
      </FormDialog>
    </>
  )
}
