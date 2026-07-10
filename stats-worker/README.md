# 选项匿名统计 · 后端部署指南（GitHub 当数据库）

把 GitHub 当成一个极简的「聚合数据库」：前端不直接碰 GitHub，而是通过一个
**持有 token 的 Cloudflare Worker 代理** 去读写仓库里的 `data/stats.json`。
这样 token 永不进浏览器，又能做到全站真实聚合。

## 架构

```
浏览器                     Cloudflare Worker                GitHub 仓库
 ├─ GET  /stats  ─────────▶ 读 data/stats.json  ───────────▶ 返回全站聚合
 └─ POST /report ─────────▶ 计数+1，写回 data/stats.json ──▶ 触发 Pages 重建
```

前端读取用 `GET /stats`（实时，不缓存）；上报用 `POST /report`。
未配置 Worker 时，站点自动降级为「本地 localStorage + 种子基线」，显示效果不变。

## 步骤

### 1. 建一个细粒度 GitHub Token
- GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- 仅勾选 `qianyi` 这个仓库的 **Contents: Read and Write**
- 复制生成的 token

### 2. 部署 Worker
```bash
npm i -g wrangler
wrangler login
cd stats-worker
wrangler secret put GITHUB_TOKEN      # 粘贴上面的 token
wrangler deploy
```
部署成功会得到类似 `https://qy-stats.<子域>.workers.dev` 的地址。

### 3. 填回站点
打开 `index.html`，把地址填进：
```html
<script>window.STATS_WORKER_URL = 'https://qy-stats.<子域>.workers.dev';</script>
```
推送后，全站统计即为真实跨用户聚合。

## 说明 / 取舍
- **隐私**：只记录「哪个节点的哪个选项被点了几次」，不记录 IP、设备、身份。
- **并发**：Worker 对写操作做了 409 冲突重试（读-改-写），偶发并发会自愈；个人站点流量下足够。
- **Pages 重建**：每次上报都会提交 `data/stats.json`，GitHub Pages 会随之重建（个人站点频率可接受）。若担心，可改为 Worker 侧 KV 暂存、定时回写。
- **不想用 Cloudflare？** 也可换 Vercel/Netlify/Deno 的函数，逻辑相同——只要有一个能持有 token 的服务端代理即可。
