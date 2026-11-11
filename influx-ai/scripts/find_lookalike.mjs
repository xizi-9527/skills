#!/usr/bin/env node

import { reportHttpError, reportBilling, reportBusinessNotice } from './_discovery_response.mjs';

const endpointPath = '/openapi/v1/creators/lookalike';
const allowedPlatforms = new Set(['tiktok', 'instagram', 'youtube']);
const allowedDimensions = new Set(['overall', 'topic', 'style']);
const allowedRequestKeys = new Set([
  'request_version',
  'seed_creator_key',
  'username',
  'profile_url',
  'platform',
  'similarity_dimension',
  'limit',
  'hard_filters',
  'exclude_creator_keys',
  'debug',
  'profile_only',
  'retrieval_strategy',
  'query',
  'additional_requirements',
  'weight_control',
  'execution_plan',
  'lang',
  'service_level',
]);
const allowedLangs = new Set(['cn', 'en']);
const allowedServiceLevels = new Set(['S1', 'S2', 'S3']);
const allowedFilterKeys = new Set([
  'follower_min',
  'follower_max',
  'avg_views_min',
  'avg_views_max',
  'countries',
  'has_email',
  'passthrough',
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function validateRequest(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    fail('Input must be a JSON object.');
  }

  const unknownKeys = Object.keys(params).filter((key) => !allowedRequestKeys.has(key));
  if (unknownKeys.length) {
    fail(`Unsupported parameter(s): ${unknownKeys.join(', ')}.`);
  }

  const seedFields = ['seed_creator_key', 'username', 'profile_url'];
  if (seedFields.filter((key) => params[key] !== undefined).length !== 1) {
    fail('Provide exactly one of seed_creator_key, username, or profile_url.');
  }
  if (params.seed_creator_key !== undefined && params.platform !== undefined) {
    fail('platform can only be used with username or profile_url.');
  }
  if (params.platform !== undefined && !allowedPlatforms.has(params.platform)) {
    fail('platform must be tiktok, instagram, or youtube.');
  }
  if (params.similarity_dimension !== undefined && !allowedDimensions.has(params.similarity_dimension)) {
    fail('similarity_dimension must be overall, topic, or style.');
  }
  if (params.retrieval_strategy !== undefined &&
      !['seed_vector', 'profile', 'auto'].includes(params.retrieval_strategy)) {
    fail('retrieval_strategy must be seed_vector, profile, or auto.');
  }
  if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) {
    fail('limit must be an integer from 1 to 100.');
  }
  if (params.lang !== undefined && (typeof params.lang !== 'string' || !allowedLangs.has(params.lang))) {
    fail('lang must be cn or en.');
  }
  if (params.service_level !== undefined &&
      (typeof params.service_level !== 'string' || !allowedServiceLevels.has(params.service_level.toUpperCase()))) {
    fail('service_level must be S1, S2, or S3.');
  }
  for (const key of ['username', 'profile_url']) {
    if (params[key] !== undefined && (typeof params[key] !== 'string' || !params[key].trim())) {
      fail(`${key} must be a non-empty string.`);
    }
  }
  for (const key of ['query', 'additional_requirements']) {
    if (params[key] !== undefined && typeof params[key] !== 'string') {
      fail(`${key} must be a string.`);
    }
  }
  const combinedQuery = [params.query?.trim(), params.additional_requirements?.trim()]
    .filter(Boolean).join('\n');
  if (combinedQuery.length > 2000) {
    fail('query and additional_requirements must total no more than 2000 characters.');
  }
  if (params.hard_filters !== undefined) {
    if (!params.hard_filters || typeof params.hard_filters !== 'object' || Array.isArray(params.hard_filters)) {
      fail('hard_filters must be a JSON object.');
    }
    const unknownFilters = Object.keys(params.hard_filters).filter((key) => !allowedFilterKeys.has(key));
    if (unknownFilters.length) {
      fail(`Unsupported hard filter(s): ${unknownFilters.join(', ')}.`);
    }
  }
  if (params.exclude_creator_keys !== undefined &&
      (!Array.isArray(params.exclude_creator_keys) || params.exclude_creator_keys.length > 10000)) {
    fail('exclude_creator_keys must be an array of at most 10000 creator keys.');
  }
}

let params;
try {
  params = JSON.parse(process.argv[2] ?? '');
} catch {
  fail('Pass a valid JSON object as the first argument.');
}
validateRequest(params);

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
    result = { message: body || response.statusText };
  }

  if (!response.ok || result?.success === false) {
    reportHttpError(response, result);
    process.exitCode = 1;
  } else if (result?.success !== true || !result.data || typeof result.data.status !== 'string') {
    if (result !== null && result !== undefined) console.log(JSON.stringify(result, null, 2));
    console.error('Scout returned an invalid OpenAPI response.');
    process.exitCode = 1;
  } else if (['invalid_request', 'intent_parse_failed', 'intent_conflict',
    'condition_unsupported', 'routing_failed', 'failed'].includes(result.data.status)) {
    console.log(JSON.stringify(result, null, 2));
    reportBilling(result.meta);
    console.error(JSON.stringify({ status: result.data.status, errors: result.data.errors }));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
    reportBilling(result.meta);
    reportBusinessNotice(result.data);
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
