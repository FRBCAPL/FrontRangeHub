/**
 * Simplified CSI reconcile UI: three action buckets and a single plain-English status per row.
 * Used by csiSanctionCompare.js after rows are tagged.
 */

function csiAssignActionBuckets(rows) {
    if (!rows) return;
    rows.forEach((r) => {
        if (r.reconcileTag === 'owe_you') {
            r.actionBucket = 'collect';
            r.actionLabel = 'Collect sanction from player';
            r.actionDetail = 'CSI is billing you · not paid in Duezy yet';
            return;
        }
        if (r.reconcileTag === 'aligned') {
            r.actionBucket = 'ok';
            r.actionLabel = 'All set';
            r.actionDetail = 'Paid in Duezy';
            return;
        }
        if (r.appPreviouslySanctioned) {
            r.actionBucket = 'ok';
            r.actionLabel = 'All set';
            r.actionDetail = 'Previously sanctioned in Duezy';
            return;
        }
        if (r.kind === 'both' && r.displayPaidYou === 'No' && r.csiNotCharged === true) {
            r.actionBucket = 'ok';
            r.actionLabel = 'All set';
            r.actionDetail = 'CSI is not charging you for this player';
            return;
        }
        if (r.kind === 'csi_only') {
            r.actionBucket = 'roster';
            r.actionLabel = 'Add or link in Duezy';
            r.actionDetail = 'On CSI file — not matched to your roster';
            return;
        }
        if (r.kind === 'app_only') {
            r.actionBucket = 'roster';
            r.actionLabel = 'Check CSI export';
            r.actionDetail = 'In Duezy — not found on CSI file';
            return;
        }
        if (r.kind === 'ambiguous') {
            r.actionBucket = 'roster';
            r.actionLabel = 'Pick the right player';
            r.actionDetail = (r.detail || '').replace(/^Match:\s*/i, '').trim() || 'More than one possible match';
            return;
        }
        r.actionBucket = 'roster';
        r.actionLabel = 'Review';
        r.actionDetail = r.reconcileLabel || 'Quick check needed';
    });
}

function csiRowMatchesSimpleFilter(r, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'collect') return r.actionBucket === 'collect';
    if (filter === 'ok') return r.actionBucket === 'ok';
    if (filter === 'roster') return r.actionBucket === 'roster';
    if (filter === 'owe_you') return r.actionBucket === 'collect';
    if (filter === 'aligned') return r.actionBucket === 'ok';
    if (filter === 'roster_issues') return r.actionBucket === 'roster';
    return true;
}

function csiBuildSimpleSummaryHtml(opts) {
    const {
        nCollect,
        nOk,
        nRoster,
        nPaid,
        nCsiBilling,
        amtCollectUsd,
        amtCollectedUsd,
        amtCsiBillUsd,
        amtCsiOnCollectUsd,
        marginOnCollectUsd,
        marginCollectedUsd,
        feeCollectUsd,
        feeCsiUsd,
        feeMarginUsd,
        formatMoney
    } = opts;
    const fmt = typeof formatMoney === 'function' ? formatMoney : (n) => '$' + Number(n).toFixed(2);
    const collectFromPlayers = fmt(amtCollectUsd);
    const csiOnCollect = fmt(amtCsiOnCollectUsd);
    const marginOnCollect = fmt(marginOnCollectUsd);
    const collectedMoney = fmt(amtCollectedUsd);
    const csiBillTotal = fmt(amtCsiBillUsd);
    const marginCollected = fmt(marginCollectedUsd);
    const feeCollectStr = fmt(feeCollectUsd);
    const feeCsiStr = fmt(feeCsiUsd);
    const feeMarginStr = fmt(feeMarginUsd);
    const paidCount = nPaid == null ? 0 : nPaid;
    const nBill = nCsiBilling == null ? 0 : nCsiBilling;

    return `
        <p class="csi-simple-lead mb-2">
            <strong>Two different amounts:</strong> you collect <strong>${feeCollectStr}</strong> per player in Duezy;
            CSI bills you <strong>${feeCsiStr}</strong> per player on their sheet (empty <strong>Complete</strong>).
            Your margin is <strong>${feeMarginStr}</strong> when you collect and pay CSI.
        </p>
        <div class="csi-fee-totals mb-3">
            <div class="csi-fee-totals__row csi-fee-totals__row--csi">
                <span class="csi-fee-totals__label">CSI invoice (this file)</span>
                <span class="csi-fee-totals__value">${nBill} players × ${feeCsiStr} ≈ <strong>${csiBillTotal}</strong> owed to CSI</span>
            </div>
            <div class="csi-fee-totals__row">
                <span class="csi-fee-totals__label">Still collect from players</span>
                <span class="csi-fee-totals__value">${collectFromPlayers} at ${feeCollectStr} each · CSI share ${csiOnCollect} · your margin ${marginOnCollect}</span>
            </div>
            <div class="csi-fee-totals__row">
                <span class="csi-fee-totals__label">Already in Duezy as paid</span>
                <span class="csi-fee-totals__value">${collectedMoney} collected · margin about ${marginCollected}</span>
            </div>
        </div>
        <div class="csi-simple-tabs mb-3" role="tablist" aria-label="Filter players">
            <button type="button" class="csi-simple-tab csi-simple-tab--collect" data-csi-reconcile-filter="collect" role="tab" aria-pressed="false" onclick="csiSetCompareFilter('collect')">
                <span class="csi-simple-tab__label">Collect</span>
                <span class="csi-simple-tab__count">${nCollect}</span>
                ${nCollect > 0 ? `<span class="csi-simple-tab__sub">${collectFromPlayers} from players · CSI ${csiOnCollect}</span>` : '<span class="csi-simple-tab__sub">nothing to collect</span>'}
            </button>
            <button type="button" class="csi-simple-tab csi-simple-tab--ok" data-csi-reconcile-filter="ok" role="tab" aria-pressed="false" onclick="csiSetCompareFilter('ok')">
                <span class="csi-simple-tab__label">All set</span>
                <span class="csi-simple-tab__count">${nOk}</span>
                ${
                    paidCount > 0
                        ? `<span class="csi-simple-tab__sub">${collectedMoney} at ${feeCollectStr} · ${paidCount} paid</span>`
                        : '<span class="csi-simple-tab__sub">paid or CSI not billing you</span>'
                }
            </button>
            <button type="button" class="csi-simple-tab csi-simple-tab--roster" data-csi-reconcile-filter="roster" role="tab" aria-pressed="false" onclick="csiSetCompareFilter('roster')">
                <span class="csi-simple-tab__label">Check roster</span>
                <span class="csi-simple-tab__count">${nRoster}</span>
                <span class="csi-simple-tab__sub">names, links, missing rows</span>
            </button>
        </div>
        <div class="csi-simple-export mb-3 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-sm btn-primary" onclick="csiDownloadComparisonPdf()" title="PDF of the players shown for the tab/filter you have selected">
                <i class="fas fa-file-pdf me-1" aria-hidden="true"></i>Download PDF
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="csiDownloadComparisonCsv()" title="Spreadsheet of the current filter">
                <i class="fas fa-file-csv me-1" aria-hidden="true"></i>CSV
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="csiDownloadOweComparisonCsv()" title="Collect list only">
                <i class="fas fa-file-download me-1" aria-hidden="true"></i>Collect CSV
            </button>
            <span class="small text-muted">Uses the same list as the table (selected tab above).</span>
        </div>
        <details class="csi-simple-more mb-2">
            <summary class="small text-muted user-select-none">More export options</summary>
            <div class="d-flex flex-wrap gap-2 align-items-center mt-2 mb-2">
                <label class="visually-hidden" for="csiCompareFocusFilter">Filter table</label>
                <select id="csiCompareFocusFilter" class="form-select form-select-sm" style="max-width: 11rem" onchange="csiOnCompareFocusFilterChange()">
                    <option value="collect">Collect</option>
                    <option value="ok">All set</option>
                    <option value="roster">Check roster</option>
                    <option value="all">Everyone</option>
                </select>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="csiDownloadComparisonCsv()">Full list CSV (all players)</button>
                <button type="button" class="btn btn-link btn-sm text-muted" onclick="csiConfirmClearAllManualNameLinks()">Clear saved name links</button>
            </div>
            <p class="small text-muted mb-0">CSI <strong>Complete</strong> empty = CSI charges you. Date in Complete = CSI is not charging you. Duezy paid status matches the Players tab.</p>
        </details>`;
}

function csiRowDisplayName(r) {
    if (!r) return '';
    if (r.nameApp && r.nameApp !== '—') return String(r.nameApp).trim();
    if (r.nameCsi && r.nameCsi !== '—') return String(r.nameCsi).trim();
    return '';
}

function csiRowTeamsDisplay(r) {
    if (!r || !r.teams) return '';
    const t = String(r.teams).trim();
    return t && t !== '—' ? t : '';
}

function csiSortCompareRows(rows) {
    if (!rows || !rows.length) return rows;
    const sort = window._csiCompareSort || { key: 'player', dir: 'asc' };
    const dir = sort.dir === 'desc' ? -1 : 1;
    const collator = (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    return rows.slice().sort((a, b) => {
        let cmp = 0;
        if (sort.key === 'team') {
            cmp = collator(csiRowTeamsDisplay(a), csiRowTeamsDisplay(b));
            if (cmp === 0) cmp = collator(csiRowDisplayName(a), csiRowDisplayName(b));
        } else {
            cmp = collator(csiRowDisplayName(a), csiRowDisplayName(b));
            if (cmp === 0) cmp = collator(csiRowTeamsDisplay(a), csiRowTeamsDisplay(b));
        }
        return cmp * dir;
    });
}

function csiOnCompareTableSort(column) {
    if (!window._csiCompareSort) window._csiCompareSort = { key: 'player', dir: 'asc' };
    if (window._csiCompareSort.key === column) {
        window._csiCompareSort.dir = window._csiCompareSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
        window._csiCompareSort = { key: column, dir: 'asc' };
    }
    if (typeof csiUpdateCompareSortHeaderIcons === 'function') csiUpdateCompareSortHeaderIcons();
    if (typeof csiRenderCompareTableFiltered === 'function') csiRenderCompareTableFiltered();
}

function csiUpdateCompareSortHeaderIcons() {
    const sort = window._csiCompareSort || { key: 'player', dir: 'asc' };
    ['player', 'team'].forEach((col) => {
        const icon = document.getElementById('csi-sort-icon-' + col);
        if (!icon) return;
        if (sort.key !== col) {
            icon.className = 'fas fa-sort sort-icon ms-1 opacity-50';
            return;
        }
        icon.className =
            sort.dir === 'asc' ? 'fas fa-sort-up sort-icon ms-1' : 'fas fa-sort-down sort-icon ms-1';
    });
}

function csiCompareTableRowHtmlSimple(r) {
    const escape = typeof csiEscapeHtml === 'function' ? csiEscapeHtml : (s) => String(s == null ? '' : s);
    const primary = csiRowDisplayName(r) || '—';
    const teams = csiRowTeamsDisplay(r);
    const csiLine =
        r.nameCsi && r.nameCsi !== '—' && r.nameApp !== r.nameCsi
            ? `<div class="csi-player-csi text-muted small">CSI: ${escape(r.nameCsi)}</div>`
            : '';
    let actionClass = 'csi-action--roster';
    if (r.actionBucket === 'collect') actionClass = 'csi-action--collect';
    else if (r.actionBucket === 'ok') actionClass = 'csi-action--ok';

    const keys = [r.csiStrictKey, r.csiAltStrictKey].filter(Boolean);
    let linkCell = '<td class="csi-compare-link-cell text-muted small text-end">—</td>';
    if (r.kind === 'csi_only' && keys.length) {
        const payload = csiEncodeRowPayload({ keys, display: r.nameCsi || '' });
        linkCell = `<td class="csi-compare-link-cell text-end text-nowrap"><button type="button" class="btn btn-outline-primary btn-sm py-0 px-2" data-csi-action="link" data-csi-payload="${payload}">Link</button></td>`;
    } else if (r.kind === 'ambiguous' && keys.length) {
        const payload = csiEncodeRowPayload({ keys, display: r.nameCsi || '' });
        linkCell = `<td class="csi-compare-link-cell text-end text-nowrap"><button type="button" class="btn btn-outline-primary btn-sm py-0 px-2" data-csi-action="pick" data-csi-payload="${payload}">Pick</button></td>`;
    } else if (r.kind === 'both' && r.matchedByManualLink && keys.length) {
        const payload = csiEncodeRowPayload({ keys });
        linkCell = `<td class="csi-compare-link-cell text-end text-nowrap"><button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" data-csi-action="unlink" data-csi-payload="${payload}">Unlink</button></td>`;
    }

    const detail = r.actionDetail ? `<div class="csi-action-detail">${escape(r.actionDetail)}</div>` : '';

    return `<tr data-action-bucket="${escape(r.actionBucket || '')}">
        <td class="csi-player-cell"><div class="fw-medium">${escape(primary)}</div>${csiLine}</td>
        <td class="csi-team-cell small">${teams ? escape(teams) : '<span class="text-muted">—</span>'}</td>
        <td class="csi-action-cell ${actionClass}"><div class="csi-action-label">${escape(r.actionLabel || 'Review')}</div>${detail}</td>
        ${linkCell}
    </tr>`;
}
