#!/usr/bin/env node

import { reportHttpError, reportBilling, reportBusinessNotice } from './_discovery_response.mjs';

const endpointPath = '/openapi/v1/creators/search';
const allowedRequestKeys = new Set([
  'request_version',
  'query',
  'original_query',
  'mode',
  'platforms',
  'strong_hashtags',
  'hard_filters',
  'exclude_creator_keys',
  'limit',
  'debug',
  'semantic_context',
  'weight_control',
  'execution_plan',
  'hashtag_mode',
  'parsed_profile',
  'seed_creators',
  'service_level',
]);
const seedPlatforms = new Set(['tiktok', 'instagram', 'youtube']);
const allowedServiceLevels = new Set(['S1', 'S2', 'S3']);
const failureStatuses = new Set([
  'invalid_request',
  'intent_parse_failed',
  'intent_conflict',
  'condition_unsupported',
  'routing_failed',
  'failed',
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
if (typeof params.query !== 'string' || params.query.length > 2000) {
  fail('query must be a string of at most 2000 characters.');
}
if (!Array.isArray(params.platforms) || params.platforms.length < 1 || params.platforms.length > 3 ||
    params.platforms.some((platform) => typeof platform !== 'string' ||
      !['tiktok', 'instagram', 'youtube'].includes(platform.trim().toLowerCase()))) {
  fail('platforms must contain 1 to 3 supported platforms: tiktok, instagram, youtube.');
}
if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 500)) {
  fail('limit must be an integer from 1 to 500.');
}
if (params.service_level !== undefined &&
    (typeof params.service_level !== 'string' || !allowedServiceLevels.has(params.service_level.toUpperCase()))) {
  fail('service_level must be S1, S2, or S3.');
}
if (params.seed_creators !== undefined) {
  if (!Array.isArray(params.seed_creators) || params.seed_creators.length < 1 || params.seed_creators.length > 10) {
    fail('seed_creators must be an array of 1 to 10 reference creators.');
  }
  for (const seed of params.seed_creators) {
    if (!seed || typeof seed !== 'object' || Array.isArray(seed)) {
      fail('each seed_creators item must be a JSON object.');
    }
    if (seed.platform !== undefined && !seedPlatforms.has(seed.platform)) {
      fail('seed_creators[].platform must be tiktok, instagram, or youtube.');
    }
    if (seed.uid === undefined && seed.url === undefined && seed.name === undefined) {
      fail('each seed_creators item must include one of uid, url, or name.');
    }
  }
  // Scout requires query or explicit filters alongside seeds; seeds alone are not enough.
  const hasQuery = typeof params.query === 'string' && params.query.trim().length > 0;
  const hasFilters = (params.hard_filters && Object.keys(params.hard_filters).length > 0) ||
    (Array.isArray(params.strong_hashtags) && params.strong_hashtags.length > 0);
  if (!hasQuery && !hasFilters) {
    fail('seed_creators must be accompanied by a non-empty query or explicit filters; do not send seed_creators alone.');
  }
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
    if (!response.ok) reportHttpError(response, null);
    fail(`Scout returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (result?.success === false || !response.ok) {
    reportHttpError(response, result);
    process.exitCode = 1;
  } else if (result?.success !== true || !result.data || typeof result.data.status !== 'string' ||
      !Array.isArray(result.data.errors)) {
    if (result !== null && result !== undefined) console.log(JSON.stringify(result, null, 2));
    console.error('Scout returned an invalid OpenAPI response.');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
    reportBilling(result.meta);
    if (failureStatuses.has(result.data.status)) {
      console.error(JSON.stringify({ status: result.data.status, errors: result.data.errors }));
      process.exitCode = 1;
    } else {
      reportBusinessNotice(result.data);
    }
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
