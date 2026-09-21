(function () {
  const config = window.MONTHLY_KNOW_CONFIG;
  const badge = document.createElement("div");
  badge.className = "data-connection-badge";
  badge.setAttribute("role", "status");

  function mountBadge() {
    const toolbar = document.querySelector(".toolbar");
    if (toolbar && !badge.isConnected) toolbar.prepend(badge);
  }

  function status(label, tone) {
    mountBadge();
    badge.textContent = label;
    badge.dataset.tone = tone;
  }

  function headers() {
    return {
      apikey: config.supabaseAnonKey,
      Accept: "application/json"
    };
  }

  async function query(path) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, { headers: headers() });
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
    return response.json();
  }

  function mapEvent(row) {
    return {
      id: row.id,
      brand: row.brand || "待归类",
      event: row.title,
      date: row.happened_at ? row.happened_at.slice(0, 10) : "待确认",
      type: row.event_type || "其他",
      theme: row.theme || "",
      purpose: row.purpose || "",
      productStrategy: row.product_strategy || "",
      coreStrategy: row.core_strategy || "",
      actions: row.actions || [],
      channels: row.channels || [],
      result: row.summary || "",
      source: "Monthly Know 数据库",
      consumerInsights: [],
      research: {}
    };
  }

  async function hydrate() {
    if (!config?.supabaseUrl || !config?.supabaseAnonKey || config.supabaseUrl.includes("YOUR_PROJECT")) {
      status("静态样本", "fallback");
      return;
    }
    status("正在同步", "loading");
    try {
      const events = await query("approved_events?select=*&order=happened_at.desc&limit=250");
      if (events.length) {
        state.events = events.map(mapEvent);
        render();
      }
      status(`数据库已连接 · ${events.length} 条事件`, "live");
      window.dispatchEvent(new CustomEvent("monthly-know:data-ready", { detail: { events: events.length } }));
    } catch (error) {
      console.error("Monthly Know database sync failed", error);
      status("数据库异常 · 已回退样本", "error");
    }
  }

  window.MonthlyKnowAPI = { hydrate, query };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate, { once: true });
  } else {
    hydrate();
  }
})();
