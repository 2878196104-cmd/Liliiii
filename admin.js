(function () {
  const config = window.MONTHLY_KNOW_CONFIG || {};
  const $ = id => document.getElementById(id);
  let token = sessionStorage.getItem("monthlyKnowToken") || "";
  let activeView = "inbox";
  let activeEventStatus = "pending";
  let documents = [];
  let sourceRows = [];
  let sourceConfig = [];
  let statsRows = [];
  let events = [];

  const statusLabels = {
    new: "待判断",
    needs_review: "待核验",
    accepted: "已采纳",
    ignored: "已忽略"
  };

  function configured() {
    return config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_PROJECT");
  }

  async function api(path, options = {}) {
    const headers = {
      apikey: config.supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${config.supabaseUrl}${path}`, { ...options, headers });
    if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }

  async function login(email, password) {
    const result = await api("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    token = result.access_token;
    sessionStorage.setItem("monthlyKnowToken", token);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "时间待确认";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat("zh-CN", includeTime ? {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    } : { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function excerpt(value, length = 220) {
    const clean = String(value || "").replace(/\s+/g, " ").trim();
    return clean.length > length ? clean.slice(0, length) + "…" : clean;
  }

  async function loadSourceData() {
    const [rows, configResponse] = await Promise.all([
      api("/rest/v1/sources?select=id,name,base_url,platform,enabled,collection_interval_minutes,last_collected_at&order=name"),
      fetch("config/sources.json", { cache: "no-store" }).then(response => response.ok ? response.json() : [])
    ]);
    sourceRows = rows || [];
    sourceConfig = Array.isArray(configResponse) ? configResponse : [];
    const select = $("sourceFilter");
    const current = select.value;
    select.innerHTML = '<option value="all">全部来源</option>' + sourceRows.map(row =>
      `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`
    ).join("");
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  async function loadStats() {
    statsRows = await api("/rest/v1/raw_documents?select=source_id,processing_status,raw_payload&order=collected_at.desc&limit=1000");
    const counts = statsRows.reduce((map, row) => {
      map[row.processing_status || "new"] = (map[row.processing_status || "new"] || 0) + 1;
      return map;
    }, {});
    const cards = [
      ["待判断", counts.new || 0, "等待人工选择"],
      ["待核验", counts.needs_review || 0, "证据或归类不足"],
      ["已采纳", counts.accepted || 0, "已进入证据资料库"],
      ["已忽略", counts.ignored || 0, "不进入后续研究"]
    ];
    $("statsGrid").innerHTML = cards.map(([label, value, note]) =>
      `<article><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`
    ).join("");
  }

  function currentDocumentStatus() {
    if (activeView === "accepted") return "accepted";
    return $("documentStatus").value;
  }

  async function loadDocuments() {
    const status = currentDocumentStatus();
    const sourceId = $("sourceFilter").value;
    let path = "/rest/v1/raw_documents?select=id,source_id,title,body_text,canonical_url,published_at,collected_at,processing_status,kind,raw_payload,sources(name,platform,trust_level)&order=collected_at.desc&limit=250";
    if (status !== "all") path += `&processing_status=eq.${encodeURIComponent(status)}`;
    if (sourceId !== "all") path += `&source_id=eq.${encodeURIComponent(sourceId)}`;
    documents = await api(path);
    renderDocuments();
  }

  function filteredDocuments() {
    const term = $("documentSearch").value.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(row =>
      [row.title, row.body_text, row.sources?.name, row.sources?.platform]
        .some(value => String(value || "").toLowerCase().includes(term))
    );
  }

  function renderDocuments() {
    const rows = filteredDocuments();
    $("documentCount").textContent = rows.length;
    $("workspaceSummary").textContent = activeView === "accepted"
      ? `${rows.length} 条已采纳证据，可继续结构化为事件和洞察。`
      : `${rows.length} 条资料等待判断；当前最多显示最近 250 条。`;
    $("documentQueue").innerHTML = rows.length ? rows.map(row => {
      const url = safeUrl(row.canonical_url);
      return `<article class="document-card" data-id="${escapeHtml(row.id)}">
        <div class="document-top">
          <div class="document-meta">
            <span class="status-pill status-${escapeHtml(row.processing_status || "new")}">${escapeHtml(statusLabels[row.processing_status] || row.processing_status || "待判断")}</span>
            <span>${escapeHtml(row.sources?.name || "未知来源")}</span>
          <span>${escapeHtml(row.sources?.platform || row.kind || "公开网页")}</span>
          <span>初筛 ${escapeHtml(row.raw_payload?.prefilter?.score ?? "—")} 分</span>
            <span>发布 ${escapeHtml(formatDate(row.published_at))}</span>
            <span>采集 ${escapeHtml(formatDate(row.collected_at, true))}</span>
          </div>
          <button class="text-button" data-open-document>查看详情</button>
        </div>
        <h3>${escapeHtml(row.title)}</h3>
        <p>${escapeHtml(excerpt(row.body_text) || "暂无正文摘要，可打开原文核验。")}</p>
        <div class="document-actions">
          ${url ? `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">核验原文 ↗</a>` : ""}
          <button data-doc-action="accepted">采纳</button>
          <button data-doc-action="needs_review" class="warning">待核验</button>
          <button data-doc-action="ignored" class="danger">忽略</button>
          ${row.processing_status !== "new" ? '<button data-doc-action="new" class="secondary">恢复待判断</button>' : ""}
        </div>
      </article>`;
    }).join("") : '<div class="empty">当前筛选条件下没有资料</div>';
  }

  function inferEventType(row) {
    const text = `${row.title || ""} ${row.body_text || ""}`;
    if (/联名|合作/.test(text)) return "品牌联名";
    if (/新品|发布|推出|上市/.test(text)) return "新品发布";
    if (/门店|开业|开店/.test(text)) return "渠道动作";
    if (/报告|趋势|数据/.test(text)) return "行业趋势";
    if (/营销|广告|案例| campaign/i.test(text)) return "营销案例";
    return "行业动态";
  }

  async function createCandidateEvent(row) {
    const existing = await api(`/rest/v1/event_evidence?select=event_id&document_id=eq.${encodeURIComponent(row.id)}&limit=1`);
    if (existing.length) return existing[0].event_id;
    const score = Number(row.raw_payload?.prefilter?.score || 50);
    const created = await api("/rest/v1/events", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: row.title,
        event_type: inferEventType(row),
        theme: row.sources?.name || "待归类",
        summary: excerpt(row.body_text, 360) || "正文摘要待补充",
        happened_at: row.published_at,
        status: "pending",
        confidence: Math.max(0, Math.min(1, score / 100)),
        created_by: "admin-accepted-document"
      })
    });
    const event = created[0];
    await api("/rest/v1/event_evidence", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_id: event.id,
        document_id: row.id,
        quote_text: excerpt(row.body_text, 500),
        evidence_role: "primary"
      })
    });
    return event.id;
  }

  async function updateDocumentStatus(id, processing_status) {
    const row = documents.find(item => item.id === id);
    await api(`/rest/v1/raw_documents?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ processing_status })
    });
    if (processing_status === "accepted" && row) await createCandidateEvent(row);
    await Promise.all([loadDocuments(), loadStats()]);
  }

  function openDocument(id) {
    const row = documents.find(item => item.id === id);
    if (!row) return;
    const url = safeUrl(row.canonical_url);
    $("documentDetail").innerHTML = `
      <span class="eyebrow">${escapeHtml(row.sources?.name || "未知来源")}</span>
      <h2>${escapeHtml(row.title)}</h2>
      <div class="detail-meta">
        <span>${escapeHtml(statusLabels[row.processing_status] || row.processing_status)}</span>
        <span>发布：${escapeHtml(formatDate(row.published_at))}</span>
        <span>采集：${escapeHtml(formatDate(row.collected_at, true))}</span>
        <span>机器初筛：${escapeHtml(row.raw_payload?.prefilter?.score ?? "—")} 分</span>
      </div>
      ${row.raw_payload?.prefilter ? `<div class="score-reason">命中主题：${escapeHtml((row.raw_payload.prefilter.topic_hits || []).join("、") || "无")} · 价值信号：${escapeHtml((row.raw_payload.prefilter.value_hits || []).join("、") || "无")}</div>` : ""}
      <div class="detail-body">${escapeHtml(row.body_text || "暂无正文摘要。")}</div>
      <div class="document-actions">
        ${url ? `<a class="button secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开原始页面 ↗</a>` : ""}
        <button data-dialog-action="accepted" data-id="${escapeHtml(row.id)}">采纳</button>
        <button data-dialog-action="needs_review" data-id="${escapeHtml(row.id)}" class="warning">待核验</button>
        <button data-dialog-action="ignored" data-id="${escapeHtml(row.id)}" class="danger">忽略</button>
      </div>`;
    $("documentDialog").showModal();
  }

  async function loadQueue() {
    events = await api(`/rest/v1/events?select=id,title,event_type,theme,summary,purpose,product_strategy,core_strategy,actions,channels,happened_at,status,confidence,brands(name),event_evidence(document_id,quote_text,raw_documents(title,canonical_url,body_text,sources(name)))&status=eq.${activeEventStatus}&order=created_at.desc&limit=100`);
    $("workspaceSummary").textContent = `${events.length} 条事件 · 当前状态：${activeEventStatus}`;
    $("eventQueue").innerHTML = events.length ? events.map(row => `
      <article class="event-card" data-id="${escapeHtml(row.id)}">
        <div class="event-meta"><span>${escapeHtml(row.brands?.name || "待归类")}</span><span>${escapeHtml(row.event_type || "未分类")}</span><span>${escapeHtml(formatDate(row.happened_at))}</span><span>置信度 ${escapeHtml(row.confidence ?? "—")}</span></div>
        <h3>${escapeHtml(row.title)}</h3><p>${escapeHtml(row.summary || row.theme || "暂无摘要")}</p>
        <div class="evidence-count">${row.event_evidence?.length || 0} 条证据</div>
        <div class="event-actions">
          ${row.status === "pending" ? '<button data-event-preview>生成看板预览</button>' : ""}
          ${row.status === "pending" ? '<button data-action="needs_evidence" class="warning">证据不足</button><button data-action="rejected" class="danger">驳回</button>' : ""}
          ${row.status === "approved" ? '<button data-event-preview class="secondary">查看已发布画面</button>' : ""}
        </div>
      </article>`).join("") : '<div class="empty">当前没有事件记录</div>';
  }

  function openEventPreview(id) {
    const row = events.find(item => item.id === id);
    if (!row) return;
    const evidence = row.event_evidence || [];
    $("eventPreview").innerHTML = `
      <span class="eyebrow">DASHBOARD PREVIEW · 看板发布预览</span>
      <article class="dashboard-preview-card">
        <div class="preview-meta"><span>${escapeHtml(row.brands?.name || "待归类")}</span><span>${escapeHtml(row.event_type || "行业动态")}</span><span>${escapeHtml(formatDate(row.happened_at))}</span></div>
        <h2>${escapeHtml(row.title)}</h2>
        <p>${escapeHtml(row.summary || "暂无摘要")}</p>
        <div class="preview-section"><strong>主题判断</strong><span>${escapeHtml(row.theme || "待补充")}</span></div>
        <div class="preview-section"><strong>核心策略</strong><span>${escapeHtml(row.core_strategy || row.purpose || "待人工补充")}</span></div>
        <div class="preview-section"><strong>证据来源</strong>${evidence.length ? evidence.map(item => {
          const doc = item.raw_documents || {};
          const url = safeUrl(doc.canonical_url);
          return `<span>${escapeHtml(doc.sources?.name || "未知来源")} · ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.title || "打开原文")} ↗</a>` : escapeHtml(doc.title || "原文")}</span>`;
        }).join("") : "<span>暂无关联证据</span>"}</div>
      </article>
      <div class="preview-warning">这是最终公开画面的数据预览。确认后才会写入公开看板；如内容不完整，请关闭并标记“证据不足”。</div>
      <div class="document-actions">
        ${row.status !== "approved" ? `<button data-confirm-publish data-id="${escapeHtml(row.id)}">确认发布到看板</button>` : '<span class="published-badge">已发布到公开看板</span>'}
        <button data-close-preview class="secondary">返回审核</button>
      </div>`;
    $("eventPreviewDialog").showModal();
  }

  async function updateEventStatus(id, status) {
    await api(`/rest/v1/events?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
    await loadQueue();
  }

  function mergedSources() {
    const databaseMap = new Map(sourceRows.map(row => [row.name, row]));
    return sourceConfig.map(item => ({ ...item, database: databaseMap.get(item.name) || null }));
  }

  function renderSources() {
    const rows = mergedSources();
    $("sourceCount").textContent = rows.length;
    $("workspaceSummary").textContent = `${rows.length} 个来源已登记；成功状态来自 Supabase 最近采集记录。`;
    $("sourceGrid").innerHTML = rows.map(item => {
      const db = item.database;
      const url = safeUrl(item.entry_url || item.base_url);
      const effectiveEnabled = db?.enabled ?? item.enabled;
      const state = !effectiveEnabled ? "已暂停" : db ? "已接通" : "待适配";
      const sourceStats = statsRows.filter(row => row.source_id === db?.id);
      const useful = sourceStats.filter(row => ["new", "needs_review", "accepted"].includes(row.processing_status)).length;
      const rate = sourceStats.length ? Math.round(useful / sourceStats.length * 100) : 0;
      return `<article class="source-card">
        <div class="source-card-head"><span class="status-pill ${db ? "status-accepted" : "status-needs_review"}">${state}</span><small>${escapeHtml(item.platform || "其他来源")}</small></div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${db?.last_collected_at ? "最近成功：" + escapeHtml(formatDate(db.last_collected_at, true)) : "尚无成功采集时间"}</p>
        <p class="source-quality">近批资料 ${sourceStats.length} 条 · 初筛保留率 ${rate}%</p>
        <div class="source-foot"><span>每 ${escapeHtml(db?.collection_interval_minutes || item.collection_interval_minutes || 360)} 分钟</span>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>` : ""}</div>
        ${db ? `<button class="source-toggle secondary" data-source-id="${escapeHtml(db.id)}" data-source-enabled="${effectiveEnabled ? "false" : "true"}">${effectiveEnabled ? "暂停采集" : "恢复采集"}</button>` : ""}
      </article>`;
    }).join("");
  }

  async function activateView(view) {
    activeView = view;
    document.querySelectorAll(".primary-tabs button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    $("documentView").hidden = !["inbox", "accepted"].includes(view);
    $("eventView").hidden = view !== "events";
    $("sourceView").hidden = view !== "sources";
    $("statsGrid").hidden = view === "sources";
    const titles = { inbox: "采集收件箱", accepted: "已采纳资料", events: "事件审核", sources: "信息源管理" };
    $("workspaceTitle").textContent = titles[view];
    if (view === "accepted") {
      $("documentStatus").value = "accepted";
      $("documentStatus").disabled = true;
      await loadDocuments();
    } else if (view === "inbox") {
      $("documentStatus").disabled = false;
      if ($("documentStatus").value === "accepted") $("documentStatus").value = "new";
      await loadDocuments();
    } else if (view === "events") {
      await loadQueue();
    } else {
      renderSources();
    }
  }

  async function bootstrap() {
    await Promise.all([loadSourceData(), loadStats()]);
    await activateView("inbox");
  }

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("loginStatus").textContent = "正在登录……";
    try {
      if (!configured()) throw new Error("尚未配置 Supabase。");
      await login($("email").value, $("password").value);
      $("loginPanel").hidden = true;
      $("workspace").hidden = false;
      await bootstrap();
    } catch (error) {
      $("loginStatus").textContent = error.message.includes("permission")
        ? "账号已登录，但没有管理员权限。"
        : error.message;
    }
  });

  document.querySelector(".primary-tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) activateView(button.dataset.view).catch(showError);
  });
  $("documentSearch").addEventListener("input", renderDocuments);
  $("documentStatus").addEventListener("change", () => loadDocuments().catch(showError));
  $("sourceFilter").addEventListener("change", () => loadDocuments().catch(showError));
  $("refreshDocuments").addEventListener("click", () => Promise.all([loadSourceData(), loadStats(), loadDocuments()]).catch(showError));

  $("documentQueue").addEventListener("click", event => {
    const card = event.target.closest("[data-id]");
    if (!card) return;
    if (event.target.closest("[data-open-document]")) return openDocument(card.dataset.id);
    const action = event.target.closest("[data-doc-action]")?.dataset.docAction;
    if (action) updateDocumentStatus(card.dataset.id, action).catch(showError);
  });

  $("documentDetail").addEventListener("click", event => {
    const button = event.target.closest("[data-dialog-action]");
    if (!button) return;
    updateDocumentStatus(button.dataset.id, button.dataset.dialogAction)
      .then(() => $("documentDialog").close()).catch(showError);
  });
  $("closeDocumentDialog").addEventListener("click", () => $("documentDialog").close());

  $("eventQueue").addEventListener("click", event => {
    const card = event.target.closest("[data-id]");
    if (card && event.target.closest("[data-event-preview]")) return openEventPreview(card.dataset.id);
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action && card) updateEventStatus(card.dataset.id, action).catch(showError);
  });
  $("eventPreview").addEventListener("click", event => {
    const publish = event.target.closest("[data-confirm-publish]");
    if (publish) {
      updateEventStatus(publish.dataset.id, "approved").then(() => {
        $("eventPreviewDialog").close();
        alert("已发布到公开研究看板。");
      }).catch(showError);
    }
    if (event.target.closest("[data-close-preview]")) $("eventPreviewDialog").close();
  });
  $("closeEventPreview").addEventListener("click", () => $("eventPreviewDialog").close());

  $("sourceGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-source-id]");
    if (!button) return;
    api(`/rest/v1/sources?id=eq.${encodeURIComponent(button.dataset.sourceId)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ enabled: button.dataset.sourceEnabled === "true" })
    }).then(() => loadSourceData()).then(renderSources).catch(showError);
  });
  document.querySelector(".event-filters").addEventListener("click", event => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    activeEventStatus = button.dataset.status;
    document.querySelectorAll(".event-filters button").forEach(item => item.classList.toggle("active", item === button));
    loadQueue().catch(showError);
  });

  function showError(error) {
    console.error(error);
    alert(error.message || "操作失败");
  }

  $("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("monthlyKnowToken");
    location.reload();
  });

  if (token && configured()) {
    $("loginPanel").hidden = true;
    $("workspace").hidden = false;
    bootstrap().catch(() => {
      sessionStorage.removeItem("monthlyKnowToken");
      location.reload();
    });
  }
})();
