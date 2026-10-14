import React, { useMemo, useState } from 'react';
import DuezyColumnMap from './DuezyColumnMap.jsx';
import DuezyImportPreview from './DuezyImportPreview.jsx';
import DuezyLayoutPicker from './DuezyLayoutPicker.jsx';
import { assignDivisions, guessColumns, MAX_IMPORT_TEAMS, TEMPLATE_CSV } from '../../utils/duezyRoster.js';
import {
  guessLayout, kindsFor, layoutRows, layoutToTeams, looksPerPlayer, recallLayout, rememberLayout,
} from '../../utils/duezyRosterLayout.js';
import { downloadTemplate, readSheetFile, SHEET_ACCEPT } from '../../utils/duezySheetRead.js';

const padKinds = (kinds, rows) => {
  const width = Math.max(kinds.length, ...rows.map((r) => r.length));
  return Array.from({ length: width }, (_, i) => kinds[i] || 'skip');
};

/** Best guess for a sheet, replaced by the layout saved last time this heading row was imported. */
function startingLayout(rows) {
  const guess = guessLayout(rows);
  const { heading } = layoutRows(rows, guess);
  const saved = recallLayout(heading);
  const layout = saved ? { ...guess, kinds: saved.kinds, perPlayer: Boolean(saved.perPlayer) } : guess;
  return { layout: { ...layout, kinds: padKinds(layout.kinds, rows) }, remembered: Boolean(saved) };
}

/**
 * "Upload a file" tab: Excel, Google Sheets download, Numbers, LibreOffice or CSV → layout + columns → preview → add.
 * `divisions` [{ id, name }] lets a Division column route teams; `children` = the fallback division picker.
 */
export default function DuezyTeamUpload({
  divisions = [], fallbackName = '', existingNames = [], busy, error, onImport, onCancel, children,
}) {
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [layout, setLayout] = useState({ startRow: 0, hasHeadings: false, perPlayer: false, kinds: [] });
  const [remembered, setRemembered] = useState(false);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const rows = sheets[sheetIndex]?.rows || [];
  const body = rows.slice(layout.startRow);

  const chooseSheet = (list, index) => {
    const start = startingLayout(list[index]?.rows || []);
    setSheetIndex(index);
    setLayout(start.layout);
    setRemembered(start.remembered);
  };

  /** Column guesses follow the start row and heading choice; the row layout is re-guessed with them. */
  const relayout = (startRow, hasHeadings) => {
    const kinds = padKinds(kindsFor(rows, startRow, hasHeadings), rows);
    const { data } = layoutRows(rows, { startRow, hasHeadings });
    setLayout({ startRow, hasHeadings, kinds, perPlayer: looksPerPlayer(data, kinds) });
    setRemembered(false);
  };
  const changeStart = (startRow) => relayout(startRow, guessColumns(rows.slice(startRow)).hasHeadings);

  const pick = async (file) => {
    if (!file) return;
    setReading(true);
    setReadError('');
    try {
      const list = await readSheetFile(file);
      setFileName(file.name);
      setSheets(list);
      const best = list.findIndex((s) => guessLayout(s.rows).hasHeadings);
      chooseSheet(list, best >= 0 ? best : 0);
    } catch (err) {
      setReadError(err.message || 'Couldn’t read that file.');
    } finally {
      setReading(false);
    }
  };

  const { teams, unmatched, total } = useMemo(() => {
    const all = layoutToTeams(rows, layout);
    return { ...assignDivisions(all.slice(0, MAX_IMPORT_TEAMS), divisions), total: all.length };
  }, [rows, layout, divisions]);
  const tooMany = total > MAX_IMPORT_TEAMS;

  const submit = () => {
    if (!teams.length) return;
    rememberLayout(layoutRows(rows, layout).heading, layout);
    onImport(teams);
  };

  if (!sheets.length) {
    return (
      <div className="dz-team-modal-form">
        <label className={`dz-upload-drop${reading ? ' is-busy' : ''}`}>
          <input type="file" accept={SHEET_ACCEPT} onChange={(e) => pick(e.target.files?.[0])} disabled={reading} />
          <span className="dz-upload-icon" aria-hidden="true">📄</span>
          <strong>{reading ? 'Reading your file…' : 'Choose a spreadsheet'}</strong>
          <small>Excel, Google Sheets, Numbers, LibreOffice or CSV</small>
        </label>
        <p className="dz-team-modal-hint">
          From Google Sheets: <b>File › Download › Microsoft Excel (.xlsx)</b> or <b>CSV</b>. One team per row; captain, phone or email,
          division and players are all optional.{' '}
          <button type="button" className="dz-link" onClick={() => downloadTemplate(TEMPLATE_CSV)}>Download a template</button>
        </p>
        {readError ? <p className="dz-error">{readError}</p> : null}
        <div className="dz-team-modal-actions">
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <form className="dz-team-modal-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="dz-upload-file">
        <span>📄 {fileName}</span>
        <button type="button" className="dz-link dz-small" onClick={() => { setSheets([]); setFileName(''); }}>Choose another file</button>
      </div>
      {sheets.length > 1 ? (
        <label className="dz-field">
          <span>Sheet</span>
          <select value={sheetIndex} onChange={(e) => chooseSheet(sheets, Number(e.target.value))}>
            {sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length} rows)</option>)}
          </select>
        </label>
      ) : null}

      {remembered ? (
        <p className="dz-team-modal-hint is-ok" role="status">
          ✓ Using the layout from your last upload of this sheet.{' '}
          <button type="button" className="dz-link dz-small" onClick={() => relayout(layout.startRow, layout.hasHeadings)}>Start over</button>
        </p>
      ) : null}
      <DuezyLayoutPicker
        rows={rows}
        layout={layout}
        onPerPlayer={(perPlayer) => setLayout((prev) => ({ ...prev, perPlayer }))}
        onStartRow={changeStart}
      />
      <DuezyColumnMap
        rows={body}
        kinds={layout.kinds}
        hasHeadings={layout.hasHeadings}
        perPlayer={layout.perPlayer}
        onKinds={(kinds) => setLayout((prev) => ({ ...prev, kinds }))}
        onHeadings={(on) => relayout(layout.startRow, on)}
      />
      {tooMany ? <p className="dz-team-modal-hint is-warn">Only the first {MAX_IMPORT_TEAMS} teams are added at once.</p> : null}
      {teams.length ? (
        <DuezyImportPreview teams={teams} divisions={divisions} fallbackName={fallbackName} existingNames={existingNames} unmatched={unmatched} />
      ) : (
        <p className="dz-team-modal-hint is-warn">No team names found. Pick which column holds the team name.</p>
      )}
      {children}

      {error ? <p className="dz-error">{error}</p> : null}
      <div className="dz-team-modal-actions">
        <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !teams.length}>
          {teams.length ? `Add ${teams.length} team${teams.length === 1 ? '' : 's'}` : 'Add teams'}
        </button>
      </div>
    </form>
  );
}
