import { useState } from 'react'
import { Button, Chip, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; title: string; username: string; inTime: string; good: boolean; top: boolean; deleted: number; commentCount: number; view: number }

export default function Topics() {
  const { run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState({ username: '', startDate: '', endDate: '' })
  const [q, setQ] = useState(f)
  const list = usePagedList<Row>('/admin/topic/list', q)
  const [edit, setEdit] = useState<{ id: number; title: string; content: string; tags: string } | null>(null)

  const act = (path: string, id: number, msg?: string) => run(async () => { await api.get(`/admin/topic/${path}`, { id }); list.reload() }, msg)
  const openEdit = async (id: number) => {
    const d = await api.get<{ topic: { title: string; content: string }; tags: string }>('/admin/topic/edit', { id })
    setEdit({ id, title: d.topic.title, content: d.topic.content, tags: d.tags })
  }

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'title', headerName: '标题', flex: 1, minWidth: 220 },
    { field: 'username', headerName: '作者', width: 110 },
    { field: 'inTime', headerName: '发布时间', width: 170, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'commentCount', headerName: '评论', width: 70 },
    { field: 'view', headerName: '浏览', width: 70 },
    { field: 'flags', headerName: '状态', width: 150, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        {row.top && <Chip size="small" color="warning" label="置顶" />}
        {row.good && <Chip size="small" color="success" label="精华" />}
        {row.deleted === 1 && <Chip size="small" color="error" label="已删除" />}
      </Stack>) },
    { field: 'actions', headerName: '操作', width: 470, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => openEdit(row.id).catch((e) => run(() => Promise.reject(e)))}>编辑</Button>
        <Button size="small" onClick={() => act('good', row.id)}>{row.good ? '取消精华' : '加精'}</Button>
        <Button size="small" onClick={() => act('top', row.id)}>{row.top ? '取消置顶' : '置顶'}</Button>
        {row.deleted === 1
          ? <>
            <Button size="small" onClick={() => act('restore', row.id)}>恢复</Button>
            <Button size="small" color="error" onClick={() => confirm('彻底删除后无法恢复，确定？', () => act('physical_delete', row.id))}>彻底删除</Button>
          </>
          : <Button size="small" color="error" onClick={() => confirm('确定删除该话题？', () => act('delete', row.id))}>删除</Button>}
        <Button size="small" onClick={() => act('index', row.id, '已建立索引')}>索引</Button>
        <Button size="small" onClick={() => act('delete_index', row.id, '已删除索引')}>删索引</Button>
      </Stack>) },
  ]

  return (
    <>
      <PageTitle actions={<>
        <Button onClick={() => confirm('为全部话题建立索引？', () => run(() => api.get('/admin/topic/index_all'), '已提交'))}>全部建索引</Button>
        <Button color="error" onClick={() => confirm('清空全部索引？', () => run(() => api.get('/admin/topic/delete_all_index'), '已清空'))}>清空索引</Button>
      </>}>话题管理</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="作者" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <TextField size="small" type="date" label="开始日期" slotProps={{ inputLabel: { shrink: true } }} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        <TextField size="small" type="date" label="结束日期" slotProps={{ inputLabel: { shrink: true } }} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
        <Button variant="contained" onClick={() => setQ(f)}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title="编辑话题" onClose={() => setEdit(null)}
        onSubmit={() => edit && run(async () => { await api.post('/admin/topic/edit', edit); setEdit(null); list.reload() }, '已保存')}>
        <TextField label="标题" value={edit?.title ?? ''} onChange={(e) => setEdit({ ...edit!, title: e.target.value })} />
        <TextField label="内容" multiline minRows={8} value={edit?.content ?? ''} onChange={(e) => setEdit({ ...edit!, content: e.target.value })} />
        <TextField label="标签（逗号分隔）" value={edit?.tags ?? ''} onChange={(e) => setEdit({ ...edit!, tags: e.target.value })} />
      </FormDialog>
    </>
  )
}
