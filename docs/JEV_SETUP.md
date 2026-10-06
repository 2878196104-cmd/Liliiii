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
- `confidence`：0–1
- `recommendation`：`accept` / `review` / `reject`
- `status`：`pass` / `review` / `filter`

Jev 不直接删除、采纳或发布资料。低置信度内容仍进入人工复核，避免模型判断覆盖原始证据与管理员决策。
