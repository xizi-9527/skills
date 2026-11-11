#!/usr/bin/env node
import { isMain, runCli } from './_outreach_cli.mjs';
export { prepareRequest, prepareConfirmation, selectFirstEmailContent } from './_outreach_client.mjs';
export async function main(options) { return runCli('status', options); }
if (isMain(import.meta.url)) process.exitCode = await main();
