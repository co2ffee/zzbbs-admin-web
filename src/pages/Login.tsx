import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { api } from '../api'
import { useAuth } from '../auth'

interface F { username: string; password: string; code: string }

export default function Login() {
  const { admin, login } = useAuth()
  const nav = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>()
  const [err, setErr] = useState('')
  const [k, setK] = useState(Date.now())
  if (admin) return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async (v) => {
    setErr('')
    try {
      // 登录接口走表单参数，验证码依赖 session cookie，所以需要同域/代理
      const r = await api.post<{ adminUser: { id: number; username: string }; token: string }>('/admin/api/login', v)
      login(r.adminUser, r.token)
      nav('/')
    } catch (e: any) {
      setErr(e.message)
      setK(Date.now())
    }
  })

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Paper sx={{ p: 4, width: 380 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>后台登录</Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField label="用户名" {...register('username', { required: '请输入用户名' })} error={!!errors.username} helperText={errors.username?.message} />
            <TextField label="密码" type="password" {...register('password', { required: '请输入密码' })} error={!!errors.password} helperText={errors.password?.message} />
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <TextField label="验证码" sx={{ flex: 1 }} {...register('code', { required: '请输入验证码' })} error={!!errors.code} helperText={errors.code?.message} />
              <img src={`/common/captcha?${k}`} alt="captcha" style={{ height: 40, cursor: 'pointer' }} onClick={() => setK(Date.now())} />
            </Stack>
            <Button type="submit" variant="contained" disabled={isSubmitting}>登录</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
