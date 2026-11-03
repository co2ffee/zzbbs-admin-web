# pybbs-admin-web

pybbs 后台管理前端：React + Vite + TypeScript + MUI（含 MUI X DataGrid）。纯静态产物，由 nginx 托管，不需要 Node 进程。

对接后端 `/admin/**` JSON 接口，使用 `token` header 鉴权：登录页 `POST /admin/api/login`（表单参数 `username`/`password`/`code`），成功后把返回的 `token` 存在 `localStorage`，之后每个请求带 `token` header。验证码是 `/common/captcha`，依赖后端 session cookie，所以前端必须与后端同域（开发时用 Vite 代理，线上用 nginx 反向代理）。

## 开发

```bash
npm install
npm run dev            # http://localhost:3001，默认代理到 http://localhost:8080
PYBBS_BACKEND=http://host:8080 npm run dev
```

## 打包部署

```bash
npm run build          # 产物在 dist/
```

如果要挂在子路径（例如 `/admin-ui/`），构建时指定 base：

```bash
npx vite build --base=/admin-ui/
```

nginx 示例（SPA 路径与后端 API 路径不冲突：SPA 页面在 `/admin-ui/`，API 仍走 `/admin/**`）：

```nginx
location /admin-ui/ { alias /path/to/dist/; try_files $uri $uri/ /admin-ui/index.html; }
location ~ ^/(admin|common|static)/ { proxy_pass http://127.0.0.1:8080; }
```

## 页面

仪表盘、话题、评论、文件、标签、用户、敏感词、系统设置、后台用户、角色、权限。
