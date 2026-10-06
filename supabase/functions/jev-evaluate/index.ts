const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const jevApiKey = Deno.env.get("JEV_API_KEY") || "";
const jevApiUrl = Deno.env.get("JEV_API_URL") || "https://jev-ai.org/api/v1/systemone/";
const jevModel = Deno.env.get("JEV_MODEL") || "jev-1.13";

type DocumentRow = {
  id: string;
  title: string;
  body_text: string | null;
  canonical_url: string;
  published_at: string | null;
  raw_payload: Record<string, unknown> | null;
  sources: { name?: string; platform?: string; trust_level?: number } | null;
};

function score(answer: Record<string, unknown> | undefined) {
  const value = Number(answer?.score);
  if (!Number.isFinite(value)) return 0;
  // All scoring questions below use five tiers, so Jev returns a decimal on a 0..4 scale.
  return Math.round(Math.max(0, Math.min(100, value / 4 * 100)));
}

function confidenceOf(answer: Record<string, unknown> | undefined) {
  const value = Number(answer?.confidence);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function choiceOf(answer: Record<string, unknown> | undefined, fallback: string) {
  const value = answer?.choice;
  return typeof value === "string" && value ? value : fallback;
}

async function isAdmin(authorization: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/is_monthly_know_admin`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: authorization, "Content-Type": "application/json" },
    body: "{}",
  });
  return response.ok && await response.json() === true;
}

async function loadDocuments(ids: string[]) {
  const query = new URLSearchParams({
    select: "id,title,body_text,canonical_url,published_at,raw_payload,sources(name,platform,trust_level)",
    id: `in.(${ids.join(",")})`,
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/raw_documents?${query}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`读取资料失败（${response.status}）`);
  return await response.json() as DocumentRow[];
}

async function evaluate(document: DocumentRow) {
  const state = {
    title: document.title,
    content: (document.body_text || "").slice(0, 9000),
    source: document.sources?.name || "未知来源",
    platform: document.sources?.platform || "公开网页",
    source_trust_level: document.sources?.trust_level || 1,
    published_at: document.published_at,
    url: document.canonical_url,
  };
  const questions = {
    relevance: { type: "score", instructions: "这条资料与品牌营销、家居、睡眠、消费趋势、竞品动作或目标人群研究的直接相关程度。", criteria: ["无关", "弱相关", "相关", "高度相关", "核心证据"] },
    novelty: { type: "score", instructions: "相较于常见行业信息，这条资料包含新事实、新变化或新信号的程度；重复搬运和泛泛观点应低分。", criteria: ["重复噪声", "少量新增", "有新信息", "明显新信号", "独特关键发现"] },
    strategic_value: { type: "score", instructions: "这条资料支撑市场趋势、人群矛盾、竞品动作、品牌机会或案例判断的策略价值。", criteria: ["无策略价值", "仅供背景", "可作辅助", "值得研究", "关键策略证据"] },
    source_quality: { type: "score", instructions: "根据来源身份、事实完整度、可核验性和证据清晰度判断信息质量。", criteria: ["不可依赖", "证据较弱", "基本可用", "质量良好", "高质量一手证据"] },
    category: { type: "choice", instructions: "按资料主要研究价值选择一个最匹配的品类。睡眠包括床垫、枕头、寝具、助眠、睡眠科技与睡眠服务；家居包括家具、全屋与家纺；健康疗愈包括身心健康、情绪与放松。", criteria: { sleep: "睡眠", home: "家居", health_wellness: "健康疗愈", lifestyle: "生活方式", other: "其他" } },
    subcategory: { type: "choice", instructions: "选择这条资料最主要的细分类目。", criteria: { mattress: "床垫与智能床", bedding: "枕被与床品寝具", sleep_tech: "睡眠科技与监测", sleep_service: "酒店、内容或助眠服务", furniture: "家具与全屋", wellness: "健康与情绪疗愈", other: "其他" } },
    marketing_objective: { type: "choice", instructions: "判断该案例最主要解决的营销任务；只选一个主任务。", criteria: { product_launch: "新品上市", brand_building: "品牌心智", seasonal_campaign: "节点营销", consumer_education: "用户教育", conversion: "渠道转化", community: "社群经营", other: "其他" } },
    reference_scope: { type: "choice", instructions: "判断这条资料最适合作为什么范围的参考。直接竞品指核心跟踪品牌；品类参考指同一需求或赛道的其他品牌；跨界灵感指其他行业但营销方法可迁移。", criteria: { direct_competitor: "直接竞品", category_reference: "品类参考", cross_category_inspiration: "跨界灵感" } },
    audience_need: { type: "choice", instructions: "从案例表达中选择最核心的消费者需求。", criteria: { better_sleep: "改善睡眠", stress_relief: "减压与情绪放松", health_management: "健康管理", comfort_upgrade: "舒适与品质升级", self_expression: "审美与自我表达", family_care: "家庭关怀", other: "其他" } },
    occasion: { type: "choice", instructions: "选择该案例主要借势或发生的场景。", criteria: { world_sleep_day: "世界睡眠日", seasonal: "季节或节日节点", festival: "品牌节或行业节", launch: "新品发布", daily: "日常长期传播", other: "其他" } },
    confidence: { type: "noul", instructions: "现有标题、正文、来源和时间信息是否足以对这条资料作出可靠的筛选判断？" },
    recommendation: { type: "choice", instructions: "这条资料进入人工策略研究前最合适的处理建议是什么？", criteria: { accept: "建议保留并进入人工审核", review: "证据不足或判断接近，需要人工复核", reject: "相关性或价值过低，建议过滤" } },
  };
  const response = await fetch(jevApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jevApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `monthly-know-${document.id}-${crypto.randomUUID()}`,
    },
    body: JSON.stringify({ model: jevModel, state, questions }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Jev 请求失败（${response.status}）`);
  const answers = payload.answers || {};
  const recommendation = answers.recommendation?.choice || "review";
  const confidence = Number(answers.confidence?.noul ?? confidenceOf(answers.recommendation));
  const result = {
    relevance: score(answers.relevance),
    novelty: score(answers.novelty),
    strategic_value: score(answers.strategic_value),
    source_quality: score(answers.source_quality),
    category: choiceOf(answers.category, "other"),
    subcategory: choiceOf(answers.subcategory, "other"),
    marketing_objective: choiceOf(answers.marketing_objective, "other"),
    reference_scope: choiceOf(answers.reference_scope, "category_reference"),
    audience_need: choiceOf(answers.audience_need, "other"),
    occasion: choiceOf(answers.occasion, "other"),
    confidence,
    recommendation,
    status: confidence < 0.65 ? "review" : recommendation === "accept" ? "pass" : recommendation === "reject" ? "filter" : "review",
    model: payload.model || jevModel,
    model_version: payload.model_version || null,
    evaluated_at: new Date().toISOString(),
    adapter: "jev-systemone-v1",
  };
  const rawPayload = { ...(document.raw_payload || {}), jev: result };
  const update = await fetch(`${supabaseUrl}/rest/v1/raw_documents?id=eq.${encodeURIComponent(document.id)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ raw_payload: rawPayload }),
  });
  if (!update.ok) throw new Error(`写回结果失败（${update.status}）`);
  return { id: document.id, result };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "请先登录管理员账号。" }, 401);
  if (!await isAdmin(authorization)) return json({ error: "当前账号没有管理员权限。" }, 403);
  if (request.method === "GET") return json({ configured: Boolean(jevApiKey), model: jevModel, adapter: "jev-systemone-v1" });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!jevApiKey) return json({ error: "服务端尚未配置 JEV_API_KEY。" }, 503);

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.document_ids)
    ? [...new Set(body.document_ids.filter((id: unknown) => typeof id === "string"))].slice(0, 100)
    : [];
  if (!ids.length) return json({ error: "document_ids 必须包含 1–100 个资料 ID。" }, 400);

  try {
    const documents = await loadDocuments(ids);
    const results = [];
    const errors = [];
    let cursor = 0;
    const workerCount = Math.min(6, documents.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (cursor < documents.length) {
        const document = documents[cursor++];
        try { results.push(await evaluate(document)); }
        catch (error) { errors.push({ id: document.id, error: error instanceof Error ? error.message : "判断失败" }); }
      }
    }));
    return json({ requested: ids.length, completed: results.length, failed: errors.length, results, errors });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Jev 服务异常" }, 500);
  }
});
