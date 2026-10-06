(() => {
  const host=document.getElementById('unifiedSourceLibrary');if(!host)return;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let entries=[],query='',type='all';
  host.innerHTML='<p role="status">正在加载信息源……</p>';
  function cards(){
    const rows=entries.filter(s=>(type==='all'||(type==='accounts'?s.account:type==='creators'?s.platform==='创作者':!s.account&&s.platform!=='创作者'))&&[s.name,s.host,s.platform,...s.focuses].join(' ').toLowerCase().includes(query.toLowerCase()));
    host.querySelector('[data-source-count]').textContent=rows.length+' / '+entries.length+' 个独立网站或账号';
    host.querySelector('[data-source-cards]').innerHTML=rows.length?rows.map(s=>`<article class="registry-card"><small>${escape(s.platform||'网站')}</small><h3>${escape(s.name)}</h3><div class="registry-address">${escape(s.account?s.url.replace('https://',''):s.host)}</div><p>${escape(s.focuses.join('；')||'品牌与行业参考资料')}</p>${s.note?`<p class="registry-note">${escape(s.note)}</p>`:''}<footer><span>${s.members.some(m=>m.mode==='html')?'已配置采集 · 状态见后台':'人工查看入口'}</span><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a></footer></article>`).join(''):'<p class="registry-empty">没有匹配的来源，请换一个关键词。</p>';
  }
  Promise.all(['sources','research-sources','expanded-sources'].map(name=>fetch('config/'+name+'.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error(name);return r.json();}))).then(([base,research,extra])=>{
    entries=MONTHLY_SOURCES.group([...base,...research,...MONTHLY_SOURCES.expandDefaults(extra)]);
    host.innerHTML='<div class="registry-toolbar"><label>查找来源<input type="search" placeholder="网站、账号或关键词，如睡眠" aria-label="查找信息源"></label><label>来源类型<select aria-label="来源类型"><option value="all">全部来源</option><option value="websites">网站</option><option value="accounts">社媒账号</option><option value="creators">创作者 / 评测</option></select></label><span data-source-count aria-live="polite"></span></div><p class="registry-intro">按网站或账号归档，同一网站的专题子页合并展示。来源可同时服务月度竞品和专题研究；登记入口不代表已经采集成功。</p><div class="registry-grid" data-source-cards></div>';
    host.querySelector('input').addEventListener('input',e=>{query=e.target.value.trim();cards();});
    host.querySelector('select').addEventListener('change',e=>{type=e.target.value;cards();});cards();
  }).catch(()=>{host.innerHTML='<p role="alert">信息源加载失败，请刷新重试。</p>';});
})();
