import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.PYBBS_BACKEND || 'http://localhost:8080'

// 后台接口都在 /admin/**，验证码在 /common/captcha，图片等静态资源在 /static
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: { '/admin': backend, '/common': backend, '/static': backend },
  },
})
