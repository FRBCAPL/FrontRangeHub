/** Read an uploaded spreadsheet into rows of text cells. SheetJS is only downloaded when a file is picked. */

export const SHEET_ACCEPT = '.xlsx,.xlsm,.xls,.ods,.numbers,.csv,.tsv,.txt';
const MAX_BYTES = 5 * 1024 * 1024;
const TEXT_FILE = /\.(csv|tsv|txt)$/i;

const tidyRows = (rows) =>
  rows
    .map((r) => (Array.isArray(r) ? r : []).map((c) => String(c ?? '').replace(/\s+/g, ' ').trim()))
    .filter((r) => r.some(Boolean));

/** File → [{ name, rows }] for every sheet that has something in it. Throws plain-English errors. */
export async function readSheetFile(file) {
  if (!file) throw new Error('Pick a file first.');
  if (file.size > MAX_BYTES) throw new Error('That file is over 5 MB. Save just the team list as its own sheet and try again.');
  const XLSX = await import('xlsx');
  let book;
  try {
    // Text files are read as plain text so "719-555-0123" or "1-2" never turn into dates.
    book = TEXT_FILE.test(file.name)
      ? XLSX.read(await file.text(), { type: 'string', raw: true })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  } catch {
    throw new Error('Couldn’t read that file. Try saving it as .xlsx or .csv.');
  }
  const sheets = book.SheetNames
    .map((name) => ({
      name,
      rows: tidyRows(XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false, defval: '', blankrows: false })),
    }))
    .filter((s) => s.rows.length);
  if (!sheets.length) throw new Error('That file looks empty.');
  return sheets;
}

/** Download a starter CSV (opens in Excel, Google Sheets, Numbers…). */
export function downloadTemplate(csv, filename = 'duezy-teams-template.csv') {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
