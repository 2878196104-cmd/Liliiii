window.monthlyMarketingSummary = {
  period: '2026.08.20—09.18',
  title: '品质、舒适与生活方式，正在形成不同的品牌叙事',
  lead: '本期家居样本呈现三种竞争路径：用材料与系列解释品质，用功能与技术定义舒适，用生活故事赋予品类意义。关注点是品牌想建立什么认知，而非活动数量。',
  findings:[
    {title:'品质表达逐步具体化',text:'源氏以黑标和专业展区细化实木品质；慕思以T12技术解释睡眠。品质议题被拆成材料、结构与研发等更具体的证明。'},
    {title:'同一品类可以有不同主题',text:'睡眠既可围绕技术支撑展开，也可围绕日常休息讲故事。慕思与亚朵分别采用功能解释和生活叙事，表达重心不同。'},
    {title:'跨品类扩展需要共同主张',text:'源氏将实木延展至睡眠与定制；顾家由功能单品连接整家配套。产品范围扩大后，品牌如何保持清晰认知值得关注。'}
  ],
  brandReadings:[
    {brand:'源氏木语',theme:'以实木品质支撑生活方式延展',evidence:'黑标、睡眠与定制在展会中分别展示。',reading:'以材料认知为起点，扩展更完整的居住方案；高端系列让品质叙事出现层次。'},
    {brand:'顾家家居',theme:'以功能舒适连接单品与整家',evidence:'松果沙发突出动态腰靠；装企交流呈现整家配套。',reading:'功能单品提供容易感知的舒适理由，整家业务扩大品牌的解决方案范围。'},
    {brand:'慕思',theme:'以AI技术强化睡眠专业性',evidence:'T12围绕分区支撑、本地运算与交互展开。',reading:'传播把研发能力放到前台，争取智能睡眠的专业认知；技术主张不等于已证明用户认可。'},
    {brand:'亚朵星球',theme:'以生活故事表达休息的价值',evidence:'「睡觉第一名」广告片将产品置于日常生活。',reading:'从生活态度进入睡眠议题，与技术叙事形成参照；情感主题尚不能直接说明购买动机。'}
  ],
  outlook:'对林氏的战略讨论：以「适居」统摄丰富品类，还是优先建立某一优势品类认知？品质应如何支撑这条主线，而不成为另一个并列口号？重点是认知取舍与长期一致性。',
  exportFile:'exports/Monthly-Note_营销策略总结_2026-09_B.pptx',
  rows: [
    {title:'品牌与创意：从生活问题切入', evidence:'亚朵以「睡觉第一名」广告片讲日常休息；顾家以松果沙发演示动态腰靠；林氏展馆呈现四个1:1真实户型。', judgment:'竞品采用不同方式，把产品放进可理解的生活情境。传播方式的丰富，不等于已证明购买转化。', action:'围绕小客厅、家庭共用空间、睡前休息制作场景短片。先展示一个具体困扰，再展示林氏方案；每条只讲一个解决点。', material:'户型前后对照短片＋场景KV＋整屋清单', test:'比较场景版与参数版的有效产品咨询率'},
    {title:'产品与品质：说明选择差异', evidence:'源氏展示黑标、睡眠与定制；顾家演示功能沙发；慕思T12突出分区支撑与本地运算。源氏评论样本出现系列差异、色系与规格追问。', judgment:'功能和系列增加后，解释「适合谁、差在哪」值得优先测试。评论提示具体疑问，尚不足以确认普遍购买动机。', action:'为林氏重点套系做选择指南：户型、家庭使用者、尺寸、材质、预算区间。用结构实拍和统一条件演示支撑品质表达，不直接借用竞品技术主张。', material:'系列对比卡＋材质档案＋尺寸与色系组合图', test:'测试差异理解度、组合咨询率和重复疑问量'},
    {title:'门店、电商与社媒：用同一方案承接', evidence:'林氏「适·居」展馆连接实景、直播与整家；源氏以展会与门店活动承接体验；顾家联合装企交流整家配套。', judgment:'本期样本呈现跨触点的配合动作，未提供可比较的成交效果。林氏可测试同一方案贯穿传播与咨询是否更有效。', action:'选择一家门店试点户型诊断活动；电商页同步完整清单和权益。官号发布场景内容、功能演示、到店问答，统一链接到预约或产品页。', material:'活动招募海报＋体验任务卡＋直播切片＋预约页', test:'追踪预约到店率、有效方案咨询及后续订单'}
  ],
  priority:'先做一个真实户型的整屋选择指南，再配一场门店体验与一组社媒内容；用两周试点验证，不先扩大投放。',
  scope:'基于本期公开报道与官方内容的策略解读；所述心智为品牌表达方向，不代表消费者已形成同等认知，也不代表行业全貌。',
  sources:[
    ['林氏「适·居」展会报道','https://news.sina.com.cn/sx/2026-09-08/detail-inirayqy4699478.shtml'],
    ['顾家松果沙发官方笔记','https://www.xiaohongshu.com/explore/6aaaa3fb00000000260321c1'],
    ['亚朵「睡觉第一名」案例','https://socialbeta.com/campaign/28300'],
    ['慕思T12官方发布','https://www.derucci.com/news/info.html?id=1637'],
    ['源氏黑标官方笔记','https://www.xiaohongshu.com/explore/6a882d85000000002b003924']
  ]
};
if(typeof document!=='undefined') {
  const d=window.monthlyMarketingSummary, host=document.querySelector('#page-compare');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const section=document.createElement('section');section.className='marketing-output';
  section.innerHTML='<header class="output-toolbar"><div><small>Monthly Note · '+d.period+'</small><h2>结论证据（输出层）</h2></div><span class="output-preview-label">营销策略与品类心智 · 一页总结</span></header><article class="strategy-b-slide"><h1>'+esc(d.title)+'</h1><p class="strategy-b-lead">'+esc(d.lead)+'</p><div class="strategy-b-layout"><aside class="strategy-b-judgments"><h3>本期竞争观察</h3>'+d.findings.map((f,i)=>'<section><small>0'+(i+1)+'</small><h4>'+esc(f.title)+'</h4><p>'+esc(f.text)+'</p></section>').join('')+'</aside><section class="strategy-b-brands"><h3>竞品主题与认知方向</h3>'+d.brandReadings.map(r=>'<article><div class="strategy-b-brand"><strong>'+esc(r.brand)+'</strong><span>'+esc(r.theme)+'</span></div><p>'+esc(r.reading)+'</p><small><b>动作依据：</b>'+esc(r.evidence)+'</small></article>').join('')+'</section></div><footer class="strategy-b-outlook"><strong>林氏视角 · 战略讨论</strong><p>'+esc(d.outlook.replace('对林氏的战略讨论：',''))+'</p></footer><p class="strategy-b-scope">'+esc(d.scope)+'</p></article><details class="output-sources"><summary>支撑来源 · '+d.sources.length+'项</summary>'+d.sources.map(([n,u])=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(u)+'">'+esc(n)+' ↗</a>').join('')+'</details><footer class="output-download-bar"><span>当前内容按 B 版式导出 · 一页可编辑 PPT</span><div><button class="strategy-ppt-preview">查看 PPT 预览</button> <a class="output-export" href="'+esc(d.exportFile)+'" download>按模板导出 PPT ↓</a></div></footer><dialog class="output-preview-dialog"><button class="output-preview-close" aria-label="关闭预览">关闭 ×</button><img src="assets/marketing-summary-B-preview.png" alt="'+esc(d.title)+' 完整PPT预览"></dialog>';
  host.append(section);
  const dialog=section.querySelector('.output-preview-dialog');
  section.querySelector('.strategy-ppt-preview').onclick=()=>dialog.showModal();
  section.querySelector('.output-preview-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close();});
}
