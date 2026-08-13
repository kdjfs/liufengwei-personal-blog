import process from 'node:process';

process.env.LFW_AI_DEV_MODE = 'local';
process.env.LFW_AI_STRICT = '1';

await import('./dev.mjs');
