import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, args) {
  console.log(`\n▶ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function assertClean(label) {
  console.log(`\n▶ git diff --exit-code (${label})`);
  const result = spawnSync('git', ['diff', '--exit-code'], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(pnpm, ['content:prepare']);
assertClean('content:prepare');
run(pnpm, ['content:check']);
run(pnpm, ['test']);
run(pnpm, ['typecheck']);
run(pnpm, ['lint']);
run(pnpm, ['format:check']);
run(pnpm, ['ai:function:check']);
run(pnpm, ['audit', '--prod']);
run(pnpm, ['build']);
assertClean('build');
run(pnpm, ['bundle:report']);
run(pnpm, ['seo:check']);
run(pnpm, ['e2e']);

console.log('\n✓ LFW Space release gate passed.');
