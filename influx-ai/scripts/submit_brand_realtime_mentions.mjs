#!/usr/bin/env node

// Submit a realtime brand mention collection task (async).
// POST /openapi/v1/brand-discovery/realtime-mentions
// 成功后从 data.task_id 取任务 ID，再用 status / results 脚本轮询与取结果。

const endpointPath = '/openapi/v1/brand-discovery/realtime-mentions';
const allowedPlatforms = new Set(['tiktok', 'instagram', 'youtube']);
const allowedRequestKeys = new Set([
  'platform',
  'brand_name',
  'keywords',
  'start_time',
  'end_time',
]);

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
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

const unknownKeys = Object.keys(params).filter((key) => !allowedRequestKeys.has(key));
if (unknownKeys.length) {
  fail(`Unsupported parameter(s): ${unknownKeys.join(', ')}.`);
}

if (typeof params.platform !== 'string' || !allowedPlatforms.has(params.platform)) {
  fail('platform must be one of tiktok, instagram, youtube.');
}

const hasBrandName = typeof params.brand_name === 'string' && params.brand_name.trim();
const hasKeywords = Array.isArray(params.keywords) &&
  params.keywords.some((k) => typeof k === 'string' && k.trim());
if (!hasBrandName && !hasKeywords) {
  fail('Provide either brand_name or a non-empty keywords array.');
}
if (params.keywords !== undefined) {
  if (!Array.isArray(params.keywords) || params.keywords.length < 1 || params.keywords.length > 10) {
    fail('keywords must be an array of 1 to 10 items.');
  }
  if (params.keywords.some((k) => typeof k !== 'string' || !k.trim())) {
    fail('each keywords item must be a non-empty string.');
  }
}
for (const key of ['start_time', 'end_time']) {
  if (params[key] !== undefined && (!Number.isInteger(params[key]) || params[key] < 0)) {
    fail(`${key} must be a non-negative integer (unix seconds).`);
  }
}
if (params.start_time !== undefined && params.end_time !== undefined &&
    params.start_time > params.end_time) {
  fail('start_time must not exceed end_time.');
}
if (hasKeywords && params.keywords.some((k) => k.trim().length > 200)) {
  fail('each keywords item must be at most 200 characters.');
}
if (hasBrandName && params.brand_name.length > 200) {
  fail('brand_name must be at most 200 characters.');
}

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

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(params),
  });
  const body = await response.text();
  let result;
  try {
    result = body ? JSON.parse(body) : null;
  } catch {
    fail(`Scout returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || result?.success === false) {
    if (result?.success === false) console.log(JSON.stringify(result, null, 2));
    console.error(JSON.stringify({ status: response.status, error: result?.error ?? result }));
    process.exitCode = 1;
  } else if (result?.success !== true || !result.data || typeof result.data.task_id !== 'string') {
    console.error('Scout returned an invalid OpenAPI response (missing data.task_id).');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
