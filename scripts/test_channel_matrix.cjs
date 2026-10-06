const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dashboard-mvp.js','utf8');
const fragment=source.slice(source.indexOf('  const channelGroups='),source.indexOf('  const placements='));
const context={safe:value=>String(value??''),state:{meta:{competitors:[]}},corpus:[]};
vm.createContext(context);vm.runInContext(fragment+'\nthis.test={primaryChannel,renderChannelMatrix};',context);
const rows=[
  {brand:'源氏木语',date:'2026-09-08',event:'上海双展：新实木主义产品矩阵扩容',type:'品牌升级',channels:['展会','小红书'],actions:[]},
  {brand:'顾家家居',date:'2026-09-09',event:'松果沙发：新品秋季私享会',type:'新品私享会',channels:['门店','社媒'],actions:[]},
  {brand:'顾家家居',date:'2026-09-10',event:'京东闪电新品季：平台首发',type:'电商平台 IP',channels:['京东','社媒','发布会'],actions:[]},
  {brand:'亚朵星球',date:'2026-09-11',event:'睡觉第一名广告片',type:'广告片',channels:['微博'],actions:[]},
  {brand:'待确认',date:'2026-09-12',event:'年度事项',type:'其他',channels:[],actions:[]}
];
assert.deepEqual(rows.map(row=>context.test.primaryChannel(row)),['retail','retail','ecommerce','social',null]);
const rendered=context.test.renderChannelMatrix([...rows,structuredClone(rows[0])],[...new Set(rows.map(row=>row.brand))]);
assert.equal((rendered.match(/class="matrix-event"/g)||[]).length,5);
rows.forEach(row=>assert.equal(rendered.split('data-matrix-event="'+row.event+'"').length-1,1));
assert.ok(rendered.includes('联动：社媒传播'));
assert.ok(rendered.includes('主要渠道待确认'));
assert.ok(rendered.includes('5 个案例'));
console.log('Passed: single placement, exact duplicate suppression, linked channels, unclassified preservation, unique counts.');
