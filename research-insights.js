/* Curated research brief, not a simulated live search or model result. */
(function(root){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}};
  let brief=null,error=false;
  function render(rows,filters){
    if(!brief)return '<p role="status">'+(error?'研究样本加载失败，请刷新重试。':'正在加载证据与判断……')+'</p>';
    const sleep=filters.theme.trim()==='睡眠';
    const ids=new Set(rows.map(r=>r.id));
    const conclusions=sleep?brief.insights.filter(i=>i.evidence_ids.filter(id=>ids.has(id)).length>=2):[];
    const deep=sleep?brief.deep_cases.filter(c=>ids.has(c.case_id)):[];
    const link=r=>safe(r.url)?`<a href="${esc(safe(r.url))}" target="_blank" rel="noopener noreferrer">${esc(r.brand)} · ${esc(r.title||r.label)} ↗</a>`:'';
    return `<section class="research-findings"><small>研究样本 · ${esc(brief.reviewed_at)}</small><h2>${sleep?esc(brief.title):'这个专题尚未完成证据研究'}</h2>
      <p>${sleep?esc(brief.question):'下方只筛选已收录资料；不会把睡眠样本的判断套用到其他主题。可按下面的工作流建立新专题。'}</p>
      ${sleep?`<p class="research-limits">${esc(brief.status)}。研究窗口：${esc(brief.window)}。</p><details><summary>研究前提与覆盖缺口</summary><p>${esc(brief.assumptions)}</p><p>${esc(brief.coverage)}</p></details>`:''}
      <div class="research-findings-grid">${conclusions.map(i=>`<article><small>分析判断 · 待业务验证</small><h3>${esc(i.title)}</h3><p>${esc(i.direction)}</p><details><summary>为什么这样判断 · 证据与反例</summary><p>${esc(i.reasoning)}</p><div class="research-evidence-links">${rows.filter(r=>i.evidence_ids.includes(r.id)).map(link).join('')}</div><h4>成立条件</h4><p>${esc(i.conditions)}</p><h4>最强反例</h4><p>${esc(i.counter)}</p><h4>如何验证</h4><p>${esc(i.test)}</p></details></article>`).join('')}</div>
      ${sleep&&!conclusions.length?'<p>当前筛选下支持证据不足，暂不展示策划判断。可查看完整两年样本；少量匹配不代表市场没有案例。</p>':''}
      ${deep.length?`<details class="research-deep"><summary>查看 ${deep.length} 个重点案例的闭环与迁移边界</summary>${deep.map(c=>`<article><h3>${esc(c.title)}</h3><h4>来源事实</h4><p>${esc(c.facts)}</p><h4>链路与缺口</h4><p>${esc(c.loop)}</p><h4>分析判断</h4><p>${esc(c.interpretation)}</p><h4>可迁移／不可复制</h4><p>${esc(c.transfer)}</p><h4>尚未知道</h4><p>${esc(c.unknown)}</p>${c.sources.map(s=>`<p>${link({...s,brand:s.label,title:s.type})}</p>`).join('')}</article>`).join('')}</details>`:''}
      <details><summary>后续专题复用的研究工作流</summary><ol>${brief.workflow.map(w=>`<li>${esc(w)}</li>`).join('')}</ol><p>这是人工研究工作流，不是已经接通的全网检索或自动生成能力。</p></details></section>`;
  }
  function markdown(rows,filters){
    if(!brief)return '\n研究样本尚未加载，请稍后重新导出。\n';
    const ids=new Set(rows.map(r=>r.id));
    const insights=filters.theme.trim()==='睡眠'?brief.insights.filter(i=>i.evidence_ids.filter(id=>ids.has(id)).length>=2):[];
    return '\n## 研究前提\n'+(filters.theme.trim()==='睡眠'?brief.question+'\n'+brief.status+'\n'+brief.assumptions+'\n覆盖缺口：'+brief.coverage:'当前主题尚未完成证据研究。')+'\n'+insights.map(i=>'\n## 暂时判断：'+i.title+'\n\n候选方向：'+i.direction+'\n推导：'+i.reasoning+'\n条件：'+i.conditions+'\n反例：'+i.counter+'\n验证：'+i.test+'\n证据：\n'+rows.filter(r=>i.evidence_ids.includes(r.id)).map(r=>'- '+r.title+' '+safe(r.url)).join('\n')).join('\n')+'\n\n## 复用工作流\n'+brief.workflow.map((w,i)=>(i+1)+'. '+w).join('\n')+'\n';
  }
  root.MONTHLY_RESEARCH_INSIGHTS={render,markdown};
  fetch('config/sleep-research.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(b=>{brief=b;root.dispatchEvent(new Event('research-brief-ready'));}).catch(()=>{error=true;root.dispatchEvent(new Event('research-brief-ready'));});
})(window);
