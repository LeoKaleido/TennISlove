// Aggiorna i risultati del seed leggendoli dall'Excel di Giuseppe (foglio "Calendario").
// Uso: pnpm seed:excel <file.xlsm>   →   riscrive prisma/seed-results.json
// Da lanciare prima della pubblicazione con l'Excel più recente, poi si esegue il seed.

import { writeFile } from 'node:fs/promises';
import { evaluateMatch, type MatchScoreInput } from '@tentennis/shared';
import ExcelJS from 'exceljs';
import { matchCode, PLAYERS, ROUNDS, type SeedResult } from './seed-data';

const file = process.argv[2];
if (!file) {
  console.error('Uso: pnpm seed:excel <file.xlsm>');
  process.exit(1);
}

/** Valore di una cella: per le formule conta il risultato calcolato */
function cellValue(ws: ExcelJS.Worksheet, address: string): string | number | null {
  const v = ws.getCell(address).value as unknown;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object' && v !== null && 'result' in v) return (v as { result: string | number | null }).result ?? null;
  if (typeof v === 'string' || typeof v === 'number') return v;
  return null;
}

const num = (v: string | number | null) => (v === null ? null : Number(v));
const pair = (a: number | null, b: number | null) => (a === null && b === null ? null : { a: a ?? 0, b: b ?? 0 });

// Nel calendario dell'Excel ci sono i nomi completi; i nomi brevi sono accettati per i file più vecchi
const byName = new Map<string, string>();
for (const p of PLAYERS) {
  byName.set(`${p.firstName} ${p.lastName}`.toLowerCase(), p.key);
  byName.set(p.key.toLowerCase(), p.key);
}
const expected = new Map<string, [string, string]>();
ROUNDS.forEach((r, i) => r.matches.forEach(([a, b], j) => expected.set(matchCode(i + 1, j + 1), [a, b])));

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.getWorksheet('Calendario');
if (!ws) throw new Error('Foglio "Calendario" non trovato');

const results: Record<string, SeedResult> = {};
const problems: string[] = [];

for (let row = 8; row <= ws.rowCount; row++) {
  const code = cellValue(ws, `AA${row}`);
  if (typeof code !== 'string' || !/^G\d{2}-\d{2}$/.test(code)) continue;
  const state = cellValue(ws, `F${row}`);
  if (state !== 'Conclusa' && state !== 'Tempo scaduto') continue;

  const a = byName.get(String(cellValue(ws, `D${row}`) ?? '').trim().toLowerCase());
  const b = byName.get(String(cellValue(ws, `E${row}`) ?? '').trim().toLowerCase());
  const exp = expected.get(code);
  if (!exp || a !== exp[0] || b !== exp[1]) {
    problems.push(`${code} (riga ${row}): giocatori diversi dal calendario del seed`);
    continue;
  }

  const input: MatchScoreInput = {
    timeExpired: state === 'Tempo scaduto',
    set1: pair(num(cellValue(ws, `G${row}`)), num(cellValue(ws, `H${row}`))),
    set2: pair(num(cellValue(ws, `I${row}`)), num(cellValue(ws, `J${row}`))),
    stb: pair(num(cellValue(ws, `K${row}`)), num(cellValue(ws, `L${row}`))),
  };
  const ev = evaluateMatch(input);
  if (ev.status !== 'OK') {
    problems.push(`${code} (riga ${row}): ${ev.message}`);
    continue;
  }
  // controllo incrociato con i punti calcolati dall'Excel
  const excelA = num(cellValue(ws, `N${row}`));
  const excelB = num(cellValue(ws, `O${row}`));
  if (excelA !== null && excelB !== null && (excelA !== ev.pointsA || excelB !== ev.pointsB)) {
    problems.push(`${code}: punti diversi dall'Excel (app ${ev.pointsA}-${ev.pointsB}, Excel ${excelA}-${excelB}), importato comunque`);
  }
  results[code] = input;
}

const sorted = Object.fromEntries(Object.entries(results).sort(([x], [y]) => x.localeCompare(y)));
await writeFile(new URL('./seed-results.json', import.meta.url), JSON.stringify(sorted, null, 2) + '\n');
console.log(`${Object.keys(sorted).length} risultati scritti in prisma/seed-results.json`);
if (problems.length) console.log(`Da controllare:\n- ${problems.join('\n- ')}`);
