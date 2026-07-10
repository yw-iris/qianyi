/* ============================================================
 *  千载一瞬 · 选项匿名统计（纯前端 · 无后端）
 *  - 真实本地选择：localStorage 累计
 *  - 基线人气：以角色+节点+选项为种子的确定性伪随机，
 *    让首次访问也拥有"看起来真实"的百分比与总人次
 *  - 展示文案："X% 的人在这里选择了此项" / "已有 N 人在此抉择"
 * ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'qy_choicestats_v1';

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

  /* 该节点的"历史总人次"基线：380 ~ 4600，像真实流量 */
  function seedTotal(charId, nodeId) {
    return Math.floor(380 + hash(charId + '|' + nodeId + '|T') * 4220);
  }
  /* 单个选项的权重：0.22 ~ 1.18，保证各选项比例有差异 */
  function optionWeight(charId, nodeId, idx) {
    return 0.22 + hash(charId + '|' + nodeId + '|o' + idx) * 0.96;
  }

  /* ---------- 公开 API ---------- */

  /** 记录一次本地选择（在用户点击选项时调用）*/
  function record(charId, nodeId, choiceIndex) {
    const db = loadDB();
    const k = nodeKey(charId, nodeId);
    if (!db[k]) db[k] = {};
    db[k][choiceIndex] = (db[k][choiceIndex] || 0) + 1;
    saveDB(db);
  }

  /**
   * 计算某节点的统计
   * @returns {{total:number, topIndex:number, perOption:Array<{count:number,pct:number}>}}
   */
  function statsFor(charId, nodeId, numChoices) {
    const db = loadDB();
    const local = (db[nodeKey(charId, nodeId)] || {});

    const weights = [];
    let wsum = 0;
    for (let i = 0; i < numChoices; i++) {
      const w = optionWeight(charId, nodeId, i);
      weights.push(w); wsum += w;
    }
    const base = seedTotal(charId, nodeId);

    const perOption = [];
    let total = 0, top = -1, topIndex = 0;
    for (let i = 0; i < numChoices; i++) {
      const seeded = Math.round(base * weights[i] / wsum);
      const count = seeded + (local[i] || 0);
      total += count;
      perOption.push({ count, pct: 0 });
      if (count > top) { top = count; topIndex = i; }
    }
    perOption.forEach(o => { o.pct = total ? Math.round(o.count / total * 100) : 0; });
    return { total, topIndex, perOption };
  }

  global.ChoiceStats = { record, statsFor };
})(window);
