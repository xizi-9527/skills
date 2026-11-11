#!/usr/bin/env node
// 轮询实时品牌提及采集任务状态，每 60 秒查询一次，直到任务完成/失败/超时。
// 设计参考 creator-scraper-cv/scripts/poll_task_status.mjs。
//
// 用法:
//   node poll_brand_realtime_mentions.mjs '{"task_id":"<32位hex>"}'
//   node poll_brand_realtime_mentions.mjs '{"task_id":"<32位hex>","interval":30,"max_attempts":60}'
//
// 参数:
//   task_id       — 必填，提交返回的 32 位十六进制任务 ID（7 天内有效）
//   interval      — 可选，轮询间隔秒数，默认 60
//   max_attempts  — 可选，最大轮询次数，默认 45（即默认最多等 45 分钟）
//
// 以 data.status 为准：submitted / processing / completed / failed。
// 即使 progress 显示 100%，只要 status 仍是 processing 就继续等待。
// 任务 completed 后，用 get_brand_realtime_mention_results.mjs 分页取达人及视频。

const endpointPath = '/openapi/v1/brand-discovery/realtime-mentions/status';
const TERMINAL_STATES = ['completed', 'failed'];

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

let params;
try {
  params = JSON.parse(process.argv[2] ?? '');
} catch {
  fail('Pass a valid JSON object as the first argument.');
}
if (!params || typeof params !== 'object' || Array.isArray(params)) {
  fail('Input must be a JSON object.');
}
const allowedKeys = new Set(['task_id', 'interval', 'max_attempts']);
const unknownKeys = Object.keys(params).filter((key) => !allowedKeys.has(key));
if (unknownKeys.length) {
  fail(`Unsupported parameter(s): ${unknownKeys.join(', ')}.`);
}
if (typeof params.task_id !== 'string' || !/^[0-9a-f]{32}$/.test(params.task_id)) {
  fail('task_id must be a 32-character hex string (from a submit response). Task IDs expire after 7 days.');
}
if (params.interval !== undefined && (!Number.isInteger(params.interval) || params.interval < 1)) {
  fail('interval must be a positive integer (seconds).');
}
if (params.max_attempts !== undefined && (!Number.isInteger(params.max_attempts) || params.max_attempts < 1)) {
  fail('max_attempts must be a positive integer.');
}

const taskId = params.task_id;
const interval = params.interval || 60;
const maxAttempts = params.max_attempts || 45;

const baseUrl = process.env.SCOUT_API_BASE_URL;
if (!baseUrl) {
  fail('SCOUT_API_BASE_URL is required.');
}
const apiKey = (process.env.SCOUT_API_KEY ?? '').trim();
if (!apiKey) {
  fail('SCOUT_API_KEY is required. Set it in the environment; Scout authenticates every request via the X-API-Key header.');
}
let url;
try {
  url = new URL(endpointPath, `${baseUrl.replace(/\/+$/, '')}/`);
} catch {
  fail('SCOUT_API_BASE_URL must be a valid absolute URL.');
}

async function queryStatus() {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ task_id: taskId }),
  });
  const body = await response.text();
  let result;
  try {
    result = body ? JSON.parse(body) : null;
  } catch {
    return { httpError: true, status: response.status, result: { message: body || response.statusText } };
  }
  return { ok: response.ok, status: response.status, result };
}

console.error(`[轮询] 开始监控任务 ${taskId}，间隔 ${interval}s，最多 ${maxAttempts} 次`);

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  let payload;
  try {
    payload = await queryStatus();
  } catch (error) {
    fail(`Scout request failed: ${error.message}`);
  }

  const { ok, status: httpStatus, result } = payload;
  if (!ok || result?.success === false) {
    if (result?.success === false) console.log(JSON.stringify(result, null, 2));
    console.error(JSON.stringify({ status: httpStatus, error: result?.error ?? result }));
    process.exit(1);
  }
  if (result?.success !== true || !result.data || typeof result.data.status !== 'string') {
    console.error('Scout returned an invalid OpenAPI response (missing data.status).');
    process.exit(1);
  }

  const { status, progress, provider_count, completed_count } = result.data;
  console.error(`[轮询 ${attempt}/${maxAttempts}] 状态: ${status} | 进度: ${progress ?? '-'} | 完成: ${completed_count ?? '-'}/${provider_count ?? '-'}`);

  if (TERMINAL_STATES.includes(status)) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(status === 'completed' ? 0 : 1);
  }

  if (attempt < maxAttempts) {
    await sleep(interval);
  }
}

console.error(`[轮询] 已达最大轮询次数 ${maxAttempts}，任务仍在处理中`);
console.log(JSON.stringify({
  success: false,
  error: { message: `轮询超时：已等待 ${maxAttempts * interval} 秒，任务仍未完成`, task_id: taskId },
  data: { task_id: taskId, status: 'processing' },
}));
process.exit(1);
