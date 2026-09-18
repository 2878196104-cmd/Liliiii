/* Monthly Note: strict three-page information architecture. */
(() => {
  document.title='Monthly Note';
  document.querySelector('#page-title').textContent='Monthly Note';
  document.querySelector('.eyebrow').textContent='MONTHLY NOTE';
  document.querySelector('.subhead').remove();
  document.querySelector('.coverage-note')?.remove();
  const labels={home:'行业趋势',intelligence:'竞品动作',compare:'结论证据（输出层）',sources:'信息源库'};
  if(location.protocol==='file:'){const localSources=document.createElement('script');localSources.src='local-internal-sources.js';document.head.append(localSources);}
  Object.entries(labels).forEach(([key,label])=>document.querySelector('[data-page="'+key+'"]').textContent=label);
  document.querySelector('[data-page="case"]').hidden=true;
  document.querySelector('[data-page="strategy"]').hidden=true;
  document.querySelectorAll('.grid-kpi').forEach(el=>el.classList.add('retired-module'));
  const home=document.querySelector('#page-home');
  home.querySelector('.trend-panel').classList.add('retired-module');
  home.querySelector('.cloud-panel .section-index').textContent='01 / 公开网站 · 家居行业';
  home.querySelector('.cloud-panel .panel-title').textContent='关键词速览';
  home.querySelector('.cloud-panel .pill').textContent='概念 · 新质 · 措施 · 高频话题';
  home.querySelector('#keywordExplain').textContent='统计公开网站中家居行业反复提及的概念、新质与采取的措施。按有效文章提及频次观察，不等同于搜索量或全平台热度。';
  // Existing mixed-platform keyword weights do not meet the newly defined corpus.
  const oldCloud=home.querySelector('#keywordCloud');oldCloud.classList.add('retired-module');
  const cloud=document.createElement('div');cloud.className='monthly-keywords-pending';
  oldCloud.after(cloud);
  const corpus=[
    {date:'2026-09-08',source:'乐居财经',title:'探展CIFF上海：设计、数智、可持续',url:'https://www.lejucaijing.com/news-7502978883970070340.html',topics:['智能睡眠','原创设计','绿色可持续','场景体验','渠道融合'],summary:'展会报道呈现智能睡眠、材料选择与线上线下渠道衔接；属于媒体观察，不是销售效果验证。'},
    {date:'2026-09-09',source:'新华网客户端／中企视讯',title:'慕思T12：全栈自研与睡眠生态',url:'https://app.xinhuanet.com/news/article.html?articleId=202609093efa8d098cb14206be18ed1f16311157',topics:['智能睡眠','端侧AI','全栈自研','个性化体验'],summary:'报道强调本地运算与软硬件研发。技术效果是报道中的品牌主张，尚未作独立测试。'},
    {date:'2026-09-12',source:'中国家具协会',title:'设计生态圈：产品创新、材料创新大赛',url:'https://www.cnfa.com.cn/infodetails4632.html?lid=36',topics:['原创设计','材料创新','东方审美','设计出海'],summary:'设计与材料创新被放在产业升级语境中，东方设计语言也是讨论方向。'},
    {date:'2026-09-14',source:'中国家具协会／政策转载',title:'促进智能家居消费行动方案',url:'https://www.cnfa.com.cn/infodetails4634.html',topics:['智能家居','场景体验','适老化','以旧换新','回收服务'],summary:'政策涉及体验空间、适老化设计、购新支持与回收服务。页面发布于9月14日，文件落款为9月2日。'}
  ];
  const counts=new Map();corpus.forEach(a=>new Set(a.topics).forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
  cloud.className='monthly-topic-cloud';
  cloud.innerHTML=[...counts].sort((a,b)=>b[1]-a[1]).map(([t,n],i)=>'<button data-public-topic="'+safe(t)+'" style="--weight:'+(n===2?30:19)+'px;--tone:'+(i%3)+'">'+safe(t)+'<small>'+n+'篇</small></button>').join('');
  home.querySelector('.cloud-panel .pill').textContent='首批4篇 · 8/19—9/17 · 人工主题归并';
  const explain=home.querySelector('#keywordExplain');
  explain.classList.add('compact-source-insight');
  explain.innerHTML='<details class="keyword-source-toggle"><summary>来源与统计口径 <span>4篇公开文章</span></summary><div class="keyword-source-body">仅统计上述30天窗口内已核对的4篇公开网页；同一文章每个话题只计一次。智慧睡眠、AI睡眠等按语义归并为智能睡眠，智能家居不与其混为同义词。点击词条查看证据。</div></details>';
  cloud.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    cloud.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    const topic=b.dataset.publicTopic;
    explain.innerHTML='<details class="keyword-source-toggle"><summary>'+safe(topic)+' <span>'+counts.get(topic)+'篇来源 · 点击展开</span></summary><div class="keyword-source-body">'+corpus.filter(a=>a.topics.includes(topic)).map(a=>'<div class="public-topic-evidence"><a target="_blank" rel="noopener noreferrer" href="'+safe(a.url)+'">'+safe(a.title)+' ↗</a><small>'+a.date+' · '+safe(a.source)+'</small><p>'+safe(a.summary)+'</p></div>').join('')+'</div></details>';
  });
  const additions=[
    ['营销行业媒体','胖鲸','https://pangjing.cn/','品牌案例、品牌商业与消费趋势；只纳入家居相关、有明确日期的文章。'],
    ['营销行业媒体','品牌星球','https://www.brandstar.com.cn/','品牌案例、生活方式、设计与新品；搜索可发现，部分页面直读受限。'],
    ['营销行业媒体','TOPMarketing','https://www.itopmarketing.com/','品牌战役、广告创意、电商传播与营销访谈。'],
    ['家居行业媒体','乐居财经','https://www.lejucaijing.com/','家居企业、展会、产品及渠道动态。'],
    ['家居行业媒体','中国质量新闻网·家居建材','https://www.cqn.com.cn/jiajujiancai/index.htm','产品质量、材料标准与家居消费。'],
    ['展会/协会','中国家具协会','https://www.cnfa.com.cn/','原创设计、材料创新、政策、标准与行业资讯。'],
    ['展会/协会','CIFF上海家博会','https://www.ciff-sh.com/2026/','展会主题、参展新品与现场展示；无发布日期的页面不计入近30天词频。'],
    ['展会/协会','摩登上海时尚家居展','https://expo.maison-shanghai.cn/','设计、家居生活方式与展会趋势。'],
    ['PR/综合媒体','新华网客户端','https://app.xinhuanet.com/','家居新闻与企业稿；保留原始供稿来源，区分转载与独立报道。']
  ];
  additions.forEach(([category,name,url,monitorFor])=>{if(!state.sources.some(s=>s.name===name))state.sources.push({category,name,url,monitorFor,use:'公开网页关键词与事件证据',priority:'补充'});});
  renderSources();
  home.querySelector('.headline-grid').closest('article').querySelector('.section-index').textContent='02 / 行业资讯';
  const p2=document.querySelector('#page-intelligence');
  [...p2.children].forEach(el=>el.classList.add('retired-module'));
  const pane=document.createElement('div');pane.className='monthly-actions';p2.append(pane);
  const link=e=>e.url?'<a href="'+safe(e.url)+'" target="_blank" rel="noopener noreferrer">原始来源 ↗</a>':'';
  const text=v=>safe(Array.isArray(v)?v.join(' / '):v||'暂无已核实的公开信息');
  function highlighted(value){
    const raw=Array.isArray(value)?value.join(' / '):String(value||'');
    const divider=raw.indexOf('｜');
    const body=divider>=0?raw.slice(divider+1):raw;
    const emphasized=safe(body).replace(/YESLEEP|麻豆Pro|鲲鹏Pro|大黑熊|元气|黑标|全屋定制|实木床3\.0|OKIN|山宁泰|超声波焊接|C钉|双电机|三电机沙发|0重力单椅|微异形横厅沙发|空间种草|场景演示|打卡福利|帆布包|定制冰箱贴|拼豆图纸|浅胡桃色|松果沙发|动态追腰支撑系统|零重力|隐藏式灵动几|顾家星选|适·居|G707|在栖|寻楸|分区护脊|分区撑腰|分区深睡|睡觉第一名|深睡枕Pro4|深睡控温被Pro3|每天最小的长假|T12|端侧AI|联发科|14个独立分区|潮汐算法3\.0|云波AI智能枕|潮汐追姿枕|五重进化|AI好眠进化联盟/g,m=>'<strong class="copy-highlight">'+m+'</strong>');
    return (divider>=0?'<strong class="copy-label">'+safe(raw.slice(0,divider))+'</strong><span class="copy-separator">｜</span>':'')+emphasized;
  }
  const field=(label,value)=>'<div class="monthly-fact"><small>'+label+'</small><p>'+text(value)+'</p></div>';
  const ysSources={
    official:{name:'品牌官网 · 品牌主张／长期背景',url:'https://www.yeswood.com/ppjs'},
    history:{name:'官网2025-06-12 · 历史产品工艺',url:'https://www.yeswood.com/newsinfo/8431653.html'},
    exhibit:{name:'2026-09-08 · 展会广告稿',url:'https://www.cqn.com.cn/jiajujiancai/content/2026-09/08/content_9171745.htm'},
    march:{name:'2026-03-12 · 历史展会报道',url:'https://www.cqn.com.cn/jiajujiancai/content/2026-03/12/content_9148181.htm'},
    sleep:{name:'2026-06-17 · 新浪家居产品背景',url:'https://chengde.jiaju.sina.cn/news/20260617/7472948115650447231.shtml'},
    muse:{name:'MUSE设计奖 · 鲲鹏Pro',url:'https://design.museaward.com/winners-info.php?id=40730'},
    timber:{name:'AHEC · 木材分级技术背景',url:'https://www.americanhardwood.org/sites/default/files/publications/download/2024-05/AHEC_Species_Guide_2024_2ndEdition_English.pdf'}
  };
  [
    {category:'品牌自有矩阵',name:'源氏木语官网·品牌与产品背景',url:ysSources.official.url,monitorFor:'品牌、材料、制造与服务主张；按SKU核对，不以官网自述替代独立验证。'},
    {category:'PR/综合媒体',name:'MUSE Design Awards',url:ysSources.muse.url,monitorFor:'产品设计、奖项及参与企业；当前详情限流，索引信息保留访问状态。'},
    {category:'展会/协会',name:'美国阔叶木外销委员会 AHEC',url:'https://www.americanhardwood.org/',monitorFor:'木种与分级技术背景；长期资料不计入30天关键词统计。'}
  ].forEach(s=>{if(!state.sources.some(x=>x.name===s.name))state.sources.push({...s,use:'源氏木语产品研究补充证据',priority:'补充'});});
  renderSources();
  function ysResearchAudit(){return [
    {key:'product',label:'新品动向',steps:[
      ['这个月到底做了什么',['报道事实｜9月上海双展，重点展示睡眠、黑标与定制，动作性质是展会，不是已核实的新品发布会。','时间辨析｜首次设置专业展区不等于产品首次上市。黑标、零胶水床垫在3月已被报道，官网2025年的资料也已有无胶工艺。'],['exhibit','march','history']],
      ['哪些是新品，哪些是展出产品',['展出产品｜元气、麻豆Pro床垫；稿件没有给出这两款的首发日期。','稿件称为新品｜首款三电机沙发、微异形横厅沙发、0重力单椅。缺少SKU、独立产品页、上市日期与参数，暂不与鲲鹏Pro画等号。','核验重点｜三电机分别控制什么、适配什么户型、价格与旧款差异，均需官方SKU资料。'],['exhibit','muse']],
      ['升级的不是一句“高端”',['历史对照｜3月已有黑标展区；因此黑标不是9月新建的产品线。','本期变化｜这次展示将选材、软体与全屋定制放进一个空间，强调从单件购买到完整家居方案。','分析判断｜更像扩大既有品质承诺的应用范围，而不是已经证明了某款产品性能升级。'],['march','exhibit']]
    ]},
    {key:'positioning',label:'产品定位战略解读',steps:[
      ['先理解黑标的证明点',['品牌主张｜官网将黑标列为品质升级方向，展会稿强调黑胡桃、白蜡木与定制。','技术辨析｜FAS是木材分级中的净材出材要求，不能单独证明成品家具更耐久、涂层更安全或设计更先进。','营销解读｜真正有解释力的内容应是板材怎么筛、结构怎么做、交付怎么兑现，而不是堆木种名。'],['official','exhibit','timber']],
      ['床垫：健康承诺如何落地',['品牌工艺主张｜官网历史文章已介绍超声波焊接。新浪家居进一步描述弹簧袋焊接与C钉固定层间材料。','判断｜把工艺结构展示出来，比只写“环保床垫”更便于消费者理解；但不用胶不等于整张床垫零排放。','证据缺口｜需要对应SKU的结构图、检测方法、样品日期及完整报告，才能验证安全或功效。'],['history','sleep']],
      ['价格与人群，哪些还不能下结论',['品牌意图｜官网强调品质可及；展会稿面向需要设计、个性化与空间完整度的消费者。意图不等于实际购买人群。','历史价格｜6月报道写五重奏S为8,599元，其他搜索结果有不同价格；规格、渠道及优惠不明，不作现价。','缺口｜麻豆Pro、元气及功能沙发需官方规格和当前成交口径；不靠媒体推荐人群替代用户研究。'],['official','exhibit','sleep']],
      ['供应链与研发：看到什么线索',['官网自述｜有大型木场合作及制造园区布局，但页面未披露木场名单、合作合同或具体SKU对应关系。','外部线索｜MUSE鲲鹏Pro参赛记录列出嘉善丰德家具与Remacro Technology；仅作为参与企业线索，不认定部件供应关系。','待验证研发假设｜实木视觉语言与功能软体、睡眠工艺、定制服务结合，可能是后续方向；不能推断未公布新品计划。'],['official','muse']],
      ['这对营销表达意味着什么',['推导｜官网的品质承诺，结合展会的空间化展示及床垫物理工艺，说明品牌在尝试让不可见品质变得可解释。','分析判断｜值得关注的是“材料与工艺证据如何形成购买理由”，而不只是“又参加了展会”。','待验证｜消费者是否看懂、是否相信、是否愿意付溢价，仍需本事件评论、访谈或转化证据。'],['official','history','exhibit']]
    ]},
    {key:'social',label:'社媒动态',steps:[['消费者反馈能验证什么',['目前缺口｜未取得可直接归属于本次展会与具体新品的评论样本，不使用其他笔记讨论证明本事件效果。','下一步验证｜选取一条相关官方或合作笔记，区分材质疑问、气味担忧、睡感、价格与服务；检验上述品质表达是否被理解。'],[]]]}
  ];}
  const officialNotes={
    smart:'6a955681000000002503a37f',museNote:'6aa11f9f000000002b010136',sofa:'6aa26d7a000000002803263c',preview:'6a99091f000000002600ae18',opening:'6a9bfcc9000000002b0132c4',black:'6a882d85000000002b003924',style:'6aa7c2cb000000002b026a58',beads:'6a8c0f1f0000000014028afc'
  };
  Object.entries(officialNotes).forEach(([key,id])=>ysSources[key]={name:'小红书官方笔记',url:'https://www.xiaohongshu.com/explore/'+id});
  const noteMedia=window.monthlyNoteMedia||[];
  const competitorProfiles=window.monthlyCompetitorProfiles||{};
  Object.entries(competitorProfiles).forEach(([brand,p])=>Object.values(p.sources).forEach(s=>{
    if(!state.sources.some(old=>old.url===s.url))state.sources.push({name:brand+'｜'+s.name,url:s.url,category:s.url.includes('xiaohongshu.com')?'品牌自有矩阵':s.url.includes('snzsxh.com')?'展会与协会':s.url.includes('derucci.com')?'品牌自有矩阵':'研究案例来源',use:'本期事件、产品表达与活动物料',monitorFor:'本期竞品研究证据',priority:'本期'});
  }));
  renderSources();
  state.events=(state.events||[]).flatMap(e=>competitorProfiles[e.brand]?competitorProfiles[e.brand].events.map(item=>({...e,...item,image:item.image||null,videoUrl:item.videoUrl||null,materials:item.materials||[],consumerInsights:[],research:{},storeChanges:null})):e);
  Object.entries(officialNotes).forEach(([key,id])=>{const n=noteMedia.find(n=>n.id===id);if(n)ysSources[key].name=n.title;});
  function chapterMedia(keys){
    if(competitorProfiles[activeBrand]){
      const e=competitorProfiles[activeBrand].events[activeEvent];
      return (e.materialPlacement?.[activeDimension]?.[activeStep]||[]).map(id=>noteMedia.find(n=>n.id===id)).filter(Boolean);
    }
    // Each note has one editorial home; source citations may still support other chapters.
    const materialPlacement={
      product:[['preview','opening'],[],['museNote','sofa']],
      positioning:[[],['smart'],[]],
      social:[['style','color','song','cafe'],['black'],['beads']]
    };
    const mediaKeys=materialPlacement[activeDimension]?.[activeStep]||[];
    const extra={color:'6a92b870000000002a03bb13',song:'6a9152b5000000002003bcee',cafe:'6a90040b000000001f006bbf'};
    return mediaKeys.map(k=>noteMedia.find(n=>n.id===(officialNotes[k]||extra[k]))).filter(Boolean);
  }
  const lightbox=document.createElement('dialog');lightbox.className='monthly-lightbox';document.body.append(lightbox);
  lightbox.addEventListener('click',ev=>{if(ev.target===lightbox)lightbox.close();});
  function openMedia(n,index=0){
    const images=n.images?.length?n.images:[n.image];
    lightbox.innerHTML='<button class="lightbox-close" aria-label="关闭图片">关闭 ×</button><h3>'+safe(n.title)+'</h3><img src="'+safe(images[index])+'" alt="'+safe(n.title)+' 第'+(index+1)+'张" referrerpolicy="no-referrer"><div class="lightbox-paging"><button data-media-prev>← 上一张</button><span>'+(index+1)+' / '+images.length+'</span><button data-media-next>下一张 →</button></div><a href="https://www.xiaohongshu.com/explore/'+safe(n.id)+'" target="_blank" rel="noopener noreferrer">查看原笔记 ↗</a>';
    lightbox.querySelector('.lightbox-close').onclick=()=>lightbox.close();
    lightbox.querySelector('img').onerror=ev=>{ev.target.hidden=true;const p=document.createElement('p');p.textContent='原图暂不可用，请打开原笔记查看物料。';ev.target.after(p);};
    lightbox.querySelector('[data-media-prev]').onclick=()=>openMedia(n,(index-1+images.length)%images.length);
    lightbox.querySelector('[data-media-next]').onclick=()=>openMedia(n,(index+1)%images.length);
    if(!lightbox.open)lightbox.showModal();
  }
  function ysSections(){return [
    {key:'product',label:'新品动向',summary:'以双展集中展示产品矩阵，以智能床和功能沙发丰富居家体验。',steps:[
      ['双展不只陈列家具，而是展示一套家居场景',['时间与地点｜虹桥：9月5—8日，国家会展中心2.1B08；浦东：9月8—11日，新国际博览中心E2E01。','产品阵容｜YESLEEP睡眠、黑标与定制集中亮相；元气、麻豆Pro床垫，以及三电机沙发、微异形横厅沙发、0重力单椅等产品展出。','展陈打法｜以软体区为中厅，环绕动线串联多种风格样板空间，让观众在真实空间尺度中看搭配、体验产品。','配套引流｜9月3日官号发布双展打卡邀约，明确展位与时间，以帆布包、定制冰箱贴等周边吸引到场；9月5日续发开幕内容。'],['preview','opening','exhibit'],'营销解读｜产品、空间与打卡福利共同服务于到场体验：先用官号给出明确到场理由，再通过样板场景解释产品如何进入日常生活。'],
      ['智能床上新：保留实木外观，增加可调节体验',['发布节点｜8月31日，官号发布“实木床也可以智能化”，以“实木床3.0”组织产品升级叙事。','结构配置｜实木床架与隐藏式电动系统结合；官号介绍德国OKIN双电机、18cm高回弹海绵、3cm记忆棉与山宁泰抗菌布料。','功能表达｜把调节能力转译为观影、按摩、缓鼾、0压、一键放平五类模式；按摩支持背部、腿部独立控制与三档强度。'],['smart'],'营销解读｜不是只讲电机和材料，而是从垫枕头追剧、调整躺卧角度等处境切入，用具体使用方式解释智能化的价值。'],
      ['功能沙发双打法：设计背书与场景演示并行',['鲲鹏Pro｜9月9日发布MUSE金奖消息，以黑胡桃实木框架、电动无级调节与高弹软包组织卖点；奖项官网以翼形实木扶手解释东方设计语言。','大黑熊｜9月10日围绕贵妃、双人大床、直排三种模式演示电动沙发床，分别对应独处、双人休憩与全家围坐。'],['museNote','muse','sofa'],'营销解读｜鲲鹏Pro借设计奖强化产品价值，大黑熊借生活场景解释功能用途；两种内容分别回答“为什么值得选”和“买回来怎样用”。']
    ]},
    {key:'positioning',label:'产品定位战略解读',summary:'以材料品质为基础，向整屋方案、健康睡眠和功能舒适延伸。',steps:[
      ['黑标与定制：从选材走向整屋方案',['产品表达｜黑标强调高等级木材、设计与服务，并延伸至全屋定制。','定位解读｜面向不只购买一件家具、还重视整屋风格与空间适配的改善需求，将材料品质转化为完整家居方案。'],['exhibit','official']],
      ['睡眠产品：延续健康材料的品牌表达',['工艺｜官网介绍超声波焊接；睡眠报道补充C钉固定填充层，以物理连接替代相关粘合环节。','定位解读｜把实木产品的健康材料叙事延伸到床垫；智能床则增加观影、休憩、角度调节等使用场景。'],['history','sleep','smart']],
      ['研发方向：实木外观与电动功能融合',['产品线索｜智能床隐藏电机，鲲鹏Pro保留实木造型，大黑熊通过电动结构切换家具形态。','方向判断｜近期产品传播共同强调“保留实木审美，同时增加可调节的舒适体验”，功能软体与睡眠系统是值得持续关注的开发方向。'],['smart','museNote','sofa']]
    ]},
    {key:'social',label:'社媒动态',summary:'官号以场景种草维持日常内容，以功能演示解释产品，以打卡权益承接线下活动。',steps:[
      ['官号内容：产品、空间、活动三条线',['产品演示｜8月31日智能床、9月9日鲲鹏Pro获奖、9月10日大黑熊沙发床，分别使用功能说明、奖项背书与场景演示。','空间种草｜中古拼黑卧室、浅胡桃色、宋式美学、阳台咖啡角等内容，将家具嵌入生活场景。','活动引流｜8月22日黑标门店打卡，9月3日双展预热，9月5日虹桥开幕；以地点、时间与周边福利承接到场。'],['smart','museNote','sofa','style','black','preview']],
      ['门店配套营销：用打卡征集连接到店与社媒',['活动机制｜8月22日发布黑标门店打卡活动，持续至9月6日；邀请消费者前往全国黑标体验门店，在评论区上传实拍与体验感受，参与餐垫抽奖。','内容承接｜门店以实木材质、空间设计与家居氛围提供拍摄场景，官号以征集机制邀请消费者分享到店体验。','公开互动｜黑标打卡笔记40赞、36收藏、20评论、40分享；智能床笔记23赞、21收藏；双展预热16赞、6收藏、10分享。','数据口径｜9月16日官方账号采集快照，选取自20篇笔记样本。'],['black','smart','preview'],'营销解读｜值得参考的是“门店可拍场景＋体验征集＋轻量奖励”的组合，而不只是开店消息。活动把社媒邀约与门店体验连接起来。'],
      ['用户讨论：颜色扩展、升级差异、素材需求',['颜色与组合｜浅胡桃色相关评论提出床、电视柜、餐桌、书柜等具体产品需求。','升级差异｜黑标活动笔记中，用户询问黑标与普通系列有什么区别。','素材参与｜拼豆家居内容下，用户索要拼豆图纸，其中一条获15赞。','以上为官方笔记评论样本中的具体讨论。'],['black','beads']]
    ]}
  ];}
  let activeBrand=null, activeDimension='product', activeStep=0, activeEvent=0;
  const placements={
    '源氏木语':{label:'展会',x:19,y:65},
    '顾家家居':{label:'新品私享会 · 渠道交流',x:39,y:83},
    '林氏家居':{label:'展会',x:57,y:65},
    '亚朵星球':{label:'广告片',x:70,y:27},
    '慕思床垫':{label:'新品发布会',x:80,y:83}
  };
  function renderMonthly(){
    const events=state.events||[];
    const brands=[...new Set(events.map(e=>e.brand))];
    if(!brands.includes(activeBrand))activeBrand=null;
    const activity=brands.map((brand,i)=>{
      const e=events.find(e=>e.brand===brand),p=placements[brand]||{label:e.type||'其他动作',y:72};
      const count=new Set(events.filter(e=>e.brand===brand).map(e=>e.date+'|'+e.event)).size;
      return {brand,p,count,order:i};
    });
    const maxCount=Math.max(1,...activity.map(a=>a.count));
    activity.sort((a,b)=>b.count-a.count||a.order-b.order);
    const card=a=>{
      const score=Math.round(100*a.count/maxCount);
      return '<button class="coord-brand '+(activeBrand===a.brand?'selected':'')+'" data-monthly-brand="'+safe(a.brand)+'" style="--activity:'+score+'" aria-pressed="'+(activeBrand===a.brand)+'" title="本期收录活跃指数 '+score+'；'+a.count+'个独立事件"><span class="coord-dot"></span><strong>'+safe(a.brand)+'</strong><small>'+safe(a.p.label)+'</small><span class="coord-activity">活跃指数 <b>'+score+'</b><em>'+a.count+'个事件</em></span></button>';
    };
    const lane=(online,label)=>'<section class="coord-lane"><div class="coord-lane-label">'+label+'</div><div class="coord-brand-row">'+activity.filter(a=>(a.p.y<50)===online).map(card).join('')+'</div></section>';
    pane.innerHTML='<section class="card panel"><div class="section-index">01 / 本月竞品动作</div><h2 class="panel-title">竞品全景图</h2><div class="monthly-coordinate activity-map">'+lane(true,'线上 · 内容与平台活动')+lane(false,'线下 · 展会与发布活动')+'</div><p class="note">本期收录活跃指数＝品牌独立事件数 ÷ 本期最高事件数 × 100。卡片随指数增大，同一区域按指数降序排列，同分保持品牌顺序；仅反映已收录样本，不代表全市场活跃度或营销效果。</p></section><div class="monthly-dimensions" id="monthlyReader" aria-live="polite"></div>';
    pane.querySelectorAll('[data-monthly-brand]').forEach(button=>button.onclick=()=>{
      activeBrand=button.dataset.monthlyBrand;activeDimension='product';activeStep=0;activeEvent=0;
      pane.querySelectorAll('[data-monthly-brand]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
      renderReader();
      document.querySelector('#monthlyReader').scrollIntoView({behavior:'smooth',block:'start'});
    });
    renderReader();
  }
  function renderReader(){
    const host=pane.querySelector('#monthlyReader');
    if(!activeBrand){host.innerHTML='';return;}
    const items=(state.events||[]).filter(e=>e.brand===activeBrand);
    const e=items[activeEvent]||items[0],r=e.research||{};
    const isCampaign=/电商|促销|618|双11|双十一|抖音|京东|天猫/.test([e.event,e.type,e.purpose,...(e.channels||[])].join(' '));
    const isFilm=/广告片|短片|影片/.test(e.event||'');
    const missing='暂无已核实的公开数据。';
    const socialSteps=[
      ['话题搜索词','暂无经核实的平台话题搜索词数据。公开报道中的主题不等同于消费者搜索词。'],
      ['用户评价',e.consumerInsights?.length?e.consumerInsights.map(i=>i.phenomenon):'尚未取得可归属于本事件的评论样本，不推测消费者态度。'],
      ['官号内容趋势','暂无统一时间口径的官号发布内容分类统计。']
    ];
    const sections=e.sections|| (activeBrand==='源氏木语'?ysSections():isFilm?[
      {key:'expression',label:'广告表达',steps:[['先看它讲什么',e.theme],['它想改变什么认知',e.coreStrategy],['表达与素材形式',e.materials||e.actions]]},
      {key:'distribution',label:'传播路径',steps:[['在哪里传播',e.channels],['怎样展开',e.actions],['公开传播结果',e.result]]},
      {key:'social',label:'消费者反馈',steps:socialSteps.slice(1,2)}
    ]:isCampaign?[
      {key:'campaign',label:'电商 Campaign',steps:[
      ['活动主题',e.theme],
      ['核心成果',e.result],
      ['产品表现','暂无已核实的活动销量、排名或转化数据；产品阵容不等同于销售表现。'],
      ['全域传播',[...(e.actions||[]),...(e.channels||[])]]]},
      {key:'social',label:'社媒动态',steps:socialSteps}
    ]:[
      {key:'product',label:'新品动向',steps:[
      ['核心事件',e.productStrategy],
      ['现场展示与发布形式',[...(e.actions||[]),...(e.channels||[])]]]},
      {key:'positioning',label:'产品定位战略解读',steps:[['主打哪些产品',r.products||e.productStrategy],['价格与目标人群',[r.price,r.audience].filter(Boolean)],['材料与技术',r.tech||missing],['品牌想建立的认知',e.coreStrategy]]},
      {key:'social',label:'社媒动态',steps:socialSteps}
    ]);
    // Only show store changes when this event has explicitly attributed store evidence.
    if(e.storeChanges&&!isFilm)sections.splice(1,0,{key:'stores',label:'门店动向',steps:[['本事件门店新增与改造',e.storeChanges]]});
    if(!sections.some(s=>s.key===activeDimension)){activeDimension=sections[0].key;activeStep=0;}
    const dimensions=sections.map(s=>[s.key,s.label]);
    const steps=sections.find(s=>s.key===activeDimension).steps;
    activeStep=Math.min(activeStep,steps.length-1);
    const [title,value,evidenceKeys=[],takeaway='']=steps[activeStep];
    const values=Array.isArray(value)?value:[value||missing];
    const media=activeBrand==='源氏木语'||competitorProfiles[activeBrand]?chapterMedia(evidenceKeys):[];
    const sources=competitorProfiles[activeBrand]?.sources||ysSources;
    const section=sections.find(s=>s.key===activeDimension);
    const hero=section.image||e.image;
    const heroCaption=section.imageCaption||e.imageCaption||'事件主图';
    host.innerHTML='<section class="card panel monthly-reader"><div class="monthly-reader-head"><div><div class="section-index">02 / 点击维度 · 逐步阅读</div><h2>'+safe(activeBrand)+'</h2></div><button class="reader-close" aria-label="收起品牌拆解">收起 ×</button></div>'+
      (items.length>1?'<select aria-label="选择该品牌事件" class="select monthly-event-select">'+items.map((it,i)=>'<option value="'+i+'" '+(i===activeEvent?'selected':'')+'>'+safe(it.event)+'</option>').join('')+'</select>':'<p class="monthly-event-title">'+safe(e.event)+' · '+safe(e.date)+'</p>')+
      '<nav class="monthly-tabs" aria-label="拆解维度">'+dimensions.map(([key,label])=>'<button data-dimension="'+key+'" aria-pressed="'+(activeDimension===key)+'">'+label+'</button>').join('')+'</nav>'+
      (sections.find(s=>s.key===activeDimension).summary?'<div class="monthly-editorial-lead"><small>本期主线</small><p>'+safe(sections.find(s=>s.key===activeDimension).summary)+'</p></div>':'')+
      '<div class="monthly-story"><div class="monthly-story-copy"><nav class="monthly-steps" aria-label="阅读章节">'+steps.map(([label],i)=>'<button data-reader-step="'+i+'" aria-current="'+(i===activeStep?'step':'false')+'">'+String(i+1).padStart(2,'0')+' '+label+'</button>').join('')+'</nav><div class="reader-answer"><small>'+String(activeStep+1).padStart(2,'0')+' / '+steps.length+'</small><h3>'+safe(title)+'</h3>'+values.map(v=>'<p>'+highlighted(v)+'</p>').join('')+
      (takeaway?'<aside class="monthly-takeaway">'+highlighted(takeaway)+'</aside>':'')+
      (activeBrand!=='源氏木语'&&activeDimension==='positioning'?'<small>定位解读</small>':'')+
      '<div class="chapter-sources">'+evidenceKeys.filter(k=>sources[k]).map(k=>'<a href="'+safe(sources[k].url)+'" target="_blank" rel="noopener noreferrer">'+safe(sources[k].name)+' ↗</a>').join('')+'</div></div><div class="reader-footer">'+link(e)+'</div></div>'+
      (hero?'<figure class="monthly-story-image"><img src="'+safe(hero)+'" alt="'+safe(heroCaption)+'" loading="lazy"><figcaption>'+safe(heroCaption)+'</figcaption>'+(isFilm&&e.videoUrl?'<a href="'+safe(e.videoUrl)+'" target="_blank" rel="noopener noreferrer">观看完整广告片 ↗</a>':'')+'</figure>':'')+'</div>'+
      (media.length?'<section class="monthly-materials"><h3>官方物料</h3>'+media.map(n=>'<article class="monthly-note-sheet"><a href="https://www.xiaohongshu.com/explore/'+safe(n.id)+'" target="_blank" rel="noopener noreferrer">'+safe(n.title)+' ↗</a><small>'+n.date+' · '+(n.images?.length||1)+'张采集图片</small><div class="monthly-material-grid">'+(n.images?.length?n.images:[n.image]).map((url,i)=>({url,i})).filter(x=>x.url!==hero).map(({url,i})=>'<button data-media-id="'+safe(n.id)+'" data-image-index="'+i+'"><img src="'+safe(url)+'" alt="'+safe(n.title)+' 第'+(i+1)+'张" loading="lazy" referrerpolicy="no-referrer"><small>'+(i+1)+' / '+(n.images?.length||1)+'</small></button>').join('')+'</div></article>').join('')+'</section>':'')+'</section>';
    host.querySelectorAll('[data-media-id]').forEach(b=>{b.onclick=()=>openMedia(noteMedia.find(n=>n.id===b.dataset.mediaId),Number(b.dataset.imageIndex));b.querySelector('img').onerror=ev=>{ev.target.hidden=true;b.classList.add('image-unavailable');b.querySelector('small').textContent='图片暂不可用 · 查看原笔记';};});
    host.querySelector('.reader-close').onclick=()=>{activeBrand=null;renderMonthly();};
    host.querySelectorAll('[data-dimension]').forEach(b=>b.onclick=()=>{activeDimension=b.dataset.dimension;activeStep=0;renderReader();});
    host.querySelectorAll('[data-reader-step]').forEach(b=>b.onclick=()=>{activeStep=Number(b.dataset.readerStep);renderReader();});
    host.querySelector('.monthly-event-select')?.addEventListener('change',ev=>{activeEvent=Number(ev.target.value);activeStep=0;renderReader();});
  }
  const p3=document.querySelector('#page-compare');[...p3.children].forEach(el=>el.classList.add('retired-module'));
  document.querySelector('.nav [data-page="intelligence"]').addEventListener('click',renderMonthly);
  renderMonthly();
  document.querySelector('[data-page="home"]').click();
})();
