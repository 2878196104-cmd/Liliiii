/* A separate research pool. Public seeds are source-checked summaries, not Jev results. */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
  const taskLabels = {all:'全部任务',launch:'新品发布',seasonal:'节点 / 品牌节',brand:'品牌表达',experience:'线下体验',education:'用户教育',conversion:'渠道转化'};
  const filters = {theme:'睡眠', product:'all', scope:'category', task:'all', years:'2'};
  let seeds = [], loadError = '', host, liveEvents = [], selected = [], notes = '', strategy = {}, saved = true;
  const storageKey = () => 'monthly-note:research:v1:' + filters.theme.trim().toLowerCase();
  function restore() {
    try { const data = JSON.parse(localStorage.getItem(storageKey()) || '{}'); selected = Array.isArray(data.selected) ? data.selected : []; notes = String(data.notes || ''); strategy = window.MONTHLY_RESEARCH_STRATEGY.normalize(data.strategy); }
    catch { selected = []; notes = ''; strategy = {}; }
  }
  function save() {
    try { localStorage.setItem(storageKey(), JSON.stringify({selected, notes, strategy, updatedAt:new Date().toISOString()})); saved = true; }
    catch { saved = false; }
  }
  restore();
  const productsOf = text => ['床垫','枕头','家纺','智能床'].filter(p => (p==='家纺'?/家纺|床品|被子|深睡被/:new RegExp(p)).test(text));
  function records() {
    const rows = [...seeds, ...liveEvents.filter(e => e.pool === 'research' || e.pool === 'both').map(e => {
      const text = [e.event,e.theme,e.result,e.productStrategy,...(e.actions || [])].join(' ');
      const products = productsOf(text);
      return {id:e.id, date:e.date, date_basis:'资料归档日期', brand:e.brand, title:e.event, summary:e.result,
        products:products.length?products:['跨界'], scope:products.length?'category':'cross',
        tasks:[/新品|发布|上市/.test(text)?'launch':/睡眠日|节日|大促|品牌节/.test(text)?'seasonal':'brand'],
        kind:products.length?'reference':'inspiration', url:e.sourceUrl, source:e.source,
        idea:e.coreStrategy, limits:'后台人工发布资料；借鉴判断仍需结合原文核验。', tags:[e.theme,e.type].filter(Boolean)};
    })];
    const urls = new Set();
    return rows.filter(r => { const key = safeUrl(r.url) || r.id; if(urls.has(key))return false; urls.add(key);return true; });
  }
  function matches(row) {
    const today = new Date(); const cutoff = new Date(today); cutoff.setFullYear(today.getFullYear()-Number(filters.years));
    const date = new Date(row.date + 'T00:00:00');
    if(!Number.isFinite(date.getTime()) || date>today || date<cutoff)return false;
    const theme = filters.theme.trim().toLowerCase();
    const terms = theme.split(/[\s，、,]+/).filter(Boolean);
    const text = [row.title,row.brand,row.summary,...(row.tags||[]),...(row.products||[])].join(' ').toLowerCase();
    return terms.every(term=>term==='睡眠'?/睡眠|深睡|床垫|枕头|寝具|家纺|床品|智能床|试睡/.test(text):text.includes(term)) && (filters.product==='all'||row.products.includes(filters.product))
      && (filters.scope==='all'||row.scope===filters.scope) && (filters.task==='all'||row.tasks.includes(filters.task));
  }
  const options = (items, value) => Object.entries(items).map(([key,label])=>`<option value="${escape(key)}" ${key===value?'selected':''}>${escape(label)}</option>`).join('');
  function card(row, inspiration) {
    const chosen = selected.some(s=>s.id===row.id);
    const url = safeUrl(row.url);
    return `<article class="research-card ${inspiration?'inspiration-note':''}"><small>${escape(row.brand)} · ${escape(row.date)}</small>
      <h3>${escape(row.title)}</h3><p>${escape(row.summary)}</p><div class="research-tags">${row.products.map(p=>`<span>${escape(p)}</span>`).join('')}${row.tasks.map(t=>`<span>${escape(taskLabels[t]||t)}</span>`).join('')}</div>
      <details><summary>借鉴线索与边界</summary><p>${escape(row.idea||'仍需提炼')}</p><p class="research-limits">${escape(row.limits)}</p></details>
      <footer>${url?`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(row.source)} · 原文</a>`:'<span>原文待补充</span>'}<button data-select-research="${escape(row.id)}" aria-pressed="${chosen}">${chosen?'已选 · 移除':'加入方案线索'}</button></footer><small class="research-date-basis">${escape(row.date_basis)}</small></article>`;
  }
  function synthesis() {
    const groups = [
      ['launch','新品如何被解释'],['seasonal','节点如何成为参与理由'],['brand','如何形成统一主题'],['experience','如何变成体验'],['education','用什么证据支撑'],['conversion','如何连接购买']
    ].map(([task,label])=>({label,rows:selected.filter(s=>(s.tasks||[]).includes(task))})).filter(g=>g.rows.length);
    return `<section class="research-synthesis" id="researchSynthesis"><div class="research-section-title"><div><small>03 / 方案线索</small><h2>让选中的材料发生联系</h2></div><span>${selected.length} 条已选</span></div>
      <p>这里是你的工作草稿，不是已经验证的策略结论。筛选变化不会清空已选材料。</p>
      ${window.MONTHLY_RESEARCH_STRATEGY.render(strategy)}
      <div class="research-selected">${selected.map(s=>`<div><span>${escape(s.brand)} · ${escape(s.title)}</span><button data-remove-research="${escape(s.id)}" aria-label="移除 ${escape(s.title)}">移除</button></div>`).join('')||'<p>从参考资料或灵感墙加入材料，就会按营销任务聚合在这里。</p>'}</div>
      <div class="research-connections">${groups.map(g=>`<article><h3>${escape(g.label)}</h3>${g.rows.map(s=>`<p>${escape(s.idea||s.title)}</p>`).join('')}</article>`).join('')}</div>
      <label for="researchNotes">自己的想法 / 待验证问题</label><textarea id="researchNotes" placeholder="例如：用睡前仪式做统一主题；床垫负责试睡体验，枕头和床品负责低门槛参与。还需要核验哪些执行条件？">${escape(notes)}</textarea>
      <footer><span id="researchSaveState">${saved?'草稿只保存在当前浏览器，不跨设备同步':'当前浏览器无法保存；请导出草稿'}</span><button data-export-research>导出研究草稿</button></footer></section>`;
  }
  function render(target, events) {
    host = target; liveEvents = window.MONTHLY_RESEARCH_EVENTS || events || [];
    const visible = records().filter(matches).sort((a,b)=>b.date.localeCompare(a.date));
    const references = visible.filter(r=>r.kind!=='inspiration'), inspirations = visible.filter(r=>r.kind==='inspiration');
    host.innerHTML = `<div class="research-heading"><small>PROJECT RESEARCH</small><h2>专题研究</h2><p>为这一次方案搜集材料，而不是再读一份月报。</p></div>
      <form class="research-brief"><label>研究主题<input name="theme" aria-label="研究主题" value="${escape(filters.theme)}" placeholder="睡眠 / 品牌日 / 门店体验"></label>
      <label>产品品类<select name="product">${options({all:'全部品类',床垫:'床垫',枕头:'枕头',家纺:'家纺 / 床品',智能床:'智能床'},filters.product)}</select></label>
      <label>参考关系<select name="scope">${options({all:'品类案例 + 跨界灵感',category:'品类案例',cross:'跨界灵感'},filters.scope)}</select></label>
      <label>营销任务<select name="task">${options(taskLabels,filters.task)}</select></label>
      <label>时间范围<select name="years">${options({'2':'近两年','1':'近一年'},filters.years)}</select></label><button type="submit">更新研究</button></form>
      <div class="research-result-count" role="status">${loadError?escape(loadError):`库内匹配 ${visible.length} 条 · ${references.length} 条参考资料 · ${inspirations.length} 条灵感（不是全网结果）`}<a href="#researchSynthesis">查看方案线索 (${selected.length})</a></div>
      ${window.MONTHLY_RESEARCH_INSIGHTS?window.MONTHLY_RESEARCH_INSIGHTS.render(visible,filters):''}
      <details class="research-materials"><summary>证据资料 · 产品、节点与品牌动作（${references.length} 条）</summary><div class="research-reference-grid">${references.map(r=>card(r,false)).join('')||'<p class="research-empty">暂无匹配的已收录资料。可放宽任务或范围；不会用无关案例填满结果。</p>'}</div></details>
      <section class="research-inspiration-section"><div class="research-section-title"><div><small>02 / 灵感墙</small><h2>一些可以借走的表达</h2></div><span>${inspirations.length} 条</span></div><div class="research-inspiration-wall">${inspirations.map(r=>card(r,true)).join('')||'<p class="research-empty">当前范围没有跨界灵感。选择“品类 + 跨界”或“跨界灵感”查看。</p>'}</div></section>${synthesis()}
      <p class="research-footnote">首批资料为人工核对来源的摘要，不是 Jev 自动判断结果。日期为报道日期时已单独注明。筛选仅检索已收录资料，不代表实时搜索整个互联网。</p>`;
    host.querySelector('form').onsubmit = event => {
      event.preventDefault(); const form = new FormData(event.target); const previous = storageKey();
      Object.keys(filters).forEach(key=>filters[key]=String(form.get(key)||''));
      if(storageKey()!==previous)restore(); render(host,liveEvents);
    };
    host.querySelectorAll('select').forEach(select=>select.onchange=()=>host.querySelector('form').requestSubmit());
    host.querySelectorAll('[data-select-research]').forEach(button=>button.onclick=()=>{
      const id = button.dataset.selectResearch; const row = visible.find(r=>r.id===id);
      if(selected.some(s=>s.id===id)) selected=selected.filter(s=>s.id!==id); else if(row)selected.push(row);
      save(); render(host,liveEvents);
    });
    host.querySelectorAll('[data-remove-research]').forEach(button=>button.onclick=()=>{selected=selected.filter(s=>s.id!==button.dataset.removeResearch);save();render(host,liveEvents);});
    const saveState = () => {save();host.querySelector('#researchSaveState').textContent=saved?'草稿已保存在当前浏览器':'保存失败，请导出草稿';};
    host.querySelector('#researchNotes').oninput = event => {notes=event.target.value;saveState();};
    host.querySelectorAll('[data-strategy-field]').forEach(input=>input.oninput=event=>{strategy[event.target.dataset.strategyField]=event.target.value;saveState();});
    host.querySelector('[data-export-research]').onclick = () => {
      const content = `# ${filters.theme||'专题'}研究草稿\n\n研究范围：${filters.product}；任务：${taskLabels[filters.task]}；近${filters.years}年\n\n` + window.MONTHLY_RESEARCH_STRATEGY.markdown(strategy) + (window.MONTHLY_RESEARCH_INSIGHTS?.markdown(visible,filters)||'') + selected.map(s=>`## ${s.title}\n${s.brand} · ${s.date} · ${s.date_basis||''}\n\n来源事实：${s.summary}\n\n借鉴（待验证）：${s.idea||''}\n\n边界：${s.limits||''}\n\n原文：${safeUrl(s.url)}\n`).join('\n')+`\n## 自己的想法\n${notes}\n`;
      const url = URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
      const a = document.createElement('a');a.href=url;a.download='专题研究草稿.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }
  fetch('config/research-cases.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('资料加载失败');return r.json();}).then(cases=>{
    seeds=cases;if(host?.isConnected&&document.querySelector('[data-page="research"]')?.getAttribute('aria-selected')==='true')render(host,liveEvents);
  }).catch(()=>{loadError='专题资料加载失败，请刷新后重试';if(host?.isConnected)render(host,liveEvents);});
  window.MONTHLY_RESEARCH={render};
  window.addEventListener('research-brief-ready',()=>{if(host?.isConnected&&document.querySelector('[data-page="research"]')?.getAttribute('aria-selected')==='true')render(host,liveEvents);});
})();
