# zzbbs-admin-web

zzbbs 后台管理前端：React + Vite + TypeScript + MUI（含 MUI X DataGrid）。纯静态产物，由 nginx 托管，不需要 Node 进程。

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

## 开发注意

- 接口返回的 `tinyint(1)` 字段（如话题/评论的 `deleted`）经 JDBC 会变成 `true/false`，不要用 `=== 1` 判断，用 `ui.tsx` 里的 `isDeleted()`。
- 话题管理列表有意包含已删除的话题（显示“已删除”，可恢复/彻底删除）；仪表盘“今日新增”只统计未删除的。
- 操作需要后端权限（`@RequiresPermissions`）；没权限时接口返回 `code=201`，前端用提示条显示（错误提示停留 8 秒）。新增后台功能时，后端要同时加对应的权限迁移。

## 发布与部署

push 到 `main` 后，`.github/workflows/release-dist.yml` 会构建（`--base=/admin-ui/`）并把 `admin-ui.tar.gz` 发到固定 tag `deploy-latest` 的 release。

服务器侧：把 `deploy/deploy-admin-ui.sh` 放到 `/home/pybbs/`，执行 `bash deploy-admin-ui.sh`（下载走 mihomo 代理，原子替换，保留上一版 `admin-ui.bak`）。

nginx（`^~` 保证优先于正则）：

```nginx
location ^~ /admin-ui/ {
    alias /home/pybbs/admin-ui/;
    try_files $uri $uri/ /admin-ui/index.html;
    # index.html 每次都向服务器确认有没有更新，否则部署新版后浏览器可能继续用旧的 JS
    add_header Cache-Control "no-cache";
}

# 带 hash 的静态资源可以长期缓存
location ^~ /admin-ui/assets/ {
    alias /home/pybbs/admin-ui/assets/;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

回滚：`cd /home/pybbs && rm -rf admin-ui && mv admin-ui.bak admin-ui`。完整的上线步骤见主仓库 `zzbbs` 的 `DEPLOY_RUNBOOK.md`。
