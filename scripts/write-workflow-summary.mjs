import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const allowedStatuses = new Set(['PASS', 'FAIL', 'BLOCKED', 'SKIPPED', 'NO APLICA']);

function normalizeStatus(value) {
  const status = String(value ?? '').trim().toUpperCase();
  return allowedStatuses.has(status) ? status : 'BLOCKED';
}

function escapeCell(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function parseControls(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, status, ...detail] = line.split('|');
      return {
        name: name?.trim() || 'Control',
        status: normalizeStatus(status),
        detail: detail.join('|').trim() || 'Sin detalle adicional',
      };
    });
}

function defaultAction(status) {
  return {
    PASS: 'PUEDE CONTINUAR',
    FAIL: 'DEBE CORREGIRSE',
    BLOCKED: 'BLOQUEADO POR AMBIENTE',
    SKIPPED: 'REQUIERE EJECUCIÓN MANUAL',
    'NO APLICA': 'NO REQUIERE EJECUCIÓN PARA ESTE CAMBIO',
  }[status];
}

const status = normalizeStatus(process.env.SUMMARY_STATUS);
const controls = parseControls(process.env.SUMMARY_CONTROLS);
const workflow = process.env.SUMMARY_WORKFLOW || process.env.GITHUB_WORKFLOW || 'Workflow';
const event = process.env.GITHUB_EVENT_NAME || 'local';
const sha = process.env.GITHUB_SHA || 'local';
const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'local';
const pr = process.env.SUMMARY_PR || 'No aplica';
const action = process.env.SUMMARY_ACTION || defaultAction(status);
const data = process.env.SUMMARY_DATA || 'Sin datos sensibles; revisar el control específico.';
let metrics = process.env.SUMMARY_METRICS || 'Sin métricas adicionales.';
if (process.env.SUMMARY_COVERAGE_FILE) {
  try {
    const coverage = JSON.parse(await readFile(process.env.SUMMARY_COVERAGE_FILE, 'utf8')).total;
    metrics = ['statements', 'branches', 'functions', 'lines']
      .map((key) => `${key}: ${coverage[key].pct}%`)
      .join('; ');
  } catch (error) {
    metrics = `Cobertura no disponible: ${error.message}`;
  }
}
const artifacts = process.env.SUMMARY_ARTIFACTS || 'Ninguno.';

const lines = [
  `## ${workflow}`,
  '',
  '| Campo | Valor |',
  '|---|---|',
  `| Evento | ${escapeCell(event)} |`,
  `| SHA | \`${escapeCell(sha)}\` |`,
  `| Rama | ${escapeCell(branch)} |`,
  `| PR | ${escapeCell(pr)} |`,
  `| Datos / ambiente | ${escapeCell(data)} |`,
  '',
  '### Pruebas / controles ejecutados',
  '',
  '| Control | Resultado | Detalle |',
  '|---|---|---|',
  ...controls.map(({ name, status: controlStatus, detail }) =>
    `| ${escapeCell(name)} | **${controlStatus}** | ${escapeCell(detail)} |`),
  '',
  `**Métricas importantes:** ${metrics}`,
  '',
  `**Artifacts:** ${artifacts}`,
  '',
  `**ESTADO GENERAL: ${status}**`,
  '',
  `**ACCIÓN RECOMENDADA: ${action}**`,
  '',
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines}\n`, 'utf8');
} else {
  process.stdout.write(`${lines}\n`);
}

if (process.env.SUMMARY_REPORT) {
  await mkdir(dirname(process.env.SUMMARY_REPORT), { recursive: true });
  await writeFile(
    process.env.SUMMARY_REPORT,
    JSON.stringify(
      {
        workflow,
        event,
        sha,
        branch,
        pr,
        controls,
        data,
        metrics,
        artifacts,
        status,
        action,
      },
      null,
      2,
    ),
    'utf8',
  );
}
