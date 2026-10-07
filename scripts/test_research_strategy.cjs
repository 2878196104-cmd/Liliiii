const assert=require('node:assert/strict'),s=require('../research-strategy');
assert.deepEqual(s.normalize(),{problem:'',proof:'',choice:'',action:''});
assert.equal(s.normalize({problem:'问题',proof:123}).proof,'');
const value={problem:'仅解决选型',proof:'高度可调整',choice:'主张\n不选其他方向',action:'预约；仍需验证'};
assert.deepEqual(s.normalize(JSON.parse(JSON.stringify(value))),value);
const html=s.render(value);assert.equal((html.match(/data-strategy-field=/g)||[]).length,4);
for(const f of s.fields){assert.ok(html.includes('href="#strategy-'+f.key+'"'));assert.ok(html.includes('id="strategy-'+f.key+'"'));assert.ok(s.markdown(value).includes(value[f.key]));}
assert.ok(s.render({problem:'</textarea><script>alert(1)</script>'}).includes('&lt;/textarea&gt;'));
assert.ok(!s.render({problem:'</textarea><script>alert(1)</script>'}).includes('<script>'));
assert.equal((s.markdown({}).match(/待填写/g)||[]).length,4);
console.log('Strategy: four anchors, empty defaults, safe rendering, persistence shape and export passed.');
