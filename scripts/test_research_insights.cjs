const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const rows=JSON.parse(fs.readFileSync('config/research-cases.json','utf8'));
const brief=JSON.parse(fs.readFileSync('config/sleep-research.json','utf8'));
assert.equal(rows.length,16);assert.equal(new Set(rows.map(r=>r.id)).size,16);
for(const i of brief.insights){assert.ok(i.evidence_ids.length>=2);for(const id of i.evidence_ids)assert.ok(rows.some(r=>r.id===id));for(const k of ['reasoning','conditions','counter','test'])assert.ok(i[k]);}
const ctx={window:{dispatchEvent(){}},Event:class{},URL,fetch:async()=>({ok:true,json:async()=>brief})};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('research-insights.js','utf8'),ctx);
setImmediate(()=>{const render=ctx.window.MONTHLY_RESEARCH_INSIGHTS.render;
 const html=render(rows,{theme:'睡眠'});assert.ok(html.includes('最强反例'));assert.ok(html.includes('尚未知道'));assert.equal((html.match(/分析判断 · 待业务验证/g)||[]).length,3);
 assert.ok(!render(rows,{theme:'露营'}).includes('把今晚还给自己'));assert.ok(render([],{theme:'睡眠'}).includes('支持证据不足'));
 assert.ok(ctx.window.MONTHLY_RESEARCH_INSIGHTS.markdown(rows,{theme:'睡眠'}).includes('反例：'));
 assert.ok(!ctx.window.MONTHLY_RESEARCH_INSIGHTS.markdown(rows,{theme:'露营'}).includes('把今晚还给自己'));
 assert.ok(!render(rows.filter(r=>r.id==='sleep-jd-24358'),{theme:'睡眠'}).includes('分析判断 · 待业务验证'));
 console.log('Research brief: 16 unique cases, 3 evidenced hypotheses, 2 deep cases; topic and evidence gates passed.');
});
