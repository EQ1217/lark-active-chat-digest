#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' || arg === '-i') {
      args.input = argv[++i];
    } else if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }
  return args;
}

function usage() {
  return `Usage: node build-card.mjs --input digest.json --output card.json

Input shape:
{
  "title": "最近1天活跃大群摘要",
  "range_label": "最近1天",
  "groups": [
    {
      "name": "群聊名字",
      "member_count": 86,
      "items": [
        {"summary":"一句话结论", "url":"https://...", "reasons":["@所有人"]}
      ]
    }
  ]
}`;
}

function escapeLarkMd(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function linkLine(item) {
  const summary = escapeLarkMd(item.summary || item.text || '未命名结论');
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  const reasonText = reasons.length
    ? ` _${escapeLarkMd(reasons.slice(0, 3).join(' / '))}_`
    : '';
  const flag = reasons.some(reason => String(reason).includes('@所有人')) ? '🚩 ' : '';

  if (item.url) {
    return `- ${flag}[${summary}](${item.url})${reasonText}`;
  }
  return `- ${flag}${summary}${reasonText}`;
}

function buildCard(digest) {
  const title = digest.title || `${digest.range_label || '最近'}活跃大群摘要`;
  const groups = Array.isArray(digest.groups) ? digest.groups : [];

  const threshold = digest.member_threshold || digest.member_count_threshold || 50;
  const stats = digest.stats || digest.meta || {};
  const statParts = [];
  if (stats.total_chats !== undefined) statParts.push(`拉到群${stats.total_chats}个`);
  if (stats.ignored_chats !== undefined) statParts.push(`白名单忽略${stats.ignored_chats}个`);
  if (stats.confirmed_large_groups !== undefined) statParts.push(`明确超阈值${stats.confirmed_large_groups}个`);
  if (stats.unknown_member_groups !== undefined) statParts.push(`人数未知保留${stats.unknown_member_groups}个`);
  if (stats.excluded_small_groups !== undefined) statParts.push(`人数未达标排除${stats.excluded_small_groups}个`);
  if (stats.scanned_large_groups !== undefined) statParts.push(`本次扫描${stats.scanned_large_groups}个`);
  if (stats.groups_with_messages !== undefined) statParts.push(`有消息群${stats.groups_with_messages}个`);
  if (stats.final_items !== undefined) statParts.push(`摘要${stats.final_items}条`);

  const introLines = [
    `**${escapeLarkMd(title)}**`,
    `筛选口径：未免打扰、成员数明确 > ${escapeLarkMd(threshold)} 或成员数未知、每群最多10条关键结论。`,
  ];
  if (statParts.length) introLines.push(`统计：${escapeLarkMd(statParts.join('，'))}。`);

  const elements = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: introLines.join('\n'),
      },
    },
  ];

  for (const group of groups) {
    const items = Array.isArray(group.items) ? group.items.slice(0, 10) : [];
    if (!items.length) continue;

    const memberCountStatus = group.member_count_status || group.member_status;
    const memberCount = group.member_count
      ? `｜${group.member_count}人`
      : ['unknown', 'member_count_unknown', 'unconfirmed'].includes(memberCountStatus)
        ? '｜人数未知'
        : '';
    const activeLabel = group.active_label ? `｜${escapeLarkMd(group.active_label)}` : '';
    const heading = `**${escapeLarkMd(group.name || '未命名群聊')} 总结**${memberCount}${activeLabel}`;
    const body = items.map(linkLine).join('\n');

    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `${heading}\n${body}`,
      },
    });
  }

  if (elements.length === 1) {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: '未筛选到符合条件的关键消息。可尝试扩大到最近3天，或补充更具体的关键词。',
      },
    });
  }

  return {
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: 'blue',
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    elements,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.input || !args.output) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const digest = JSON.parse(readFileSync(args.input, 'utf8'));
const card = buildCard(digest);
writeFileSync(args.output, `${JSON.stringify(card, null, 2)}\n`, 'utf8');
