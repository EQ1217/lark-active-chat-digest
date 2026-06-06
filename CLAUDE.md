# lark-active-chat-digest 开发规则

## 目录结构

- `SKILL.md`：skill 主说明，包含触发描述、执行流程、权限和输出约束。
- `scripts/`：确定性辅助脚本，只放可复用的小工具。
- `evals/`：skill 行为测试提示和断言，修改时说明意图，避免把测试写成只适配某一次输出。
- `README.md`：面向 GitHub 的项目说明。

## 修改原则

- 先更新规则，再更新实现；涉及默认行为、权限、发送确认、成员数筛选等约束时优先改 `SKILL.md`。
- 飞书写操作必须 dry-run 并等待用户明确确认，不能绕过 `lark-shared` 规则。
- 成员数筛选必须区分“明确超过阈值”“明确未达阈值”“未知”，未知不能被描述成已超过阈值。
- 不把真实用户 token、open_id 以外的敏感凭据、消息原文样本或私有业务数据提交进仓库。
- evals 用来描述期望行为，不写死真实飞书数据。

## 验证命令

修改后至少运行：

```bash
node --check scripts/build-card.mjs
python3 -m json.tool evals/evals.json >/dev/null
```

如果修改了卡片脚本，额外用一个临时 digest 生成卡片并校验 JSON。
