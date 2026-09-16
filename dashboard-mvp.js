/* Case adapter: shared facts and hypotheses; no simulated AI or new research. */
(() => {
  const getMvp = () => state.events.find(e => e.brand === '源氏木语');
  function openBrandResearch() {
    selectedBrand = '源氏木语'; compareStep = 2; selectedLens = '核心策略';
    renderCompare(); document.querySelector('[data-page="compare"]').click();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function openMvpCase() {
    const items = getFilteredEvents();
    const index = items.findIndex(e => e.brand === '源氏木语');
    if(index < 0) { alert('当前筛选条件未包含源氏木语，请先调整品牌或动作筛选。'); return; }
    selectedEventIndex=index; storyStep=0; renderEventDetails();
    document.querySelector('[data-page="case"]').click();
    renderValidation(); window.scrollTo({top:0,behavior:'smooth'});
  }
  const landscape = document.querySelector('#page-intelligence');
  document.querySelector('#competitiveMap')?.closest('article')?.classList.add('legacy-map');
  const hub=document.createElement('section');hub.className='mvp-hub';
  hub.innerHTML=`<article class="mvp-lead"><div><div class="section-index">本期深度研究 · 源氏木语</div><h3>“新实木主义”如何从品牌口号，落到产品与消费者选择？</h3><p>先还原黑标与产品矩阵的升级，再用典型反馈检验：消费者看懂了什么，仍然缺少什么判断依据。</p></div><div class="mvp-actions"><button data-mvp="case">沿案例阅读 →</button><button class="secondary" data-mvp="research">打开品牌研究</button></div></article><div class="mvp-side"><article class="mvp-small"><span class="mvp-circle">01</span><h4>品牌事实</h4><p>产品、选材、价格、上市与传播路径。</p></article><article class="mvp-small"><span class="mvp-circle">02</span><h4>消费者信号</h4><p>官方笔记可见样本，不等同于全平台口碑。</p></article><article class="mvp-small"><span class="mvp-circle">03</span><h4>洞察假设</h4><p>配色决策、升级比较与内容参与。</p></article><article class="mvp-small"><span class="mvp-circle">04</span><h4>策略转换</h4><p>证据之后，再谈内容与物料方向。</p></article></div>`;
  landscape.querySelector('.page-intro').after(hub);
  hub.querySelector('[data-mvp="case"]').onclick=openMvpCase;
  hub.querySelector('[data-mvp="research"]').onclick=openBrandResearch;
  function renderValidation(){
    document.querySelector('#mvpCaseValidation')?.remove();
    const event=selectedEvent();if(!event||event.brand!=='源氏木语')return;
    const section=document.createElement('section');section.id='mvpCaseValidation';
    section.innerHTML=`<article class="validation-box"><div class="section-index">辅助证据 · 尚非本事件专属评论</div><h3>品牌升级说完了，消费者的疑问解决了吗？</h3><p>当前20篇官方笔记样本出现三组信号：跨品类浅胡桃色需求、黑标与普通系列的差异追问、拼豆图纸索取。这些用于提出研究问题，不能直接证明上海双展的传播效果。</p><p>下一步应选择与本事件直接相关的典型合作笔记，并补自然讨论、购买与使用证据；同时回查4条时间异常和2条未完整子回复。</p><div class="validation-links"><button id="mvpReviewHypotheses">查看三条假设及推导 →</button>${event.url?`<a href="${safe(event.url)}" target="_blank" rel="noopener noreferrer">打开事件报道 ↗</a>`:''}</div></article><article class="case-notebook"><h3>研究批注</h3><p>记录你不同意的判断、需要补充的证据或下一步问题。仅保存到当前浏览器，不会发送给AI，也不会同步给其他人。</p><textarea id="mvpNotebook" aria-label="源氏木语案例研究批注" placeholder="例如：浅胡桃色询问是否来自同一活动？需要补哪些购买后证据？"></textarea><button id="saveMvpNotebook">保存批注</button><span class="notebook-status" id="mvpNotebookStatus" role="status"></span></article>`;
    document.querySelector('#page-case').append(section);
    section.querySelector('#mvpReviewHypotheses').onclick=()=>{openBrandResearch();document.querySelector('.insight-lab')?.scrollIntoView({behavior:'smooth',block:'start'});};
    try{section.querySelector('#mvpNotebook').value=localStorage.getItem('marketing-mvp-yuanshimuyu-notes')||'';}catch{}
    section.querySelector('#saveMvpNotebook').onclick=()=>{try{localStorage.setItem('marketing-mvp-yuanshimuyu-notes',section.querySelector('#mvpNotebook').value);section.querySelector('#mvpNotebookStatus').textContent='已保存到当前浏览器';}catch{section.querySelector('#mvpNotebookStatus').textContent='浏览器禁止本地保存，请复制保留';}};
  }
  const strategy=document.createElement('article');strategy.className='strategy-provenance';
  strategy.innerHTML=`<div class="section-index">策略来源与限制</div><h4>先把“升级差异”解释清楚，再验证“品质档案”是否有用</h4><p>评论中的黑标差异追问支持一个具体问题：消费者缺少比较依据。现有样本尚不足以证明“改善型家庭普遍愿意为透明品质溢价”。下方创意是待测试方向，并非源氏木语已执行的活动。</p><button>回到品牌事实与洞察 →</button>`;
  document.querySelector('.strategy-page-demo').prepend(strategy);strategy.querySelector('button').onclick=openBrandResearch;
  document.querySelector('[data-page="case"]').addEventListener('click',renderValidation);
  document.querySelector('[data-page="compare"]').addEventListener('click',()=>{if(compareStep===0){compareStep=2;renderCompare();}});
  document.querySelectorAll('.hierarchy-actions button').forEach(b=>{if(b.textContent.includes('返回行业全景'))b.textContent='← 返回案例精选';});
  document.querySelector('#page-compare .page-intro .section-index').textContent='BRANDS / EVIDENCE / INTERPRETATION';
  document.querySelector('#page-case .page-intro .section-index').textContent='案例精选 / 品牌 / 案例研究';
})();
