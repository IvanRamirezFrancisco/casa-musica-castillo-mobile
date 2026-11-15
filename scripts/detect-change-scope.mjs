import { appendFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function isDocumentationPath(path) {
  return path.startsWith('docs/') || path.endsWith('.md');
}

async function changedFilesFromGitHubEvent() {
  if (process.argv[2] === '--files') return process.argv.slice(3);

  const eventName = process.env.GITHUB_EVENT_NAME;
  if (!['pull_request', 'push'].includes(eventName)) return null;

  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  // En synchronize se evalúa solo el bloque recién incorporado; al abrir/reabrir se evalúa todo el PR.
  const synchronized = eventName === 'pull_request' && event.action === 'synchronize' && event.before && event.after;
  const base = synchronized ? event.before : eventName === 'pull_request' ? event.pull_request?.base?.sha : event.before;
  const head = synchronized ? event.after : eventName === 'pull_request' ? event.pull_request?.head?.sha : event.after;
  if (!base || !head || /^0+$/.test(base)) return null;

  const { stdout } = await execFileAsync('git', ['diff', '--name-only', base, head]);
  return stdout.split('\n').map((path) => path.trim()).filter(Boolean);
}

function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  return appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, 'utf8');
}

const files = await changedFilesFromGitHubEvent();
const automaticEvent = ['pull_request', 'push'].includes(process.env.GITHUB_EVENT_NAME);
const docsOnly = automaticEvent && Array.isArray(files) && files.length > 0 && files.every(isDocumentationPath);
const reason = docsOnly
  ? 'Todos los archivos modificados pertenecen a docs/** o terminan en .md.'
  : automaticEvent
    ? 'Existe al menos un cambio ejecutable/configurable, o no fue posible demostrar que el cambio sea solo documental.'
    : 'Las ejecuciones manuales y reutilizables conservan el alcance completo.';

await Promise.all([
  writeOutput('docs_only', String(docsOnly)),
  writeOutput('changed_count', String(files?.length ?? 0)),
]);

const status = docsOnly ? 'NO APLICA' : 'APLICA';
const filePreview = files?.length ? files.slice(0, 20).map((path) => `- \`${path}\``).join('\n') : '- No disponible para este evento.';
const summary = [
  '## Alcance del cambio',
  '',
  `**Controles pesados:** ${status}`,
  '',
  reason,
  '',
  `**Archivos detectados:** ${files?.length ?? 'no disponible'}`,
  '',
  filePreview,
  files && files.length > 20 ? `- … y ${files.length - 20} archivo(s) más.` : '',
  '',
].filter((line) => line !== '').join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
} else {
  process.stdout.write(`${JSON.stringify({ docsOnly, reason, files }, null, 2)}\n`);
}
