// Response notices for the six creator discovery endpoints. No requests or retries.
export function reportHttpError(response, result) {
  if (result !== null && result !== undefined) console.log(JSON.stringify(result, null, 2));
  const status = response.status;
  let hint;
  if (status === 401) {
    hint = '请检查 SCOUT_API_KEY 是否缺失、无效、过期或已撤销。';
  } else if (status === 402 && result?.error?.code === 40201 &&
      result?.error?.message === 'insufficient_credits') {
    hint = '积分不足，请检查钱包余额；价格和扣费由服务端 Billing 负责。';
  } else if (status === 403) {
    hint = '请检查 Key scope、服务端 scope 策略、用户 Scout Discover 权限或资源归属；不一定是缺少套餐。';
  } else if (status === 429) {
    const retry = validRetryAfter(response.headers?.get('Retry-After'));
    hint = retry
      ? '请求受到限流，请等待' + retry + '后再按需查询；不自动重试，不通过更换 Key 绕过限流。'
      : '请求受到限流，未提供有效 Retry-After，无法确定等待时间；不自动重试，不通过更换 Key 绕过限流。';
  } else if (status === 503) {
    hint = '服务或依赖暂不可用，不表示 Key 一定无效。';
  }
  console.error(JSON.stringify({ status, error: result?.error ?? result, ...(hint ? { hint } : {}) }));
}

function validRetryAfter(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed) && Number.isSafeInteger(Number(trimmed))) return trimmed + ' 秒';
  const time = Date.parse(trimmed);
  // Accept the canonical HTTP-date form, not Date.parse's permissive date guesses.
  if (Number.isFinite(time) && new Date(time).toUTCString() === trimmed) return '至 ' + trimmed + ' ';
  return null;
}

export function reportBilling(meta) {
  let hint;
  if (meta?.billing_status === 'pending_settlement') {
    hint = '业务结果已返回，积分仍待结算；credits_consumed=null 不是扣费 0。credits_remaining 为准入时余额，非扣款后余额，-1 表示未提供。';
  } else if (meta?.billing_status === 'recording_failed') {
    hint = '用量登记失败，需要核对；不代表业务查询失败，也不能据此认定免费或已扣费。credits_consumed=null 表示尚未取得已结算积分数。';
  }
  if (hint) console.error(JSON.stringify({
    billing_status: meta.billing_status,
    billing_operation_id: meta.billing_operation_id,
    hint: hint + ' 不要自动重跑搜索；重新搜索会产生新的独立计费操作，不能代替查询原回执。',
  }));
}

export function reportBusinessNotice(data) {
  if (data.status === 'empty') {
    console.error(JSON.stringify({ status: data.status, errors: data.errors,
      hint: '本次未找到候选达人，不自动放宽条件或重复搜索。' }));
  } else if (['partial', 'router_degraded'].includes(data.status) || data.errors?.length) {
    console.error(JSON.stringify({ status: data.status, errors: data.errors,
      hint: data.status === 'router_degraded' ? '本次结果可能不是最优检索方式，请结合实际候选及错误判断。'
        : '本次结果含部分成功或错误，请结合实际候选及错误判断。' }));
  }
}
