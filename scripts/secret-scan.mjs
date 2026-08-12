import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const tokenRules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['provider-secret', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
];

const configFile = /(?:^|\/)(?:Dockerfile|[^/]+\.(?:env|ini|properties|toml|ya?ml))$/i;
const credentialAssignment =
  /^\s*([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*[:=]\s*["']?([^"'#\r\n]+?)["']?\s*$/gm;

function isDocumentedNonSecret(value) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized.startsWith('${') ||
    normalized.includes('secrets.') ||
    normalized.includes('process.env') ||
    normalized.includes('replace_me') ||
    normalized.startsWith('replace_with') ||
    normalized.endsWith('_test_only') ||
    normalized.endsWith('_local_only')
  );
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

export function findSecrets(path, content) {
  const findings = [];
  for (const [rule, expression] of tokenRules) {
    expression.lastIndex = 0;
    for (const match of content.matchAll(expression)) {
      findings.push({ path, line: lineNumber(content, match.index ?? 0), rule });
    }
  }

  if (configFile.test(path.replaceAll('\\', '/'))) {
    credentialAssignment.lastIndex = 0;
    for (const match of content.matchAll(credentialAssignment)) {
      if (!isDocumentedNonSecret(match[2])) {
        findings.push({
          path,
          line: lineNumber(content, match.index ?? 0),
          rule: 'literal-secret',
        });
      }
    }
  }
  return findings;
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
}

export function scanTrackedFiles() {
  const findings = [];
  for (const path of trackedFiles()) {
    const buffer = readFileSync(path);
    if (buffer.length > 5 * 1024 * 1024 || buffer.includes(0)) continue;
    findings.push(...findSecrets(path, buffer.toString('utf8')));
  }
  return findings;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const findings = scanTrackedFiles();
  if (findings.length) {
    console.error('Secret scan failed. Potential credentials were found:');
    for (const finding of findings) {
      console.error(`- ${finding.path}:${finding.line} (${finding.rule})`);
    }
    process.exitCode = 1;
  } else {
    console.log('Secret scan passed: tracked text files contain no recognized credentials.');
  }
}
