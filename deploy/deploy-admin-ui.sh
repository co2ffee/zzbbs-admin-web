#!/bin/bash
# 用法：bash deploy-admin-ui.sh   下载最新管理端静态产物 → 校验 → 原子替换（不需要重启后端）
# 放在服务器 /home/pybbs/ 下；下载走本机 mihomo 代理(127.0.0.1:7891)
set -e
cd /home/pybbs

URL="https://github.com/co2ffee/zzbbs-admin-web/releases/download/deploy-latest/admin-ui.tar.gz"

echo "通过代理下载管理端前端..."
curl --socks5 127.0.0.1:7891 -fL --max-time 120 -o admin-ui.tar.gz.new "$URL"

if [ ! -s admin-ui.tar.gz.new ] || ! tar -tzf admin-ui.tar.gz.new >/dev/null 2>&1; then
    echo "下载的压缩包无效，取消部署"
    rm -f admin-ui.tar.gz.new
    exit 1
fi

rm -rf admin-ui.new
mkdir admin-ui.new
tar -xzf admin-ui.tar.gz.new -C admin-ui.new
rm -f admin-ui.tar.gz.new

if [ ! -f admin-ui.new/index.html ]; then
    echo "压缩包里没有 index.html，取消部署"
    rm -rf admin-ui.new
    exit 1
fi

echo "替换静态文件（保留上一版 admin-ui.bak，出问题可回滚）..."
rm -rf admin-ui.bak
[ -d admin-ui ] && mv admin-ui admin-ui.bak
mv admin-ui.new admin-ui
echo "管理端前端部署完成"
