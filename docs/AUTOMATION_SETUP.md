# Monthly Know 自动化部署

## 1. 创建数据库

1. 创建 Supabase 项目。
2. 在 SQL Editor 执行 `supabase/migrations/202609210001_intelligence_core.sql`。
3. 在 Project Settings → API 复制 Project URL、anon key 和 service role key。
4. 在 Authentication 中创建管理员用户，再执行：

```sql
insert into public.profiles (user_id, display_name, is_admin)
select id, email, true from auth.users where email = '你的管理员邮箱';
```

`service role key` 只能作为 GitHub Secret 使用，禁止写入网页或提交到仓库。

## 2. 连接网页

复制 `runtime-config.example.js` 为 `runtime-config.js`，只填写 Project URL 和公开的 anon key。页面会优先读取数据库中的 `approved_events`，连接失败则自动回退到仓库内的静态样本。

## 3. 配置采集器

复制 `config/sources.example.json` 为 `config/sources.json`，添加经过确认的 RSS/Atom 来源并设置 `enabled: true`。不要添加禁止自动访问的页面。

在 GitHub 仓库 Settings → Secrets and variables → Actions 增加：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

采集任务默认每 6 小时运行一次，也可以从 Actions 页面手动触发。

## 4. 使用审核台

打开 `/admin.html`，使用上一步创建的管理员账号登录。审核台可以查看不同状态的事件，并执行批准、标记证据不足或驳回。公开看板只读取已批准事件。

## 5. 审核规则

采集器只写入 `raw_documents`，不会直接把未经确认的内容发布到看板。结构化事件写入 `events` 后默认状态为 `pending`；只有改为 `approved` 才会通过公开视图显示。

## 6. 当前边界

- 现阶段自动采集器支持标准 RSS/Atom。
- 小红书、抖音及聚光数据应使用授权接口、合规数据服务或人工文件导入。
- AI 提取与审核后台是下一阶段；数据库已预留 `processing_status`、`insights` 和证据关系。
- GitHub Pages 仍是静态前端，Supabase 承担数据、权限和实时能力。
