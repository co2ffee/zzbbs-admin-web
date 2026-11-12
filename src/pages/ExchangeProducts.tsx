import { useState } from 'react'
import { Avatar, Button, Checkbox, Chip, Divider, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid'
import { api } from '../api'
import { FormDialog, PageTitle, PagedGrid, useConfirm, useNotify, usePagedList } from '../ui'

interface Row { id: number; name: string; image?: string; description?: string; score: number; stock: number; sort: number; enabled: boolean; rewardText?: string | null; rewardType?: string | null; rewardUrl?: string | null }
interface Form { id?: number; name: string; image?: string; description: string; score: string; unlimited: boolean; stock: string; sort: string; enabled: boolean; newImage?: string; removeImage?: boolean; uploading?: boolean
  // 兑换后给用户看的内容：文本 + 一个文件（图片或视频）
  rewardText: string; rewardType?: string; rewardUrl?: string; newRewardUrl?: string; newRewardType?: string; removeRewardFile?: boolean; uploadingReward?: boolean }

const empty: Form = { name: '', description: '', score: '', unlimited: true, stock: '10', sort: '0', enabled: true, rewardText: '' }

export default function ExchangeProducts() {
  const { run } = useNotify()
  const { confirm, dialog } = useConfirm()
  const list = usePagedList<Row>('/admin/exchange/product/list')
  const [edit, setEdit] = useState<Form | null>(null)

  const columns: GridColDef<Row>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'image', headerName: '图片', width: 80, sortable: false, renderCell: ({ row }) => <Avatar variant="rounded" src={row.image} sx={{ width: 36, height: 36, mt: 0.5 }}>{row.name[0]}</Avatar> },
    { field: 'name', headerName: '名称', flex: 1, minWidth: 160 },
    { field: 'score', headerName: '所需积分', width: 100 },
    { field: 'stock', headerName: '库存', width: 90, valueFormatter: (v) => (Number(v) < 0 ? '不限量' : String(v)) },
    { field: 'sort', headerName: '排序', width: 80 },
    { field: 'enabled', headerName: '状态', width: 90, renderCell: ({ row }) => (row.enabled ? <Chip size="small" color="success" label="上架" /> : <Chip size="small" label="已下架" />) },
    { field: 'actions', headerName: '操作', width: 160, sortable: false, renderCell: ({ row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}>
        <Button size="small" onClick={() => setEdit({ id: row.id, name: row.name, image: row.image, description: row.description ?? '', score: String(row.score), unlimited: row.stock < 0, stock: row.stock < 0 ? '10' : String(row.stock), sort: String(row.sort), enabled: row.enabled,
          rewardText: row.rewardText ?? '', rewardType: row.rewardType ?? undefined, rewardUrl: row.rewardUrl ?? undefined })}>编辑</Button>
        <Button size="small" color="error" onClick={() => confirm(`删除商品「${row.name}」？已有的兑换记录不受影响。`, () => run(async () => { await api.get('/admin/exchange/product/delete', { id: row.id }); list.reload() }))}>删除</Button>
      </Stack>) },
  ]

  // 图片和标签图标一样走预签名直传：先向后端要上传地址，浏览器直接 PUT 到存储桶，保存时只提交图片地址
  const pickImage = async (file?: File) => {
    if (!file || !edit) return
    setEdit((e) => e && { ...e, uploading: true })
    await run(async () => {
      const r = await api.get<{ uploadUrl: string; fileUrl: string }>('/admin/exchange/product/upload_url')
      let res: Response
      try {
        res = await fetch(r.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      } catch {
        throw new Error('上传失败，请检查网络，或检查存储桶的跨域（CORS）设置')
      }
      if (!res.ok) throw new Error(`上传失败 (${res.status})`)
      setEdit((e) => e && { ...e, newImage: r.fileUrl, image: r.fileUrl, removeImage: false })
    }, '图片已上传，保存后生效')
    setEdit((e) => e && { ...e, uploading: false })
  }

  // 兑换后给用户看的文件：图片或视频，同样是预签名直传
  const pickReward = async (file: File | undefined, kind: 'image' | 'video') => {
    if (!file || !edit) return
    setEdit((e) => e && { ...e, uploadingReward: true })
    await run(async () => {
      const r = await api.get<{ uploadUrl: string; fileUrl: string }>('/admin/exchange/product/upload_url', { type: kind })
      let res: Response
      try {
        res = await fetch(r.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      } catch {
        throw new Error('上传失败，请检查网络，或检查存储桶的跨域（CORS）设置')
      }
      if (!res.ok) throw new Error(`上传失败 (${res.status})`)
      setEdit((e) => e && { ...e, newRewardUrl: r.fileUrl, newRewardType: kind, rewardUrl: r.fileUrl, rewardType: kind, removeRewardFile: false })
    }, '文件已上传，保存后生效')
    setEdit((e) => e && { ...e, uploadingReward: false })
  }

  const save = () => edit && run(async () => {
    // newImage 为空表示没换图片：不提交 image，后端保持原图
    await api.post('/admin/exchange/product/save', {
      id: edit.id, name: edit.name, description: edit.description, score: edit.score,
      stock: edit.unlimited ? -1 : edit.stock, sort: edit.sort, enabled: edit.enabled, image: edit.newImage,
      // 点了“移除图片”且没有再上传新图：告诉后端去掉图片（不提交 image 只是“保持原图”）
      removeImage: edit.removeImage && !edit.newImage ? true : undefined,
      // 文本一直提交（空字符串 = 清空）；文件：新传的才提交，点了“移除文件”且没再传新的就告诉后端去掉
      rewardText: edit.rewardText, rewardUrl: edit.newRewardUrl, rewardType: edit.newRewardType,
      removeRewardFile: edit.removeRewardFile && !edit.newRewardUrl ? true : undefined,
    })
    setEdit(null); list.reload()
  }, '已保存')

  const set = (patch: Partial<Form>) => setEdit((e) => e && { ...e, ...patch })

  return (
    <>
      <PageTitle actions={<Button variant="contained" onClick={() => setEdit({ ...empty })}>新增商品</Button>}>兑换商品</PageTitle>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>用户在前台「积分兑换」页用积分兑换这里上架的商品；兑换记录在「兑换记录」里处理。</Typography>
      <PagedGrid list={list} columns={columns as GridColDef[]} />
      {dialog}
      <FormDialog open={!!edit} title={edit?.id ? '编辑商品' : '新增商品'} onClose={() => setEdit(null)} onSubmit={save} submitting={edit?.uploading || edit?.uploadingReward}>
        <TextField label="商品名称" required value={edit?.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar variant="rounded" src={edit?.image} sx={{ width: 72, height: 72 }}>{edit?.name?.[0]}</Avatar>
          <Button component="label" variant="outlined" disabled={edit?.uploading}>{edit?.uploading ? '上传中…' : edit?.image ? '更换图片' : '上传图片'}
            <input hidden type="file" accept="image/*" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }} />
          </Button>
          {edit?.image && <Button color="error" disabled={edit?.uploading} onClick={() => set({ image: undefined, newImage: undefined, removeImage: true })}>移除图片</Button>}
          {edit?.removeImage && !edit?.image && <Typography variant="caption" color="text.secondary">保存后商品不再显示图片</Typography>}
        </Stack>
        <TextField label="商品简介（可选）" multiline minRows={2} value={edit?.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        <TextField label="兑换需要的积分" type="number" required value={edit?.score ?? ''} onChange={(e) => set({ score: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControlLabel control={<Checkbox checked={edit?.unlimited ?? true} onChange={(e) => set({ unlimited: e.target.checked })} />} label="不限量" />
          <TextField label="库存" type="number" disabled={edit?.unlimited} value={edit?.stock ?? ''} onChange={(e) => set({ stock: e.target.value })} slotProps={{ htmlInput: { min: 0 } }} />
        </Stack>
        <Divider textAlign="left"><Typography variant="caption" color="text.secondary">兑换后给用户看的内容</Typography></Divider>
        <TextField label="文本（可选，比如兑换码、说明、网盘链接）" multiline minRows={3} value={edit?.rewardText ?? ''}
          onChange={(e) => set({ rewardText: e.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
        {edit?.rewardUrl && (edit.rewardType === 'video'
          ? <video src={edit.rewardUrl} controls style={{ maxWidth: '100%', maxHeight: 220, background: '#000' }} />
          : <img src={edit.rewardUrl} alt="兑换内容" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />)}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Button component="label" variant="outlined" size="small" disabled={edit?.uploadingReward}>{edit?.uploadingReward ? '上传中…' : '上传图片'}
            <input hidden type="file" accept="image/*" onChange={(e) => { pickReward(e.target.files?.[0], 'image'); e.target.value = '' }} />
          </Button>
          <Button component="label" variant="outlined" size="small" disabled={edit?.uploadingReward}>上传视频（mp4）
            <input hidden type="file" accept="video/mp4" onChange={(e) => { pickReward(e.target.files?.[0], 'video'); e.target.value = '' }} />
          </Button>
          {edit?.rewardUrl && <Button color="error" size="small" disabled={edit?.uploadingReward} onClick={() => set({ rewardUrl: undefined, rewardType: undefined, newRewardUrl: undefined, newRewardType: undefined, removeRewardFile: true })}>移除文件</Button>}
          {edit?.removeRewardFile && !edit?.rewardUrl && <Typography variant="caption" color="text.secondary">保存后不再给文件</Typography>}
        </Stack>
        <Typography variant="caption" color="text.secondary">用户兑换成功后才能看到这些内容（兑换时会保存一份，之后你改了或删了商品也不影响已经兑换的用户）。文件用随机链接保存，知道链接的人也能打开，请不要放特别敏感的内容。</Typography>
        <TextField label="排序（数字大的排前面）" type="number" value={edit?.sort ?? '0'} onChange={(e) => set({ sort: e.target.value })} />
        <FormControlLabel control={<Switch checked={edit?.enabled ?? true} onChange={(e) => set({ enabled: e.target.checked })} />} label="上架（关闭后用户端看不到）" />
      </FormDialog>
    </>
  )
}
