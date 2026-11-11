#!/usr/bin/env node

// Find creators with public collaboration/coauthor relationships to a brand.
// Calls Scout BrandCollaborationService via
// POST /openapi/v1/brand-discovery/collaboration-creators.

const endpointPath = '/openapi/v1/brand-discovery/collaboration-creators';
const allowedPlatforms = new Set(['tiktok', 'instagram']);
const allowedRequestKeys = new Set([
  'brand_name',
  'platforms',
  'brand_candidate_limit',
  'limit',
  'evidence_per_creator',
  'country_codes',
  'followers_cnt_gte',
  'followers_cnt_lte',
  'engagement_rate_gte',
  'has_email',
  'industry_keywords',
  'service_level',
  'lang',
]);
const allowedServiceLevels = new Set(['S1', 'S2', 'S3']);
const allowedLangs = new Set(['cn', 'en']);

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
if (typeof params.brand_name !== 'string' || !params.brand_name.trim() ||
    params.brand_name.length > 200) {
  fail('brand_name must be a non-empty string of at most 200 characters.');
}
if (params.platforms !== undefined) {
  if (!Array.isArray(params.platforms) || params.platforms.length < 1 ||
      params.platforms.some((p) => typeof p !== 'string' || !allowedPlatforms.has(p.trim().toLowerCase()))) {
    fail('platforms must contain at least one of: tiktok, instagram.');
  }
}
if (params.brand_candidate_limit !== undefined &&
    (!Number.isInteger(params.brand_candidate_limit) ||
     params.brand_candidate_limit < 1 || params.brand_candidate_limit > 10)) {
  fail('brand_candidate_limit must be an integer from 1 to 10.');
}
if (params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) {
  fail('limit must be an integer from 1 to 100.');
}
if (params.evidence_per_creator !== undefined &&
    (!Number.isInteger(params.evidence_per_creator) ||
     params.evidence_per_creator < 0 || params.evidence_per_creator > 5)) {
  fail('evidence_per_creator must be an integer from 0 to 5.');
}
if (params.industry_keywords !== undefined &&
    (!Array.isArray(params.industry_keywords) || params.industry_keywords.length > 20)) {
  fail('industry_keywords must be an array of at most 20 items.');
}
if (params.country_codes !== undefined && !Array.isArray(params.country_codes)) {
  fail('country_codes must be an array of country codes.');
}
if (params.service_level !== undefined &&
    (typeof params.service_level !== 'string' || !allowedServiceLevels.has(params.service_level.toUpperCase()))) {
  fail('service_level must be S1, S2, or S3.');
}
if (params.lang !== undefined && (typeof params.lang !== 'string' || !allowedLangs.has(params.lang))) {
  fail('lang must be cn or en.');
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
  } else if (result?.success !== true || !result.data || !Array.isArray(result.data.items)) {
    console.error('Scout returned an invalid OpenAPI response.');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
