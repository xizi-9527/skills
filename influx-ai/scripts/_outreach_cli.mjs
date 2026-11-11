import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createOutreachClient, operations, OutreachError, prepareConfirmation } from './_outreach_client.mjs';

export function isMain(url) { return Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === url; }

export async function runCli(operation, { args = process.argv.slice(2), env = process.env, client, stdout = value => console.log(value), stderr = value => console.error(value) } = {}) {
  try {
    let inputText, file, confirmationId, prepare = false;
    for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      if (arg === '--input-file') { if (file || !args[index + 1]) throw new OutreachError('input', '--input-file 需要一个本地 JSON 文件'); file = args[++index]; }
      else if (arg === '--prepare') prepare = true;
      else if (arg === '--confirm') { if (confirmationId || !args[index + 1]) throw new OutreachError('input', '--confirm 需要内容预览返回的 confirmation_id'); confirmationId = args[++index]; }
      else if (!arg.startsWith('--') && inputText === undefined) inputText = arg;
      else throw new OutreachError('input', '调用参数无效');
    }
    if ((file && inputText !== undefined) || (!file && inputText === undefined) || (prepare && confirmationId) || ((prepare || confirmationId) && !operations[operation]?.confirm)) throw new OutreachError('input', '使用单个 JSON 或 --input-file；发送/回复使用 --prepare 或 --confirm');
    if (file) { try { inputText = await readFile(file, 'utf8'); } catch { throw new OutreachError('input', '无法读取本地请求文件'); } }
    let input;
    try { input = JSON.parse(inputText.replace(/^\uFEFF/, '')); } catch { throw new OutreachError('input', '请求必须为有效 JSON，ID 应使用字符串'); }
    if (operations[operation]?.confirm && (prepare || !confirmationId)) {
      stdout(JSON.stringify(prepareConfirmation(operation, input), null, 2));
      return 0;
    }
    const activeClient = client ?? createOutreachClient({ baseUrl: env.SCOUT_API_BASE_URL, apiKey: env.SCOUT_API_KEY });
    const result = await activeClient.execute(operation, input, { confirmationId });
    // Preserve the server wrapper. Simulation markers/warnings are output separately.
    for (const warning of result.warnings) stderr(warning);
    stdout(JSON.stringify(result.response, null, 2));
    if (operation === 'send' && (result.response.data.failed_count > 0 || result.response.data.pending_count > 0)) return 2;
    if (operation === 'reply' && !['sent', 'delivered'].includes(result.response.data.delivery_status)) return 2;
    return 0;
  } catch (error) {
    const safe = error instanceof OutreachError ? Object.fromEntries(
      ['kind', 'message', 'status', 'code', 'request_id', 'retry_after', 'outcome'].filter(field => error[field] !== undefined).map(field => [field, error[field]])
    ) : { kind: 'local', message: '本地邮件操作失败，未输出原始异常' };
    stderr(JSON.stringify({ ...(error.simulated ? { simulation: '模拟错误：未调用真实服务或模型' } : {}), error: safe }));
    return 1;
  }
}
