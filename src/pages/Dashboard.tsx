import { useEffect, useState } from 'react'
import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material'
import { api } from '../api'
import { PageTitle, useNotify } from '../ui'

// 仪表盘字段带下划线（topic_count），api.get 会转成驼峰
interface D { topicCount: number; tagCount: number; commentCount: number; userCount: number; osName: string; totalMemorySize: number; usedMemory: number; systemCpuLoad: number; processCpuLoad: number }

export default function Dashboard() {
  const { fail } = useNotify()
  const [d, setD] = useState<D | null>(null)
  useEffect(() => { api.get<D>('/admin/index').then(setD).catch(fail) }, []) // eslint-disable-line
  if (!d) return <LinearProgress />
  const stat = (label: string, v: number) => (
    <Card><CardContent><Typography color="text.secondary">{label}</Typography><Typography variant="h4">{v}</Typography></CardContent></Card>
  )
  const memPct = d.totalMemorySize ? Math.round((d.usedMemory / d.totalMemorySize) * 100) : 0
  const pct = (x: number) => Math.max(0, Math.round(x * 100))
  const bar = (label: string, v: number, extra?: string) => (
    <Card><CardContent>
      <Typography color="text.secondary">{label}{extra ? `（${extra}）` : ''}</Typography>
      <Typography variant="h5">{v}%</Typography>
      <LinearProgress variant="determinate" value={Math.min(100, v)} sx={{ mt: 1 }} />
    </CardContent></Card>
  )
  const grid = (cols: string) => ({ display: 'grid', gap: 2, gridTemplateColumns: cols, mb: 2 })
  return (
    <>
      <PageTitle>仪表盘（今日新增）</PageTitle>
      <Box sx={grid('repeat(auto-fit, minmax(130px, 1fr))')}>
        {stat('话题', d.topicCount)}{stat('评论', d.commentCount)}{stat('标签', d.tagCount)}{stat('用户', d.userCount)}
      </Box>
      <PageTitle>系统（{d.osName}）</PageTitle>
      <Box sx={grid('repeat(auto-fit, minmax(200px, 1fr))')}>
        {bar('内存使用', memPct, `${Math.round(d.usedMemory / 1024)}MB / ${Math.round(d.totalMemorySize / 1024)}MB`)}
        {bar('系统 CPU', pct(d.systemCpuLoad))}
        {bar('进程 CPU', pct(d.processCpuLoad))}
      </Box>
    </>
  )
}
