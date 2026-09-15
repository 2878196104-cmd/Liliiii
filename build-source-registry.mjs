import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputPath = "D:/桌面文件/AI大赛.xlsx";
const outputDir = "outputs/source-registry";
const outputPath = path.join(outputDir, "AI大赛_营销情报来源库.xlsx");
const today = "2026-09-13";

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cellColumn(ref) {
  return ref.replace(/\d+/g, "");
}

function cellRow(ref) {
  return Number(ref.replace(/[A-Z]+/g, ""));
}

function columnNumber(col) {
  let num = 0;
  for (const ch of col) num = num * 26 + ch.charCodeAt(0) - 64;
  return num;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const items = xml.match(/<si[\s\S]*?<\/si>/g) || [];
  for (const item of items) {
    const parts = [...item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

function parseRelationships(xml) {
  const rels = {};
  if (!xml) return rels;
  const matches = xml.matchAll(/<Relationship\b([^>]+?)\/>/g);
  for (const match of matches) {
    const attrs = match[1];
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) rels[id] = decodeXml(target);
  }
  return rels;
}

async function extractBrandLinks() {
  const bytes = await fs.readFile(inputPath);
  const zip = await JSZip.loadAsync(bytes);
  const sharedStrings = parseSharedStrings(await zip.file("xl/sharedStrings.xml")?.async("string"));
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml").async("string");
  const relXml = await zip.file("xl/worksheets/_rels/sheet1.xml.rels").async("string");
  const rels = parseRelationships(relXml);

  const values = {};
  const cellMatches = sheetXml.matchAll(/<c\b([^>]*?)>([\s\S]*?)<\/c>/g);
  for (const match of cellMatches) {
    const attrs = match[1];
    const body = match[2];
    const ref = attrs.match(/\br="([^"]+)"/)?.[1];
    if (!ref) continue;
    const type = attrs.match(/\bt="([^"]+)"/)?.[1];
    const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
    let value = decodeXml(raw);
    if (type === "s") value = sharedStrings[Number(raw)] || "";
    values[ref] = value;
  }

  const hyperlinks = {};
  const linkMatches = sheetXml.matchAll(/<hyperlink\b([^>]+?)\/>/g);
  for (const match of linkMatches) {
    const attrs = match[1];
    const ref = attrs.match(/\bref="([^"]+)"/)?.[1];
    const relId = attrs.match(/\br:id="([^"]+)"/)?.[1];
    if (ref && relId && rels[relId]) hyperlinks[ref] = rels[relId];
  }

  const brands = {};
  for (const [ref, value] of Object.entries(values)) {
    if (cellRow(ref) === 1 && columnNumber(cellColumn(ref)) >= 2) {
      brands[cellColumn(ref)] = value;
    }
  }

  const channelByRow = {};
  let currentChannel = "";
  for (let row = 1; row <= 80; row += 1) {
    const label = values[`A${row}`];
    if (label) currentChannel = label;
    channelByRow[row] = currentChannel;
  }

  const rows = [];
  for (const [ref, value] of Object.entries(values)) {
    const row = cellRow(ref);
    const col = cellColumn(ref);
    const brand = brands[col];
    if (!brand || row < 3) continue;
    const url = hyperlinks[ref] || (String(value).startsWith("http") ? value : "");
    if (!url) continue;
    const channel = channelByRow[row] || "未分类";
    rows.push({
      layer: "品牌自有矩阵",
      brand,
      channel,
      name: value || `${brand} ${channel}`,
      url,
      use: ownedUse(channel),
      monitorFor: ownedMonitorFor(channel),
      priority: ["官网", "集团官方"].includes(channel) ? "P0" : "P1",
      frequency: ["小红书", "微博", "抖音"].includes(channel) ? "每日" : "每周",
      skill: ["小红书", "微博", "抖音"].includes(channel) ? "competitor-profiling + last30days" : "competitor-profiling",
      login: ["小红书", "微博", "抖音"].includes(channel) ? "可能需要" : "否",
      note: "来自原始工作簿超链接"
    });
  }

  return rows.sort((a, b) => a.brand.localeCompare(b.brand, "zh-CN") || a.channel.localeCompare(b.channel, "zh-CN"));
}

function ownedUse(channel) {
  const map = {
    "官网": "抓取品牌介绍、产品体系、新品发布、活动公告和站内新闻。",
    "集团官方": "抓取集团战略、品牌升级、渠道布局、投资者或新闻中心内容。",
    "小红书": "观察种草内容、达人合作、用户评论、场景卖点和矩阵号内容变化。",
    "微博": "观察官方公告、话题运营、节点营销、明星合作和公关传播。",
    "抖音": "观察短视频内容、直播间动作、电商节点、达人内容和爆款素材。"
  };
  return map[channel] || "补充品牌公开内容和营销动作线索。";
}

function ownedMonitorFor(channel) {
  const map = {
    "官网": "新品、发布会、品牌主张、产品线、门店与服务信息",
    "集团官方": "品牌战略、组织动作、渠道布局、重大合作、行业 PR",
    "小红书": "达人种草、用户反馈、热门笔记、生活方式场景、产品卖点",
    "微博": "品牌公告、话题活动、明星合作、节点营销、危机或口碑变化",
    "抖音": "短视频选题、直播活动、爆款素材、电商促销、达人联动"
  };
  return map[channel] || "营销活动和品牌动态";
}

const externalSources = [
  ["营销行业媒体", "", "营销案例", "数英 DIGITALING", "https://www.digitaling.com/", "追踪品牌营销案例、整合传播、创意代理公司案例和 Campaign 复盘。", "品牌活动、联名、传播主题、创意素材、行业讨论热度", "P0", "每周", "competitor-profiling", "否", "适合沉淀案例"],
  ["营销行业媒体", "", "社会化营销", "SocialBeta", "https://socialbeta.com/", "追踪社会化营销案例、趋势观察和内容传播玩法。", "社媒打法、年轻化传播、IP 联名、内容趋势", "P0", "每周", "competitor-profiling + last30days", "否", "适合关键词与案例双用"],
  ["营销行业媒体", "", "广告营销", "广告门", "https://www.adquan.com/", "追踪广告营销案例、品牌 Campaign、代理商案例和行业新闻。", "品牌主张、广告片、传播战役、营销事件", "P0", "每周", "competitor-profiling", "否", "适合 campaign 案例"],
  ["营销行业媒体", "", "营销资讯", "梅花网", "https://www.meihua.info/", "补充营销资讯、案例、活动和广告行业动态。", "营销案例、活动资讯、品牌 PR、行业大会", "P1", "每周", "competitor-profiling", "否", "补充来源"],
  ["营销行业媒体", "", "数字营销", "Morketing", "https://www.morketing.com/", "补充数字营销、电商营销、品牌增长和平台生态变化。", "营销趋势、平台玩法、电商节点、增长案例", "P1", "每周", "competitor-profiling + last30days", "否", "补充来源"],
  ["家居行业媒体", "", "行业媒体", "新浪家居", "https://jiaju.sina.com.cn/", "追踪家居品牌新闻、行业资讯、活动报道和卖场动态。", "家居品牌发布、展会、渠道、门店、行业观点", "P0", "每周", "competitor-profiling", "否", "家居行业优先源"],
  ["家居行业媒体", "", "行业媒体", "网易家居", "https://home.163.com/", "补充家居行业新闻、品牌动态和消费趋势内容。", "新品、品牌新闻、行业观察、消费者趋势", "P1", "每周", "competitor-profiling", "否", "补充来源"],
  ["家居行业媒体", "", "行业媒体", "搜狐焦点家居", "https://home.focus.cn/", "追踪家居、建材、家装品牌资讯和区域市场动态。", "门店、招商、活动、行业新闻", "P1", "每周", "competitor-profiling", "否", "补充来源"],
  ["家居行业媒体", "", "行业媒体", "腾讯家居", "https://www.jia360.com/", "补充泛家居品牌资讯、专题活动和行业深度内容。", "品牌动态、行业专题、展会活动", "P1", "每周", "competitor-profiling", "否", "补充来源"],
  ["展会/协会/产业入口", "", "展会", "中国家博会 CIFF", "https://www.ciff-gz.com/", "监控家居展会、新品集中发布、参展品牌和主题趋势。", "展会主题、参展品牌、新品发布、行业风向", "P0", "展前/展中每日，平时每月", "competitor-profiling", "否", "展会期提高频率"],
  ["展会/协会/产业入口", "", "展会", "中国建博会", "https://www.cbd-china.com/", "追踪建装、家居、定制与材料相关展会资讯。", "展会活动、品牌发布、招商动作、品类趋势", "P1", "展前/展中每日，平时每月", "competitor-profiling", "否", "展会期提高频率"],
  ["PR/综合媒体", "", "新闻稿", "美通社 PR Newswire", "https://www.prnasia.com/", "追踪企业新闻稿、品牌发布、战略合作、上市或新品类传播。", "官方 PR、合作发布、品牌战略、渠道信息", "P0", "每周", "competitor-profiling", "否", "PR 稿优先源"],
  ["PR/综合媒体", "", "商业媒体", "36氪", "https://36kr.com/", "补充商业媒体视角，尤其是消费品牌、零售、AI 工具和新商业模式。", "品牌融资、业务调整、新零售、消费趋势", "P1", "每周", "competitor-profiling + last30days", "否", "商业趋势补充"],
  ["PR/综合媒体", "", "综合媒体", "中国网", "http://www.china.com.cn/", "补充品牌新闻稿、企业动态和公共传播内容。", "品牌 PR、战略合作、企业动态、公益活动", "P1", "每周", "competitor-profiling", "否", "综合媒体补充"],
  ["PR/综合媒体", "", "综合媒体", "人民网", "http://www.people.com.cn/", "补充权威媒体报道和行业公共议题。", "政策、消费趋势、行业观点、企业动态", "P1", "每周", "competitor-profiling", "否", "权威媒体补充"],
  ["PR/综合媒体", "", "综合媒体", "新华网", "http://www.xinhuanet.com/", "补充权威媒体报道、品牌公关和行业公共议题。", "行业政策、企业动态、消费趋势", "P1", "每周", "competitor-profiling", "否", "权威媒体补充"],
  ["公开搜索入口", "", "搜索引擎", "百度组合查询", "https://www.baidu.com/", "用品牌名加发布会、联名、新品、门店焕新、品牌升级等关键词补漏。", "漏网新闻、区域报道、转载稿、长尾活动", "P0", "每周", "competitor-profiling + last30days", "否", "按关键词规则使用"],
  ["公开搜索入口", "", "内容搜索", "微信搜一搜", "https://weixin.sogou.com/", "补充公众号文章和行业垂直内容。", "公众号 PR、行业分析、案例拆解、区域活动", "P1", "每周", "competitor-profiling + last30days", "可能需要", "可能受访问限制"]
];

function externalRows() {
  return externalSources.map(([layer, brand, channel, name, url, use, monitorFor, priority, frequency, skill, login, note]) => ({
    layer,
    brand,
    channel,
    name,
    url,
    use,
    monitorFor,
    priority,
    frequency,
    skill,
    login,
    note
  }));
}

function toRows(records) {
  const headers = ["ID", "来源层级", "品牌", "渠道类型", "来源名称", "URL", "监控用途", "重点关键词/抓取规则", "优先级", "建议频率", "适用 Skill", "是否需要登录", "备注"];
  const body = records.map((record, index) => [
    `SRC-${String(index + 1).padStart(3, "0")}`,
    record.layer,
    record.brand,
    record.channel,
    record.name,
    record.url,
    record.use,
    record.monitorFor,
    record.priority,
    record.frequency,
    record.skill,
    record.login,
    record.note
  ]);
  return [headers, ...body];
}

function styleTable(sheet, rangeAddress, tableName) {
  const range = sheet.getRange(rangeAddress);
  range.format.font = { name: "Arial", size: 10, color: "#172033" };
  range.format.verticalAlignment = "center";
  range.format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  const header = sheet.getRange(rangeAddress.replace(/\d+:.+/, "1:M1"));
  header.format = {
    fill: "#1F4E78",
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" }
  };
  const table = sheet.tables.add(rangeAddress, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  return table;
}

function writeSheet(sheet, rows, tableName) {
  const colCount = rows[0].length;
  const rowCount = rows.length;
  sheet.getRangeByIndexes(0, 0, rowCount, colCount).values = rows;
  styleTable(sheet, `A1:M${rowCount}`, tableName);
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  sheet.getRange("A:A").format.columnWidth = 11;
  sheet.getRange("B:B").format.columnWidth = 18;
  sheet.getRange("C:C").format.columnWidth = 18;
  sheet.getRange("D:D").format.columnWidth = 14;
  sheet.getRange("E:E").format.columnWidth = 28;
  sheet.getRange("F:F").format.columnWidth = 44;
  sheet.getRange("G:H").format.columnWidth = 36;
  sheet.getRange("I:K").format.columnWidth = 16;
  sheet.getRange("L:L").format.columnWidth = 14;
  sheet.getRange("M:M").format.columnWidth = 22;
}

function addOverview(workbook, records) {
  const sheet = workbook.worksheets.add("总览");
  const brandCount = new Set(records.filter((r) => r.brand).map((r) => r.brand)).size;
  const ownedCount = records.filter((r) => r.layer === "品牌自有矩阵").length;
  const externalCount = records.length - ownedCount;
  const p0Count = records.filter((r) => r.priority === "P0").length;
  sheet.getRange("A1").values = [["营销情报来源库"]];
  sheet.getRange("A3:B8").values = [
    ["生成日期", today],
    ["覆盖品牌数", brandCount],
    ["品牌自有入口", ownedCount],
    ["外部监控源", externalCount],
    ["P0 优先源", p0Count],
    ["来源总数", records.length]
  ];
  sheet.getRange("D3:E6").values = [
    ["Skill", "推荐用途"],
    ["last30days", "关键词趋势、近 30 天热词、社媒声量和内容线索"],
    ["competitor-profiling", "竞品营销事件拆解、案例详情、品牌对比"],
    ["HTML 看板", "统一展示关键词、行业头条、竞品动作和信息源库"]
  ];
  sheet.getRange("A1").format.font = { name: "Arial", size: 16, bold: true, color: "#172033" };
  sheet.getRange("A3:B8").format.font = { name: "Arial", size: 10, color: "#172033" };
  sheet.getRange("D3:E6").format.font = { name: "Arial", size: 10, color: "#172033" };
  sheet.getRange("A3:A8").format = { fill: "#EAF2F8", font: { name: "Arial", size: 10, bold: true, color: "#172033" } };
  sheet.getRange("D3:E3").format = { fill: "#1F4E78", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
  sheet.getRange("A3:B8").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("D3:E6").format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("A:A").format.columnWidth = 16;
  sheet.getRange("B:B").format.columnWidth = 18;
  sheet.getRange("D:D").format.columnWidth = 22;
  sheet.getRange("E:E").format.columnWidth = 58;
  sheet.showGridLines = false;
  sheet.tabColor = "#1F4E78";
}

function addFieldGuide(workbook) {
  const sheet = workbook.worksheets.add("字段说明");
  const rows = [
    ["字段", "说明", "填法建议"],
    ["来源层级", "品牌自有矩阵、营销行业媒体、家居行业媒体、展会/协会/产业入口、PR/综合媒体、公开搜索入口。", "用于看板筛选和抓取策略分层。"],
    ["品牌", "品牌自有渠道填写品牌名；外部媒体可留空。", "品牌名建议和竞品库统一。"],
    ["渠道类型", "官网、小红书、微博、抖音、营销案例、行业媒体、新闻稿、搜索引擎等。", "用于判断抓取方式和内容解析方式。"],
    ["监控用途", "说明这个来源为什么值得看。", "写给运营同事和后续自动化脚本看。"],
    ["重点关键词/抓取规则", "该来源重点看哪些词或事件。", "例如 新品、发布会、联名、门店焕新、品牌升级。"],
    ["优先级", "P0 为每轮必看，P1 为补充，P2 为低频补漏。", "优先从 P0 建 MVP。"],
    ["建议频率", "每日、每周、每月、展前/展中每日。", "社媒和展会期频率更高。"],
    ["适用 Skill", "last30days、competitor-profiling 或两者。", "关键词趋势优先 last30days，营销事件优先 competitor-profiling。"],
    ["是否需要登录", "标注访问限制。", "小红书、抖音、微信搜一搜可能需要人工或账号环境。"]
  ];
  sheet.getRangeByIndexes(0, 0, rows.length, rows[0].length).values = rows;
  sheet.getRange(`A1:C${rows.length}`).format.font = { name: "Arial", size: 10, color: "#172033" };
  sheet.getRange("A1:C1").format = { fill: "#1F4E78", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
  sheet.getRange(`A1:C${rows.length}`).format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
  sheet.getRange("A:A").format.columnWidth = 22;
  sheet.getRange("B:C").format.columnWidth = 48;
  sheet.showGridLines = false;
}

const ownedRows = await extractBrandLinks();
const records = [...ownedRows, ...externalRows()];

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
addOverview(workbook, records);

const sourceSheet = workbook.worksheets.add("来源库");
writeSheet(sourceSheet, toRows(records), "SourceRegistry");
sourceSheet.tabColor = "#5B9BD5";

const brandSheet = workbook.worksheets.add("品牌自有矩阵");
writeSheet(brandSheet, toRows(ownedRows), "BrandOwnedMatrix");

const actionSheet = workbook.worksheets.add("动作分类");
const actionRows = [
  ["动作类型", "判断口径", "建议输出字段"],
  ["新品发布", "出现新系列、新产品、新技术、新材质或新品上市传播。", "产品/战略、核心卖点、渠道、素材、结果"],
  ["品牌升级", "品牌口号、视觉系统、品牌定位或生活方式主张发生明显变化。", "主题、核心策略、判断"],
  ["品类抢位", "围绕实木、睡眠、全屋、儿童、沙发等品类争夺心智。", "营销目的、产品/战略、核心策略"],
  ["年轻化", "面向年轻人、首套房、小户型、新婚等人群重写表达。", "目标人群、动作总结、素材"],
  ["联名/IP", "与 IP、艺术家、明星、设计师或跨界品牌合作。", "合作对象、动作、渠道、素材"],
  ["节点营销", "围绕 618、双 11、春节、开学季、家装季等节点。", "时间、渠道、促销机制、结果"],
  ["线下活动", "发布会、快闪、门店活动、展会、设计师沙龙。", "地点、动作、素材、结果"],
  ["达人传播", "KOL/KOC/达人笔记、短视频、直播种草。", "达人类型、内容角度、互动数据"]
];
actionSheet.getRangeByIndexes(0, 0, actionRows.length, actionRows[0].length).values = actionRows;
actionSheet.getRange(`A1:C${actionRows.length}`).format.font = { name: "Arial", size: 10, color: "#172033" };
actionSheet.getRange("A1:C1").format = { fill: "#1F4E78", font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" } };
actionSheet.getRange(`A1:C${actionRows.length}`).format.borders = { preset: "all", style: "thin", color: "#D9D9D9" };
actionSheet.getRange("A:A").format.columnWidth = 18;
actionSheet.getRange("B:C").format.columnWidth = 52;
actionSheet.showGridLines = false;

addFieldGuide(workbook);

workbook.recalculate();

const inspect = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 4000,
  tableMaxRows: 5,
  tableMaxCols: 6
});
console.log(inspect.ndjson);

const preview = await workbook.render({
  sheetName: "来源库",
  range: "A1:M18",
  scale: 1,
  format: "png"
});
await fs.writeFile(path.join(outputDir, "来源库-preview.png"), new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`saved=${outputPath}`);
console.log(`ownedRows=${ownedRows.length}`);
console.log(`totalRows=${records.length}`);

