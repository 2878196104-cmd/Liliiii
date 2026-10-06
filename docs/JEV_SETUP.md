# Jev 接入配置

前端不会接触 Jev API Key。管理员登录后，`admin.html` 只调用 Supabase Edge Function `jev-evaluate`；函数在服务端读取资料、调用 Jev，再把结构化结果写回 `raw_documents.raw_payload.jev`。

## 最少配置

```bash
supabase secrets set JEV_API_KEY=你的服务端密钥
supabase secrets set JEV_API_URL=https://jev-ai.org/api/v1/systemone/
supabase secrets set JEV_MODEL=jev-1.13
supabase functions deploy jev-evaluate
```

只有 `JEV_API_KEY` 必填。默认 adapter 使用 Jev System One 的 `state + questions` 协议；更换供应商时只需修改 `JEV_API_URL`，若响应字段不同则调整 `supabase/functions/jev-evaluate/index.ts` 中的 `evaluate` 映射。

## 返回与存储

每条资料会得到：

- `relevance`：0–100
- `novelty`：0–100
- `strategic_value`：0–100
- `source_quality`：0–100
- `category`：`sleep` / `home` / `health_wellness` / `lifestyle` / `other`
- `subcategory`：床垫、寝具、睡眠科技、睡眠服务、家具、健康疗愈等细分类
- `marketing_objective`：新品上市、品牌心智、节点营销、用户教育、渠道转化或社群经营
- `reference_scope`：直接竞品、品类参考或跨界灵感
- `audience_need`：改善睡眠、减压、健康管理、舒适升级等核心需求
- `occasion`：世界睡眠日、季节节点、品牌节、新品发布或日常传播
- `confidence`：0–1
- `recommendation`：`accept` / `review` / `reject`
- `status`：`pass` / `review` / `filter`

Jev 不直接删除、采纳或发布资料。低置信度内容仍进入人工复核，避免模型判断覆盖原始证据与管理员决策。

后台的“批量审核全部最新资料”会审核当前筛选结果（页面最多加载最近 250 条），浏览器按每批 100 条提交，Edge Function 在每批内最多并发处理 6 条。单条失败会单独记录，不会中断整批。

升级到新的品类标签后，需要重新部署一次 `jev-evaluate`，再对旧资料运行批量审核，模型标签才会写回；部署前后台仍会用关键词规则提供临时分类，不影响检索。
