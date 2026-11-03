import { useState } from 'react'
import { Button, Chip, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api, fmtTime } from '../api'
import { FormDialog, isDeleted, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; topicId: number; title?: string; content: string; username: string; inTime: string; status: boolean | number; deleted: boolean | number }

export default function Comments() {
  const { run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [f, setF] = useState({ username: '', startDate: '', endDate: '' })
  const [q, setQ] = useState(f)
  const list = usePagedList<Row>('/admin/comment/list', q)
  const [edit, setEdit] = useState<{ id: number; content: string; topicTitle: string } | null>(null)

  const act = (path: string, id: number, msg?: string) => run(async () => { await api.get(`/admin/comment/${path}`, { id }); list.reload() }, msg)
  const openEdit = async (id: number) => {
    const d = await api.get<{ comment: { content: string }; topic: { title: string } }>('/admin/comment/edit', { id })
    setEdit({ id, content: d.comment.content, topicTitle: d.topic?.title ?? '' })
  }

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'content', headerName: '内容', flex: 1, minWidth: 260 },
    { field: 'title', headerName: '话题', width: 200 },
    { field: 'username', headerName: '评论人', width: 110 },
    { field: 'inTime', headerName: '时间', width: 170, valueFormatter: (v) => fmtTime(v as string) },
    { field: 'state', headerName: '状态', width: 120, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        {!row.status && <Chip size="small" color="warning" label="待审核" />}
        {isDeleted(row.deleted) && <Chip size="small" color="error" label="已删除" />}
      </Stack>) },
    { field: 'actions', headerName: '操作', width: 260, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => openEdit(row.id).catch((e) => run(() => Promise.reject(e)))}>编辑</Button>
        {!row.status && <Button size="small" onClick={() => act('examine', row.id, '已审核')}>审核通过</Button>}
        {isDeleted(row.deleted)
          ? <Button size="small" onClick={() => act('restore', row.id)}>恢复</Button>
          : <Button size="small" color="error" onClick={() => confirm('确定删除该评论？', () => act('delete', row.id))}>删除</Button>}
      </Stack>) },
  ]

  return (
    <>
      <PageTitle>评论管理</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="评论人" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <TextField size="small" type="date" label="开始日期" slotProps={{ inputLabel: { shrink: true } }} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        <TextField size="small" type="date" label="结束日期" slotProps={{ inputLabel: { shrink: true } }} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
        <Button variant="contained" onClick={() => setQ(f)}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title={`编辑评论（话题：${edit?.topicTitle ?? ''}）`} onClose={() => setEdit(null)}
        onSubmit={() => edit && run(async () => { await api.post('/admin/comment/edit', { id: edit.id, content: edit.content }); setEdit(null); list.reload() }, '已保存')}>
        <TextField label="内容" multiline minRows={6} value={edit?.content ?? ''} onChange={(e) => setEdit({ ...edit!, content: e.target.value })} />
      </FormDialog>
    </>
  )
}
