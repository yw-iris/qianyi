/* ============================================================
 *  千载一瞬 · 选项匿名统计
 *  - 真实本地选择：localStorage 累计
 *  - 基线人气：以角色+节点+选项为种子的确定性伪随机，
 *    让首次访问 / 后端未配置时也拥有"看起来真实"的百分比与总人次
 *  - 可选远端后端：配置 workerUrl 后，统计改为读取全站真实聚合
 *    （Cloudflare Worker 代理 GitHub token，读写仓库 data/stats.json）
 *  - 展示文案："X% 的人在这里选择了此项" / "已有 N 人在此抉择"
 * ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'qy_choicestats_v1';

  let WORKER_URL = '';        // 配置后启用全站真实聚合
  let remoteCache = null;     // { 'charId:nodeId': [c0, c1, ...] }
  let remoteTried = false;

  /* ---------- 持久化 ---------- */
  function loadDB() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveDB(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* ---------- 确定性哈希（FNV-1a）---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000; // [0,1)
  }

  function nodeKey(charId, nodeId) { return charId + ':' + nodeId; }

  /* 按角色区分「人气」基线（min, max），让统计看起来更真实。
   * 王羲之/苏轼/王希孟 天然高热度；张择端/李煜/颜真卿 偏小众；
   * 王安石介于中间。值经过微调使各角色平均差距合理。 */
  const CHAR_HEAT = {
    xizhi:       [1100, 5800],   // 书圣，最大众
    sushi:       [1000, 5200],   // 东坡，极热
    ximeng:      [800, 4400],    // 千里江山，少年天才热
    wanganshi:   [600, 3400],    // 拗相公，中热
    yanzhenqing: [350, 2200],    // 忠烈，偏小众
    zeduan:      [280, 1900],    // 界画，小众但名作加持
    liyu:        [250, 1800]     // 词帝，圈内热圈外冷
  };
  const DEFAULT_HEAT = [380, 4600]; // 未匹配角色回退

  /* 该节点的"历史总人次"基线：按角色区分热度 */
  function seedTotal(charId, nodeId) {
    const [lo, hi] = CHAR_HEAT[charId] || DEFAULT_HEAT;
    return Math.floor(lo + hash(charId + '|' + nodeId + '|T') * (hi - lo));
  }
  /* 单个选项的权重：0.22 ~ 1.18，保证各选项比例有差异 */
  function optionWeight(charId, nodeId, idx) {
    return 0.22 + hash(charId + '|' + nodeId + '|o' + idx) * 0.96;
  }

  /* ---------- 远端后端（GitHub 当数据库）---------- */
  function configure(opts) {
    if (opts && opts.workerUrl) {
      WORKER_URL = String(opts.workerUrl).replace(/\/+$/, '');
      loadRemote();
    }
  }

  function loadRemote() {
    if (!WORKER_URL) return;
    remoteTried = true;
    fetch(WORKER_URL + '/stats', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && typeof j === 'object') remoteCache = j; })
      .catch(() => { /* 离线/后端不可用：静默降级为本地+基线 */ });
  }

  function pushRemote(charId, nodeId, choiceIndex) {
    if (!WORKER_URL) return;
    const id = nodeKey(charId, nodeId);
    fetch(WORKER_URL + '/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, choice: choiceIndex })
    }).catch(() => { /* 失败不影响体验 */ });
  }

  /** 优先用远端真实聚合；缺失的节点回退到基线，保证始终"看起来真实" */
  function baseCountsFor(charId, nodeId, numChoices) {
    const id = nodeKey(charId, nodeId);
    if (remoteCache && remoteCache[id]) {
      const arr = remoteCache[id].slice();
      while (arr.length < numChoices) arr.push(0);
      return arr;
    }
    const weights = [];
    let wsum = 0;
    for (let i = 0; i < numChoices; i++) {
      const w = optionWeight(charId, nodeId, i);
      weights.push(w); wsum += w;
    }
    const base = seedTotal(charId, nodeId);
    return weights.map(w => Math.round(base * w / wsum));
  }

  /* ---------- 公开 API ---------- */

  /** 记录一次选择：本地累计 + 异步上报远端 */
  function record(charId, nodeId, choiceIndex) {
    const db = loadDB();
    const k = nodeKey(charId, nodeId);
    if (!db[k]) db[k] = {};
    db[k][choiceIndex] = (db[k][choiceIndex] || 0) + 1;
    saveDB(db);
    pushRemote(charId, nodeId, choiceIndex);
  }

  /**
   * 计算某节点的统计（合并远端真实聚合 + 本地选择）
   * @returns {{total:number, topIndex:number, perOption:Array<{count:number,pct:number}>}}
   */
  function statsFor(charId, nodeId, numChoices) {
    const db = loadDB();
    const local = (db[nodeKey(charId, nodeId)] || {});
    const base = baseCountsFor(charId, nodeId, numChoices);

    const perOption = [];
    let total = 0, top = -1, topIndex = 0;
    for (let i = 0; i < numChoices; i++) {
      const count = (base[i] || 0) + (local[i] || 0);
      total += count;
      perOption.push({ count, pct: 0 });
      if (count > top) { top = count; topIndex = i; }
    }
    perOption.forEach(o => { o.pct = total ? Math.round(o.count / total * 100) : 0; });
    return { total, topIndex, perOption };
  }

  global.ChoiceStats = { record, statsFor, configure };
})(window);
