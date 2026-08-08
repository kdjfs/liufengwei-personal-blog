import { spawnSync } from 'node:child_process';

const pnpmCli = process.env.npm_execpath;
if (!pnpmCli) throw new Error('Run the release gate through `pnpm release:check`.');

function run(command, args) {
  console.log(`\n▶ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runPnpm(args) {
  run(process.execPath, [pnpmCli, ...args]);
}

function assertClean(label) {
  console.log(`\n▶ git diff --exit-code (${label})`);
  const result = spawnSync('git', ['diff', '--exit-code'], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runPnpm(['content:prepare']);
assertClean('content:prepare');
runPnpm(['content:check']);
runPnpm(['test']);
runPnpm(['typecheck']);
runPnpm(['lint']);
runPnpm(['format:check']);
runPnpm(['ai:function:check']);
runPnpm(['audit', '--prod']);
runPnpm(['build']);
assertClean('build');
runPnpm(['bundle:report']);
runPnpm(['seo:check']);
runPnpm(['e2e']);

console.log('\n✓ LFW Space release gate passed.');
