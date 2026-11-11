import { createHash } from 'node:crypto';

const platforms = new Set(['tiktok', 'instagram', 'youtube']);
const deliveryStates = new Set(['sending', 'scheduled', 'cancelled', 'sent', 'delivered', 'bounced', 'complained', 'failed']);
export const operations = Object.freeze({
  send: { path: '/first-emails/send', status: 201, scope: 'creator:outreach:send', confirm: true },
  reply: { path: '/replies/send', status: 201, scope: 'creator:outreach:send', confirm: true },
  status: { path: '/sends/status', status: 200, scope: 'creator:outreach:read' },
  thread: { path: '/threads/get', status: 200, scope: 'creator:outreach:read' },
  template: { path: '/first-emails/template', status: 200, scope: 'creator:outreach:read' },
  preview: { path: '/first-emails/preview', status: 200, scope: 'creator:outreach:read' },
  generate: { path: '/first-emails/generate', status: 200, scope: 'creator:outreach:send' },
});
const requestFields = {
  send: ['campaign_id', 'campaign_creator_ids', 'content_source', 'template_mode', 'subject', 'body_html', 'body_text', 'platform_templates', 'send_mode', 'idempotency_key'],
  reply: ['campaign_creator_id', 'thread_id', 'content_source', 'subject', 'body_html', 'body_text'],
  status: ['campaign_creator_id'], thread: ['campaign_creator_id'], template: ['campaign_id'],
  preview: ['campaign_id', 'disclose_brand', 'target_platform'], generate: ['campaign_id', 'disclose_brand'],
};

export class OutreachError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.name = 'OutreachError';
    this.kind = kind;
    Object.assign(this, details);
  }
}
function invalid(message) { throw new OutreachError('input', message); }
function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(`${name} 必须是 JSON 对象`);
}
function keys(value, allowed, name) {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) invalid(`${name} 包含未开放字段`);
}
function text(value, name, max, { nullable = false, nonblank = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || [...value].length > max || (nonblank && !value.trim())) {
    invalid(`${name} 必须是${nonblank ? '非空白' : ''}字符串，最多 ${max} 字符`);
  }
}
function id(value, name) {
  // Only convert already-safe integers to strings. Never cast string IDs to Number.
  if (Number.isSafeInteger(value) && value > 0) value = String(value);
  if (typeof value !== 'string' || !/^[0-9]{1,19}$/.test(value) || BigInt(value) < 1n || BigInt(value) > 9223372036854775807n) {
    invalid(`${name} 必须是正 BIGINT 十进制字符串或安全整数`);
  }
  return BigInt(value).toString();
}
function mailBody(value, platform = false) {
  text(value.subject, 'subject', 500, { nonblank: true });
  for (const field of ['body_html', 'body_text']) {
    if (value[field] !== undefined) text(value[field], field, field === 'body_html' ? 50000 : 20000, { nullable: !platform || field === 'body_text' });
  }
  if (platform) text(value.body_html, 'body_html', 50000, { nonblank: true });
  if (![value.body_html, value.body_text].some(body => typeof body === 'string' && body.trim())) invalid('至少提供一种非空白正文');
}
export function prepareRequest(operation, input) {
  if (!operations[operation]) invalid('未知邮件操作');
  object(input, '请求');
  keys(input, requestFields[operation], '请求');
  const request = structuredClone(input);
  if ('campaign_id' in input || ['send', 'template', 'preview', 'generate'].includes(operation)) request.campaign_id = id(input.campaign_id, 'campaign_id');
  if (['reply', 'status', 'thread'].includes(operation)) request.campaign_creator_id = id(input.campaign_creator_id, 'campaign_creator_id');
  if (['send', 'reply'].includes(operation)) {
    if (input.content_source !== 'custom') invalid('content_source 必须为 custom');
    if (operation === 'reply') {
      text(input.thread_id, 'thread_id', 128, { nonblank: true });
      mailBody(input);
    } else {
      if (!Array.isArray(input.campaign_creator_ids) || input.campaign_creator_ids.length < 1 || input.campaign_creator_ids.length > 100) invalid('campaign_creator_ids 必须包含 1～100 项');
      request.campaign_creator_ids = [...new Set(input.campaign_creator_ids.map(item => id(item, 'campaign_creator_ids')))];
      text(input.idempotency_key, 'idempotency_key', 128, { nonblank: true });
      request.template_mode = input.template_mode ?? 'shared';
      request.send_mode = input.send_mode ?? 'now';
      // null is not a default for non-nullable enums.
      if (input.template_mode === null || !['shared', 'per_platform'].includes(request.template_mode)) invalid('template_mode 必须为 shared 或 per_platform');
      if (input.send_mode === null || !['now', 'smart'].includes(request.send_mode)) invalid('send_mode 必须为 now 或 smart');
      if (input.platform_templates !== undefined) object(input.platform_templates, 'platform_templates');
      if (request.template_mode === 'shared') {
        if (Object.keys(input.platform_templates ?? {}).length) invalid('共享内容不能同时提供平台模板');
        mailBody(input);
      } else {
        if (['subject', 'body_html', 'body_text'].some(field => field in input)) invalid('分平台模式应省略顶层共享内容');
        if (!input.platform_templates || !Object.keys(input.platform_templates).length) invalid('分平台模式需要非空 platform_templates');
        for (const [platform, content] of Object.entries(input.platform_templates)) {
          if (!platforms.has(platform)) invalid('平台仅支持 tiktok、instagram、youtube');
          object(content, '平台内容'); keys(content, ['subject', 'body_html', 'body_text'], '平台内容'); mailBody(content, true);
        }
      }
    }
  }
  if (['preview', 'generate'].includes(operation)) {
    if (input.disclose_brand !== undefined && typeof input.disclose_brand !== 'boolean') invalid('disclose_brand 必须为 JSON boolean');
    request.disclose_brand = input.disclose_brand ?? false;
    if (operation === 'preview' && input.target_platform !== undefined && input.target_platform !== null && !platforms.has(input.target_platform)) invalid('target_platform 仅支持 tiktok、instagram、youtube 或 null');
  }
  return request;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function prepareConfirmation(operation, input) {
  if (!operations[operation]?.confirm) invalid('此操作不使用邮件发送确认');
  const request = prepareRequest(operation, input);
  const confirmationId = createHash('sha256').update(canonical({ operation, request })).digest('hex');
  return {
    operation, confirmation_id: confirmationId, request,
    summary: {
      campaign_id: request.campaign_id, campaign_creator_ids: request.campaign_creator_ids,
      campaign_creator_id: request.campaign_creator_id, thread_id: request.thread_id,
      content_source: request.content_source, template_mode: request.template_mode,
      send_mode: request.send_mode ?? 'reply', subject: request.subject,
      body_html: request.body_html, body_text: request.body_text, platform_templates: request.platform_templates,
    },
    notice: '仅内容预览，尚未提交。向用户展示业务目标及完整内容并获得确认后，才可用 confirmation_id 提交相同请求；摘要值不是用户授权证明。',
  };
}

// Extract only sendable fields; versions, language and attachments never enter send.
export function selectFirstEmailContent(result, { source = 'template', mode = 'shared', targetPlatforms = [] } = {}) {
  if (!['template', 'preview', 'generate'].includes(source) || !['shared', 'per_platform'].includes(mode)) invalid('内容选择方式无效');
  if (result?.success !== true || !result.data) invalid('内容响应不可用');
  const content = source === 'template' ? result.data.template : result.data;
  if (!content) invalid('尚无首封模板');
  function select(value, perPlatform = false) {
    object(value, '邮件内容');
    const selected = Object.fromEntries(['subject', 'body_html', 'body_text'].filter(field => value[field] !== undefined).map(field => [field, value[field]]));
    mailBody(selected, perPlatform);
    return selected;
  }
  if (mode === 'shared') return { content_source: 'custom', template_mode: 'shared', ...select(content) };
  if (!Array.isArray(targetPlatforms) || !targetPlatforms.length || targetPlatforms.some(platform => !platforms.has(platform))) invalid('必须明确目标达人对应的平台');
  return {
    content_source: 'custom', template_mode: 'per_platform',
    platform_templates: Object.fromEntries([...new Set(targetPlatforms)].map(platform => [platform, select(content.platform_templates?.[platform], true)])),
  };
}
function protocol(message, details = {}) { throw new OutreachError('protocol', message, details); }
function responseId(value) { return typeof value === 'string' && /^[0-9]{1,19}$/.test(value) && BigInt(value) > 0n && BigInt(value) <= 9223372036854775807n; }
export function validateResult(operation, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) protocol('邮件响应缺少有效 data');
  const record = (value, fields) => {
    if (!value || typeof value !== 'object' || fields.some(field => !responseId(value[field]))) protocol('邮件响应业务 ID 必须为正 BIGINT 字符串');
  };
  const array = value => { if (!Array.isArray(value)) protocol('邮件响应缺少列表'); return value; };
  if (operation === 'send') {
    record(data, ['campaign_id']);
    for (const field of ['requested_count', 'sent_count', 'failed_count', 'scheduled_count', 'pending_count']) {
      if (data[field] === undefined && ['scheduled_count', 'pending_count'].includes(field)) continue;
      if (!Number.isSafeInteger(data[field]) || data[field] < (field === 'requested_count' ? 1 : 0)) protocol('邮件批次计数字段无效');
    }
    for (const field of ['successful_campaign_creator_ids', 'pending_campaign_creator_ids', 'failed_campaign_creator_ids']) if (data[field] !== undefined && array(data[field]).some(value => !responseId(value))) protocol('邮件批次 ID 列表无效');
    for (const item of array(data.items ?? [])) {
      record(item, ['campaign_creator_id', 'send_record_id', 'ledger_record_id']);
      if (typeof item.platform_thread_id !== 'string' || !item.platform_thread_id || typeof item.delivery_status !== 'string') protocol('邮件发送明细无效');
    }
  } else if (operation === 'reply') {
    record(data, ['campaign_creator_id', 'send_record_id', 'ledger_record_id']);
    if (['platform_send_id', 'platform_thread_id', 'platform_message_id', 'delivery_status'].some(field => typeof data[field] !== 'string')) protocol('邮件回复回执无效');
  } else if (operation === 'status') {
    for (const item of array(data.items)) {
      record(item, ['ledger_record_id']);
      if (typeof item.delivery_status !== 'string') protocol('邮件投递状态无效');
    }
  } else if (operation === 'thread') {
    if (!('thread' in data)) protocol('邮件响应缺少 thread');
    if (data.thread !== null) {
      if (!data.thread || typeof data.thread.thread_id !== 'string' || typeof data.thread.subject !== 'string') protocol('会话引用无效');
      for (const message of array(data.thread.messages)) {
        if (!message || ['id', 'direction', 'from_address', 'subject', 'status', 'timestamp'].some(field => typeof message[field] !== 'string') || ['to_addresses', 'cc_addresses'].some(field => !Array.isArray(message[field]) || message[field].some(value => typeof value !== 'string'))) protocol('会话消息无效');
      }
    }
  } else if (operation === 'template') {
    if (!('template' in data)) protocol('邮件响应缺少 template');
    if (data.template !== null && (!data.template || !Number.isSafeInteger(data.template.version) || data.template.version < 1)) protocol('模板版本无效');
  } else {
    record(data, ['campaign_id']);
    if (!Number.isSafeInteger(data.brief_version) || data.brief_version < 1) protocol('Brief 版本无效');
    if (operation === 'generate' && (!Number.isSafeInteger(data.version) || data.version < 1)) protocol('模板版本无效');
    if (operation === 'preview' && (!Number.isSafeInteger(data.expected_content_version) || data.expected_content_version < 0)) protocol('预览版本无效');
    if (operation === 'preview' && ['subject', 'body_html', 'body_text'].some(field => typeof data[field] !== 'string' || !data[field].trim())) protocol('预览内容无效');
  }
}
export function resultWarnings(operation, result, { simulated = false, request } = {}) {
  const data = result.data;
  const warnings = [];
  if (simulated) warnings.push(operation === 'send' && request?.send_mode === 'smart' ? '模拟预约：未提交真实待发送动作' : ['send', 'reply'].includes(operation) ? '模拟发送：未真实发邮件' : '模拟结果：未调用真实服务或模型');
  if (operation === 'send') {
    if (data.failed_count > 0) warnings.push('有未完成或失败目标；不可据此自动重发，部分结果可能未知');
    if (data.pending_count > 0) warnings.push('存在待处理目标，尚未确认发送或预约成功');
    if (data.scheduled_count > 0) warnings.push('已预约不等于已发送或已送达');
    if (data.sent_count > 0) warnings.push('已发送不等于已送达');
  }
  if (operation === 'reply' && data.delivery_status !== 'delivered') warnings.push('按回执状态展示，不视为已送达');
  const statuses = operation === 'send' || operation === 'status' ? (data.items ?? []).map(item => item.delivery_status) : operation === 'reply' ? [data.delivery_status] : [];
  if (statuses.some(state => !deliveryStates.has(state))) warnings.push('存在未知投递状态，请保留原值核对');
  return warnings;
}
export function resolveBaseUrl(value) {
  let base;
  try { base = new URL(value); } catch { throw new OutreachError('configuration', 'SCOUT_API_BASE_URL 必须是有效服务地址'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new OutreachError('configuration', '服务地址不接受凭据、查询参数或片段');
  const path = base.pathname.replace(/\/+$/, '');
  base.pathname = `${path.endsWith('/openapi') ? path : `${path}/openapi`}/v1/outreach`;
  return base.toString().replace(/\/$/, '');
}
export function createOutreachClient({ baseUrl, apiKey, transport, simulated = false, timeoutMs = 30000 } = {}) {
  const base = resolveBaseUrl(baseUrl);
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new OutreachError('configuration', 'SCOUT_API_KEY 未配置，请使用受保护配置');
  if (simulated && typeof transport !== 'function') throw new OutreachError('configuration', '模拟模式必须注入隔离 transport');
  if (transport !== undefined && typeof transport !== 'function') throw new OutreachError('configuration', 'transport 必须为函数');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new OutreachError('configuration', 'timeoutMs 必须为正整数');
  const fetcher = transport ?? globalThis.fetch;
  return {
    async execute(operation, input, { confirmationId } = {}) {
      const request = prepareRequest(operation, input);
      if (operations[operation].confirm && confirmationId !== prepareConfirmation(operation, request).confirmation_id) throw new OutreachError('confirmation', '必须先展示当前目标和完整邮件内容并获得确认，再提供相同请求的 confirmation_id');
      const uncertain = ['send', 'reply', 'generate'].includes(operation);
      const details = { outcome: uncertain ? 'unknown' : 'unavailable' };
      const controller = new AbortController();
      let timeout;
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new OutreachError('timeout', '请求超时；涉及提交时结果可能未知，不自动重试', details)); }, timeoutMs);
      });
      try {
        return await Promise.race([deadline, (async () => {
          const response = await fetcher(`${base}${operations[operation].path}`, {
            method: 'POST', redirect: 'error', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': apiKey },
            body: JSON.stringify(request),
          });
          const raw = await response.text();
          const http = response.status;
          let result;
          try { result = JSON.parse(raw); } catch { protocol('服务未返回有效 JSON；涉及提交时结果可能未知', { status: http, ...details }); }
          if (!result || typeof result.success !== 'boolean') protocol('服务未返回有效 OpenAPI 外壳', { status: http, ...details });
          if (!response.ok) {
            if (![400, 401, 402, 403, 404, 409, 422, 429, 500, 502, 503].includes(http) || result.success !== false || !Number.isInteger(result.error?.code) || result.error.code !== http * 100 + 1 || typeof result.error.message !== 'string') protocol('HTTP 与 OpenAPI 错误外壳不一致', { status: http, ...details });
            const retry = response.headers.get('Retry-After');
            const retryAfter = http === 429 && retry !== null && /^[0-9]+$/.test(retry) && Number.isSafeInteger(Number(retry)) ? Number(retry) : undefined;
            // Never return raw response/header dumps. Redact the configured secret even in a purported safe message.
            const message = result.error.message.split(apiKey).join('[已隐藏]');
            throw new OutreachError('http', message, {
              status: http, code: result.error.code,
              ...(typeof result.meta?.request_id === 'string' ? { request_id: result.meta.request_id.split(apiKey).join('[已隐藏]') } : {}),
              ...(retryAfter !== undefined ? { retry_after: retryAfter } : {}),
              outcome: uncertain ? (http >= 500 ? 'unknown' : 'rejected') : 'unavailable',
            });
          }
          if (http !== operations[operation].status || result.success !== true || result.error != null) protocol('HTTP 成功状态或 OpenAPI 外壳不符合操作契约', { status: http, ...details });
          try { validateResult(operation, result.data); } catch (error) { if (error instanceof OutreachError) Object.assign(error, { status: http, ...details }); throw error; }
          return { response: result, warnings: resultWarnings(operation, result, { simulated, request }), simulated };
        })()]);
      } catch (error) {
        if (error instanceof OutreachError) { if (simulated) error.simulated = true; throw error; }
        throw new OutreachError('network', '请求连接中断；涉及提交时结果可能未知，不自动重试', { ...details, ...(simulated ? { simulated: true } : {}) });
      } finally { clearTimeout(timeout); }
    },
  };
}
