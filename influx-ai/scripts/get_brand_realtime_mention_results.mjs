#!/usr/bin/env node

// Fetch realtime brand mention results (paged by creator).
// POST /openapi/v1/brand-discovery/realtime-mentions/results
// 仅在任务 status=completed 后调用。data.items 按达人分页，每位达人带 videos；
// data.total 是达人总数。task_id 7 天后过期无法再查。

const endpointPath = '/openapi/v1/brand-discovery/realtime-mentions/results';
const allowedRequestKeys = new Set(['task_id', 'page', 'size']);

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
if (typeof params.task_id !== 'string' || !/^[0-9a-f]{32}$/.test(params.task_id)) {
  fail('task_id must be a 32-character hex string (from a submit response). Task IDs expire after 7 days.');
}
if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
  fail('page must be a positive integer.');
}
if (params.size !== undefined && (!Number.isInteger(params.size) || params.size < 1 || params.size > 100)) {
  fail('size must be an integer from 1 to 100.');
}

const payload = { task_id: params.task_id };
if (params.page !== undefined) payload.page = params.page;
if (params.size !== undefined) payload.size = params.size;

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
    body: JSON.stringify(payload),
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
  } else if (result?.success !== true || !result.data || !Array.isArray(result.data.items)) {
    console.error('Scout returned an invalid OpenAPI response (missing data.items).');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
