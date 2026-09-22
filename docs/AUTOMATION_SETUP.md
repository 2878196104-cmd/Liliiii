# Monthly Know 自动化部署

## 1. 创建数据库

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/migrations/202609210001_intelligence_core.sql`。
3. 在 Project Settings → API Keys 复制 Project URL、Publishable Key 和 Secret Key。
4. 在 Authentication → Users 中创建管理员用户。
5. 在 SQL Editor 执行：

```sql
insert into public.profiles (user_id, display_name, is_admin)
select id, email, true
from auth.users
where email = '你的管理员邮箱'
on conflict (user_id) do update set is_admin = true;
```

Secret Key 只能作为 GitHub Secret 使用，禁止写入网页、Issue、聊天记录或仓库。

## 2. 连接网页

`runtime-config.js` 只填写：

- Project URL
- Publishable Key

页面优先读取数据库中的 `approved_events`，连接失败时回退到仓库中的静态样本。

## 3. 配置采集器

信息源保存在 `config/sources.json`。

采集器支持：

- RSS/Atom
- 公开网页栏目
- 标题和正文关键词过滤
- 原文链接与内容哈希去重
- 单一来源失败隔离
- 来源最近成功采集时间
- 采集前相关性、策略价值、来源可信度、时效性和完整度评分
- 高价值、待核验、自动忽略三级分流
- 对既有未处理资料重新评分

GitHub 仓库 Settings → Secrets and variables → Actions 必须包含：

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

调度器每 6 小时运行一次；来源自身频次由 `collection_interval_minutes` 控制。目前 18 个来源每 6 小时采集，2 个来源每 12 小时采集。手动运行可选择强制忽略频次。

## 4. 使用管理者采集后台

打开：

<https://2878196104-cmd.github.io/Liliiii/admin.html>

使用第 1 步创建的 Supabase Auth 管理员账号登录。

后台包括：

- 采集收件箱
- 待判断、待核验、已采纳、已忽略状态
- 标题、摘要、来源和原文核验
- 已采纳证据资料库
- 事件审核
- 信息源状态

“采纳”会将原始文章进入证据资料库，并创建带原文证据关系的候选事件，但不会直接发布到公开看板。

## 5. 发布规则

1. 采集器写入 `raw_documents`。
2. 人工将资料标记为 `accepted`。
3. 后台自动从已采纳资料生成 `pending` 候选事件并绑定原始证据。
4. 自动生成事件默认状态为 `pending`。
5. 管理员先打开与正式卡片一致的看板预览。
6. 只有在预览中点击“确认发布到看板”，事件才变为 `approved`。
7. 公开看板只读取 `approved_events`。

## 6. 当前边界

- 部分动态渲染网站需要专用适配器。
- 小红书、微博、抖音使用授权接口、合规服务或人工导入。
- 已完成“采集 → 机器初筛 → 人工采纳 → 候选事件 → 看板预览 → 确认发布”。
- 下一阶段是相似报道聚类、品牌实体识别和洞察草稿生成。
- GitHub Pages 承担前端，Supabase 承担数据、权限和实时能力。
