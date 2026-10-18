import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const terminalFailure = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'stale']);
const terminalBlocked = new Set(['skipped', 'neutral']);

export function evaluateQualityGate(checkRuns, requiredNames) {
  const controls = requiredNames.map((name) => {
    const matches = checkRuns
      .filter((run) => run.name === name)
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
    const run = matches[0];
    if (!run) return { name, status: 'PENDING', detail: 'El check todavía no apareció para este SHA.' };
    if (run.status !== 'completed') {
      return { name, status: 'PENDING', detail: `Estado GitHub: ${run.status}.` };
    }
    if (run.conclusion === 'success') {
      return { name, status: 'PASS', detail: `Check ${run.id ?? ''} completado correctamente.`.trim() };
    }
    if (terminalBlocked.has(run.conclusion)) {
      return { name, status: 'BLOCKED', detail: `Conclusión GitHub: ${run.conclusion}.` };
    }
    if (terminalFailure.has(run.conclusion)) {
      return { name, status: 'FAIL', detail: `Conclusión GitHub: ${run.conclusion}.` };
    }
    return { name, status: 'PENDING', detail: `Conclusión todavía no terminal: ${run.conclusion ?? 'null'}.` };
  });

  const complete = controls.every(({ status }) => ['PASS', 'FAIL', 'BLOCKED'].includes(status));
  const general = controls.some(({ status }) => status === 'FAIL')
    ? 'FAIL'
    : controls.some(({ status }) => status === 'BLOCKED')
      ? 'BLOCKED'
      : controls.every(({ status }) => status === 'PASS')
        ? 'PASS'
        : 'PENDING';
  return { controls, complete, general };
}

function requiredChecksFromEnvironment() {
  return (process.env.QUALITY_GATE_CHECKS || '')
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);
}

async function getCheckRuns() {
  if (process.argv[2] === '--evaluate-file') {
    const fixture = JSON.parse(await readFile(process.argv[3], 'utf8'));
    return fixture.check_runs ?? fixture;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !sha || !token) {
    throw new Error('GITHUB_REPOSITORY, GITHUB_SHA y GITHUB_TOKEN son obligatorios para consultar checks.');
  }
  const response = await fetch(
    `https://api.github.com/repos/${repository}/commits/${sha}/check-runs?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub checks API respondió ${response.status}: ${await response.text()}`);
  }
  return (await response.json()).check_runs;
}

async function saveReport(result, requiredChecks) {
  const reportPath = process.env.QUALITY_GATE_REPORT || 'reports/devops-quality-gate.json';
  await mkdir(dirname(reportPath), { recursive: true });
  const report = {
    workflow: 'DEVOPS QUALITY GATE',
    sha: process.env.GITHUB_SHA || 'fixture-local',
    repository: process.env.GITHUB_REPOSITORY || 'local',
    requiredChecks,
    status: result.general,
    controls: result.controls,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const rows = result.controls.map(({ name, status, detail }) => `| ${name} | **${status}** | ${detail} |`);
  const action = result.general === 'PASS'
    ? 'PUEDE CONTINUAR'
    : result.general === 'PENDING'
      ? 'BLOQUEADO: checks todavía en ejecución o ausentes'
      : 'DEBE CORREGIRSE';
  const summary = [
    '## DEVOPS QUALITY GATE',
    '',
    `**SHA:** \`${report.sha}\``,
    '',
    '| Check obligatorio | Estado | Detalle |',
    '|---|---|---|',
    ...rows,
    '',
    `**ESTADO GENERAL: ${result.general}**`,
    '',
    `**ACCIÓN RECOMENDADA: ${action}**`,
    '',
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
  } else {
    process.stdout.write(summary);
  }
}

async function main() {
  const requiredChecks = requiredChecksFromEnvironment();
  if (requiredChecks.length === 0) throw new Error('QUALITY_GATE_CHECKS no puede estar vacío.');

  const fixtureMode = process.argv[2] === '--evaluate-file';
  const attempts = fixtureMode ? 1 : Number(process.env.QUALITY_GATE_MAX_ATTEMPTS || 60);
  const intervalMs = Number(process.env.QUALITY_GATE_INTERVAL_MS || 15000);
  let result;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = evaluateQualityGate(await getCheckRuns(), requiredChecks);
    if (result.complete) break;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  await saveReport(result, requiredChecks);
  if (result.general !== 'PASS') process.exitCode = 1;
}

await main();
