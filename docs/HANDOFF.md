# Monthly Know 自动化系统交接文档

更新日期：2026-09-21

## 1. 项目目标

将原本只包含静态 HTML 数据的营销情报看板，升级为可持续运行的情报系统：

```text
公开信息源 → 定时采集 → Supabase 原始资料库 → 事件/洞察提炼 → 人工审核 → 公开看板
```

仓库：<https://github.com/2878196104-cmd/Liliiii>  
线上看板：<https://2878196104-cmd.github.io/Liliiii/>  
审核后台：<https://2878196104-cmd.github.io/Liliiii/admin.html>

## 2. 当前完成状态

### 已完成

- Supabase 数据库结构已创建并验证。
- 前端已配置 Supabase URL 和 Publishable Key。
- GitHub Actions 已配置 Supabase Secret Key。
- 采集器支持 RSS/Atom 和公开网页栏目两种模式。
- 采集任务每 6 小时自动执行一次。
- 修改采集器、来源配置或工作流时会自动触发测试。
- 原始文章按“原文链接 + 内容哈希”去重。
- 单一来源失败不会阻断其他来源。
- 已配置 20 个来源，并完成真实抓取测试。

### 最近一次验证结果

运行记录：<https://github.com/2878196104-cmd/Liliiii/actions/runs/35583416399>

- 配置来源：20
- 可访问来源：18
- 实际产出内容：12
- 本轮新增：21 条
- 重复跳过：45 条
- 当时累计原始文档：约 66 条
- 工作流结论：Success

数据库中的实际数量会随定时任务继续增长，以上数字仅为交接时快照。

## 3. 系统结构

### 展示层

- `index.html`：入口，跳转到主看板。
- `skill-output-dashboard.html`：现有静态研究看板。
- `dashboard-api.js`：读取 Supabase 中已审核事件；失败时回退到静态内容。
- `runtime-config.js`：公开运行配置，只允许保存 URL 和 Publishable Key。
- `admin.html` / `admin.js`：审核后台基础页面。

### 采集层

- `config/sources.json`：信息源注册表。
- `scripts/collect.py`：RSS 和公开网页采集器。
- `.github/workflows/collect.yml`：每 6 小时执行采集，并在配置变更时自动测试。

### 数据层

主要 Supabase 表：

- `sources`：信息源。
- `raw_documents`：未经改写的原始文章与证据。
- `brands`：品牌标准名称。
- `events`：待审核或已审核的品牌事件。
- `event_evidence`：事件与原始文档的证据关系。
- `insights`：趋势判断和策略洞察。
- `insight_evidence`：洞察与原始文档的证据关系。
- `collection_runs`：采集运行记录。
- `profiles`：后台用户与管理员权限。

公开看板只读取 `approved_events` 视图，不会把未经审核的内容直接发布。

## 4. 已配置来源

### 营销与品牌媒体

- SocialBeta
- 数英 DIGITALING
- Morketing
- 广告门 ADQUAN
- 梅花网
- 品牌星球 BrandStar
- TOPMarketing
- 36氪

### 家居行业媒体

- 中国质量新闻网·家居建材
- 新浪家居
- 乐居财经
- 红星美凯龙资讯
- 网易家居
- 搜狐焦点家居
- 九正家居

### 协会、展会与品牌官网

- 中国家具协会
- CIFF 上海家博会
- CIFF 广州家博会
- 中国建博会 CBD
- 慕思官方资讯

### 当前异常

- 九正家居：返回 HTTP 405。
- 中国建博会 CBD：网站证书过期。
- 梅花网、36氪、TOPMarketing、网易家居、搜狐焦点家居、CIFF 上海：当前通用解析器可访问，但本轮未匹配到内容，需要单站适配。
- 小红书、微博、抖音：不使用非授权绕过方式；后续通过官方接口、合规服务或人工导入接入。

## 5. 如何确认采集结果

### 查看原始内容

打开 Supabase：

<https://supabase.com/dashboard/project/bksnawqgqsheiwrzdusb/editor>

重点查看：

1. `sources`：来源是否成功登记。
2. `raw_documents`：标题、原文链接、正文、发布时间、采集时间和处理状态。
3. `events`：后续由处理流程生成的待审核事件。
4. `insights`：后续生成的待审核洞察。

### 查看采集运行

<https://github.com/2878196104-cmd/Liliiii/actions/workflows/collect.yml>

绿色为成功。点进一次运行后查看 `Collect configured sources`，日志会列出每个来源的发现数量、失败原因和最终新增数。

### 手动运行

1. 打开上述 Actions 页面。
2. 点击 `Run workflow`。
3. 分支选择 `main`。
4. 再点击绿色 `Run workflow`。

## 6. 环境配置

GitHub Repository Secrets：

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

Secret Key 不得写入仓库、HTML、Issue、日志或交接文档。

公开前端配置位于 `runtime-config.js`：

- Supabase URL
- Publishable Key

Publishable Key 可以出现在浏览器端，但权限必须由 Supabase RLS 控制。

## 7. 当前最明显的断点

### 已补齐：管理者采集后台

审核后台现已提供：

- 最新采集文章列表
- 来源、发布时间和采集时间
- 标题、摘要与原文链接
- 待判断、待核验、已采纳、已忽略状态
- 信息源配置与最近成功采集状态
- 独立的事件审核工作区

采纳动作只进入证据资料库，不会直接发布到公开看板。

### 当前断点一：原始文章尚未自动生成事件与洞察

当前流程已完成“采集 → 存储”，尚未完成：

- 品牌识别
- 事件类型识别
- 摘要和证据句提取
- 相似报道聚类
- 待审核事件生成
- 趋势统计与洞察草稿
- 原始文档与事件/洞察的证据绑定

因此公开看板暂时不会自动出现新内容。

### 当前断点二：部分网站需要专用适配器

通用 HTML 解析适合作为第一版，但动态渲染、接口加载或特殊路径的网站需要单站规则。不要把“配置成功”当成“实际产生数据”，应以 Actions 日志中的 `discovered` 数量为准。

## 8. 下一阶段优先级

### P0：事件生成与审核

从原始文档生成 `pending` 事件，必须保留证据关系，不允许直接公开。

验收标准：

- 每个事件至少关联一条 `raw_documents`。
- 自动生成内容默认 `pending`。
- 管理员批准后才进入 `approved_events`。
- 拒绝或证据不足的事件不在公开看板显示。

### P1：来源适配与质量控制

- 为动态网站增加专用解析规则。
- 对转载内容做标题、正文相似度聚类。
- 增加来源健康状态、最近成功时间和连续失败次数。
- 将失效来源自动降级，但不自动删除。

### P2：社交与内部数据

- 小红书聚光导出文件人工上传。
- 品牌官方社交账号授权数据。
- 内部 Excel/CSV 研究材料导入。
- 搜索词、互动量等指标必须保留平台、时间范围和口径。

## 9. 数据与内容原则

- 原始证据不可被 AI 改写覆盖。
- 事实、推断和建议必须分层保存。
- 任何公开结论都应能够回到原文。
- 同一篇转载稿不能被当成多个独立证据。
- 搜索命中量不等于平台完整声量。
- 未公开的销量、预算、转化和用户数据不得推测补齐。
- 社交平台只使用授权接口、合规服务或人工导入。

## 10. 维护建议

- 每周查看一次 Actions 失败来源。
- 每月清理连续失败或长期零产出的来源。
- 修改 `config/sources.json` 后等待自动测试结果。
- 不要把 Secret Key 粘贴进代码或聊天记录。
- 扩充来源时优先考虑信息质量、更新频率和可追溯性，而不是单纯增加数量。
