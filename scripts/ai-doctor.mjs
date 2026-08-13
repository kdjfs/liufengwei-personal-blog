import process from 'node:process';
import { AnthropicSSEDecoder } from '../src/lib/ai/sse.ts';
import {
  getApiKeyStatus,
  inspectLocalGateway,
  LOCAL_AI_HOST,
  LOCAL_AI_PORT,
  loadLocalDevEnvironment,
} from './local-ai-environment.mjs';

const probe = process.argv.includes('--probe');
const strict = process.argv.includes('--strict') || probe;
const local = loadLocalDevEnvironment();
const environment = local.environment;
const keyStatus = getApiKeyStatus(environment.DEEPSEEK_API_KEY);
const mode =
  environment.NODE_ENV === 'production'
    ? 'production-vercel'
    : environment.LFW_AI_DEV_MODE === 'cloud'
      ? 'cloud-8788'
      : 'local-8787';
const astroOrigin = environment.LFW_ASTRO_ORIGIN ?? 'http://localhost:4321';
const gateway = await inspectLocalGateway();
const nodeVersion = process.versions.node;
const [nodeMajor, nodeMinor] = nodeVersion.split('.').map(Number);
const nodeSupported = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12);

console.log('[LFW AI Doctor]');
console.log(`Node: ${nodeVersion} (${nodeSupported ? 'OK' : '需要 >= 22.12.0'})`);
console.log(`.env.local: ${local.exists ? '存在' : '缺失'}`);
console.log(`DEEPSEEK_API_KEY: ${keyStatus}`);
console.log(`Astro Origin: ${astroOrigin}`);
console.log(
  `Local Gateway ${LOCAL_AI_HOST}:${LOCAL_AI_PORT}: ${
    gateway.state === 'lfw'
      ? gateway.configured
        ? 'reachable / configured'
        : 'reachable / unconfigured'
      : gateway.state
  }`,
);
console.log(`PUBLIC_AI_API_URL: ${environment.PUBLIC_AI_API_URL?.trim() ? 'configured' : 'empty'}`);
console.log(`Resolved mode: ${mode}`);

let failed = !nodeSupported || !local.exists || keyStatus !== 'configured';
if (strict && mode === 'local-8787' && (gateway.state !== 'lfw' || !gateway.configured))
  failed = true;

if (probe) {
  if (gateway.state !== 'lfw' || !gateway.configured) {
    console.error('[LFW AI Doctor] Probe 跳过：Local Gateway 未就绪。');
  } else {
    const response = await fetch(`http://${LOCAL_AI_HOST}:${LOCAL_AI_PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: astroOrigin },
      body: JSON.stringify({
        mode: 'fast',
        messages: [{ role: 'user', content: '只回复：LFW_AI_OK' }],
        context: [],
        currentPage: { title: 'Local AI Doctor', url: '/' },
      }),
    }).catch(() => undefined);
    if (!response?.ok || !response.body) {
      failed = true;
      console.error(`[LFW AI Doctor] Probe: FAIL (${response?.status ?? 'network'})`);
    } else {
      const decoder = new AnthropicSSEDecoder();
      const textDecoder = new TextDecoder();
      const reader = response.body.getReader();
      let output = '';
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        output += decoder.push(textDecoder.decode(chunk.value, { stream: true })).join('');
      }
      output += decoder.push(textDecoder.decode()).join('');
      const passed = output.trim().length > 0;
      failed ||= !passed;
      console.log(`[LFW AI Doctor] Probe: ${passed ? 'PASS' : 'FAIL'}`);
    }
  }
}

if (failed) process.exitCode = 1;
