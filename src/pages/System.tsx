import { useEffect, useState } from 'react'
import { Box, Button, FormControlLabel, LinearProgress, MenuItem, Paper, Radio, RadioGroup, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { api } from '../api'
import { PageTitle, useNotify } from '../ui'

interface Cfg { key: string; value: string; description: string; type: string; option?: string; reboot?: string }

export default function System() {
  const { fail, run } = useNotify()
  const [groups, setGroups] = useState<Record<string, Cfg[]> | null>(null)
  const [tab, setTab] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})

  const load = () => api.get<Record<string, Cfg[]>>('/admin/system/edit').then((g) => {
    setGroups(g)
    setValues(Object.fromEntries(Object.values(g).flat().map((c) => [c.key, c.value ?? ''])))
  }).catch(fail)
  useEffect(() => { load() }, []) // eslint-disable-line

  if (!groups) return <LinearProgress />
  const names = Object.keys(groups)
  const cur = groups[names[tab]] ?? []
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }))

  const field = (c: Cfg) => {
    const v = values[c.key] ?? ''
    if (c.type === 'radio') return (
      <RadioGroup row value={v} onChange={(e) => set(c.key, e.target.value)}>
        <FormControlLabel value="1" control={<Radio />} label="是" /><FormControlLabel value="0" control={<Radio />} label="否" />
      </RadioGroup>)
    if (c.type === 'select') return (
      <TextField select size="small" value={v} onChange={(e) => set(c.key, e.target.value)}>
        {(c.option || '').split(',').map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </TextField>)
    return <TextField size="small" fullWidth value={v} type={c.type === 'password' ? 'password' : c.type === 'number' ? 'number' : 'text'} onChange={(e) => set(c.key, e.target.value)} />
  }

  // 提交全部分组的配置（后端按 key 更新；密码未改动时值为 ******* 会被后端跳过）
  const save = () => run(async () => {
    const list = Object.entries(values).map(([name, value]) => ({ name, value }))
    await api.postJson('/admin/system/edit', list)
    await load()
  }, '已保存')

  return (
    <>
      <PageTitle actions={<Button variant="contained" onClick={save}>保存全部</Button>}>系统设置</PageTitle>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        {names.map((n) => <Tab key={n} label={n} />)}
      </Tabs>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {cur.map((c) => (
            <Box key={c.key} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 1, alignItems: 'center' }}>
              <Typography>{c.description}{c.reboot === '1' && <Typography component="span" color="error" variant="caption"> （需重启）</Typography>}</Typography>
              {field(c)}
            </Box>
          ))}
        </Stack>
      </Paper>
    </>
  )
}
