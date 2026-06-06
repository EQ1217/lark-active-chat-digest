# lark-active-chat-digest

飞书活跃大群摘要 skill：从当前用户可见且未免打扰的飞书群中，按活跃度筛选大群，提取最近消息中的高信号内容，并生成飞书消息卡片。

## 能力

- 支持最近 `1 / 3 / 7 / 15` 天摘要。
- 支持群数量上限 `5 / 10 / 15 / 20`。
- 支持自定义成员数阈值，例如只看 50 人、100 人或 200 人以上的群。
- 忽略免打扰群。
- 支持忽略指定群名。
- 重点关注：
  - `@所有人`
  - 回复数或点赞/表情数超过阈值
  - 群主/管理员发言
  - 默认关键词或用户自定义关键词
- 输出飞书 `interactive` 消息卡片。
- 发送给自己或指定会话前会先执行 dry-run，并等待用户确认。

## 文件

```text
lark-active-chat-digest/
├── CLAUDE.md
├── README.md
├── SKILL.md
├── evals/
│   └── evals.json
└── scripts/
    └── build-card.mjs
```

## 使用前提

需要已配置 `lark-cli`，并按 user 身份授权读取当前用户可见的群聊、群消息和互动数据。发送卡片通常使用 bot 身份。

详见 [SKILL.md](SKILL.md)。

## 本地验证

```bash
node --check scripts/build-card.mjs
python3 -m json.tool evals/evals.json >/dev/null
```
