/**
 * 千载一瞬 · 统计后端代理（Cloudflare Worker）
 *
 * 作用：持有 GitHub token，替前端读写仓库里的 data/stats.json，
 *       把 GitHub 当成一个极简的「聚合数据库」。
 *       token 只存在 Worker 的 secret 里，永不进浏览器。
 *
 * 接口：
 *   GET  /stats            → 返回整份聚合 JSON（实时，不缓存）
 *   POST /report  {id,choice} → 对应节点的 choice 计数 +1，写回仓库
 *   OPTIONS               → CORS 预检
 *
 * 部署：
 *   npm i -g wrangler
 *   wrangler login
 *   wrangler secret put GITHUB_TOKEN   # 填入细粒度 PAT（仅 Contents: Read/Write）
 *   wrangler deploy
 * 然后把得到的 *.workers.dev 地址填进 index.html 的 window.STATS_WORKER_URL
 */

const REPO = REPO_OWNER + '/' + REPO_NAME; // 来自 wrangler.toml [vars]
const PATH = STATS_PATH;                   // 例如 data/stats.json
const BRANCH = BRANCH_NAME;

const API = 'https://api.github.com';

function ghHeaders(extra) {
  return Object.assign({
    Authorization: 'Bearer ' + GITHUB_TOKEN,
    'User-Agent': 'qy-stats-worker',
    Accept: 'application/vnd.github+json'
  }, extra || {});
}

async function getStats() {
  const r = await fetch(`${API}/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
    headers: ghHeaders()
  });
  if (r.status === 404) return { content: {}, sha: null };
  if (!r.ok) throw new Error('GET stats failed: ' + r.status);
  const j = await r.json();
  let content = {};
  try { content = JSON.parse(atob(j.content)); } catch (e) { content = {}; }
  return { content, sha: j.sha };
}

async function putStats(content, sha) {
  const body = {
    message: 'stats: update choice counts',
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content)))),
    branch: BRANCH
  };
  if (sha) body.sha = sha;
  return fetch(`${API}/repos/${REPO}/contents/${PATH}`, {
    method: 'PUT',
    headers: ghHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
}

async function report(id, choice) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { content, sha } = await getStats();
      if (!content[id]) content[id] = [];
      content[id][choice] = (content[id][choice] || 0) + 1;
      const r = await putStats(content, sha);
      if (r.ok) return content;
      if (r.status === 409) continue; // 并发冲突，重试读-改-写
      return content;
    } catch (e) {
      return null;
    }
  }
  return null;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method === 'POST' && url.pathname === '/report') {
      let id = null, choice = -1;
      try { const d = await request.json(); id = d.id; choice = d.choice | 0; } catch (e) {}
      if (!id || choice < 0) {
        return new Response(JSON.stringify({ ok: false, error: 'bad body' }), {
          status: 400, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
        });
      }
      const store = await report(id, choice);
      return new Response(JSON.stringify({ ok: !!store }), {
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
      });
    }
    if (request.method === 'GET' && url.pathname === '/stats') {
      let content = {};
      try { content = (await getStats()).content; } catch (e) { content = {}; }
      return new Response(JSON.stringify(content), {
        headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS)
      });
    }
    return new Response('Not Found', { status: 404, headers: CORS });
  }
};
