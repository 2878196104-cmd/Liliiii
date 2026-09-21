(function () {
  const config = window.MONTHLY_KNOW_CONFIG || {};
  const $ = id => document.getElementById(id);
  let token = sessionStorage.getItem("monthlyKnowToken") || "";
  let activeStatus = "pending";

  function configured() {
    return config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes("YOUR_PROJECT");
  }

  async function api(path, options = {}) {
    const response = await fetch(`${config.supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${token || config.supabaseAnonKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
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

  async function loadQueue() {
    const rows = await api(`/rest/v1/events?select=id,title,event_type,theme,summary,happened_at,status,confidence,brands(name)&status=eq.${activeStatus}&order=created_at.desc&limit=100`);
    $("queueSummary").textContent = `${rows.length} 条记录 · 当前状态：${activeStatus}`;
    $("eventQueue").innerHTML = rows.length ? rows.map(row => `
      <article class="event-card" data-id="${row.id}">
        <div class="event-meta"><span>${row.brands?.name || "待归类"}</span><span>${row.event_type || "未分类"}</span><span>${row.happened_at?.slice(0,10) || "日期待确认"}</span><span>置信度 ${row.confidence ?? "—"}</span></div>
        <h3>${escapeHtml(row.title)}</h3><p>${escapeHtml(row.summary || row.theme || "暂无摘要")}</p>
        <div class="event-actions">
          <button data-action="approved">批准</button><button data-action="needs_evidence">证据不足</button><button data-action="rejected">驳回</button>
        </div>
      </article>`).join("") : '<div class="empty">当前没有记录</div>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  async function updateStatus(id, status) {
    await api(`/rest/v1/events?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
    await loadQueue();
  }

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    $("loginStatus").textContent = "正在登录……";
    try {
      if (!configured()) throw new Error("尚未配置 Supabase，请先完成自动化部署配置。 ");
      await login($("email").value, $("password").value);
      $("loginPanel").hidden = true; $("workspace").hidden = false;
      await loadQueue();
    } catch (error) { $("loginStatus").textContent = error.message; }
  });

  $("eventQueue").addEventListener("click", event => {
    const action = event.target.dataset.action;
    const card = event.target.closest("[data-id]");
    if (action && card) updateStatus(card.dataset.id, action).catch(error => alert(error.message));
  });
  document.querySelector(".filters").addEventListener("click", event => {
    if (!event.target.dataset.status) return;
    activeStatus = event.target.dataset.status;
    document.querySelectorAll(".filters button").forEach(button => button.classList.toggle("active", button === event.target));
    loadQueue().catch(error => alert(error.message));
  });
  $("logoutButton").addEventListener("click", () => { sessionStorage.removeItem("monthlyKnowToken"); location.reload(); });

  if (token && configured()) {
    $("loginPanel").hidden = true; $("workspace").hidden = false;
    loadQueue().catch(() => { sessionStorage.removeItem("monthlyKnowToken"); location.reload(); });
  }
})();
