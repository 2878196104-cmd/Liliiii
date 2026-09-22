(function () {
  const config = window.MONTHLY_KNOW_CONFIG;
  // Keep the curated research already shipped with the dashboard. Live events are
  // an incremental layer; a successful database response must never erase the
  // historical competitor baseline.
  const baselineEvents = structuredClone(state?.events || []);
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

  function eventKey(event) {
    return [event.brand || "待归类", event.date || "待确认", event.event || ""]
      .map(value => String(value).trim().toLowerCase())
      .join("|");
  }

  function mergeEvents(liveRows) {
    const merged = baselineEvents.map(event => structuredClone(event));
    const positions = new Map(merged.map((event, index) => [eventKey(event), index]));
    liveRows.map(mapEvent).forEach(event => {
      const key = eventKey(event);
      const existingIndex = positions.get(key);
      if (existingIndex === undefined) {
        positions.set(key, merged.length);
        merged.push(event);
      } else {
        // A reviewed database record is authoritative for matching summary fields,
        // while the curated baseline retains richer research/material metadata.
        merged[existingIndex] = { ...merged[existingIndex], ...event };
      }
    });
    return merged;
  }

  async function hydrate() {
    if (!config?.supabaseUrl || !config?.supabaseAnonKey || config.supabaseUrl.includes("YOUR_PROJECT")) {
      status("静态样本", "fallback");
      return;
    }
    status("正在同步", "loading");
    try {
      const events = await query("approved_events?select=*&order=happened_at.desc&limit=250");
      state.events = mergeEvents(events);
      render();
      status(`历史研究 ${baselineEvents.length} 条 · 新发布 ${events.length} 条`, "live");
      window.dispatchEvent(new CustomEvent("monthly-know:data-ready", {
        detail: { events: events.length, baseline: baselineEvents.length, total: state.events.length }
      }));
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
