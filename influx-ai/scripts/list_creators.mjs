#!/usr/bin/env node

import { reportHttpError, reportBilling } from './_discovery_response.mjs';

// Structured per-platform creator list. Calls Scout native list service via
// GET /openapi/v1/creators/{platform}/list with query parameters.

const platformPaths = {
  tiktok: '/openapi/v1/creators/tiktok/list',
  instagram: '/openapi/v1/creators/instagram/list',
  youtube: '/openapi/v1/creators/youtube/list',
  twitter: '/openapi/v1/creators/twitter/list',
};
const allowedPlatforms = new Set(Object.keys(platformPaths));
const allowedSortOrders = new Set(['asc', 'desc']);

// Shared filters accepted on every platform list query.
const commonKeys = new Set([
  'keyword',
  'username_keywords',
  'must_hashtags',
  'country_code',
  'gender',
  'kol_visibility_main',
  'ethnicity_main',
  'is_real_person',
  'has_email',
  'has_whatsapp',
  'industry',
  'language_code',
  'followers_cnt_gte',
  'followers_cnt_lte',
  'last10_avg_video_views_cnt_gte',
  'last10_avg_video_views_cnt_lte',
  'last10_avg_video_interaction_rate_gte',
  'last10_avg_video_interaction_rate_lte',
  'last_video_publish_date_gte',
  'last_video_publish_date_lte',
  'audience_country_code_list',
  'audience_female_rate_gte',
  'audience_female_rate_lte',
  'audience_age_list',
  'is_verified',
  'last10_video_views_per_sub_gte',
  'last10_video_views_per_sub_lte',
  'last10_med_video_views_per_sub_gte',
  'last10_med_video_views_per_sub_lte',
  'page',
  'size',
  'sort_field',
  'sort_order',
  'service_level',
  'lang',
]);
const allowedServiceLevels = new Set(['S1', 'S2', 'S3']);
const allowedLangs = new Set(['cn', 'en']);

// Platform-specific filters layered on top of the common set.
const platformKeys = {
  tiktok: new Set([
    'has_mcn',
    'has_line',
    'has_zalo',
    'product_category_id_array',
    'audience_language_code_list',
    'last30day_gmv_gte',
    'last30day_gmv_lte',
    'last30day_gpm_gte',
    'last30day_gpm_lte',
    'last30day_gmv_per_buyer_gte',
    'last30day_gmv_per_buyer_lte',
    'last30day_commission_rate_gte',
    'last30day_commission_rate_lte',
  ]),
  instagram: new Set([
    'is_top_creator',
    'is_ai_creator',
    'audience_language_list',
    'last10_avg_video_likes_cnt_gte',
    'last10_avg_video_likes_cnt_lte',
    'last_video_views_cnt_gte',
    'last_video_views_cnt_lte',
    'kol_style_list',
  ]),
  youtube: new Set([
    'is_ai_creator',
    'audience_language_code_list',
    'last10_avg_video_views_cnt_short_gte',
    'last10_avg_video_views_cnt_short_lte',
    'last10_avg_video_interaction_rate_short_gte',
    'last10_avg_video_interaction_rate_short_lte',
    'last10_video_views_per_sub_short_gte',
    'last10_video_views_per_sub_short_lte',
    'last10_med_video_views_per_sub_short_gte',
    'last10_med_video_views_per_sub_short_lte',
  ]),
  twitter: new Set([
    'has_mcn',
    'audience_language_code_list',
  ]),
};

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

let input;
try {
  input = JSON.parse(process.argv[2] ?? '');
} catch {
  fail('Pass a valid JSON object as the first argument.');
}
if (!input || typeof input !== 'object' || Array.isArray(input)) {
  fail('Input must be a JSON object.');
}

const platform = typeof input.platform === 'string' ? input.platform.trim().toLowerCase() : undefined;
if (!platform || !allowedPlatforms.has(platform)) {
  fail('platform must be one of tiktok, instagram, youtube, twitter.');
}

const allowedKeys = new Set([...commonKeys, ...platformKeys[platform]]);
const params = { ...input };
delete params.platform;

const unknownKeys = Object.keys(params).filter((key) => !allowedKeys.has(key));
if (unknownKeys.length) {
  fail(`Unsupported parameter(s) for ${platform}: ${unknownKeys.join(', ')}.`);
}

if (params.page !== undefined &&
    (!Number.isInteger(params.page) || params.page < 1 || params.page > 500)) {
  fail('page must be an integer from 1 to 500.');
}
if (params.size !== undefined &&
    (!Number.isInteger(params.size) || params.size < 1 || params.size > 100)) {
  fail('size must be an integer from 1 to 100.');
}
if (params.sort_order !== undefined && !allowedSortOrders.has(params.sort_order)) {
  fail('sort_order must be asc or desc.');
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
  url = new URL(platformPaths[platform], `${baseUrl.replace(/\/+$/, '')}/`);
} catch {
  fail('SCOUT_API_BASE_URL must be a valid absolute URL.');
}
for (const [key, value] of Object.entries(params)) {
  if (value === undefined || value === null) continue;
  url.searchParams.set(key, typeof value === 'boolean' ? String(value) : String(value));
}

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'X-API-Key': apiKey },
  });
  const body = await response.text();
  let result;
  try {
    result = body ? JSON.parse(body) : null;
  } catch {
    if (!response.ok) reportHttpError(response, null);
    fail(`Scout returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok || result?.success === false) {
    reportHttpError(response, result);
    process.exitCode = 1;
  } else if (result?.success !== true || !result.data || !Array.isArray(result.data.items)) {
    if (result !== null && result !== undefined) console.log(JSON.stringify(result, null, 2));
    console.error('Scout returned an invalid OpenAPI response.');
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
    reportBilling(result.meta);
    if (!result.data.items.length) console.error(JSON.stringify({ hint: '本次列表为空，不自动翻页或重复搜索。' }));
  }
} catch (error) {
  console.error(`Scout request failed: ${error.message}`);
  process.exitCode = 1;
}
