---
name: lark-active-chat-digest
version: 1.0.0
description: "飞书活跃大群摘要：自动找出当前用户最近活跃、成员数>50或成员数未知但未免打扰的群聊，让用户选择最近1天/3天/7天/15天和最多5/10/15/20个群后汇总关键消息，并用飞书消息卡片输出。当用户说‘总结最近活跃群’、‘看看大群这几天重点’、‘飞书群聊日报/周报/半月摘要’、‘筛选@所有人/高赞/管理员发言/关键词消息’、‘把活跃群重点发成飞书卡片’时使用。优先使用本 skill，而不是通用 lark-im 或 lark-message-summary。"
metadata:
  requires:
    bins: ["lark-cli"]
  cliHelp: "lark-cli im --help"
---

# 飞书活跃大群摘要

**CRITICAL — 开始前先用 Read 工具读取 [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md)，按其中的认证、身份、权限、写入确认规则执行。**

## 目标

为用户从飞书里找出“最近活跃的大群”，只看**未免打扰**，且**成员数明确大于用户选择阈值或成员数未知**的群，聚合用户选择时间范围内的消息，筛出真正值得关注的事项，并输出为飞书消息卡片。

这个 skill 不是普通未读摘要：它以“活跃大群”而非“未读数”为入口，重点捕捉公告、决策、风险、管理员/群主表态和互动高的讨论。

## 默认交互

如果用户没有明确指定，先用最少问题补齐这些选项：

1. 时间范围：必须让用户选择 `1天 / 3天 / 7天 / 15天`；不要静默替用户决定，因为这个选项直接影响 API 调用量、输出长度和总结粒度
2. 群聊数上限：必须让用户选择 `5 / 10 / 15 / 20`；不要静默替用户决定，因为这个选项直接影响 API 调用量和输出长度
3. 群人数边界：必须让用户选择或确认最小成员数阈值，默认选项建议为 `20 / 50 / 100 / 200`；用户也可以自然语言输入其他数字，例如“只看 80 人以上的群”
4. 关键词：如果用户没给，用“默认关键词集”；如果用户要求查看或修改关键词列表，按“关键词配置流程”处理
5. 忽略群白名单：如果 memory 里已有自动忽略群名，先应用；用户也可以在本轮自然语言追加，例如“以后忽略 XX 群”
6. 输出去向：默认只在对话里展示卡片 JSON 和简短预览；只有用户明确要求发送到某个飞书会话时，才发送

不要问“要不要忽略免打扰群”：固定忽略，用 `--exclude-muted`。

如果用户说“按默认来”“你决定”或上下文已经明确了选项，才使用默认：最近 `1天`、最多 `10` 个群、成员数阈值 `50`。否则第一步先同时询问时间范围、群聊数上限、群人数边界。

## 持久配置

用户可以用自然语言要求把偏好写进 memory，作为后续默认配置。只有用户明确表达“以后都用”“记住”“作为默认”“永久配置”时才写 memory；只对本轮生效的要求不要写。

可持久化的配置：

- 默认群人数边界，例如“以后只看 100 人以上的群”
- 自动忽略群白名单，例如“以后忽略 ByteMall 可爱天使话题群”

memory 写入建议：

- 写到 `/Users/bytedance/.claude/projects/-Users-bytedance/memory/`，一条事实一个文件
- `metadata.type` 使用 `user` 或 `project`
- 同步在 `/Users/bytedance/.claude/projects/-Users-bytedance/memory/MEMORY.md` 添加一行索引
- 写入前先检查是否已有相关 memory；已有则更新，不要重复创建

配置读取规则：

- 开始执行前，先查看当前上下文中是否已有相关 memory；如没有被加载且需要确认，可读取 `MEMORY.md` 检查是否存在 `lark-active-chat-digest`、`active-chat-digest`、`飞书群摘要` 等相关条目
- memory 里的默认群人数边界只作为默认值；用户本轮明确指定时，以本轮为准
- memory 里的忽略群白名单必须应用，匹配群名时使用精确匹配优先；如果用户给的是简称，可用包含匹配，但最终统计里说明被忽略的群名

## 默认关键词集

用户提到“按你上面说的关键词”但没有再次列出时，使用以下默认高信号关键词。它们的价值在于识别需要行动、决策或风险处理的消息，而不是泛泛聊天。

- 决策类：`决定`、`结论`、`拍板`、`方案定了`、`最终版`、`确认一下`
- 行动类：`截止`、`deadline`、`DDL`、`今天内`、`明天前`、`请大家`、`需要反馈`、`待办`
- 风险类：`风险`、`问题`、`阻塞`、`故障`、`异常`、`升级`、`投诉`、`延迟`
- 业务类：`客户`、`上线`、`发布`、`变更`、`审批`、`预算`、`招聘`、`HC`
- 会议类：`周会`、`复盘`、`纪要`、`议题`、`同步会`

如果用户给了关键词，用用户关键词为主；可以保留默认关键词作为补充，但在输出里标注命中来源。

### 关键词配置流程

当用户说“查看关键词”“修改关键词”“增加/删除关键词”“把关键词列表改成……”时：

1. 先返回当前 [SKILL.md](SKILL.md) 中的默认关键词列表，按类别展示
2. 让用户确认要新增、删除、替换哪些关键词；如果用户已经明确给出修改内容，可以直接进入下一步
3. 修改本文件的“默认关键词集”段落，保持分类结构清晰
4. 修改后做一次静态检查，确保关键词仍在 [SKILL.md](SKILL.md) 中可读
5. 告知用户修改结果

关键词列表属于 skill 规则配置，用户要求修改时写入 [SKILL.md](SKILL.md)，不是写 memory。memory 只用于用户偏好（人数边界、忽略群白名单等）。

## 执行流程

### 1. 准备时间范围

根据用户选择，用本地时间计算 ISO 8601 起止时间：

- 最近1天：`start = now - 24h`
- 最近3天：`start = now - 72h`
- 最近7天：`start = now - 168h`
- 最近15天：`start = now - 360h`
- `end = now`

如果用户没有明确时间范围，先让用户选择 `1天 / 3天 / 7天 / 15天`，不要直接默认。

命令示例：

```bash
START="2026-06-05T00:00:00+08:00"
END="2026-06-06T00:00:00+08:00"
```

### 2. 获取未免打扰、按活跃时间排序的群聊

使用 user 身份，因为“免打扰”是当前用户视角：

```bash
lark-cli im +chat-list \
  --as user \
  --exclude-muted \
  --sort-type ByActiveTimeDesc \
  --page-size 100 \
  --format json
```

筛选规则：

- 只保留群聊，排除 P2P
- 成员数明确 `member_count/user_count > 用户选择阈值`：纳入候选
- 成员数无法从列表或详情接口确认：保留候选，但标记为 `member_count_unknown`；不要猜测具体人数
- 成员数明确 `<= 用户选择阈值`：排除
- 免打扰群必须已通过 `--exclude-muted` 排除
- 如果群名命中用户配置的自动忽略白名单，排除该群，并在统计里报告“白名单忽略 N 个群”
- 按最近活跃时间降序取候选群；候选数量可先取用户上限的 2-3 倍，避免部分群无关键消息

字段名可能随 lark-cli 版本变化。优先识别这些常见字段：

- 群 ID：`chat_id` / `chat_id_str`
- 群名：`name` / `chat_name`
- 群类型：`chat_mode` / `chat_type` / `type`；实际 `+chat-list` 常返回 `chat_mode: group|topic|p2p`
- 成员数：`member_count` / `members_count` / `user_count`
- 活跃时间：`last_message_time` / `active_time` / `update_time`

如果响应里没有成员数字段，对候选群调用群详情补齐。补齐成员数的目的，是尽量确认群是否明确大于用户选择阈值或明确小于等于阈值；如果仍无法确认，则保留但标记为未知：

```bash
lark-cli im chats get \
  --as user \
  --params '{"chat_id":"<chat_id>","user_id_type":"open_id"}' \
  --format json
```

注意实际返回格式可能是 `code: 0` 而不是 `ok: true`。`chats get` 的详情响应经常不带 `chat_id`，不要用详情里的空 `chat_id` 覆盖原始列表里的 `chat_id`；合并数据时必须保留并回填 `+chat-list` 返回的原始 `chat_id`，否则后续 `+chat-messages-list` 会因 chat ID 为空或格式错误失败。

严格处理：

- 详情返回 `user_count` / `member_count` / `members_count` 且数值 `> 用户选择阈值`：纳入候选，标记为 `member_count_confirmed_gt_threshold`
- 详情返回人数 `<= 用户选择阈值`：排除，标记为 `member_count_lte_threshold`
- 详情接口失败、无权限、外部群无法管理、字段缺失或无法解析：保留候选，标记为 `member_count_unknown`
- 成员数未知的群不能声称“成员数超过阈值”，输出时写“人数未知”或“成员数未确认”
- 不要把“看起来像大群”“名字像社群”“活跃度很高”当作人数判断依据

### 3. 获取群主/管理员

对每个候选群获取成员角色，用于识别群主和管理员发言：

```bash
lark-cli im chat.members get \
  --as user \
  --page-all \
  --page-limit 20 \
  --params '{"chat_id":"<chat_id>","member_id_type":"open_id"}' \
  --format json
```

记录以下信息：

- `owner` / `is_owner` / `member_type=owner` / `role=owner`
- `admin` / `is_admin` / `member_type=admin` / `role=admin`
- 成员 open_id 与展示名

如果 API 没返回角色字段，不要编造；降级为只使用 @所有人、互动数、关键词筛选，并在备注里说明“未能识别群主/管理员角色”。

### 4. 拉取群消息

对每个候选群拉取时间范围内消息：

```bash
lark-cli im +chat-messages-list \
  --as user \
  --chat-id <chat_id> \
  --start "$START" \
  --end "$END" \
  --sort desc \
  --page-size 50 \
  --format json
```

必要时分页，但控制成本：每群最多读取 3-5 页。用户指定 15/20 个群或时间范围 7/15 天时尤其要避免无界读取，可先按活跃时间取近消息，再对高信号 thread 补充上下文。

每个入选群都应尽量形成“多条关键消息”列表，而不是只挑一条代表消息。读取消息时要覆盖足够多的候选消息，确保能从 @所有人、高互动、群主/管理员、关键词命中等不同信号中为每群挑出最多 10 条。只有某个群实际没有更多高信号消息时，才少于 10 条。

### 5. 补齐互动数据

优先使用已有消息字段；如果没有，再按需补齐：

- 回复数：如果消息有 `thread_id` / `parent_id`，可用

```bash
lark-cli im +threads-messages-list \
  --as user \
  --thread <thread_id_or_message_id> \
  --page-size 500 \
  --format json
```

- 点赞 / 表情数：优先批量接口；如果 CLI 版本不支持批量命令，再逐条调用 `reactions list`

```bash
python3 - <<'PY' >/tmp/reactions_req.json
import json
message_ids = ['om_xxx', 'om_yyy']
print(json.dumps({
    'queries': [{'message_id': mid} for mid in message_ids],
    'page_size_per_message': 10,
}, ensure_ascii=False))
PY
lark-cli im reactions batch_query \
  --as user \
  --data - \
  --format json < /tmp/reactions_req.json
```

当前 CLI 的 `batch_query` 请求体要求 `queries: [{"message_id":"om_xxx"}]`，不是 `message_ids`；并且 `@file` 路径可能要求相对路径，跨目录时优先用 stdin `--data -`。

如果批量命令不可用，查看 schema 后调用：

```bash
lark-cli schema im.reactions.batch_query --format json
```

不要为了所有普通消息都查互动数据。先用 @所有人、管理员、关键词筛出候选，再对候选和可能高互动的消息补齐互动，降低 API 调用量。

### 6. 关键消息筛选与打分

保留满足任一条件的消息：

1. **@所有人**：消息包含 `@all`、`@所有人`，或 mention 元数据中出现 all
2. **高互动**：回复数 `> 10` 或点赞/表情总数 `> 10`
3. **群主/管理员发言**：发送者是群主或管理员
4. **关键词命中**：命中用户关键词或默认关键词集

建议打分，用于每群最多优选 10 条：

| 特征 | 分值 |
|------|------|
| @所有人 | +100 |
| 回复数 > 10 | +60 |
| 点赞/表情数 > 10 | +60 |
| 群主发言 | +50 |
| 管理员发言 | +40 |
| 命中行动/风险关键词 | +35 |
| 命中决策/业务/会议关键词 | +25 |
| 近期消息，按时间轻微加权 | +0-10 |

每群输出规则：

- 对每个入选群单独排序和截断，最多输出 10 条关键消息
- 不要在全局层面只保留总分最高的几条，否则会导致某些群只剩一条甚至没有摘要
- 每个群的输出应优先覆盖不同主题：公告/决策、行动项、风险问题、群主/管理员表态、高互动讨论
- 如果同一 thread 内多条消息表达同一主题，合并成一条结论，链接指向最关键的根消息或最高分消息
- 连续刷屏、表情包、纯寒暄、无行动信息的消息不纳入总结
- 没有关键消息的活跃群可以跳过，不要用低质量内容凑数
- 输出统计里要区分：扫描群数、满足人数群数、有消息群数、有关键消息群数、最终摘要条数

### 7. 生成“结论先行”的一句话总结

每条输出必须是有信息密度的一句话，格式是“结论/行动 + 必要上下文”，不要写成“某某讨论了某事”。

好：

- `[6月7日前完成预算反馈，逾期默认按当前版本提交](link)`
- `[线上发布窗口改到今晚22:00，回滚负责人已指定为张三](link)`
- `[客户投诉升级为P1，产品和交付需今天18:00前给出补偿方案](link)`

差：

- `[张三发了一条消息](link)`
- `[大家在讨论上线](link)`
- `[有一个@所有人的通知](link)`

如果原消息本身没有明确结论，把讨论归纳成“当前状态 + 下一步/争议点”。不要编造未出现的决定。

## 输出格式

### 对话内预览

先给用户简短预览：

```markdown
已筛选：最近<1/3/7/15>天、未免打扰、成员数明确><阈值>或成员数未知、最多<5/10/15/20>个活跃群；每群最多10条关键消息。
统计：拉到群<N>个，白名单忽略<N>个，成员数明确>阈值保留<N>个，成员数未知保留<N>个，成员数<=阈值排除<N>个，入选候选群<N>个，有消息群<N>个，有关键消息群<N>个，最终摘要<N>条。

<群聊名字> 总结
- [一句话结论](消息链接)
- [一句话结论](消息链接)
- [一句话结论](消息链接)
... 最多10条

<群聊名字> 总结
- [一句话结论](消息链接)
- [一句话结论](消息链接)
... 最多10条
```

### 飞书消息卡片结构

输出卡片 JSON 时使用 `interactive` 消息，正文使用 `lark_md`，每个群一个标题块，每条结论是可点击链接。

可用 [`scripts/build-card.mjs`](scripts/build-card.mjs) 从结构化 digest 生成卡片：

```bash
node /Users/bytedance/.claude/skills/lark-active-chat-digest/scripts/build-card.mjs \
  --input digest.json \
  --output card.json
```

`digest.json` 结构：

```json
{
  "title": "最近1天活跃大群摘要",
  "range_label": "最近1天",
  "groups": [
    {
      "name": "群聊名字",
      "chat_id": "oc_xxx",
      "member_count": 86,
      "member_count_status": "confirmed_gt_threshold",
      "items": [
        {
          "summary": "6月7日前完成预算反馈，逾期默认按当前版本提交",
          "url": "https://open.feishu.cn/client/message/detail?message_id=om_xxx&chat_id=oc_xxx",
          "reasons": ["@所有人", "管理员", "关键词: 截止"],
          "sender": "张三",
          "score": 170
        }
      ]
    }
  ]
}
```

卡片标题建议：`最近1天活跃大群摘要`、`最近3天活跃大群摘要`、`最近7天活跃大群摘要` 或 `最近15天活跃大群摘要`。

### 消息链接

优先使用 CLI 返回的 permalink / url 字段。如果没有，使用：

```text
https://open.feishu.cn/client/message/detail?message_id=<message_id>&chat_id=<chat_id>
```

链接不可用时仍输出纯文本结论，并在备注中说明链接未取到。

## 发送卡片

生成摘要后，标准收尾步骤是：询问用户是否要把总结好的信息作为飞书卡片发送；如果用户本轮已经明确说“发给我自己”“发到个人文件传输助手”“发送给我”，就进入“发送给自己”流程。

发送是写操作和对外可见动作，除非用户本轮明确要求发送，否则不要发送，只给卡片 JSON 和预览。

### 发送给自己

用户明确要求发给自己时，按以下步骤执行：

1. 用 user 身份定位当前用户 open_id：

```bash
lark-cli contact +get-user --as user --format json
```

2. 从返回中取 `data.user.open_id` 作为 `--user-id`。
3. 用 bot 身份对该 user_id 执行 `--dry-run` 预览请求。当前 `lark-cli im +messages-send` 版本可能不支持 `--content @file`，建议用 Python 读取卡片 JSON 后通过 argv 传参，避免 shell 拼接：

```bash
python3 - <<'PY'
import json
import subprocess
from pathlib import Path

user_id = '<current_user_open_id>'
card = Path('card.json').read_text(encoding='utf-8')
json.loads(card)
argv = [
    'lark-cli', 'im', '+messages-send',
    '--as', 'bot',
    '--user-id', user_id,
    '--msg-type', 'interactive',
    '--content', card,
    '--dry-run',
]
subprocess.run(argv, check=True)
PY
```

4. 向用户展示将发送的标题、目标用户、摘要群数量和摘要条数，等待用户明确回复“确认发送”。
5. 用户确认后，去掉 `--dry-run` 真正发送。
6. 报告 `chat_id`、`message_id`、`create_time`。

### 发送到指定群或会话

用户明确要求发到某个群或会话时：

1. 先确认目标会话 `target_chat_id`，或通过群名搜索确认唯一群
2. 用 `--dry-run` 预览请求
3. 展示将发送的标题、目标群、摘要群数量和摘要条数
4. 用户确认后再真正发送

发送命令示例：

```bash
lark-cli im +messages-send \
  --as bot \
  --chat-id <target_chat_id> \
  --msg-type interactive \
  --content '<card_json_string>'
```

如果 bot 不在目标群或权限不足，按 `lark-shared` 处理；不要改用用户身份绕过，除非用户明确要求以用户身份发送。

## 权限

| 用途 | 身份 | 可能需要的 scope |
|------|------|------------------|
| 列出当前用户群聊并过滤免打扰 | user | `im:chat:read` |
| 读取群成员与角色 | user | `im:chat.members:read` |
| 读取群消息 | user | `im:message:readonly` |
| 搜索消息（可选） | user | `im:message:readonly` |
| 读取回复/话题 | user | `im:message:readonly` |
| 读取表情/点赞 | user | `im:message.reactions:read` |
| 发送卡片 | bot/user | `im:message` 或 CLI 报错提示的发送 scope |

如果权限不足，优先最小权限增量授权：

```bash
lark-cli auth login --scope "im:chat:read im:chat.members:read im:message:readonly im:message.reactions:read" --no-wait --json
```

把返回的授权 URL 原样发给用户，等用户完成后再继续。

## 失败与降级

- 没有候选群：说明“最近<范围>没有成员数明确大于阈值或成员数未知且未免打扰的活跃群”；同时报告白名单忽略数量、成员数小于等于阈值而排除的群数量。
- 有大群但没有关键消息：说明筛选标准，并建议扩大到3天或降低互动阈值；不要硬凑摘要。
- 单个群只有 1 条摘要：只有在该群实际只筛到 1 条高信号消息时才可以这样输出；不要因为全局截断或偷懒导致每群默认一条。
- 群成员角色取不到：继续摘要，但不使用“群主/管理员发言”特征，并在备注说明。
- 互动数据取不到：继续使用 @所有人、角色、关键词；不要声称“点赞>10”。
- CLI 输出 `_notice.update`：完成当前请求后提醒用户可运行 `lark-cli update` 更新。

## 质量检查

交付前自检：

- 已忽略免打扰群（使用了 `--exclude-muted`）
- 已排除成员数明确小于等于用户阈值的群；成员数未知的群已保留并标记，未声称其人数超过阈值
- 时间范围来自用户选择的 `1天 / 3天 / 7天 / 15天`
- 群聊数上限来自用户选择，除非用户明确要求默认
- 群人数边界来自用户选择、自然语言指定或 memory 默认值；本轮明确指定优先于 memory
- 已应用自动忽略群白名单，并在统计中报告忽略数量
- 群聊数不超过用户选择上限
- 每个入选群都单独提取多条关键消息，只有实际不足时才少于 10 条
- 每群最多10条，且每群结论不超过 10 条
- 每条结论尽量可点击跳回原消息
- @所有人、高互动、群主/管理员、关键词命中至少有一类证据
- 没有把普通闲聊包装成“关键结论”
