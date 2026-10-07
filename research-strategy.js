/* User-authored decisions; never fill brand facts from reference cases. */
(function(root){
  const fields=[
    {key:'problem',short:'一个问题',title:'这次只解决一个什么问题。',hint:'写清目标人群、具体生活场景，以及这次不解决什么。'},
    {key:'proof',short:'核心证据',title:'用哪项产品或服务能力作为核心证据。',hint:'写本品牌真实可证明的能力和出处；竞品案例只能作参考，不能替代本品牌证据。'},
    {key:'choice',short:'主张与取舍',title:'选择什么主张，以及为什么不选其他方向。',hint:'写一句主张、支持理由，以及被放弃的方向和原因。'},
    {key:'action',short:'行动与验证',title:'让用户做什么具体行动，还有什么尚待验证。',hint:'写下一步行动、承接渠道、验证方式与未确认的条件。'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function normalize(value){return Object.fromEntries(fields.map(f=>[f.key,typeof value?.[f.key]==='string'?value[f.key]:'']));}
  function render(value){const draft=normalize(value);return `<div class="strategy-choice"><h3>本品牌策略选择</h3><p>用以下四项收拢判断。这里是你填写的策略草稿，不是自动生成的结论。</p><nav class="strategy-index" aria-label="策略选择索引">${fields.map((f,i)=>`<a href="#strategy-${f.key}">${i+1}. ${esc(f.short)}</a>`).join('')}</nav><div class="strategy-fields">${fields.map((f,i)=>`<section id="strategy-${f.key}" class="strategy-field"><label for="strategy-input-${f.key}">${i+1}. ${esc(f.title)}</label><p id="strategy-help-${f.key}">${esc(f.hint)}</p><textarea id="strategy-input-${f.key}" data-strategy-field="${f.key}" aria-describedby="strategy-help-${f.key}" rows="3" placeholder="待填写">${esc(draft[f.key])}</textarea></section>`).join('')}</div></div>`;}
  function markdown(value){const draft=normalize(value);return '\n## 本品牌策略选择（用户草稿）\n'+fields.map((f,i)=>'\n### '+(i+1)+'. '+f.title+'\n'+(draft[f.key].trim()||'待填写')+'\n').join('');}
  const api={fields,normalize,render,markdown};root.MONTHLY_RESEARCH_STRATEGY=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
