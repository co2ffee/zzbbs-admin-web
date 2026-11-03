import { useState } from 'react'
import { Button, Stack, TextField } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; word: string }

export default function SensitiveWords() {
  const { run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const [word, setWord] = useState('')
  const [q, setQ] = useState({ word: '' })
  const list = usePagedList<Row>('/admin/sensitive_word/list', q)
  const [edit, setEdit] = useState<{ id?: number; word: string } | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'word', headerName: '敏感词', flex: 1, minWidth: 200 },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setEdit({ ...row })}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除「${row.word}」？`, () => run(async () => { await api.get('/admin/sensitive_word/delete', { id: row.id }); list.reload() }))}>删除</Button>
      </Stack>) },
  ]

  const save = () => edit && run(async () => {
    await api.post(edit.id ? '/admin/sensitive_word/edit' : '/admin/sensitive_word/add', { id: edit.id, word: edit.word })
    setEdit(null); list.reload()
  }, '已保存')

  const importFile = (file?: File) => file && run(async () => {
    const fd = new FormData(); fd.append('file', file)
    await api.upload('/admin/sensitive_word/import', fd); list.reload()
  }, '导入完成')

  return (
    <>
      <PageTitle actions={<>
        <Button component="label">导入 Excel(.xls)<input hidden type="file" accept=".xls" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} /></Button>
        <Button variant="contained" onClick={() => setEdit({ word: '' })}>新增</Button>
      </>}>敏感词管理</PageTitle>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" label="关键字" value={word} onChange={(e) => setWord(e.target.value)} />
        <Button variant="contained" onClick={() => setQ({ word })}>搜索</Button>
      </Stack>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title={edit?.id ? '编辑敏感词' : '新增敏感词'} onClose={() => setEdit(null)} onSubmit={save}>
        <TextField label="敏感词" value={edit?.word ?? ''} onChange={(e) => setEdit({ ...edit!, word: e.target.value })} />
      </FormDialog>
    </>
  )
}
