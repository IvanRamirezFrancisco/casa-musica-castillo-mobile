import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const terminalFailure = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'stale']);
const terminalSkipped = new Set(['skipped', 'neutral']);

export function evaluateQualityGate(checkRuns, requiredNames, { docsOnly = false } = {}) {
  const controls = requiredNames.map((name) => {
    const matches = checkRuns
      .filter((run) => run.name === name)
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
    const run = matches[0];
    if (!run) return { name, status: 'PENDING', detail: 'El check todavía no apareció para el SHA evaluado.' };
    if (run.status !== 'completed') {
      return { name, status: 'PENDING', detail: `Check ${run.id ?? ''}; estado GitHub: ${run.status}.`.trim() };
    }
    if (run.conclusion === 'success') {
      return { name, status: 'PASS', detail: `Check ${run.id ?? ''} completado correctamente.`.trim() };
    }
    if (terminalSkipped.has(run.conclusion)) {
      if (docsOnly) {
        return {
          name,
          status: 'NO APLICA',
          detail: `Check ${run.id ?? ''} omitido por la regla explícita de cambio exclusivamente documental.`.trim(),
        };
      }
      return { name, status: 'BLOCKED', detail: `Conclusión GitHub inesperada para un cambio ejecutable: ${run.conclusion}.` };
    }
    if (terminalFailure.has(run.conclusion)) {
      return { name, status: 'FAIL', detail: `Conclusión GitHub: ${run.conclusion}.` };
    }
    return { name, status: 'PENDING', detail: `Conclusión todavía no terminal: ${run.conclusion ?? 'null'}.` };
  });

  const terminal = new Set(['PASS', 'FAIL', 'BLOCKED', 'NO APLICA']);
  const complete = controls.every(({ status }) => terminal.has(status));
  const general = controls.some(({ status }) => status === 'FAIL')
    ? 'FAIL'
    : controls.some(({ status }) => status === 'BLOCKED')
      ? 'BLOCKED'
      : controls.every(({ status }) => ['PASS', 'NO APLICA'].includes(status))
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

function context() {
  return {
    sha: process.env.QUALITY_GATE_SHA || process.env.GITHUB_SHA || 'fixture-local',
    event: process.env.GITHUB_EVENT_NAME || 'local',
    pr: process.env.QUALITY_GATE_PR || 'No aplica',
    branch: process.env.QUALITY_GATE_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'local',
    docsOnly: process.env.QUALITY_GATE_DOCS_ONLY === 'true',
  };
}

async function getCheckRuns(sha) {
  if (process.argv[2] === '--evaluate-file') {
    const fixture = JSON.parse(await readFile(process.argv[3], 'utf8'));
    return fixture.check_runs ?? fixture;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repository || !sha || !token) {
    throw new Error('GITHUB_REPOSITORY, QUALITY_GATE_SHA/GITHUB_SHA y GITHUB_TOKEN son obligatorios.');
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

async function saveReport(result, requiredChecks, gateContext, metadata) {
  const reportPath = process.env.QUALITY_GATE_REPORT || 'reports/devops-quality-gate.json';
  await mkdir(dirname(reportPath), { recursive: true });
  const found = result.controls.filter(({ status }) => status !== 'PENDING').map(({ name }) => name);
  const missing = result.controls.filter(({ status }) => status === 'PENDING').map(({ name }) => name);
  const report = {
    workflow: 'DEVOPS QUALITY GATE',
    ...gateContext,
    repository: process.env.GITHUB_REPOSITORY || 'local',
    requiredChecks,
    checksFound: found,
    checksMissingOrPending: missing,
    status: result.general,
    timedOut: metadata.timedOut,
    attempts: metadata.attempts,
    controls: result.controls,
    action: result.general === 'PASS'
      ? gateContext.docsOnly ? 'PUEDE CONTINUAR; CONTROLES PESADOS NO APLICAN' : 'PUEDE CONTINUAR'
      : result.general === 'PENDING' ? 'ESPERAR O CORREGIR CHECK AUSENTE' : 'DEBE CORREGIRSE',
    generatedAt: new Date().toISOString(),
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const rows = result.controls.map(({ name, status, detail }) => `| ${name} | **${status}** | ${detail} |`);
  const summary = [
    '## DEVOPS QUALITY GATE',
    '',
    `**SHA evaluado:** \`${report.sha}\``,
    '',
    `**Evento:** ${report.event} · **PR:** ${report.pr} · **Rama:** ${report.branch}`,
    '',
    `**Checks buscados:** ${requiredChecks.length} · **Encontrados/terminales:** ${found.length} · **Pendientes/ausentes:** ${missing.length}`,
    '',
    '| Check obligatorio | Estado | Detalle |',
    '|---|---|---|',
    ...rows,
    '',
    `**Timeout:** ${report.timedOut ? 'SÍ' : 'NO'} · **Intentos:** ${report.attempts}`,
    '',
    `**ESTADO GENERAL: ${result.general}**`,
    '',
    `**ACCIÓN RECOMENDADA: ${report.action}**`,
    '',
  ].join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
  } else {
    process.stdout.write(summary);
  }
  return report;
}

async function main() {
  const requiredChecks = requiredChecksFromEnvironment();
  if (requiredChecks.length === 0) throw new Error('QUALITY_GATE_CHECKS no puede estar vacío.');

  const gateContext = context();
  const fixtureMode = process.argv[2] === '--evaluate-file';
  const maxAttempts = fixtureMode ? 1 : Number(process.env.QUALITY_GATE_MAX_ATTEMPTS || 60);
  const intervalMs = Number(process.env.QUALITY_GATE_INTERVAL_MS || 15000);
  let result;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    result = evaluateQualityGate(await getCheckRuns(gateContext.sha), requiredChecks, gateContext);
    if (result.complete) break;
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const timedOut = !result.complete;
  await saveReport(result, requiredChecks, gateContext, { timedOut, attempts });
  if (result.general !== 'PASS') process.exitCode = 1;
}

await main();
