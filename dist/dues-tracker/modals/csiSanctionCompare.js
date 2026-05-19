/**
 * Compare CSI League Player Report names to Duezy roster: team(s) and sanction paid (same logic as Players).
 * Supports: title rows, header row with First / Last / Member # / optional date columns.
 * Requires: XLSX, normPlayerKey, formatPlayerName, buildPlayerSanctionCoreRows, canExport, showAlertModal, bootstrap, localStorage
 */

function csiCompareActionDisplay(result, csiInterp) {
    if (result === 'Not in Duezy') return 'Add/find in Duezy roster';
    if (result === 'Not in CSI file') return 'Check why missing from CSI export';
    if (result === 'Name match') return 'Map CSI columns (dates/status) for fee check';
    if (result === 'Review' && csiInterp === 'good') return 'Collect from player or mark paid in Duezy';
    if (result === 'Review' && csiInterp === 'bad') return 'Verify CSI status before payout/credit';
    if (result === 'OK' && csiInterp === 'bad') return 'Collect sanction fee from player';
    if (result === 'OK' && csiInterp === 'good') return 'No action';
    return 'Review this row';
}

function csiComparePaidYouDisplay(app) {
    if (!app) return '—';
    return app.appCollected ? 'Yes' : 'No';
}

function csiCompareHowPaidDisplay(app) {
    if (!app) return '—';
    if (app.appCollected) return app.howPaid || 'Recorded as paid in Duezy';
    return app.statusSummary || 'Not showing as paid in Duezy';
}

/** How paid text plus weekly sanction payment date when available (PDF export). */
function csiHowPaidWithDateForPdf(app) {
    if (!app) return '—';
    const base = csiCompareHowPaidDisplay(app);
    const d = app.sanctionPaidDateStr;
    if (d && String(d).trim()) return base + ' · Date paid: ' + String(d).trim();
    return base;
}

function csiComparePreviouslySanctionedDisplay(appPrevBool) {
    if (appPrevBool === true) return 'Yes';
    if (appPrevBool === false) return 'No';
    return '—';
}

function csiCompareCsiChargeDisplay(csiInterp) {
    if (csiInterp === 'good') return 'Yes — CSI sheet shows sanctioned/cleared (per rule above)';
    if (csiInterp === 'bad') return 'No — CSI sheet does not show that yet (per rule above)';
    if (csiInterp === 'unknown') return 'Can’t tell — map Expires/Complete or pick another rule';
    return '—';
}

/** Bucket for reconcile UI: CSI vs paid-you at a glance */
function csiAssignReconcileTags(rows) {
    rows.forEach((r) => {
        if (r.kind === 'ambiguous') {
            r.reconcileTag = 'duplicate_name';
            r.reconcileLabel = 'Duplicate name';
            return;
        }
        if (r.kind === 'csi_only') {
            r.reconcileTag = 'not_in_duezy';
            r.reconcileLabel = 'Not on Duezy roster';
            return;
        }
        if (r.kind === 'app_only') {
            r.reconcileTag = 'not_in_csi';
            r.reconcileLabel = 'Not on CSI file';
            return;
        }
        if (r.kind !== 'both') {
            r.reconcileTag = 'other';
            r.reconcileLabel = 'Other';
            return;
        }
        if (r.displayPaidYou === 'Yes') {
            r.reconcileTag = 'aligned';
            r.reconcileLabel = 'Sanction paid';
            return;
        }
        if (r.displayPaidYou === 'No') {
            r.reconcileTag = 'owe_you';
            r.reconcileLabel = 'Not paid';
            return;
        }
        r.reconcileTag = 'other';
        r.reconcileLabel = 'Other';
    });
}

function csiRowMatchesReconcileFilter(r, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'needs_attention') return r.reconcileTag !== 'aligned';
    if (filter === 'owe_you') return r.reconcileTag === 'owe_you';
    if (filter === 'aligned') return r.reconcileTag === 'aligned';
    if (filter === 'roster_issues')
        return (
            r.reconcileTag === 'not_in_duezy' ||
            r.reconcileTag === 'not_in_csi' ||
            r.reconcileTag === 'duplicate_name' ||
            r.reconcileTag === 'other'
        );
    if (filter === 'csi_charging_unpaid')
        return (
            r.reconcileTag === 'owe_you' && r.csiNotCharged === false
        );
    if (filter === 'csi_green_not_charged')
        return r.csiNotCharged === true;
    return true;
}

/** Human-readable note for table, CSV, PDF (hides internal resolver text like "Match: Exact name key"). */
function csiExportNoteForRow(r) {
    if (r.kind === 'ambiguous') return r.detail || '';
    if (r.kind === 'csi_only') {
        let base = 'No Duezy roster match — check division / spelling, or use Link.';
        if (r.csiNotCharged === true) base += ' CSI Complete has a date = not charging you.';
        else if (r.csiNotCharged === false) base += ' CSI Complete empty = charging you.';
        return base;
    }
    if (r.kind === 'app_only') return 'No CSI row matched this name.';
    const d = (r.detail || '').trim();
    let note = '';
    if (/^Match:\s*/i.test(d)) {
        if (/Manual\s+name\s+link/i.test(d)) note = 'CSI name linked manually to this roster player.';
    } else if (d) note = d;
    if (r.kind === 'both' && r.csiNotCharged !== null && r.csiNotCharged !== undefined) {
        const billing =
            r.csiNotCharged === true
                ? 'CSI Complete has date: not charging you on this list.'
                : 'CSI Complete empty: charging you on this list.';
        if (r.displayPaidYou === 'No' && r.csiNotCharged === true) {
            billing += ' Duezy shows not paid — often already sanctioned elsewhere.';
        } else if (r.displayPaidYou === 'No' && r.csiNotCharged === false) {
            billing += ' Duezy shows not paid — collect or resolve with CSI.';
        }
        note = note ? note + ' ' + billing : billing;
    }
    return note;
}

function csiCompareTableRowHtml(r) {
    const paid = r.displayPaidYou;
    let paidBadge = 'secondary';
    if (paid === 'Yes') paidBadge = 'success';
    else if (paid === 'No') paidBadge = 'danger';
    const note = csiExportNoteForRow(r);
    const csiBill = csiDisplayCsiChargingYou(r.csiNotCharged);
    let csiBillBadge = 'secondary';
    if (r.csiNotCharged === true) csiBillBadge = 'success';
    else if (r.csiNotCharged === false) csiBillBadge = 'warning';
    const keys = [r.csiStrictKey, r.csiAltStrictKey].filter(Boolean);
    let linkCell = '<td class="csi-compare-link-cell text-muted small">—</td>';
    if (r.kind === 'csi_only' && keys.length) {
        const payload = encodeURIComponent(JSON.stringify({ keys, display: r.nameCsi || '' }));
        linkCell = `<td class="csi-compare-link-cell text-nowrap"><button type="button" class="btn btn-outline-primary btn-sm py-0 px-2" onclick="csiOpenNameLinkPicker('${payload}')">Link…</button></td>`;
    } else if (r.kind === 'ambiguous' && keys.length) {
        const payload = encodeURIComponent(JSON.stringify({ keys, display: r.nameCsi || '' }));
        linkCell = `<td class="csi-compare-link-cell text-nowrap"><button type="button" class="btn btn-outline-primary btn-sm py-0 px-2" onclick="csiOpenNameLinkPicker('${payload}')">Pick…</button></td>`;
    } else if (r.kind === 'both' && r.matchedByManualLink && keys.length) {
        const payload = encodeURIComponent(JSON.stringify({ keys }));
        linkCell = `<td class="csi-compare-link-cell text-nowrap"><button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" onclick="csiRemoveNameLinkAndRerun('${payload}')">Unlink</button></td>`;
    }
    return `<tr data-reconcile-tag="${escapeHtml(r.reconcileTag || '')}">
                    <td>${escapeHtml(r.nameApp)}</td>
                    <td>${escapeHtml(r.nameCsi)}</td>
                    <td class="small">${escapeHtml(r.teams || '—')}</td>
                    <td><span class="badge rounded-pill bg-${paidBadge}">${escapeHtml(paid || '—')}</span></td>
                    <td><span class="badge rounded-pill bg-${csiBillBadge}">${escapeHtml(csiBill)}</span></td>
                    <td class="small text-muted">${escapeHtml(note)}</td>
                    ${linkCell}
                </tr>`;
}

function csiRenderCompareTableFiltered() {
    const rows = window._csiLastResultRows;
    const sel = document.getElementById('csiCompareFocusFilter');
    const filter = (sel && sel.value) || 'all';
    const tbody = document.getElementById('csiCompareTableBody');
    if (!tbody || !rows) return;
    try {
        const filtered = rows.filter((r) => csiRowMatchesReconcileFilter(r, filter));
        if (!filtered.length) {
            tbody.innerHTML =
                '<tr><td colspan="7" class="csi-compare-empty text-muted"><p class="mb-1 fw-semibold">No rows match this filter</p><p class="mb-0 small">Try <strong>All rows</strong> or fix column mapping and run again.</p></td></tr>';
        } else {
            tbody.innerHTML = filtered.map((r) => csiCompareTableRowHtml(r)).join('');
        }
    } catch (err) {
        console.error('CSI compare: filter render failed', err);
        tbody.innerHTML =
            '<tr><td colspan="7" class="csi-compare-empty text-danger small">Could not refresh the table. Try <strong>Run comparison</strong> again.</td></tr>';
    }
    csiSyncReconcileCardStates();
}

function csiOnCompareFocusFilterChange() {
    csiRenderCompareTableFiltered();
}

function csiSyncReconcileCardStates() {
    const sel = document.getElementById('csiCompareFocusFilter');
    const v = (sel && sel.value) || 'all';
    document.querySelectorAll('.csi-reconcile-stat[data-csi-reconcile-filter]').forEach((el) => {
        const f = el.getAttribute('data-csi-reconcile-filter');
        let active = false;
        if (v === 'owe_you' && f === 'owe_you') active = true;
        else if (v === 'aligned' && f === 'aligned') active = true;
        else if (v === 'roster_issues' && f === 'other') active = true;
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function csiSetCompareFilter(value) {
    const sel = document.getElementById('csiCompareFocusFilter');
    if (sel) {
        sel.value = value;
        csiRenderCompareTableFiltered();
    }
}

/** Enter/Space on stat cards (single delegated listener) */
function csiReconcileStatKeydown(ev) {
    const t = ev.target.closest('.csi-reconcile-stat[data-csi-reconcile-filter]');
    if (!t || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    const f = t.getAttribute('data-csi-reconcile-filter');
    if (f === 'owe_you') csiSetCompareFilter('owe_you');
    else if (f === 'aligned') csiSetCompareFilter('aligned');
    else if (f === 'other') csiSetCompareFilter('roster_issues');
}

function csiNormNameFromCell(cell) {
    const raw = String(cell == null ? '' : cell).trim();
    if (!raw) return '';
    const formatted = typeof formatPlayerName === 'function' ? formatPlayerName(raw) : raw;
    return typeof normPlayerKey === 'function' ? normPlayerKey(formatted) : formatted.toLowerCase();
}

/** Strip Excel odd spaces / BOM so CSI cells match roster text */
function csiCleanPart(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/\u00a0/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();
}

function csiTokenNorm(s) {
    if (s == null || s === '') return '';
    const t = String(s).trim().replace(/\./g, '').replace(/-/g, ' ');
    return typeof normPlayerKey === 'function' ? normPlayerKey(t) : t.trim().toLowerCase();
}

function csiParseDisplayNameParts(displayName) {
    const formatted =
        typeof formatPlayerName === 'function'
            ? formatPlayerName(String(displayName || '').trim())
            : String(displayName || '').trim();
    const parts = formatted.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    const suf = /^(jr\.?|sr\.?|ii|iii|iv|esq\.?)$/i;
    let end = parts.length - 1;
    while (end > 0 && suf.test(parts[end])) end--;
    const last = parts[end] || '';
    const first = parts[0] || '';
    return { first, last };
}

function csiFirstNamesCompatible(csiFnNorm, appFnNorm) {
    if (!csiFnNorm || !appFnNorm) return false;
    if (csiFnNorm === appFnNorm) return true;
    if (csiFnNorm.length === 1 && appFnNorm.charAt(0) === csiFnNorm.charAt(0)) return true;
    if (
        csiFnNorm.length >= 2 &&
        appFnNorm.length >= 2 &&
        (csiFnNorm.startsWith(appFnNorm) || appFnNorm.startsWith(csiFnNorm)) &&
        Math.min(csiFnNorm.length, appFnNorm.length) >= 2
    ) {
        if (Math.max(csiFnNorm.length, appFnNorm.length) <= 4) return true;
        if (csiFnNorm.length >= 3 && appFnNorm.length >= 3) return true;
    }
    if (
        csiFnNorm.length >= 3 &&
        appFnNorm.length >= 3 &&
        (csiFnNorm.startsWith(appFnNorm) || appFnNorm.startsWith(csiFnNorm))
    ) {
        return true;
    }
    const ca = csiFnNorm.replace(/\s/g, '');
    const cb = appFnNorm.replace(/\s/g, '');
    if (ca.length >= 3 && cb.length >= 3 && (ca === cb || ca.startsWith(cb) || cb.startsWith(ca))) return true;
    return false;
}

function csiEditDistanceAtMostOne(a, b) {
    if (a === b) return true;
    let i = 0;
    let j = 0;
    let edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i++;
            j++;
            continue;
        }
        if (edits >= 1) return false;
        edits++;
        if (a.length > b.length) i++;
        else if (b.length > a.length) j++;
        else {
            i++;
            j++;
        }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Same last name, allowing one typo if both length ≥ 4 */
function csiLastNamesFuzzyEqual(lnNorm, appLnNorm) {
    if (!lnNorm || !appLnNorm) return false;
    if (lnNorm === appLnNorm) return true;
    if (lnNorm.length < 4 || appLnNorm.length < 4) return false;
    if (Math.abs(lnNorm.length - appLnNorm.length) > 1) return false;
    return csiEditDistanceAtMostOne(lnNorm, appLnNorm);
}

/**
 * Roster stores normKey from raw "Smith, John" but CSI sends "John Smith" — map display + first+last variants.
 */
function csiBuildUnifiedAppLookup(appRows) {
    const map = new Map();
    appRows.forEach((r) => {
        const put = (k) => {
            if (k && !map.has(k)) map.set(k, r);
        };
        put(r.normKey);
        put(csiNormNameFromCell(r.displayName));
        const p = csiParseDisplayNameParts(r.displayName);
        if (p.first && p.last) {
            put(csiNormNameFromCell(p.first + ' ' + p.last));
            put(csiNormNameFromCell(p.last + ', ' + p.first));
            put(csiNormNameFromCell(csiCleanPart(p.last) + ', ' + csiCleanPart(p.first)));
        }
    });
    return map;
}

const CSI_MANUAL_NAME_LINKS_STORAGE_KEY = 'duezy_csi_manual_name_links_v1';

function csiLoadManualNameLinksMap() {
    try {
        const raw = localStorage.getItem(CSI_MANUAL_NAME_LINKS_STORAGE_KEY);
        if (!raw) return new Map();
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== 'object') return new Map();
        return new Map(Object.keys(obj).map((k) => [k, obj[k]]));
    } catch (e) {
        console.warn('CSI manual name links: could not load', e);
        return new Map();
    }
}

function csiPersistManualNameLinksMap(map) {
    try {
        const obj = {};
        map.forEach((v, k) => {
            if (k && v) obj[k] = v;
        });
        localStorage.setItem(CSI_MANUAL_NAME_LINKS_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
        console.warn('CSI manual name links: could not save', e);
        showAlertModal('Could not save name links (browser storage).', 'warning', 'Storage');
    }
}

function csiSaveManualNameLinksForKeys(csiNormKeys, duezyNormKey) {
    if (!duezyNormKey || !csiNormKeys || !csiNormKeys.length) return;
    const m = csiLoadManualNameLinksMap();
    csiNormKeys.filter(Boolean).forEach((k) => m.set(k, duezyNormKey));
    csiPersistManualNameLinksMap(m);
}

function csiRemoveManualNameLinksForKeys(csiNormKeys) {
    if (!csiNormKeys || !csiNormKeys.length) return;
    const m = csiLoadManualNameLinksMap();
    csiNormKeys.filter(Boolean).forEach((k) => m.delete(k));
    csiPersistManualNameLinksMap(m);
}

/**
 * Exact key(s), then same last name + compatible first (middle names OK).
 * @returns {{ app: object, how: string } | { ambiguous: true, names: string } | null }
 */
function csiResolveAppForCsiRow(strictKey, altStrictKey, firstRaw, lastRaw, unifiedLookup, appRows, manualLinkMap) {
    const cf = csiCleanPart(firstRaw);
    const cl = csiCleanPart(lastRaw);
    const tryKeys = new Set();
    [strictKey, altStrictKey].forEach((k) => {
        if (k) tryKeys.add(k);
    });
    if (cf && cl) {
        tryKeys.add(csiNormNameFromCell(cf + ' ' + cl));
        tryKeys.add(csiNormNameFromCell(cl + ', ' + cf));
    }
    for (const k of tryKeys) {
        const app = unifiedLookup.get(k);
        if (app) return { app, how: 'Exact name key' };
    }
    if (manualLinkMap && manualLinkMap.size) {
        for (const k of tryKeys) {
            if (!k) continue;
            const tgt = manualLinkMap.get(k);
            if (tgt) {
                const app = unifiedLookup.get(tgt) || appRows.find((r) => r.normKey === tgt);
                if (app) return { app, how: 'Manual name link' };
            }
        }
    }
    const ln = csiTokenNorm(cl);
    if (!ln) return null;
    const fn = csiTokenNorm(cf);
    const candidates = [];
    for (let i = 0; i < appRows.length; i++) {
        const r = appRows[i];
        const p = csiParseDisplayNameParts(r.displayName);
        const appLn = csiTokenNorm(p.last);
        if (!csiLastNamesFuzzyEqual(ln, appLn)) continue;
        const appFn = csiTokenNorm(p.first);
        if (!fn) {
            if (!appFn) candidates.push({ r, p });
            continue;
        }
        if (csiFirstNamesCompatible(fn, appFn)) candidates.push({ r, p });
    }
    if (candidates.length === 1) {
        const only = candidates[0];
        const fuzzyLast = csiTokenNorm(only.p.last) !== ln;
        return {
            app: only.r,
            how: fuzzyLast ? 'Matched last name (typo?) + first' : 'Matched last + first (flex)'
        };
    }
    if (candidates.length > 1) {
        const exact = candidates.filter((c) => csiTokenNorm(c.p.first) === fn);
        if (exact.length === 1) return { app: exact[0].r, how: 'Matched last + first (exact first)' };
        const keyHit = candidates.find((c) =>
            [c.r.normKey, csiNormNameFromCell(c.r.displayName)].some((x) => x && tryKeys.has(x))
        );
        if (keyHit) return { app: keyHit.r, how: 'Matched among same-last-name via roster key' };
        return { ambiguous: true, names: candidates.map((c) => c.r.displayName).join('; ') };
    }
    return null;
}

/** Convert sheet to { rows, headers, headerRowIndex } — skips title rows above CSI column headers */
function csiMatrixToObjects(matrix) {
    if (!matrix || !matrix.length) return { rows: [], headers: [], headerRowIndex: 0 };
    let headerIdx = 0;
    for (let i = 0; i < Math.min(30, matrix.length); i++) {
        const row = matrix[i] || [];
        const labels = row.map((c) => String(c == null ? '' : c).trim().toLowerCase());
        const hitFirst = labels.some((t) => /^first$|^legal first$/i.test(t) || t === 'first');
        const hitLast =
            labels.some((t) =>
                /last/i.test(t)
                    ? /\blast\b/.test(t) &&
                      !/\bfargo\b|\bseed\b|\brobust\b|\beffect\b|\bmatch\b|\bgame\b|\bwin\b/i.test(t)
                    : false
            ) || labels.some((t) => /player\s*name\s*last|last\s*name/i.test(t));
        const hitMember = labels.some((t) => /\bmember\b/.test(t) && /#|number|num|no\.?/i.test(t));
        const hitExpires = labels.some((t) => t.includes('expire'));
        const hitComplete = labels.some((t) => /^complete$/i.test(t) || (t.includes('complete') && !t.includes('incomplete')));
        const hits = [hitFirst, hitLast, hitMember, hitExpires, hitComplete].filter(Boolean).length;
        if (hits >= 2 || (hitFirst && hitLast)) {
            headerIdx = i;
            break;
        }
    }
    const headers = (matrix[headerIdx] || []).map((h, idx) => {
        const s = String(h == null ? '' : h).trim();
        return s || `Column_${idx}`;
    });
    const rows = [];
    for (let r = headerIdx + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const obj = {};
        let any = false;
        for (let c = 0; c < headers.length; c++) {
            const key = headers[c];
            const v = row[c];
            obj[key] = v;
            if (v !== '' && v != null && String(v).trim() !== '') any = true;
        }
        if (any) rows.push(obj);
    }
    return { rows, headers, headerRowIndex: headerIdx };
}

/** Load CSI League Player Report (.xlsx / .xls / .csv). */
async function csiLoadUploadedSpreadsheet(arrayBuffer) {
    if (typeof XLSX === 'undefined') throw new Error('Spreadsheet library not loaded');
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const parsed = csiMatrixToObjects(matrix);
    return {
        rows: parsed.rows,
        headers: parsed.headers,
        headerRowIndex: parsed.headerRowIndex
    };
}

function csiDisplayCsiChargingYou(csiNotCharged) {
    if (csiNotCharged === null || csiNotCharged === undefined) return '—';
    return csiNotCharged ? 'No' : 'Yes';
}

function csiScoreFirstHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/^first$/i.test(s)) return 100;
    if (/^legal first$/i.test(s)) return 95;
    if (/\bfirst\b/.test(s) && !/\blast\b/.test(s)) return 70;
    return 0;
}

function csiScoreLastHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/player\s*name\s*last|^last$/i.test(s)) return 100;
    if (/last\s*name/i.test(s)) return 90;
    if (/\blast\b/.test(s) && !/\bfargo\b|\bseed\b|\brobust\b|\beffect\b|\bmatch\b/i.test(s)) return 50;
    return 0;
}

function csiScoreMemberHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/\bmember\b/.test(s) && /#|number|num/i.test(s)) return 100;
    if (/^member\s*#?$/i.test(s)) return 95;
    return 0;
}

function csiScoreExpiresHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/\bexpire/i.test(s)) return 100;
    return 0;
}

function csiScoreCompleteFeeHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/^complete$/i.test(s)) return 100;
    if (s.includes('complete') && !s.includes('incomplete')) return 70;
    return 0;
}

function csiScoreNameHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/^player\s*name$|^name$|^member\s*name$|^full\s*name$/i.test(s)) return 100;
    if (/\bplayer\b/.test(s) && /\bname\b/.test(s)) return 80;
    if (/\bname\b/.test(s)) return 50;
    return 0;
}

function csiScoreStatusHeader(h) {
    const s = String(h || '')
        .trim()
        .toLowerCase();
    if (/\bstatus\b/.test(s)) return 90;
    if (/\bsanction\b/.test(s)) return 85;
    if (/\bmembership\b/.test(s)) return 70;
    return 0;
}

function csiParseCellDate(val) {
    if (val == null || val === '') return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'number' && val > 20000 && val < 600000) {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const utc = epoch.getTime() + Math.round(val * 86400000);
        const d = new Date(utc);
        return isNaN(d.getTime()) ? null : d;
    }
    const s = String(val).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        let y = +m[3];
        if (y < 100) y += y >= 50 ? 1900 : 2000;
        return new Date(y, +m[1] - 1, +m[2]);
    }
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? null : d2;
}

function csiDateOnlyLocal(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function csiExpiresStillGood(expiresVal) {
    const d = csiParseCellDate(expiresVal);
    if (!d) return null;
    const today = csiDateOnlyLocal(new Date());
    const exp = csiDateOnlyLocal(d);
    return exp.getTime() >= today.getTime();
}

/** True when CSI Complete column has a sanction/fee date (CSI not billing you for that row). */
function csiCompleteHasDate(completeVal) {
    if (completeVal == null) return false;
    if (String(completeVal).trim() === '') return false;
    return !!csiParseCellDate(completeVal);
}

/** CSI not charging you = Complete column has a date. null if Complete column not mapped. */
function csiCsiNotChargedFromRow(row, completeCol) {
    if (!completeCol || !row) return null;
    return csiCompleteHasDate(row[completeCol]);
}

/** @returns {{ category: 'good'|'bad'|'unknown', label: string }} */
function csiInterpretStatus(cell) {
    if (cell == null || String(cell).trim() === '') {
        return { category: 'unknown', label: '—' };
    }
    const t = String(cell).trim();
    const lower = t.toLowerCase();
    if (
        /\b(active|current|paid|cleared|valid|good|yes|ok|member)\b/.test(lower) &&
        !/\b(inactive|unpaid|no|suspended|expired|lapsed|void|pending)\b/.test(lower)
    ) {
        return { category: 'good', label: t };
    }
    if (/\b(inactive|expired|suspended|unpaid|lapsed|void|pending|revoked|no)\b/.test(lower)) {
        return { category: 'bad', label: t };
    }
    if (/^(y|n|yes|no)$/i.test(t)) {
        return /^y/i.test(t) ? { category: 'good', label: t } : { category: 'bad', label: t };
    }
    return { category: 'unknown', label: t };
}

/**
 * @param {string} rule — auto|expires|complete|both|text|none
 */
function csiInterpretRowForRule(row, rule, expiresCol, completeCol, statusCol) {
    const parts = [];
    const expiresVal = expiresCol ? row[expiresCol] : '';
    const completeVal = completeCol ? row[completeCol] : '';
    const expGood = expiresVal !== '' && expiresVal != null ? csiExpiresStillGood(expiresVal) : null;
    const feeDone = completeVal !== '' && completeVal != null ? csiCompleteHasDate(completeVal) : false;

    if (rule === 'none') {
        return { category: 'unknown', label: '—', detail: '' };
    }
    if (rule === 'text') {
        return statusCol ? csiInterpretStatus(row[statusCol]) : { category: 'unknown', label: '—', detail: '' };
    }
    if (rule === 'expires') {
        if (expGood === null) return { category: 'unknown', label: String(expiresVal || '—'), detail: 'No Expires date' };
        return expGood
            ? { category: 'good', label: 'Expires ' + String(expiresVal).trim(), detail: '' }
            : { category: 'bad', label: 'Expires ' + String(expiresVal).trim(), detail: '' };
    }
    if (rule === 'complete') {
        return feeDone
            ? { category: 'good', label: 'Fee complete ' + String(completeVal).trim(), detail: '' }
            : { category: 'bad', label: 'No Complete date', detail: '' };
    }
    if (rule === 'both') {
        const okExp = expGood === true;
        const okFee = feeDone;
        parts.push(expiresVal ? 'Exp:' + String(expiresVal).trim() : 'Exp:—');
        parts.push(completeVal ? 'Fee:' + String(completeVal).trim() : 'Fee:—');
        if (expGood === null && !feeDone) return { category: 'unknown', label: parts.join(' '), detail: '' };
        return okExp && okFee
            ? { category: 'good', label: parts.join(' '), detail: '' }
            : { category: 'bad', label: parts.join(' '), detail: '' };
    }
    // auto
    if (expGood === true) {
        return { category: 'good', label: 'Expires ' + String(expiresVal).trim(), detail: '' };
    }
    if (expGood === false) {
        return { category: 'bad', label: 'Expires ' + String(expiresVal).trim(), detail: '' };
    }
    if (feeDone) {
        return { category: 'good', label: 'Fee complete ' + String(completeVal).trim(), detail: '(no Expires parsed)' };
    }
    const bits = [];
    if (expiresVal !== '' && expiresVal != null) bits.push('Exp: ' + String(expiresVal).trim());
    if (completeVal !== '' && completeVal != null) bits.push('Fee: ' + String(completeVal).trim());
    return {
        category: 'unknown',
        label: bits.join(' ') || '—',
        detail: 'Map Expires or Complete columns'
    };
}

function csiPopulateDivisionSelect() {
    const sel = document.getElementById('csiCompareDivisionFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">All divisions</option>';
    if (typeof divisions === 'undefined' || !divisions) return;
    divisions.forEach((div) => {
        if (div.isActive !== false && (!div.description || div.description !== 'Temporary')) {
            const option = document.createElement('option');
            option.value = div.name;
            option.textContent = div.name;
            sel.appendChild(option);
        }
    });
}

function csiPickBest(headers, scoreFn) {
    let best = '';
    let bestScore = -1;
    headers.forEach((h) => {
        const sc = scoreFn(h);
        if (sc > bestScore) {
            bestScore = sc;
            best = h;
        }
    });
    return bestScore > 0 ? best : '';
}

function csiFillSelectOptions(selectEl, headers, includeEmptyLabel) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (includeEmptyLabel) {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = '—';
        selectEl.appendChild(o);
    }
    headers.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        selectEl.appendChild(opt);
    });
}

function csiFillAllColumnSelects(headers) {
    const bestFirst = csiPickBest(headers, csiScoreFirstHeader);
    const bestLast = csiPickBest(headers, csiScoreLastHeader);
    const bestMember = csiPickBest(headers, csiScoreMemberHeader);
    const bestExpires = csiPickBest(headers, csiScoreExpiresHeader);
    const bestComplete = csiPickBest(headers, csiScoreCompleteFeeHeader);
    const bestFullName = csiPickBest(headers, csiScoreNameHeader);
    const bestTextStatus = csiPickBest(headers, csiScoreStatusHeader);

    csiFillSelectOptions(document.getElementById('csiCompareFirstColumn'), headers, false);
    csiFillSelectOptions(document.getElementById('csiCompareLastColumn'), headers, false);
    csiFillSelectOptions(document.getElementById('csiCompareMemberColumn'), headers, true);
    csiFillSelectOptions(document.getElementById('csiCompareNameColumn'), headers, false);
    csiFillSelectOptions(document.getElementById('csiCompareExpiresColumn'), headers, true);
    csiFillSelectOptions(document.getElementById('csiCompareCompleteColumn'), headers, true);
    csiFillSelectOptions(document.getElementById('csiCompareStatusColumn'), headers, true);

    const fc = document.getElementById('csiCompareFirstColumn');
    const lc = document.getElementById('csiCompareLastColumn');
    const mc = document.getElementById('csiCompareMemberColumn');
    const nc = document.getElementById('csiCompareNameColumn');
    const ec = document.getElementById('csiCompareExpiresColumn');
    const cc = document.getElementById('csiCompareCompleteColumn');
    const sc = document.getElementById('csiCompareStatusColumn');

    if (fc && bestFirst) fc.value = bestFirst;
    if (lc && bestLast) lc.value = bestLast;
    if (ec && bestExpires) ec.value = bestExpires;
    if (cc && bestComplete) cc.value = bestComplete;
    if (nc && bestFullName && !bestFirst) nc.value = bestFullName;
    if (sc && bestTextStatus) sc.value = bestTextStatus;

    [fc, lc, mc, nc, ec, cc, sc].forEach((el) => {
        if (el) el.disabled = false;
    });
}

function csiOnNameModeChange() {
    const modeFirst = document.getElementById('csiNameModeFirstLast');
    const isFirstLast = modeFirst && modeFirst.checked;
    const rowFl = document.getElementById('csiNameRowFirstLast');
    const rowFull = document.getElementById('csiNameRowFull');
    if (rowFl) rowFl.style.display = isFirstLast ? '' : 'none';
    if (rowFull) rowFull.style.display = isFirstLast ? 'none' : '';
}

async function showCsiSanctionCompareModal() {
    const hasAccess = await canExport();
    if (!hasAccess) {
        const tier = await getSubscriptionTier();
        showAlertModal(
            `This tool is available on Pro and Enterprise (same as Export).\n\nYour plan: ${String(tier).charAt(0).toUpperCase() + String(tier).slice(1)}`,
            'info',
            'Upgrade required'
        );
        return;
    }
    const csiModal = document.getElementById('csiSanctionCompareModal');
    if (csiModal && !csiModal.dataset.reconcileKeydownBound) {
        csiModal.dataset.reconcileKeydownBound = '1';
        csiModal.addEventListener('keydown', csiReconcileStatKeydown);
    }
    if (csiModal) csiModal.classList.remove('csi-results-focus');
    csiPopulateDivisionSelect();
    const fileInput = document.getElementById('csiCompareFile');
    if (fileInput) fileInput.value = '';
    const ruleSel = document.getElementById('csiCompareCsiGoodRule');
    if (ruleSel) ruleSel.value = 'complete';

    ['csiCompareFirstColumn', 'csiCompareLastColumn', 'csiCompareMemberColumn', 'csiCompareNameColumn', 'csiCompareExpiresColumn', 'csiCompareCompleteColumn', 'csiCompareStatusColumn'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<option value="">Upload a file first</option>';
            el.disabled = true;
        }
    });
    const mc = document.getElementById('csiCompareMemberColumn');
    if (mc) mc.innerHTML = '<option value="">—</option>';

    document.getElementById('csiCompareRunBtn') && (document.getElementById('csiCompareRunBtn').disabled = true);
    document.getElementById('csiCompareResultsWrap') && (document.getElementById('csiCompareResultsWrap').style.display = 'none');
    document.getElementById('csiCompareSummary') && (document.getElementById('csiCompareSummary').innerHTML = '');
    document.getElementById('csiCompareTableBody') && (document.getElementById('csiCompareTableBody').innerHTML = '');
    window._csiParsedRows = null;
    window._csiParsedHeaders = null;
    window._csiLegalFirstCol = null;
    const modal = document.getElementById('csiSanctionCompareModal');
    if (modal && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(modal).show();
    }
}

function csiBuildDisplayNameFromRow(row, modeFirstLast, firstCol, lastCol, fullCol) {
    if (modeFirstLast && firstCol && lastCol) {
        const a = csiCleanPart(row[firstCol]);
        const b = csiCleanPart(row[lastCol]);
        return (a + ' ' + b).trim();
    }
    if (!modeFirstLast && fullCol) {
        return csiCleanPart(row[fullCol]);
    }
    return '';
}

function csiHandleFileSelected(ev) {
    const file = ev.target.files && ev.target.files[0];
    const runBtn = document.getElementById('csiCompareRunBtn');
    if (!file) {
        if (runBtn) runBtn.disabled = true;
        window._csiParsedRows = null;
        window._csiParsedHeaders = null;
        window._csiLegalFirstCol = null;
        return;
    }
    if (typeof XLSX === 'undefined') {
        showAlertModal('Spreadsheet library not loaded. Refresh the page and try again.', 'error', 'Error');
        return;
    }
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const parsed = await csiLoadUploadedSpreadsheet(e.target.result);
            if (!parsed.rows.length) {
                showAlertModal('No data rows found in the first sheet (after the header row).', 'warning', 'Empty file');
                if (runBtn) runBtn.disabled = true;
                return;
            }
            window._csiParsedRows = parsed.rows;
            window._csiParsedHeaders = parsed.headers;
            window._csiHeaderRowIndex = parsed.headerRowIndex;
            window._csiLegalFirstCol =
                parsed.headers.find((h) => /^legal\s*first$/i.test(String(h == null ? '' : h).trim())) || null;
            csiFillAllColumnSelects(parsed.headers);
            if (runBtn) runBtn.disabled = false;
        } catch (err) {
            console.error(err);
            showAlertModal('Could not read that file. Use .xlsx or .xls exported from CSI.', 'error', 'Read error');
            if (runBtn) runBtn.disabled = true;
        }
    };
    reader.readAsArrayBuffer(file);
}

function csiRunCompare() {
    const rows = window._csiParsedRows;
    const modeFirstLast = document.getElementById('csiNameModeFirstLast') && document.getElementById('csiNameModeFirstLast').checked;
    const firstCol = document.getElementById('csiCompareFirstColumn') && document.getElementById('csiCompareFirstColumn').value;
    const lastCol = document.getElementById('csiCompareLastColumn') && document.getElementById('csiCompareLastColumn').value;
    const fullCol = document.getElementById('csiCompareNameColumn') && document.getElementById('csiCompareNameColumn').value;

    const divFilter = document.getElementById('csiCompareDivisionFilter') && document.getElementById('csiCompareDivisionFilter').value;
    const includeArchived = document.getElementById('csiCompareIncludeArchived') && document.getElementById('csiCompareIncludeArchived').checked;

    if (!rows || !rows.length) {
        showAlertModal('Upload a CSI file first.', 'warning', 'Missing data');
        return;
    }
    if (modeFirstLast && (!firstCol || !lastCol)) {
        showAlertModal('Select both First name and Last name columns (CSI Player Report).', 'warning', 'Missing columns');
        return;
    }
    if (!modeFirstLast && !fullCol) {
        showAlertModal('Select the full name column, or switch to First + Last.', 'warning', 'Missing column');
        return;
    }
    const completeCol =
        document.getElementById('csiCompareCompleteColumn') &&
        document.getElementById('csiCompareCompleteColumn').value;
    if (!completeCol) {
        showAlertModal(
            'Select the CSI Complete column (under Fee). Players with no date there are who CSI is charging you for.',
            'warning',
            'Complete column'
        );
        return;
    }

    if (typeof buildPlayerSanctionCoreRows !== 'function') {
        showAlertModal('Duezy data is not ready. Refresh the page.', 'error', 'Error');
        return;
    }

    const appRows = buildPlayerSanctionCoreRows(divFilter || null, includeArchived, null);
    window._csiLinkPickerAppRows = appRows;
    const appByKey = new Map();
    appRows.forEach((r) => appByKey.set(r.normKey, r));
    const unifiedAppLookup = csiBuildUnifiedAppLookup(appRows);
    const manualLinkMap = csiLoadManualNameLinksMap();

    const matchedDuezyKeys = new Set();
    const resultRows = [];
    let csiRowsIncluded = 0;

    rows.forEach((row) => {
        const displayName = csiBuildDisplayNameFromRow(row, modeFirstLast, firstCol, lastCol, fullCol);
        const dn = String(displayName || '').trim();
        const strictKey = csiNormNameFromCell(displayName);
        let altStrictKey = '';
        if (modeFirstLast && lastCol && window._csiLegalFirstCol && row[window._csiLegalFirstCol]) {
            const altDisp = `${csiCleanPart(row[window._csiLegalFirstCol])} ${csiCleanPart(row[lastCol])}`.trim();
            altStrictKey = csiNormNameFromCell(altDisp);
        }
        let firstRaw = modeFirstLast && firstCol ? csiCleanPart(row[firstCol]) : '';
        let lastRaw = modeFirstLast && lastCol ? csiCleanPart(row[lastCol]) : '';
        if (!modeFirstLast && dn) {
            const pp = csiParseDisplayNameParts(displayName);
            firstRaw = pp.first;
            lastRaw = pp.last;
        }
        if (!dn && !strictKey && !(modeFirstLast && (firstRaw || lastRaw))) return;
        csiRowsIncluded++;

        const resolved = csiResolveAppForCsiRow(
            strictKey,
            altStrictKey,
            firstRaw,
            lastRaw,
            unifiedAppLookup,
            appRows,
            manualLinkMap
        );

        const csiKeyMeta = { csiStrictKey: strictKey || '', csiAltStrictKey: altStrictKey || '' };
        const csiNotCharged = csiCsiNotChargedFromRow(row, completeCol);

        if (resolved && resolved.ambiguous) {
            resultRows.push({
                kind: 'ambiguous',
                nameCsi: dn || '(blank)',
                nameApp: '—',
                teams: '—',
                displayPaidYou: '—',
                displayHowPaid: '—',
                displayHowPaidPdf: '—',
                csiNotCharged,
                result: 'Review',
                detail:
                    'More than one Duezy player could match (' +
                    resolved.names +
                    '). Pick the right player with Link, or fix spelling / division filter.',
                ...csiKeyMeta
            });
            return;
        }

        if (!resolved || !resolved.app) {
            resultRows.push({
                kind: 'csi_only',
                nameCsi: dn || '(blank)',
                nameApp: '—',
                teams: '—',
                displayPaidYou: '—',
                displayHowPaid: '—',
                displayHowPaidPdf: '—',
                csiNotCharged,
                result: 'Not in Duezy',
                detail: '',
                ...csiKeyMeta
            });
            return;
        }

        const app = resolved.app;
        matchedDuezyKeys.add(app.normKey);
        const matchNote = resolved.how ? 'Match: ' + resolved.how : '';
        const matchedByManualLink = resolved.how === 'Manual name link';

        resultRows.push({
            kind: 'both',
            nameCsi: dn || '(blank)',
            nameApp: app.displayName,
            teams: app.teams || '—',
            displayPaidYou: csiComparePaidYouDisplay(app),
            displayHowPaid: csiCompareHowPaidDisplay(app),
            displayHowPaidPdf: csiHowPaidWithDateForPdf(app),
            csiNotCharged,
            result: app.appCollected ? 'OK' : 'Review',
            detail: matchNote,
            matchedByManualLink,
            ...csiKeyMeta
        });
    });

    appByKey.forEach((app, key) => {
        if (matchedDuezyKeys.has(key)) return;
        resultRows.push({
            kind: 'app_only',
            nameCsi: '—',
            nameApp: app.displayName,
            teams: app.teams || '—',
            displayPaidYou: csiComparePaidYouDisplay(app),
            displayHowPaid: csiCompareHowPaidDisplay(app),
            displayHowPaidPdf: csiHowPaidWithDateForPdf(app),
            csiNotCharged: null,
            result: 'Review',
            detail: '',
            csiStrictKey: '',
            csiAltStrictKey: ''
        });
    });

    const nMatched = resultRows.filter((r) => r.kind === 'both').length;
    const nNotInDuezy = resultRows.filter((r) => r.kind === 'csi_only').length;
    const nNotInCsi = resultRows.filter((r) => r.kind === 'app_only').length;
    const nDup = resultRows.filter((r) => r.kind === 'ambiguous').length;

    csiAssignReconcileTags(resultRows);
    window._csiLastResultRows = resultRows;

    const nOwe = resultRows.filter((r) => r.reconcileTag === 'owe_you').length;
    const nAligned = resultRows.filter((r) => r.reconcileTag === 'aligned').length;
    const nOther = resultRows.filter((r) =>
        ['not_in_duezy', 'not_in_csi', 'duplicate_name', 'other'].includes(r.reconcileTag)
    ).length;
    const nCsiCompleteDate = resultRows.filter((r) => r.csiNotCharged === true).length;
    const nCsiChargingUnpaid = resultRows.filter(
        (r) => r.reconcileTag === 'owe_you' && r.csiNotCharged === false
    ).length;
    const billingHint = `<p class="small alert alert-info py-2 px-3 mb-2"><i class="fas fa-calendar-check me-1" aria-hidden="true"></i>CSI <strong>Complete</strong> column: <strong>${nCsiCompleteDate}</strong> row(s) have a date (CSI not charging you). <strong>${nCsiChargingUnpaid}</strong> matched row(s) have <em>empty Complete</em> and <em>not paid in Duezy</em> (CSI charging you).</p>`;

    const feeEachUsd = csiGetSanctionFeeEachUsd();
    const amtOwedUsd = nOwe * feeEachUsd;
    const amtCollectedUsd = nAligned * feeEachUsd;

    const summaryEl = document.getElementById('csiCompareSummary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="csi-reconcile-results-head">
                <h6 class="csi-reconcile-panel-title mb-0">
                    <i class="fas fa-users me-2 text-primary" aria-hidden="true"></i>Results
                </h6>
                <p class="csi-reconcile-panel-sub text-muted small mb-0">Names on the CSI file matched to Duezy. <strong>Sanction paid</strong> matches the Players tab. <strong>CSI charging you?</strong> = <strong>empty Complete</strong> column on CSI sheet (date in Complete = not charging you). Dollar totals use <strong>${csiFormatMoneyUsd(feeEachUsd)}</strong> per player.</p>
            </div>
            ${billingHint}
            <div class="row g-3 mb-3 csi-reconcile-quick">
                <div class="col-md-4">
                    <div class="csi-reconcile-stat csi-reconcile-stat--owe" data-csi-reconcile-filter="owe_you" role="button" tabindex="0" aria-pressed="false" onclick="csiSetCompareFilter('owe_you')" title="Matched on both lists, sanction not paid in Duezy">
                        <div class="csi-reconcile-stat__icon" aria-hidden="true"><i class="fas fa-hand-holding-usd"></i></div>
                        <div class="csi-reconcile-stat__body">
                            <div class="csi-reconcile-stat__label">Not paid</div>
                            <div class="csi-reconcile-stat__value">${nOwe}</div>
                            <div class="csi-reconcile-stat__money">${csiFormatMoneyUsd(amtOwedUsd)} <span class="csi-reconcile-stat__money-label">owed est.</span></div>
                            <div class="csi-reconcile-stat__hint">On CSI + Duezy · no sanction paid</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="csi-reconcile-stat csi-reconcile-stat--ok" data-csi-reconcile-filter="aligned" role="button" tabindex="0" aria-pressed="false" onclick="csiSetCompareFilter('aligned')" title="Matched and sanction paid in Duezy">
                        <div class="csi-reconcile-stat__icon" aria-hidden="true"><i class="fas fa-check-circle"></i></div>
                        <div class="csi-reconcile-stat__body">
                            <div class="csi-reconcile-stat__label">Sanction paid</div>
                            <div class="csi-reconcile-stat__value">${nAligned}</div>
                            <div class="csi-reconcile-stat__money">${csiFormatMoneyUsd(amtCollectedUsd)} <span class="csi-reconcile-stat__money-label">collected est.</span></div>
                            <div class="csi-reconcile-stat__hint">On CSI + Duezy · paid</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="csi-reconcile-stat csi-reconcile-stat--other" data-csi-reconcile-filter="other" role="button" tabindex="0" aria-pressed="false" onclick="csiSetCompareFilter('roster_issues')" title="Not on one list, duplicate name, or Duezy could not classify paid vs unpaid — excludes matched &quot;Not paid&quot;">
                        <div class="csi-reconcile-stat__icon" aria-hidden="true"><i class="fas fa-ellipsis-h"></i></div>
                        <div class="csi-reconcile-stat__body">
                            <div class="csi-reconcile-stat__label">Other</div>
                            <div class="csi-reconcile-stat__value">${nOther}</div>
                            <div class="csi-reconcile-stat__hint">No list match, duplicate name, or unclear paid</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="csi-reconcile-toolbar">
                <div class="csi-reconcile-toolbar__left">
                    <label class="form-label mb-0 me-2 csi-reconcile-toolbar-label" for="csiCompareFocusFilter">Show</label>
                    <select id="csiCompareFocusFilter" class="form-select form-select-sm csi-reconcile-toolbar-select" onchange="csiOnCompareFocusFilterChange()">
                        <option value="all">All rows</option>
                        <option value="owe_you">Not paid (matched)</option>
                        <option value="aligned">Sanction paid</option>
                        <option value="needs_attention">All except paid (includes Not paid)</option>
                        <option value="roster_issues">Other — no match / duplicate / unclear</option>
                        <option value="csi_charging_unpaid">CSI charging + not paid in Duezy</option>
                        <option value="csi_green_not_charged">CSI Complete has date (not charging)</option>
                    </select>
                </div>
                <div class="csi-reconcile-toolbar__right">
                    <button type="button" class="btn btn-sm btn-link text-muted text-decoration-none px-1" data-bs-toggle="collapse" data-bs-target="#csiCompareExtraCollapse" aria-expanded="false" title="Counts">
                        <i class="fas fa-layer-group me-1" aria-hidden="true"></i>Counts
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="csiDownloadOweComparisonCsv()" title="Matched players with sanction not paid">
                        <i class="fas fa-file-download me-1"></i>Not paid CSV
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="csiDownloadComparisonCsv()" title="Export full table">
                        <i class="fas fa-file-csv me-1"></i>Full CSV
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="csiDownloadComparisonPdf()" title="Portrait PDF (readable type), same rows as the table filter">
                        <i class="fas fa-file-pdf me-1"></i>PDF
                    </button>
                </div>
            </div>
            <p class="small text-muted mb-2 mt-1">Use <strong>Link</strong> in the table when CSI and Duezy spell a name differently. Links are saved in this browser only. <button type="button" class="btn btn-link btn-sm p-0 align-baseline text-decoration-none" onclick="csiConfirmClearAllManualNameLinks()">Clear all saved links</button></p>
            <div id="csiCompareExtraCollapse" class="collapse">
                <div class="csi-reconcile-meta-strip">
                    <span class="csi-reconcile-meta-pill"><i class="fas fa-file-excel me-1 opacity-75" aria-hidden="true"></i><strong>${csiRowsIncluded}</strong> CSI rows</span>
                    <span class="csi-reconcile-meta-pill"><i class="fas fa-users me-1 opacity-75" aria-hidden="true"></i><strong>${appRows.length}</strong> Duezy players</span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">Name matches: <strong>${nMatched}</strong></span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">Not on Duezy: <strong>${nNotInDuezy}</strong></span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">Not on CSI file: <strong>${nNotInCsi}</strong></span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">Duplicate name: <strong>${nDup}</strong></span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">Complete has date: <strong>${nCsiCompleteDate}</strong></span>
                    <span class="csi-reconcile-meta-pill csi-reconcile-meta-pill--muted">CSI charging + Duezy unpaid: <strong>${nCsiChargingUnpaid}</strong></span>
                </div>
            </div>`;
    }

    const sel = document.getElementById('csiCompareFocusFilter');
    if (sel) {
        if (nCsiChargingUnpaid > 0) sel.value = 'csi_charging_unpaid';
        else if (nOwe > 0) sel.value = 'owe_you';
        else sel.value = 'all';
    }
    csiRenderCompareTableFiltered();

    const wrap = document.getElementById('csiCompareResultsWrap');
    if (wrap) wrap.style.display = 'flex';
    const csiModal = document.getElementById('csiSanctionCompareModal');
    if (csiModal) csiModal.classList.add('csi-results-focus');
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Per-player sanction collection amount from Duezy (app.js settings); fallback $25 */
function csiGetSanctionFeeEachUsd() {
    try {
        if (typeof sanctionFeeAmount !== 'undefined' && sanctionFeeAmount != null) {
            const n = Number(sanctionFeeAmount);
            if (Number.isFinite(n) && n >= 0) return n;
        }
    } catch (e) {}
    return 25;
}

function csiFormatMoneyUsd(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '—';
    if (typeof formatCurrency === 'function') return formatCurrency(n);
    return '$' + n.toFixed(2);
}

function csiDownloadComparisonCsvRows(rows, filenameStem) {
    const header = [
        'Bucket',
        'Player (Duezy)',
        'Name (CSI file)',
        'Team(s)',
        'Sanction paid?',
        'CSI charging you?',
        'How Duezy marks paid',
        'Note'
    ];
    const lines = [header.join(',')];
    rows.forEach((r) => {
        const note = csiExportNoteForRow(r);
        const cells = [
            r.reconcileLabel || r.reconcileTag || '—',
            r.nameApp,
            r.nameCsi,
            r.teams || '—',
            r.displayPaidYou || '—',
            csiDisplayCsiChargingYou(r.csiNotCharged),
            r.displayHowPaid || '—',
            note
        ].map((c) => {
            const t = String(c == null ? '' : c).replace(/"/g, '""');
            return '"' + t + '"';
        });
        lines.push(cells.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameStem}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function csiDownloadComparisonCsv() {
    const rows = window._csiLastResultRows;
    if (!rows || !rows.length) {
        showAlertModal('Run a comparison first.', 'info', 'Nothing to export');
        return;
    }
    csiDownloadComparisonCsvRows(rows, 'csi-duezy-name-compare-full');
}

function csiDownloadOweComparisonCsv() {
    const rows = window._csiLastResultRows;
    if (!rows || !rows.length) {
        showAlertModal('Run a comparison first.', 'info', 'Nothing to export');
        return;
    }
    const owe = rows.filter((r) => r.reconcileTag === 'owe_you');
    if (!owe.length) {
        showAlertModal(
            'No rows where the name matched on CSI and Duezy but sanction is not paid. Try another filter or run comparison again.',
            'info',
            'Nothing to export'
        );
        return;
    }
    csiDownloadComparisonCsvRows(owe, 'csi-duezy-not-paid-matched');
}

function csiDownloadComparisonPdf() {
    try {
        const full = window._csiLastResultRows;
        if (!full || !full.length) {
            showAlertModal('Run a comparison first.', 'info', 'Nothing to export');
            return;
        }
        if (typeof window.jspdf === 'undefined') {
            showAlertModal(
                'PDF export library not loaded. Please refresh the page and try again.',
                'error',
                'Error'
            );
            return;
        }
        const sel = document.getElementById('csiCompareFocusFilter');
        const filterVal = (sel && sel.value) || 'all';
        const filterLabel =
            sel && sel.options && sel.selectedIndex >= 0
                ? sel.options[sel.selectedIndex].text
                : 'All rows';
        const rows = full.filter((r) => csiRowMatchesReconcileFilter(r, filterVal));
        if (!rows.length) {
            showAlertModal(
                'No rows match the current Show filter. Choose All rows or another filter, then try again.',
                'info',
                'Nothing to export'
            );
            return;
        }

        const feeEachUsd = csiGetSanctionFeeEachUsd();
        const nOwe = full.filter((r) => r.reconcileTag === 'owe_you').length;
        const nAligned = full.filter((r) => r.reconcileTag === 'aligned').length;
        const nOther = full.filter((r) =>
            ['not_in_duezy', 'not_in_csi', 'duplicate_name', 'other'].includes(r.reconcileTag)
        ).length;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const margin = 14;
        const pageW = doc.internal.pageSize.getWidth();
        const contentW = pageW - margin * 2;
        let y = margin;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CSI reconcile — Duezy', margin, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated: ' + new Date().toLocaleString(), margin, y);
        y += 5;
        doc.text(
            'Filter: ' + filterLabel + ' (' + rows.length + ' of ' + full.length + ' rows)',
            margin,
            y
        );
        y += 5;
        const summaryLine =
            'Full comparison summary: Not paid ' +
            nOwe +
            ' (' +
            csiFormatMoneyUsd(nOwe * feeEachUsd) +
            ' est.) · Paid ' +
            nAligned +
            ' (' +
            csiFormatMoneyUsd(nAligned * feeEachUsd) +
            ' est.) · Other ' +
            nOther +
            ' · Fee each ' +
            csiFormatMoneyUsd(feeEachUsd);
        const summaryLines = doc.splitTextToSize(summaryLine, contentW);
        summaryLines.forEach(function (line, i) {
            doc.text(line, margin, y + i * 5);
        });
        y += summaryLines.length * 5 + 6;

        function csiPdfDetailsCell(r) {
            const lines = [];
            lines.push('CSI charging you: ' + csiDisplayCsiChargingYou(r.csiNotCharged));
            lines.push('Teams: ' + String(r.teams || '—'));
            lines.push('How paid: ' + String(r.displayHowPaidPdf || r.displayHowPaid || '—'));
            const nt = csiExportNoteForRow(r);
            if (nt) lines.push('Note: ' + nt);
            return lines.join('\n');
        }

        const wName = 40;
        const wCsi = 40;
        const wPaid = 20;
        const wDetails = Math.max(52, contentW - wName - wCsi - wPaid);

        const head = [['Duezy player', 'CSI name', 'Paid?', 'CSI bill / teams / notes']];
        const body = rows.map((r) => [
            String(r.nameApp || '—'),
            String(r.nameCsi || '—'),
            String(r.displayPaidYou || '—'),
            csiPdfDetailsCell(r)
        ]);

        if (typeof doc.autoTable !== 'function') {
            showAlertModal(
                'PDF table plugin not loaded. Please refresh the page and try again.',
                'error',
                'Error'
            );
            return;
        }

        doc.autoTable({
            head: head,
            body: body,
            startY: y,
            margin: { left: margin, right: margin, top: margin, bottom: margin },
            tableWidth: contentW,
            columnStyles: {
                0: { cellWidth: wName },
                1: { cellWidth: wCsi },
                2: { cellWidth: wPaid },
                3: { cellWidth: wDetails }
            },
            styles: {
                fontSize: 10.5,
                cellPadding: 3.5,
                overflow: 'linebreak',
                valign: 'top',
                minCellHeight: 8,
                lineColor: [220, 220, 220],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10.5,
                cellPadding: 3
            },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            showHead: 'everyPage',
            theme: 'striped'
        });

        const fileName =
            'csi-duezy-compare-' + filterVal + '-' + new Date().toISOString().split('T')[0] + '.pdf';
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);

        showAlertModal(
            'The file "' +
                fileName +
                '" was downloaded (portrait A4, larger type). The table matches your Show filter; the summary line is for the full comparison.',
            'success',
            'Download started'
        );
    } catch (error) {
        console.error('CSI reconcile PDF export:', error);
        showAlertModal('Error exporting to PDF. Please try again.', 'error', 'Error');
    }
}

function csiPopulateNameLinkPlayerSelect() {
    const sel = document.getElementById('csiNameLinkPlayerSelect');
    if (!sel) return;
    const rows = window._csiLinkPickerAppRows;
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— Choose Duezy player —';
    sel.appendChild(opt0);
    if (!rows || !rows.length) return;
    const sorted = rows.slice().sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
    sorted.forEach((r) => {
        const o = document.createElement('option');
        o.value = r.normKey;
        const teams = r.teams ? String(r.teams).trim() : '';
        o.textContent = teams ? r.displayName + ' — ' + teams : r.displayName;
        sel.appendChild(o);
    });
}

function csiOpenNameLinkPicker(encodedPayload) {
    try {
        const data = JSON.parse(decodeURIComponent(encodedPayload));
        const keys = (data.keys || []).filter(Boolean);
        if (!keys.length) return;
        window._csiNameLinkContext = { keys, display: data.display || '' };
        const lab = document.getElementById('csiNameLinkCsiLabel');
        if (lab) lab.textContent = window._csiNameLinkContext.display || keys[0] || '(CSI)';
        csiPopulateNameLinkPlayerSelect();
        const modalEl = document.getElementById('csiNameLinkPickerModal');
        if (modalEl && window.bootstrap && window.bootstrap.Modal) {
            window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        } else {
            showAlertModal('Modal not available. Refresh the page.', 'error', 'Error');
        }
    } catch (e) {
        console.error('csiOpenNameLinkPicker', e);
        showAlertModal('Could not open link picker.', 'error', 'Error');
    }
}

function csiNameLinkSave() {
    const ctx = window._csiNameLinkContext;
    const sel = document.getElementById('csiNameLinkPlayerSelect');
    if (!ctx || !ctx.keys || !ctx.keys.length) return;
    const duezyNormKey = sel && sel.value ? sel.value.trim() : '';
    if (!duezyNormKey) {
        showAlertModal('Choose a Duezy player first.', 'info', 'Link');
        return;
    }
    csiSaveManualNameLinksForKeys(ctx.keys, duezyNormKey);
    const modalEl = document.getElementById('csiNameLinkPickerModal');
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
    }
    window._csiNameLinkContext = null;
    csiRunCompare();
}

function csiNameLinkCancel() {
    window._csiNameLinkContext = null;
    const modalEl = document.getElementById('csiNameLinkPickerModal');
    if (modalEl && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
    }
}

function csiRemoveNameLinkAndRerun(encodedPayload) {
    try {
        const data = JSON.parse(decodeURIComponent(encodedPayload));
        const keys = (data.keys || []).filter(Boolean);
        if (!keys.length) return;
        csiRemoveManualNameLinksForKeys(keys);
        csiRunCompare();
        showAlertModal('Manual name link removed.', 'success', 'Unlinked');
    } catch (e) {
        console.error('csiRemoveNameLinkAndRerun', e);
    }
}

function csiConfirmClearAllManualNameLinks() {
    if (!window.confirm('Remove every saved CSI→Duezy name link from this browser?')) return;
    try {
        localStorage.removeItem(CSI_MANUAL_NAME_LINKS_STORAGE_KEY);
    } catch (e) {
        console.warn(e);
    }
    if (window._csiLastResultRows && window._csiLastResultRows.length) csiRunCompare();
    else showAlertModal('Saved links cleared.', 'success', 'Done');
}
