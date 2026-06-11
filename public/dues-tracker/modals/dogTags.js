/**
 * Player Stats — break & run and win zip from Fargo LMS (8-ball / 9-ball / 10-ball per division).
 * Syncs BR/WZ from FargoRate LMS Players report; tracks what has been issued.
 * Settings, stats, and issued counts persist per division on the server.
 */

/** User-facing feature name (leagues use different terms for BR/WZ awards). */
const PLAYER_STATS_UI_NAME = 'Player Stats';

const DOG_TAG_GAME_TYPES = ['8-ball', '9-ball', '10-ball'];

let dogTagSaveTimer = null;
let dogTagOverviewCache = null;
/** Bumped on each division switch so stale load responses are ignored. */
let dogTagDivisionLoadToken = 0;

const dogTagSortState = {
    pending: { key: 'pendingBr', dir: 'desc' },
    all: { key: 'playerName', dir: 'asc' }
};

const dogTagSortColumns = [
    { key: 'playerName', label: 'Player', center: false },
    { key: 'fargoBr', label: 'Fargo BR', center: true },
    { key: 'issuedBr', label: 'Issued BR', center: true },
    { key: 'pendingBr', label: 'Owe BR', center: true, owe: 'br' },
    { key: 'fargoWz', label: 'Fargo WZ', center: true },
    { key: 'issuedWz', label: 'Issued WZ', center: true },
    { key: 'pendingWz', label: 'Owe WZ', center: true, owe: 'wz' }
];

function dogTagResetSortState() {
    dogTagSortState.pending = { key: 'pendingBr', dir: 'desc' };
    dogTagSortState.all = { key: 'playerName', dir: 'asc' };
}

function dogTagPlayerSortValue(p, key) {
    switch (key) {
        case 'playerName':
            return String(p.playerName || '').toLowerCase();
        case 'fargoBr':
            return p.fargoBr || 0;
        case 'issuedBr':
            return p.issuedBr || 0;
        case 'pendingBr':
            return p.pendingBr || 0;
        case 'fargoWz':
            return p.fargoWz || 0;
        case 'issuedWz':
            return p.issuedWz || 0;
        case 'pendingWz':
            return p.pendingWz || 0;
        default:
            return 0;
    }
}

function dogTagSortPlayers(list, tableKind) {
    const state = dogTagSortState[tableKind] || dogTagSortState.all;
    const { key, dir } = state;
    return [...list].sort((a, b) => {
        const va = dogTagPlayerSortValue(a, key);
        const vb = dogTagPlayerSortValue(b, key);
        if (typeof va === 'string') {
            const cmp = va.localeCompare(vb);
            return dir === 'asc' ? cmp : -cmp;
        }
        return dir === 'asc' ? va - vb : vb - va;
    });
}

function dogTagDefaultSortDir(key) {
    return key === 'playerName' ? 'asc' : 'desc';
}

function dogTagHandleSortClick(th) {
    const key = th.getAttribute('data-dog-sort');
    const tableKind = th.getAttribute('data-dog-table');
    if (!key || !tableKind || !window.__dogTagCurrentData) return;
    const state = dogTagSortState[tableKind];
    if (state.key === key) {
        state.dir = state.dir === 'asc' ? 'desc' : 'asc';
    } else {
        state.key = key;
        state.dir = dogTagDefaultSortDir(key);
    }
    dogTagRenderPendingTable(window.__dogTagCurrentData);
    dogTagRenderAllTable(window.__dogTagCurrentData);
}

function dogTagStorageKey(suffix) {
    const op = window.currentOperator || (typeof currentOperator !== 'undefined' ? currentOperator : null);
    const opId = op?.id || op?._id || 'default';
    return `duezy_dogTag_${suffix}_${opId}`;
}

function dogTagGetLastDivisionId() {
    try {
        return localStorage.getItem(dogTagStorageKey('lastDivision')) || '';
    } catch (_) {
        return '';
    }
}

function dogTagSetLastDivisionId(divisionId) {
    try {
        if (divisionId) localStorage.setItem(dogTagStorageKey('lastDivision'), divisionId);
    } catch (_) {}
}

function dogTagShowSaveHint(text, isError) {
    const el = document.getElementById('dogTagSaveHint');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'dog-tags-status-item ' + (isError ? 'text-danger' : 'text-success');
    if (text && !isError) {
        setTimeout(() => {
            if (el.textContent === text) el.textContent = '';
        }, 2500);
    }
}

function dogTagEmptyState(icon, title, hint) {
    return `<div class="dog-tag-empty-state">
        <i class="fas ${icon} dog-tag-empty-icon" aria-hidden="true"></i>
        <p class="dog-tag-empty-title">${dogTagEscapeHtml(title)}</p>
        <p class="dog-tag-empty-hint">${dogTagEscapeHtml(hint)}</p>
    </div>`;
}

function dogTagSetTabLabel(tabEl, icon, label, count) {
    if (!tabEl) return;
    if (count > 0) {
        tabEl.innerHTML = `<i class="fas ${icon} me-1"></i>${label} <span class="badge rounded-pill dog-tag-tab-badge ms-1">${count}</span>`;
    } else {
        tabEl.innerHTML = `<i class="fas ${icon} me-1"></i>${label}`;
    }
}

function dogTagEscapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function dogTagCsvCell(val) {
    const s = val == null ? '' : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function dogTagFilenameSlug(text, maxLen) {
    const slug = String(text || 'division')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, maxLen || 40);
    return slug || 'division';
}

function dogTagGetPendingExportContext() {
    const data = window.__dogTagCurrentData;
    if (!data) {
        showAlertModal('Select a division and sync from Fargo first', 'warning', PLAYER_STATS_UI_NAME);
        return null;
    }

    const pending = data.pendingOnly || (data.players || []).filter((p) => p.pendingBr > 0 || p.pendingWz > 0);
    if (!pending.length) {
        showAlertModal('Nothing pending to export — everyone is caught up', 'info', PLAYER_STATS_UI_NAME);
        return null;
    }

    const gt = data.settings?.gameType || dogTagGetGameType();
    const divName = data.division?.name || dogTagGetSelectedDivisionName();
    const pendingBr = data.totals?.pendingBr ?? pending.reduce((s, p) => s + (p.pendingBr || 0), 0);
    const pendingWz = data.totals?.pendingWz ?? pending.reduce((s, p) => s + (p.pendingWz || 0), 0);

    return {
        sorted: dogTagSortPlayers(pending, 'pending'),
        gt,
        divName,
        pendingBr,
        pendingWz,
        playerCount: pending.length,
        slug: dogTagFilenameSlug(divName),
        ball: dogTagNormalizeGameType(gt).replace('-ball', 'ball'),
        dateStr: new Date().toISOString().slice(0, 10),
        exportedAt: new Date().toLocaleString()
    };
}

function exportDogTagsPendingCsv() {
    const ctx = dogTagGetPendingExportContext();
    if (!ctx) return;

    const headers = [
        'Division',
        'Game type',
        'Player',
        'Fargo BR',
        'Issued BR',
        'Owe BR',
        'Fargo WZ',
        'Issued WZ',
        'Owe WZ',
        'BR to issue',
        'WZ to issue',
        'Exported at'
    ];

    const rows = ctx.sorted.map((p) => [
        ctx.divName,
        ctx.gt,
        p.playerName,
        p.fargoBr,
        p.issuedBr,
        p.pendingBr,
        p.fargoWz,
        p.issuedWz,
        p.pendingWz,
        p.pendingBr,
        p.pendingWz,
        ctx.exportedAt
    ]);

    const csv = '\uFEFF' + [headers, ...rows]
        .map((row) => row.map(dogTagCsvCell).join(','))
        .join('\r\n');

    const filename = `player-stats-pending-${ctx.slug}-${ctx.ball}-${ctx.dateStr}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function dogTagNormPlayerKey(name) {
    if (typeof normPlayerKey === 'function') return normPlayerKey(name);
    if (!name) return '';
    let s = String(name).trim().toLowerCase();
    s = s.replace(/['"][^'"]*['"]/g, '');
    s = s.replace(/\([^)]*\)/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

function dogTagRosterNormKey(name) {
    if (typeof rosterPlayerNormKey === 'function') return rosterPlayerNormKey(name);
    return dogTagNormPlayerKey(name);
}

/** Hyphens → spaces so "Norman-Hansen" matches "Norman Hansen" / "Norman, Gary". */
function dogTagLooseNameKey(name) {
    const base = dogTagRosterNormKey(name) || dogTagNormPlayerKey(name);
    if (!base) return '';
    return base.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function dogTagNameParts(name) {
    const loose = dogTagLooseNameKey(name);
    if (!loose) return { first: '', last: '', altLast: '' };
    let parts = loose.split(/\s+/).filter(Boolean);
    const suffixRe = /^(jr|sr|ii|iii|iv)$/i;
    parts = parts.filter((p) => !suffixRe.test(p.replace(/\./g, '')));
    if (parts.length > 2) {
        parts = parts.filter((p, i) => i === 0 || i === parts.length - 1 || p.replace(/\./g, '').length > 1);
    }
    if (parts.length >= 2) {
        return {
            first: parts[0],
            last: parts[parts.length - 1],
            altLast: parts.length >= 3 ? parts[1] : ''
        };
    }
    return { first: parts[0] || '', last: '', altLast: '' };
}

/** First + last only — ignores middle names, initials, Jr/Sr (common Fargo vs roster drift). */
function dogTagCoreNameKey(name) {
    const { first, last, altLast } = dogTagNameParts(name);
    if (first && last) return `${first} ${last}`;
    return dogTagLooseNameKey(name);
}

function dogTagPlayerLookupKeys(name) {
    const keys = new Set();
    const add = (k) => { if (k) keys.add(k); };
    if (!name) return [];

    add(dogTagNormPlayerKey(name));
    add(dogTagRosterNormKey(name));
    add(dogTagLooseNameKey(name));
    add(dogTagCoreNameKey(name));

    const { first, last, altLast } = dogTagNameParts(name);
    if (first && last) add(`${first} ${last}`);
    if (first && altLast) add(`${first} ${altLast}`);

    const trimmed = String(name).trim();
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 2) {
            const reversed = `${parts[1]} ${parts[0]}`;
            for (const fn of [dogTagNormPlayerKey, dogTagRosterNormKey, dogTagLooseNameKey, dogTagCoreNameKey]) {
                add(fn(reversed));
            }
            const revParts = dogTagNameParts(reversed);
            if (revParts.first && revParts.last) add(`${revParts.first} ${revParts.last}`);
            if (revParts.first && revParts.altLast) add(`${revParts.first} ${revParts.altLast}`);
        }
    } else {
        const normParts = dogTagLooseNameKey(trimmed).split(' ').filter(Boolean);
        if (normParts.length === 2) add(`${normParts[1]} ${normParts[0]}`);
        if (normParts.length >= 2) add(`${normParts[normParts.length - 1]} ${normParts[0]}`);
    }
    return [...keys];
}

function dogTagGetDivisionRecord(divisionId) {
    return (divisions || []).find((d) => (d._id || d.id) === divisionId) || null;
}

/** Same division matching rules as the main teams table filter (incl. double play). */
function dogTagTeamMatchesDivision(team, divisionId) {
    if (team.isArchived === true || team.is_archived === true) return false;
    if (team.isActive === false && team.isArchived !== true) return false;
    if (!team.division) return false;

    const teamDivision = String(team.division).trim();
    const selectedDivision = dogTagGetDivisionRecord(divisionId);
    const divName = (selectedDivision?.name || dogTagGetSelectedDivisionName() || '').trim();
    if (!divName) return true;

    if (teamDivision === divName) return true;
    if (teamDivision.toLowerCase() === divName.toLowerCase()) return true;

    if (selectedDivision?.isDoublePlay) {
        const formattedName = `${selectedDivision.firstDivisionName || ''} - ${selectedDivision.firstDivisionGameType || ''} / ${selectedDivision.secondDivisionName || ''} - ${selectedDivision.secondDivisionGameType || ''}`.trim();
        if (teamDivision === formattedName || teamDivision.toLowerCase() === formattedName.toLowerCase()) {
            return true;
        }
        const half1 = `${selectedDivision.firstDivisionName || ''} - ${selectedDivision.firstDivisionGameType || ''}`.trim();
        const half2 = `${selectedDivision.secondDivisionName || ''} - ${selectedDivision.secondDivisionGameType || ''}`.trim();
        const teamLower = teamDivision.toLowerCase();
        if ((half1 && teamLower === half1.toLowerCase()) || (half2 && teamLower === half2.toLowerCase())) {
            return true;
        }
    }
    return false;
}

function dogTagRegisterPlayerInLookup(lookup, name, teamName) {
    for (const key of dogTagPlayerLookupKeys(name)) {
        if (!lookup.map[key]) lookup.map[key] = teamName;
    }
    const core = dogTagCoreNameKey(name);
    const parts = dogTagNameParts(name);
    if (core) {
        if (!lookup.map[core]) lookup.map[core] = teamName;
        if (!lookup.byCore[core]) lookup.byCore[core] = [];
        if (!lookup.byCore[core].includes(teamName)) lookup.byCore[core].push(teamName);
    }
    if (parts.first && parts.altLast) {
        const altCore = `${parts.first} ${parts.altLast}`;
        if (!lookup.map[altCore]) lookup.map[altCore] = teamName;
    }
    lookup.rosterMeta.push({
        name,
        teamName,
        norm: dogTagLooseNameKey(name),
        core,
        parts
    });
}

function dogTagEmptyTeamLookup() {
    return { map: {}, byCore: {}, rosterMeta: [] };
}

/** Same roster walk as the Players tab — captain + members, division-filtered. */
function dogTagBuildTeamLookup(divisionId, pool, divisionFilter) {
    const teamsPool = pool || (
        (typeof teamsForSummary !== 'undefined' && teamsForSummary?.length)
            ? teamsForSummary
            : (typeof teams !== 'undefined' ? teams : [])
    );
    const lookup = dogTagEmptyTeamLookup();
    const capNorm = (team) => dogTagRosterNormKey(team.captainName || team.captain_name || '');

    for (const team of teamsPool) {
        if (divisionFilter !== false && !dogTagTeamMatchesDivision(team, divisionId)) continue;

        const teamName = (team.teamName || team.team_name || '').trim();
        if (!teamName) continue;

        const captainName = team.captainName || team.captain_name;
        if (captainName) {
            dogTagRegisterPlayerInLookup(lookup, captainName, teamName);
        }

        const members = team.teamMembers || team.team_members || [];
        for (const m of members) {
            const raw = typeof m === 'string' ? m : m?.name;
            if (!raw) continue;
            if (dogTagRosterNormKey(raw) === capNorm(team)) continue;
            dogTagRegisterPlayerInLookup(lookup, raw, teamName);
        }
    }
    return lookup;
}

function dogTagResolveTeamFromLookup(player, lookup) {
    if (!player || !lookup?.map) return '';

    const keys = [player.playerNameKey, ...dogTagPlayerLookupKeys(player.playerName)];
    for (const key of keys) {
        if (key && lookup.map[key]) return lookup.map[key];
    }

    const core = dogTagCoreNameKey(player.playerName);
    if (core) {
        if (lookup.map[core]) return lookup.map[core];
        const coreTeams = lookup.byCore[core];
        if (coreTeams?.length === 1) return coreTeams[0];
    }

    const fParts = dogTagNameParts(player.playerName);
    if (fParts.first && fParts.last && typeof levenshteinDistance === 'function') {
        const scored = [];
        for (const r of lookup.rosterMeta || []) {
            const p = r.parts || dogTagNameParts(r.name);
            if (!p.first || !p.last) continue;

            const lastDist = Math.min(
                levenshteinDistance(fParts.last, p.last),
                fParts.last && p.altLast ? levenshteinDistance(fParts.last, p.altLast) : 99,
                fParts.altLast && p.last ? levenshteinDistance(fParts.altLast, p.last) : 99
            );
            const firstDist = levenshteinDistance(fParts.first, p.first);
            const initialMatch = fParts.first.charAt(0) === p.first.charAt(0);
            const lastOk = lastDist <= 3;
            const firstOk = firstDist <= 2 || (initialMatch && lastDist <= 3);

            if (lastOk && firstOk) {
                scored.push({ teamName: r.teamName, score: lastDist + firstDist });
            }
        }
        if (scored.length) {
            scored.sort((a, b) => a.score - b.score);
            const bestScore = scored[0].score;
            const bestTeams = [...new Set(
                scored.filter((s) => s.score === bestScore).map((s) => s.teamName)
            )];
            if (bestTeams.length === 1) return bestTeams[0];
        }
    }

    if (fParts.first && fParts.last) {
        const fInitial = fParts.first.charAt(0);
        const candidates = (lookup.rosterMeta || []).filter((r) => {
            const p = r.parts || dogTagNameParts(r.name);
            if (!p.first || !p.last) return false;
            const lastMatch = p.last === fParts.last || p.altLast === fParts.last;
            return lastMatch && p.first.charAt(0) === fInitial;
        });
        const uniqueTeams = [...new Set(candidates.map((c) => c.teamName))];
        if (uniqueTeams.length === 1) return uniqueTeams[0];
    }

    if (core && typeof levenshteinDistance === 'function') {
        let bestTeam = null;
        let bestDist = Infinity;
        for (const r of lookup.rosterMeta || []) {
            if (!r.core) continue;
            const d = levenshteinDistance(core, r.core);
            if (d > 3) continue;
            if (d < bestDist) {
                bestDist = d;
                bestTeam = r.teamName;
            } else if (d === bestDist && bestTeam !== r.teamName) {
                bestTeam = null;
            }
        }
        if (bestTeam) return bestTeam;
    }

    return '';
}

function dogTagTeamForPlayer(player, divisionLookup, allLookup) {
    return dogTagResolveTeamFromLookup(player, divisionLookup)
        || (allLookup ? dogTagResolveTeamFromLookup(player, allLookup) : '');
}

async function dogTagEnsureTeamsPool() {
    if (typeof teamsForSummary !== 'undefined' && teamsForSummary?.length) {
        return teamsForSummary;
    }
    if (typeof loadTeamsForSummary === 'function') {
        await loadTeamsForSummary();
        if (teamsForSummary?.length) return teamsForSummary;
    }
    if (typeof apiCall === 'function') {
        try {
            const response = await apiCall('/teams?page=1&limit=10000&includeArchived=false');
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data : (data.teams || []);
            }
        } catch (e) {
            console.warn('dogTagEnsureTeamsPool:', e);
        }
    }
    return typeof teams !== 'undefined' ? teams : [];
}

function dogTagGetJsPdfConstructor() {
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    if (typeof window.jsPDF !== 'undefined') return window.jsPDF;
    return null;
}

async function exportDogTagsPendingPdf() {
    const ctx = dogTagGetPendingExportContext();
    if (!ctx) return;

    const jsPDF = dogTagGetJsPdfConstructor();
    if (!jsPDF) {
        showAlertModal('PDF library not loaded. Refresh the page and try again.', 'error', PLAYER_STATS_UI_NAME);
        return;
    }

    const divisionId = dogTagGetDivisionId();
    let divisionLookup;
    let allLookup;
    try {
        const teamsPool = await dogTagEnsureTeamsPool();
        divisionLookup = dogTagBuildTeamLookup(divisionId, teamsPool, true);
        allLookup = dogTagBuildTeamLookup(divisionId, teamsPool, false);
    } catch (e) {
        console.warn('exportDogTagsPendingPdf team lookup:', e);
        divisionLookup = dogTagBuildTeamLookup(divisionId);
        allLookup = null;
    }

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        if (typeof doc.autoTable !== 'function') {
            showAlertModal('PDF table plugin not loaded. Refresh the page and try again.', 'error', PLAYER_STATS_UI_NAME);
            return;
        }

        const margin = 12;
        const pageW = doc.internal.pageSize.getWidth();
        let y = margin;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Player Stats — Pending Issue List', margin, y);
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Division: ${ctx.divName}`, margin, y);
        y += 5;
        doc.text(
            `${ctx.gt} · ${ctx.pendingBr + ctx.pendingWz} owed (${ctx.pendingBr} BR, ${ctx.pendingWz} WZ) · ${ctx.playerCount} players`,
            margin,
            y
        );
        y += 5;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Won = earned in Fargo (BR + WZ). Owed = still to issue.', margin, y);
        y += 4;
        doc.text(`Generated ${ctx.exportedAt}`, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 6;

        const head = [['Team', 'Player', 'Won', 'Owed', 'Issued']];

        const body = ctx.sorted.map((p) => {
            const won = (p.fargoBr || 0) + (p.fargoWz || 0);
            const owed = (p.pendingBr || 0) + (p.pendingWz || 0);
            return [
                dogTagTeamForPlayer(p, divisionLookup, allLookup) || '—',
                p.playerName,
                String(won),
                String(owed),
                owed > 0 ? '[ ]' : '—'
            ];
        });

        doc.autoTable({
            head,
            body,
            startY: y,
            margin: { left: margin, right: margin, top: margin, bottom: margin },
            tableWidth: pageW - margin * 2,
            styles: {
                fontSize: 10,
                cellPadding: 2.5,
                overflow: 'linebreak',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [218, 165, 32],
                textColor: 20,
                fontStyle: 'bold',
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 42 },
                1: { cellWidth: 52 },
                2: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
                3: { fillColor: [255, 248, 220], halign: 'center', cellWidth: 22, fontStyle: 'bold' },
                4: { halign: 'center', cellWidth: 18 }
            },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            theme: 'grid',
            showHead: 'everyPage',
            didDrawPage(pageData) {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text(
                    `Page ${pageData.pageNumber} of ${pageCount}`,
                    pageW - margin,
                    doc.internal.pageSize.getHeight() - 6,
                    { align: 'right' }
                );
                doc.setTextColor(0, 0, 0);
            }
        });

        const filename = `player-stats-pending-${ctx.slug}-${ctx.ball}-${ctx.dateStr}.pdf`;
        doc.save(filename);
    } catch (e) {
        console.error('exportDogTagsPendingPdf:', e);
        showAlertModal('Could not create PDF. Please try again.', 'error', PLAYER_STATS_UI_NAME);
    }
}

function dogTagNormalizeGameType(val) {
    const gt = String(val || '8-ball').toLowerCase().trim();
    if (/\b10\s*[- ]?\s*ball\b/.test(gt) || gt === '10ball') return '10-ball';
    if (/\b9\s*[- ]?\s*ball\b/.test(gt) || gt === '9ball') return '9-ball';
    if (/\b8\s*[- ]?\s*ball\b/.test(gt) || gt === '8ball') return '8-ball';
    return '8-ball';
}

function inferDogTagGameTypeFromName(divisionName) {
    const n = String(divisionName || '').toLowerCase();
    const has8 = /\b8\s*[- ]?\s*ball\b/.test(n) || /\b8ball\b/.test(n);
    const has9 = /\b9\s*[- ]?\s*ball\b/.test(n) || /\b9ball\b/.test(n);
    const has10 = /\b10\s*[- ]?\s*ball\b/.test(n) || /\b10ball\b/.test(n);
    const multi = [has8, has9, has10].filter(Boolean).length;
    if (multi > 1) return '8-ball';
    if (has10) return '10-ball';
    if (has9) return '9-ball';
    if (has8) return '8-ball';
    return '8-ball';
}

function dogTagDivisionNameHasMultipleBallTypes(divisionName) {
    const n = String(divisionName || '').toLowerCase();
    const flags = [
        /\b8\s*[- ]?\s*ball\b/.test(n) || /\b8ball\b/.test(n),
        /\b9\s*[- ]?\s*ball\b/.test(n) || /\b9ball\b/.test(n),
        /\b10\s*[- ]?\s*ball\b/.test(n) || /\b10ball\b/.test(n)
    ];
    return flags.filter(Boolean).length >= 2;
}

/** Pull Fargo division id from names like "13862 - 8-ball / 13062 - 10-ball" */
function inferFargoDivisionIdFromDivisionName(divisionName, gameType) {
    const name = String(divisionName || '');
    const gt = dogTagNormalizeGameType(gameType);
    const numericIds = name.match(/\b\d{4,6}\b/g) || [];

    if (gt === '10-ball') {
        const m = name.match(/(\d+)\s*[-–—]?\s*10\s*[- ]?\s*ball/i);
        if (m) return m[1];
        if (numericIds.length >= 3) return numericIds[2];
        if (numericIds.length >= 2) return numericIds[1];
    } else if (gt === '9-ball') {
        const m = name.match(/(\d+)\s*[-–—]?\s*9\s*[- ]?\s*ball/i);
        if (m) return m[1];
        if (numericIds.length >= 2) return numericIds[1];
    } else {
        const m = name.match(/(\d+)\s*[-–—]?\s*8\s*[- ]?\s*ball/i);
        if (m) return m[1];
        if (numericIds.length >= 1) return numericIds[0];
    }
    return '';
}

function dogTagOtherInferredFargoIds(divisionName, gameType) {
    const gt = dogTagNormalizeGameType(gameType);
    return DOG_TAG_GAME_TYPES
        .filter((t) => t !== gt)
        .map((t) => inferFargoDivisionIdFromDivisionName(divisionName, t))
        .filter(Boolean);
}

function dogTagOverviewFargoId(divisionId, gameType) {
    const item = (dogTagOverviewCache?.divisions || []).find((d) => d.divisionId === divisionId);
    if (!item) return '';
    const gt = dogTagNormalizeGameType(gameType);
    if (gt === '10-ball') return item.fargoDivisionId10 || '';
    if (gt === '9-ball') return item.fargoDivisionId9 || '';
    return item.fargoDivisionId || '';
}

/** Pick the Fargo dropdown id for the active tag type (avoid reusing another ball type's id). */
function dogTagResolveFargoDivisionId(divisionName, gameType, savedOrInput, divisionId) {
    const gt = dogTagNormalizeGameType(gameType);
    const inferred = inferFargoDivisionIdFromDivisionName(divisionName, gt);
    const normalized = normalizeFargoDivisionIdInput(savedOrInput);
    const otherInferred = dogTagOtherInferredFargoIds(divisionName, gt);
    const overviewId = divisionId ? dogTagOverviewFargoId(divisionId, gt) : '';

    if (inferred && dogTagDivisionNameHasMultipleBallTypes(divisionName)) {
        return inferred;
    }
    if (normalized && otherInferred.includes(normalized) && inferred) {
        return inferred;
    }
    if (normalized) return normalized;
    if (inferred) return inferred;
    return normalizeFargoDivisionIdInput(overviewId) || overviewId || '';
}

function dogTagUpdateFargoIdHint(divisionName, gameType, resolvedId) {
    const el = document.getElementById('dogTagFargoDivHint');
    if (!el) return;
    const gtLabel = dogTagNormalizeGameType(gameType);
    const inferred = inferFargoDivisionIdFromDivisionName(divisionName, gtLabel);
    if (resolvedId && inferred && resolvedId === inferred) {
        el.textContent = `${gtLabel}: using Fargo division ${resolvedId} from division name.`;
    } else if (resolvedId) {
        el.textContent = `${gtLabel}: Fargo division ${resolvedId}. Change if sync fails.`;
    } else if (gtLabel !== '8-ball') {
        el.textContent = `Enter the ${gtLabel} Fargo Division ID (from Fargo dropdown — not the 8-ball id).`;
    } else {
        el.textContent = 'Fargo division number at the start of the dropdown label.';
    }
}

function dogTagApplyGameTypeTheme(gameType) {
    const modal = document.getElementById('dogTagsModal');
    if (!modal) return;
    const gt = dogTagNormalizeGameType(gameType);
    modal.classList.remove('dog-tags-theme-8ball', 'dog-tags-theme-9ball', 'dog-tags-theme-10ball');
    if (gt === '10-ball') modal.classList.add('dog-tags-theme-10ball');
    else if (gt === '9-ball') modal.classList.add('dog-tags-theme-9ball');
    else modal.classList.add('dog-tags-theme-8ball');
}

function dogTagValidateFargoDivisionForSync(divName, gameType, fargoDivisionId) {
    const gt = dogTagNormalizeGameType(gameType);
    if (!fargoDivisionId && gt !== '8-ball') {
        return `Enter the ${gt} Fargo Division ID (the number from Fargo's dropdown for ${gt}).`;
    }
    const id8 = inferFargoDivisionIdFromDivisionName(divName, '8-ball');
    const idSelf = inferFargoDivisionIdFromDivisionName(divName, gt);
    if (gt !== '8-ball' && id8 && fargoDivisionId === id8 && (!idSelf || idSelf === id8)) {
        return `The Fargo Division ID is still ${id8} (8-ball). For ${gt} stats, enter the ${gt} division number from Fargo's dropdown, then sync again.`;
    }
    return '';
}

function dogTagSettingsPayloadForGameType(gameType) {
    const divisionId = dogTagGetDivisionId();
    const divName = dogTagGetSelectedDivisionName();
    const rawDiv = document.getElementById('dogTagFargoDivisionId')?.value?.trim() || '';
    return {
        gameType,
        fargoLeagueId: document.getElementById('dogTagFargoLeagueId')?.value?.trim() || '',
        fargoDivisionId: dogTagResolveFargoDivisionId(divName, gameType, rawDiv, divisionId),
        fargoReportsUrl: document.getElementById('dogTagFargoUrl')?.value?.trim() || ''
    };
}

function dogTagGetGameType() {
    const sel = document.getElementById('dogTagGameType');
    return dogTagNormalizeGameType(sel?.value);
}

function dogTagGameTypeQuery() {
    return `gameType=${encodeURIComponent(dogTagGetGameType())}`;
}

/** Dog tag reads must bypass browser HTTP cache (304 after sync showed empty tables). */
function dogTagFetchGet(pathWithQuery) {
    const sep = pathWithQuery.includes('?') ? '&' : '?';
    return apiCall(`${pathWithQuery}${sep}_=${Date.now()}`, { cache: 'no-store' });
}

function dogTagEnsurePendingTabVisible() {
    const pane = document.getElementById('dogTagPendingPane');
    const tabBtn = document.querySelector('#dogTagsModal [data-bs-target="#dogTagPendingPane"]');
    if (!pane || !tabBtn || typeof bootstrap === 'undefined') return;
    pane.classList.add('show', 'active');
    document.querySelectorAll('#dogTagsModal .tab-pane').forEach((el) => {
        if (el !== pane) el.classList.remove('show', 'active');
    });
    document.querySelectorAll('#dogTagsModal .nav-tabs .nav-link').forEach((el) => {
        el.classList.toggle('active', el === tabBtn);
    });
}

function dogTagGetLastGameType(divisionId) {
    if (!divisionId) return '8-ball';
    try {
        const v = localStorage.getItem(dogTagStorageKey(`gameType_${divisionId}`));
        return dogTagNormalizeGameType(v);
    } catch (_) {
        return '8-ball';
    }
}

function dogTagSetLastGameType(divisionId, gameType) {
    if (!divisionId) return;
    try {
        localStorage.setItem(dogTagStorageKey(`gameType_${divisionId}`), dogTagNormalizeGameType(gameType));
    } catch (_) {}
}

function dogTagLabel(gameType, tagType) {
    const ball = dogTagAwardTypeLabel(gameType);
    return tagType === 'br' ? `${ball} Break & Run` : `${ball} Win Zip`;
}

/** Display label for award / dog-tag game type (8-ball, 9-ball, 10-ball, …). */
function dogTagAwardTypeLabel(gameType) {
    const gt = String(gameType || '8-ball').toLowerCase().trim();
    if (/\b10\s*[- ]?\s*ball\b/.test(gt) || gt === '10ball') return '10-ball';
    if (/\b9\s*[- ]?\s*ball\b/.test(gt) || gt === '9ball') return '9-ball';
    if (/\b8\s*[- ]?\s*ball\b/.test(gt) || gt === '8ball') return '8-ball';
    const num = gt.match(/\d+/);
    return num ? `${num[0]}-ball` : '8-ball';
}

function dogTagAwardBallShort(gameType) {
    const label = dogTagAwardTypeLabel(gameType);
    const num = label.match(/\d+/);
    return num ? num[0] : '8';
}

function dogTagAwardChipClass(gameType) {
    const label = dogTagAwardTypeLabel(gameType);
    if (label === '10-ball') return 'dog-tag-award-chip--10ball';
    if (label === '9-ball') return 'dog-tag-award-chip--9ball';
    return 'dog-tag-award-chip--8ball';
}

function dogTagSummaryDivisionName(data) {
    if (data?.division?.name) return data.division.name;
    const sel = document.getElementById('dogTagDivisionSelect');
    const opt = sel?.selectedOptions?.[0];
    if (opt?.value && opt.textContent) return opt.textContent.trim();
    return 'Division';
}

function populateDogTagDivisionSelect() {
    const sel = document.getElementById('dogTagDivisionSelect');
    if (!sel) return;
    const prev = sel.value || dogTagGetLastDivisionId();
    sel.innerHTML = '<option value="">Select division…</option>';

    const overviewMap = {};
    (dogTagOverviewCache?.divisions || []).forEach((d) => {
        overviewMap[d.divisionId] = d;
    });

    (divisions || []).forEach((d) => {
        if (d.isArchived === true || d.is_archived === true) return;
        const id = d._id || d.id;
        const ov = overviewMap[id];
        let label = d.name || id;
        if (ov) {
            const parts = [];
            if (ov.pending8Ball > 0) parts.push(`8:${ov.pending8Ball}`);
            if (ov.pending10Ball > 0) parts.push(`10:${ov.pending10Ball}`);
            if (parts.length) label += ` · ${parts.join(' ')} pending`;
            else if (ov.configured && ov.lastSyncedAt) label += ' · synced';
            else if (ov.configured) label += ' · saved';
        }
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = label;
        sel.appendChild(opt);
    });

    if (prev && sel.querySelector(`option[value="${CSS.escape(prev)}"]`)) {
        sel.value = prev;
    }
}

async function loadDogTagOverview() {
    try {
        const response = await apiCall('/dog-tags/overview');
        if (!response.ok) return;
        dogTagOverviewCache = await response.json();
    } catch (e) {
        console.warn('loadDogTagOverview:', e);
    }
}

function dogTagPickInitialDivisionId() {
    const last = dogTagGetLastDivisionId();
    const sel = document.getElementById('dogTagDivisionSelect');
    if (last && sel?.querySelector(`option[value="${CSS.escape(last)}"]`)) {
        return last;
    }
    const items = dogTagOverviewCache?.divisions || [];
    const withPending = items.find((d) => d.pendingTotal > 0);
    if (withPending) return withPending.divisionId;
    const configured = items.find((d) => d.configured);
    if (configured) return configured.divisionId;
    return sel?.options[1]?.value || '';
}

function dogTagRenderQuickNav() {
    const wrap = document.getElementById('dogTagDivisionQuickNav');
    if (!wrap) return;
    const current = dogTagGetDivisionId();
    const items = dogTagOverviewCache?.divisions || [];
    if (!items.length) {
        wrap.innerHTML = '';
        return;
    }
    const buttons = items.map((d) => {
        const active = d.divisionId === current ? ' active' : '';
        const badge = d.pendingTotal > 0
            ? `<span class="badge dog-tag-nav-badge ms-1">${d.pendingTotal}</span>`
            : (d.configured ? '<span class="badge bg-secondary ms-1">saved</span>' : '');
        return `<button type="button" class="btn btn-sm btn-outline-secondary dog-tag-quick-btn${active}" data-dog-div="${dogTagEscapeHtml(d.divisionId)}">${dogTagEscapeHtml(d.divisionName)}${badge}</button>`;
    }).join('');
    wrap.innerHTML = `<div class="dog-tag-quick-nav-inner">
        <span class="dog-tag-quick-nav-label"><i class="fas fa-bolt me-1"></i>Quick jump</span>
        <div class="dog-tag-quick-nav-btns">${buttons}</div>
    </div>`;

    wrap.querySelectorAll('[data-dog-div]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-dog-div');
            const sel = document.getElementById('dogTagDivisionSelect');
            if (sel && id) {
                sel.value = id;
                dogTagSetLastDivisionId(id);
                await loadDogTagDivisionData();
            }
        });
    });
}

async function showDogTagsModal() {
    await loadDogTagOverview();
    populateDogTagDivisionSelect();

    const sel = document.getElementById('dogTagDivisionSelect');
    const initial = dogTagPickInitialDivisionId();
    if (sel && initial) {
        sel.value = initial;
        dogTagSetLastDivisionId(initial);
    }

    dogTagRenderQuickNav();

    const modalEl = document.getElementById('dogTagsModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;
    modalEl.classList.remove('dog-tags-focus-players');
    const focusBtn = document.getElementById('dogTagFocusPlayersBtn');
    if (focusBtn) {
        focusBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
        focusBtn.title = 'Maximize player list';
    }
    dogTagApplyGameTypeTheme(dogTagGetGameType());
    bootstrap.Modal.getOrCreateInstance(modalEl).show();

    if (sel?.value) {
        await loadDogTagDivisionData();
    } else {
        dogTagClearResults();
    }
}

function dogTagSetSyncEnabled(enabled) {
    const btn = document.getElementById('dogTagSyncBtn');
    if (btn) btn.disabled = !enabled;
}

/** Clear player tables and Fargo division fields when switching divisions (avoids syncing wrong Fargo id). */
function dogTagPrepareDivisionSwitch() {
    dogTagDivisionLoadToken += 1;
    window.__dogTagDivisionLoading = true;
    window.__dogTagCurrentData = null;
    window.dogTagActiveDivisionId = null;
    dogTagSetSyncEnabled(false);

    const fargoDiv = document.getElementById('dogTagFargoDivisionId');
    const fargoUrl = document.getElementById('dogTagFargoUrl');
    if (fargoDiv) fargoDiv.value = '';
    if (fargoUrl) fargoUrl.value = '';
    dogTagUpdateFargoIdHint(dogTagGetSelectedDivisionName(), dogTagGetGameType(), '');

    const lastSync = document.getElementById('dogTagLastSync');
    if (lastSync) lastSync.textContent = 'Loading division…';

    dogTagClearResults('Loading division…');
}

function dogTagClearResults(loadingMessage) {
    const summary = document.getElementById('dogTagSummary');
    const pendingWrap = document.getElementById('dogTagPendingWrap');
    const allWrap = document.getElementById('dogTagAllWrap');
    const historyWrap = document.getElementById('dogTagHistoryWrap');
    const msg = loadingMessage || 'Select a division to view player stats.';
    if (summary) {
        summary.innerHTML = loadingMessage && loadingMessage !== 'Select a division to view player stats.'
            ? `<p class="dog-tags-loading-hint mb-0"><i class="fas fa-spinner fa-spin me-1"></i>${dogTagEscapeHtml(msg)}</p>`
            : dogTagEmptyState('fa-chart-bar', 'Player Stats', msg);
    }
    if (pendingWrap) pendingWrap.innerHTML = '';
    if (allWrap) allWrap.innerHTML = '';
    if (historyWrap) historyWrap.innerHTML = '';
}

function dogTagGetDivisionId() {
    return document.getElementById('dogTagDivisionSelect')?.value || '';
}

function dogTagGetSelectedDivisionName() {
    const id = dogTagGetDivisionId();
    const d = (divisions || []).find((x) => (x._id || x.id) === id);
    return d ? d.name : '';
}

async function loadDogTagDivisionData() {
    const divisionId = dogTagGetDivisionId();
    if (!divisionId) {
        window.__dogTagDivisionLoading = false;
        dogTagSetSyncEnabled(false);
        dogTagClearResults();
        return;
    }

    const gameTypeSel = document.getElementById('dogTagGameType');
    if (gameTypeSel && !window.__dogTagSwitchingGameType) {
        gameTypeSel.value = dogTagGetLastGameType(divisionId);
    }

    dogTagPrepareDivisionSwitch();
    const loadToken = dogTagDivisionLoadToken;

    const statusEl = document.getElementById('dogTagStatus');
    if (statusEl) statusEl.textContent = 'Loading…';

    try {
        const response = await dogTagFetchGet(
            `/dog-tags/divisions/${encodeURIComponent(divisionId)}?${dogTagGameTypeQuery()}`
        );
        if (loadToken !== dogTagDivisionLoadToken) return;

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to load player stats');
        }
        const data = await response.json();
        if (loadToken !== dogTagDivisionLoadToken) return;

        await dogTagApplyDivisionData(data);
        window.__dogTagDivisionLoading = false;
        dogTagSetSyncEnabled(true);
        if (statusEl) statusEl.textContent = '';
    } catch (e) {
        if (loadToken !== dogTagDivisionLoadToken) return;
        console.error('loadDogTagDivisionData:', e);
        window.__dogTagDivisionLoading = false;
        dogTagSetSyncEnabled(true);
        if (statusEl) statusEl.textContent = '';
        window.__dogTagSwitchingGameType = false;
        showAlertModal(e.message || 'Failed to load player stats', 'error', PLAYER_STATS_UI_NAME);
    }
}

async function dogTagApplyDivisionData(data) {
    const divisionId = dogTagGetDivisionId();
    if (!divisionId || !data) return;

    dogTagResetSortState();

    const gameTypeSel = document.getElementById('dogTagGameType');
    if (gameTypeSel && data.settings?.gameType) {
        gameTypeSel.value = data.settings.gameType;
    }
    window.dogTagActiveGameType = dogTagGetGameType();
    dogTagSetLastGameType(divisionId, window.dogTagActiveGameType);
    dogTagApplyGameTypeTheme(window.dogTagActiveGameType);

    const fargoLeague = document.getElementById('dogTagFargoLeagueId');
    const fargoDiv = document.getElementById('dogTagFargoDivisionId');
    const fargoUrl = document.getElementById('dogTagFargoUrl');
    if (fargoLeague) fargoLeague.value = data.settings?.fargoLeagueId || '';
    const divName = data.division?.name || dogTagGetSelectedDivisionName();
    const gt = dogTagGetGameType();
    if (fargoDiv) {
        fargoDiv.value = dogTagResolveFargoDivisionId(
            divName,
            gt,
            data.settings?.fargoDivisionId || '',
            divisionId
        );
        dogTagUpdateFargoIdHint(divName, gt, fargoDiv.value.trim());
    }
    if (fargoUrl) fargoUrl.value = data.settings?.fargoReportsUrl || '';

    const lastSync = document.getElementById('dogTagLastSync');
    if (lastSync) {
        const gt = dogTagGetGameType();
        const parts = [`${gt} stats`];
        if (data.settings?.configured) parts.push('settings saved');
        if (data.settings?.lastSyncedAt) {
            parts.push('Last synced: ' + new Date(data.settings.lastSyncedAt).toLocaleString());
        } else if (data.settings?.configured) {
            parts.push('not synced yet');
        } else {
            parts.push('set Fargo Division ID and sync');
        }
        const syncBit = data.settings?.lastSyncedAt
            ? `<i class="fas fa-check-circle text-success me-1"></i>Synced ${dogTagEscapeHtml(new Date(data.settings.lastSyncedAt).toLocaleString())}`
            : (data.settings?.configured
                ? '<i class="fas fa-exclamation-circle text-warning me-1"></i>Settings saved — sync when ready'
                : '<i class="fas fa-link me-1"></i>Connect Fargo in setup, then sync');
        lastSync.innerHTML = `<span class="dog-tags-status-pill">${syncBit}</span><span class="dog-tags-status-pill text-muted">${dogTagEscapeHtml(gt)}</span>`;
    }

    dogTagSetLastDivisionId(divisionId);
    window.dogTagActiveDivisionId = divisionId;
    dogTagRenderQuickNav();

    window.__dogTagCurrentData = data;
    dogTagRenderSummary(data);
    dogTagUpdateTabCounts(data);
    dogTagRenderPendingTable(data);
    dogTagRenderAllTable(data);
    dogTagEnsurePendingTabVisible();
    await loadDogTagHistory(divisionId);
    window.__dogTagSwitchingGameType = false;
}

function dogTagRenderSummary(data) {
    const el = document.getElementById('dogTagSummary');
    if (!el) return;
    const gt = data.settings?.gameType || dogTagGetGameType();
    const awardType = dogTagAwardTypeLabel(gt);
    const awardBall = dogTagAwardBallShort(gt);
    const divisionName = dogTagSummaryDivisionName(data);
    const pendingBr = data.totals?.pendingBr ?? (data.players || []).reduce((s, p) => s + (p.pendingBr || 0), 0);
    const pendingWz = data.totals?.pendingWz ?? (data.players || []).reduce((s, p) => s + (p.pendingWz || 0), 0);
    const pendingOnly = data.pendingOnly || (data.players || []).filter((p) => p.pendingBr > 0 || p.pendingWz > 0);
    const pendingPlayers = pendingOnly.length;
    const totalTags = pendingBr + pendingWz;
    const allPlayers = (data.players || []).length;
    const pendingClass = totalTags > 0 ? ' dog-tag-mini-stat--pending' : '';
    el.innerHTML = `
        <div class="dog-tag-dashboard">
            <div class="dog-tag-stat-cards">
                <div class="dog-tag-mini-stat${pendingClass}">
                    <span class="dog-tag-mini-stat-value">${totalTags}</span>
                    <span class="dog-tag-mini-stat-label">Pending</span>
                    <span class="dog-tag-mini-stat-sub">${dogTagEscapeHtml(awardType)}</span>
                </div>
                <div class="dog-tag-mini-stat dog-tag-mini-stat--br${pendingBr > 0 ? ' dog-tag-mini-stat--due' : ''}">
                    <span class="dog-tag-mini-stat-value">${pendingBr}</span>
                    <span class="dog-tag-mini-stat-label">BR due</span>
                    <span class="dog-tag-mini-stat-sub">${dogTagEscapeHtml(awardBall)}-ball</span>
                </div>
                <div class="dog-tag-mini-stat dog-tag-mini-stat--wz${pendingWz > 0 ? ' dog-tag-mini-stat--due' : ''}">
                    <span class="dog-tag-mini-stat-value">${pendingWz}</span>
                    <span class="dog-tag-mini-stat-label">WZ due</span>
                    <span class="dog-tag-mini-stat-sub">${dogTagEscapeHtml(awardBall)}-ball</span>
                </div>
                <div class="dog-tag-mini-stat">
                    <span class="dog-tag-mini-stat-value">${pendingPlayers}<span class="dog-tag-mini-stat-of">/${allPlayers}</span></span>
                    <span class="dog-tag-mini-stat-label">Players w/ due</span>
                    <span class="dog-tag-mini-stat-sub">${dogTagEscapeHtml(awardType)}</span>
                </div>
            </div>
            <div class="dog-tag-context-card" title="${dogTagEscapeHtml(divisionName)} — ${dogTagEscapeHtml(awardType)} break &amp; run / win zip">
                <span class="dog-tag-context-eyebrow">Division &amp; award type</span>
                <span class="dog-tag-context-division">${dogTagEscapeHtml(divisionName)}</span>
                <span class="dog-tag-award-chip ${dogTagAwardChipClass(gt)}" title="${dogTagEscapeHtml(awardType)} dog tags">${dogTagEscapeHtml(awardBall)}-ball</span>
            </div>
            <div class="dog-tag-export-actions">
                <button type="button" class="btn btn-outline-secondary btn-sm dog-tag-export-btn" onclick="exportDogTagsPendingCsv()"${pendingPlayers ? '' : ' disabled'} title="Download spreadsheet (CSV)">
                    <i class="fas fa-file-csv me-1"></i>CSV
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm dog-tag-export-btn" onclick="exportDogTagsPendingPdf()"${pendingPlayers ? '' : ' disabled'} title="Download printable PDF — checkboxes to mark issued">
                    <i class="fas fa-file-pdf me-1"></i>Print PDF
                </button>
            </div>
        </div>`;
    dogTagUpdateFargoSetupCollapse(data);
}

function dogTagUpdateFargoSetupCollapse(data) {
    const collapseEl = document.getElementById('dogTagFargoSettingsCollapse');
    const toggleBtn = document.getElementById('dogTagFargoToggleBtn');
    if (!collapseEl || typeof bootstrap === 'undefined') return;
    const configured = !!(data?.settings?.configured || data?.settings?.lastSyncedAt);
    const instance = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
    if (configured) {
        instance.hide();
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
        instance.show();
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    }
}

function dogTagUpdateTabCounts(data) {
    const pending = (data.pendingOnly || (data.players || []).filter((p) => p.pendingBr > 0 || p.pendingWz > 0)).length;
    const all = (data.players || []).length;
    const pendingTab = document.querySelector('#dogTagsModal [data-bs-target="#dogTagPendingPane"]');
    const allTab = document.querySelector('#dogTagsModal [data-bs-target="#dogTagAllPane"]');
    dogTagSetTabLabel(pendingTab, 'fa-hourglass-half', 'Pending', pending);
    dogTagSetTabLabel(allTab, 'fa-users', 'All players', all);
}

function dogTagBindFocusPlayersBtn() {
    const btn = document.getElementById('dogTagFocusPlayersBtn');
    const modal = document.getElementById('dogTagsModal');
    if (!btn || !modal || btn.dataset.dogFocusBound === '1') return;
    btn.dataset.dogFocusBound = '1';
    btn.addEventListener('click', () => {
        modal.classList.toggle('dog-tags-focus-players');
        const focused = modal.classList.contains('dog-tags-focus-players');
        btn.innerHTML = focused
            ? '<i class="fas fa-compress-alt"></i>'
            : '<i class="fas fa-expand-alt"></i>';
        btn.title = focused ? 'Show setup' : 'Maximize player list';
    });
}

function dogTagRenderIssueControl(p, gameType, tagType) {
    const pending = tagType === 'br' ? (p.pendingBr || 0) : (p.pendingWz || 0);
    if (pending <= 0) return '<span class="text-muted small">—</span>';

    const short = tagType === 'br' ? 'BR' : 'WZ';
    const key = dogTagEscapeHtml(p.playerNameKey);
    const label = dogTagLabel(gameType, tagType);

    const typeCls = tagType === 'br' ? 'dog-tag-issue-type--br' : 'dog-tag-issue-type--wz';
    return `<div class="dog-tag-issue-block">
        <span class="dog-tag-issue-type ${typeCls}" title="${dogTagEscapeHtml(label)}">${short}</span>
        <span class="dog-tag-issue-cell">
        <span class="dog-tag-issue-stepper">
            <input type="number" class="form-control form-control-sm dog-tag-issue-qty" min="1" max="${pending}" value="1"
                aria-label="${short} quantity to issue" title="How many ${label} to issue (max ${pending})"
                data-dog-issue-qty="${short}" data-dog-key="${key}">
            <span class="dog-tag-issue-arrows" role="group" aria-label="Adjust ${short} quantity">
                <button type="button" class="dog-tag-issue-step" data-dog-step="up" tabindex="-1"
                    aria-label="Increase ${short} quantity" title="Increase quantity">
                    <i class="fas fa-chevron-up" aria-hidden="true"></i>
                </button>
                <button type="button" class="dog-tag-issue-step" data-dog-step="down" tabindex="-1"
                    aria-label="Decrease ${short} quantity" title="Decrease quantity">
                    <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </button>
            </span>
        </span>
        <button type="button" class="btn btn-sm btn-success dog-tag-issue-btn" data-dog-issue="${tagType}" data-dog-key="${key}"
            title="Mark selected ${label} as issued"><i class="fas fa-check me-1"></i>Issue</button>
    </span></div>`;
}

function dogTagClampIssueQty(input) {
    if (!input) return 1;
    const min = Math.max(1, parseInt(input.getAttribute('min'), 10) || 1);
    const max = Math.max(min, parseInt(input.getAttribute('max'), 10) || min);
    let qty = parseInt(input.value, 10);
    if (!Number.isFinite(qty)) qty = min;
    qty = Math.min(Math.max(min, qty), max);
    input.value = String(qty);
    return qty;
}

function dogTagSetIssueCellDisabled(cell, disabled) {
    if (!cell) return;
    cell.querySelectorAll('.dog-tag-issue-qty, .dog-tag-issue-step, [data-dog-issue]').forEach((el) => {
        el.disabled = disabled;
    });
}

function dogTagHandleIssueStepClick(stepBtn) {
    const cell = stepBtn.closest('.dog-tag-issue-cell');
    const input = cell?.querySelector('.dog-tag-issue-qty');
    if (!input || input.disabled) return;
    const step = stepBtn.getAttribute('data-dog-step');
    const min = Math.max(1, parseInt(input.getAttribute('min'), 10) || 1);
    const max = Math.max(min, parseInt(input.getAttribute('max'), 10) || min);
    let qty = parseInt(input.value, 10) || min;
    if (step === 'up') qty = Math.min(max, qty + 1);
    else qty = Math.max(min, qty - 1);
    input.value = String(qty);
}

function dogTagReadIssueQuantity(btn, tagType, playerNameKey) {
    const cell = btn.closest('.dog-tag-issue-cell');
    const input = cell?.querySelector(`input[data-dog-issue-qty][data-dog-key="${CSS.escape(playerNameKey)}"]`)
        || cell?.querySelector('.dog-tag-issue-qty');
    return dogTagClampIssueQty(input);
}

function dogTagRenderPlayerRow(p, gameType, showAll) {
    const brBtn = dogTagRenderIssueControl(p, gameType, 'br');
    const wzBtn = dogTagRenderIssueControl(p, gameType, 'wz');
    const pendingClass = (p.pendingBr > 0 || p.pendingWz > 0) ? 'dog-tag-row-pending' : '';

    if (!showAll && p.pendingBr === 0 && p.pendingWz === 0) return '';

    return `<tr class="${pendingClass}">
        <td class="dog-tag-player-col"><span class="dog-tag-player-name">${dogTagEscapeHtml(p.playerName)}</span></td>
        <td class="text-center">${p.fargoBr}</td>
        <td class="text-center">${p.issuedBr}</td>
        <td class="text-center dog-tag-owe-col dog-tag-owe-br${p.pendingBr > 0 ? ' dog-tag-owe-due' : ''}">${p.pendingBr}</td>
        <td class="text-center">${p.fargoWz}</td>
        <td class="text-center">${p.issuedWz}</td>
        <td class="text-center dog-tag-owe-col dog-tag-owe-wz${p.pendingWz > 0 ? ' dog-tag-owe-due' : ''}">${p.pendingWz}</td>
        <td class="dog-tag-actions-col">${brBtn}${wzBtn}</td>
    </tr>`;
}

function dogTagTableHead(tableKind) {
    const state = dogTagSortState[tableKind] || dogTagSortState.all;

    const ths = dogTagSortColumns.map((col) => {
        const active = state.key === col.key;
        const icon = active ? (state.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort';
        const align = col.center ? 'text-center' : '';
        const oweCls = col.owe ? ` dog-tag-owe-col dog-tag-owe-${col.owe}` : '';
        return `<th class="dog-tag-sortable sortable-column ${align}${oweCls}${active ? ' dog-tag-sort-active' : ''}" data-dog-sort="${col.key}" data-dog-table="${tableKind}" title="Sort by ${col.label}">
            ${col.label} <i class="fas ${icon} sort-icon ms-1"></i>
        </th>`;
    }).join('');

    return `<thead><tr>${ths}<th class="dog-tag-actions-head">Issue</th></tr></thead>`;
}

function dogTagRenderPendingTable(data) {
    const wrap = document.getElementById('dogTagPendingWrap');
    if (!wrap) return;
    const gt = data.settings?.gameType || dogTagGetGameType();
    const pending = data.pendingOnly || (data.players || []).filter((p) => p.pendingBr > 0 || p.pendingWz > 0);
    const sorted = dogTagSortPlayers(pending, 'pending');
    const rows = sorted
        .map((p) => dogTagRenderPlayerRow(p, gt, true))
        .filter(Boolean)
        .join('');
    if (!rows) {
        wrap.innerHTML = dogTagEmptyState(
            'fa-check-circle',
            'All caught up!',
            'No break & runs or win zips waiting to issue. Sync from Fargo if you expected someone here.'
        );
        return;
    }
    wrap.innerHTML = `<div class="dog-tag-table-wrap table-responsive"><table class="table table-sm table-hover dog-tag-table">${dogTagTableHead('pending')}<tbody>${rows}</tbody></table></div>`;
}

function dogTagRenderAllTable(data) {
    const wrap = document.getElementById('dogTagAllWrap');
    if (!wrap) return;
    const gt = data.settings?.gameType || dogTagGetGameType();
    const sorted = dogTagSortPlayers(data.players || [], 'all');
    const rows = sorted
        .map((p) => dogTagRenderPlayerRow(p, gt, true))
        .join('');
    if (!rows) {
        wrap.innerHTML = dogTagEmptyState(
            'fa-users',
            'No players yet',
            'Choose a division and click Sync from Fargo to load the roster and BR/WZ stats.'
        );
        return;
    }
    wrap.innerHTML = `<div class="dog-tag-table-wrap table-responsive"><table class="table table-sm table-hover dog-tag-table">${dogTagTableHead('all')}<tbody>${rows}</tbody></table></div>`;
}

function dogTagBindModalTableEvents() {
    const modal = document.getElementById('dogTagsModal');
    if (!modal || modal.dataset.dogTableBound === '1') return;
    modal.dataset.dogTableBound = '1';
    modal.addEventListener('click', (ev) => {
        const sortTh = ev.target.closest('[data-dog-sort]');
        if (sortTh) {
            ev.preventDefault();
            dogTagHandleSortClick(sortTh);
            return;
        }
        const stepBtn = ev.target.closest('[data-dog-step]');
        if (stepBtn) {
            ev.preventDefault();
            dogTagHandleIssueStepClick(stepBtn);
            return;
        }
        const historyEditBtn = ev.target.closest('[data-dog-history-edit]');
        if (historyEditBtn) {
            ev.preventDefault();
            const id = historyEditBtn.getAttribute('data-dog-history-edit');
            const record = (window.__dogTagHistoryCache || []).find((h) => h.id === id);
            if (record) dogTagOpenHistoryEditModal(record);
            return;
        }
        const historyDeleteBtn = ev.target.closest('[data-dog-history-delete]');
        if (historyDeleteBtn) {
            ev.preventDefault();
            dogTagHandleHistoryDelete(
                historyDeleteBtn.getAttribute('data-dog-history-delete'),
                historyDeleteBtn.getAttribute('data-dog-history-player')
            );
            return;
        }
        const btn = ev.target.closest('[data-dog-issue]');
        if (btn) dogTagHandleIssueClick(ev, btn);
    });
}

async function dogTagHandleIssueClick(ev, btnEl) {
    const btn = btnEl || ev.target.closest('[data-dog-issue]');
    if (!btn) return;
    const divisionId = dogTagGetDivisionId();
    if (!divisionId) return;

    const tagType = btn.getAttribute('data-dog-issue');
    const playerNameKey = btn.getAttribute('data-dog-key');
    const qty = dogTagReadIssueQuantity(btn, tagType, playerNameKey);

    const issueCell = btn.closest('.dog-tag-issue-cell');
    dogTagSetIssueCellDisabled(issueCell, true);
    try {
        const response = await apiCall(`/dog-tags/divisions/${encodeURIComponent(divisionId)}/issue`, {
            method: 'POST',
            body: JSON.stringify({
                playerNameKey,
                tagType,
                quantity: qty,
                gameType: dogTagGetGameType()
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to issue tag');
        }
        await loadDogTagDivisionData();
    } catch (e) {
        showAlertModal(e.message || 'Could not record issuance', 'error', PLAYER_STATS_UI_NAME);
    } finally {
        dogTagSetIssueCellDisabled(btn.closest('.dog-tag-issue-cell'), false);
    }
}

async function saveDogTagSettings() {
    const ok = await dogTagSaveCurrentDivisionSettings(false);
    if (ok) showAlertModal('Player stats settings saved for this division', 'success', 'Saved');
}

function dogTagCollectSettingsPayload() {
    return dogTagSettingsPayloadForGameType(dogTagGetGameType());
}

function dogTagScheduleAutoSave() {
    if (!dogTagGetDivisionId() || dogTagGetDivisionId() !== window.dogTagActiveDivisionId) return;
    clearTimeout(dogTagSaveTimer);
    dogTagSaveTimer = setTimeout(() => {
        dogTagSaveCurrentDivisionSettings(true);
    }, 900);
}

async function dogTagSaveCurrentDivisionSettings(silent) {
    const divisionId = dogTagGetDivisionId();
    if (!divisionId) return false;

    const payload = dogTagCollectSettingsPayload();
    const fargoDivInput = document.getElementById('dogTagFargoDivisionId');
    if (fargoDivInput && payload.fargoDivisionId && fargoDivInput.value.trim() !== payload.fargoDivisionId) {
        fargoDivInput.value = payload.fargoDivisionId;
    }

    try {
        const response = await apiCall(`/dog-tags/divisions/${encodeURIComponent(divisionId)}/settings`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to save settings');
        }
        if (silent) dogTagShowSaveHint('Saved');
        await loadDogTagOverview();
        populateDogTagDivisionSelect();
        const sel = document.getElementById('dogTagDivisionSelect');
        if (sel) sel.value = divisionId;
        dogTagRenderQuickNav();
        return true;
    } catch (e) {
        if (silent) dogTagShowSaveHint('Save failed', true);
        else showAlertModal(e.message, 'error', PLAYER_STATS_UI_NAME);
        return false;
    }
}

function dogTagParseFargoUrl(url) {
    try {
        const params = new URLSearchParams(new URL(url.trim()).search);
        return {
            leagueId: params.get('leagueId') || '',
            divisionId: params.get('divisionId') || ''
        };
    } catch (_) {
        return { leagueId: '', divisionId: '' };
    }
}

/** "18062 - Weds 10 Ball" → "18062" for Fargo dropdown matching */
function normalizeFargoDivisionIdInput(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const lead = s.match(/^(\d+)/);
    return lead ? lead[1] : s;
}

async function syncDogTagsFromFargo() {
    const divisionId = dogTagGetDivisionId();
    if (!divisionId) {
        showAlertModal('Select a division first', 'warning', PLAYER_STATS_UI_NAME);
        return;
    }

    if (window.__dogTagDivisionLoading) {
        showAlertModal('Still loading this division — wait a moment, then sync again.', 'warning', PLAYER_STATS_UI_NAME);
        return;
    }
    if (window.dogTagActiveDivisionId && window.dogTagActiveDivisionId !== divisionId) {
        showAlertModal('Division just changed — wait for the player list to load before syncing.', 'warning', PLAYER_STATS_UI_NAME);
        return;
    }

    const divName = dogTagGetSelectedDivisionName();
    const gameType = dogTagGetGameType();
    let leagueId = document.getElementById('dogTagFargoLeagueId')?.value?.trim() || '';
    let fargoDivisionId = document.getElementById('dogTagFargoDivisionId')?.value?.trim() || '';
    const urlPaste = document.getElementById('dogTagFargoUrl')?.value?.trim() || '';

    if (urlPaste) {
        const parsed = dogTagParseFargoUrl(urlPaste);
        // URL divisionId is often stale (Fargo dropdown does not update URL) — manual ID wins
        if (!leagueId && parsed.leagueId) leagueId = parsed.leagueId;
        if (!fargoDivisionId && parsed.divisionId) fargoDivisionId = parsed.divisionId;
        if (document.getElementById('dogTagFargoLeagueId')) {
            document.getElementById('dogTagFargoLeagueId').value = leagueId;
        }
        if (document.getElementById('dogTagFargoDivisionId') && !document.getElementById('dogTagFargoDivisionId').value.trim()) {
            document.getElementById('dogTagFargoDivisionId').value = fargoDivisionId;
        }
    }

    if (!leagueId || !fargoDivisionId) {
        showAlertModal('Enter Fargo League ID and Division ID, or paste the full Fargo Reports URL', 'warning', PLAYER_STATS_UI_NAME);
        return;
    }

    fargoDivisionId = dogTagResolveFargoDivisionId(divName, gameType, fargoDivisionId, divisionId);
    const fargoDivInput = document.getElementById('dogTagFargoDivisionId');
    if (fargoDivInput) {
        fargoDivInput.value = fargoDivisionId;
        dogTagUpdateFargoIdHint(divName, gameType, fargoDivisionId);
    }

    const fargoIdWarning = dogTagValidateFargoDivisionForSync(divName, gameType, fargoDivisionId);
    if (fargoIdWarning) {
        showAlertModal(fargoIdWarning, 'warning', PLAYER_STATS_UI_NAME);
        return;
    }

    const fargoDivisionIdNormalized = normalizeFargoDivisionIdInput(fargoDivisionId) || fargoDivisionId;

    const btn = document.getElementById('dogTagSyncBtn');
    const statusEl = document.getElementById('dogTagStatus');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Fetching BR/WZ from Fargo LMS…';

    try {
        await saveDogTagSettingsSilent();

        const fargoRes = await fetch(`${API_BASE_URL}/fargo-scraper/player-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId, divisionId: fargoDivisionIdNormalized || fargoDivisionId })
        });
        const fargoData = await fargoRes.json();
        if (!fargoRes.ok || !fargoData.players?.length) {
            throw new Error(fargoData.message || 'No player stats returned from Fargo');
        }

        if (statusEl) statusEl.textContent = 'Saving stats…';

        const settingsPayload = dogTagSettingsPayloadForGameType(gameType);
        const syncRes = await apiCall(`/dog-tags/divisions/${encodeURIComponent(divisionId)}/sync`, {
            method: 'POST',
            body: JSON.stringify({
                players: fargoData.players,
                fargoLeagueId: leagueId,
                fargoDivisionId: fargoDivisionIdNormalized || fargoDivisionId,
                fargoReportsUrl: settingsPayload.fargoReportsUrl,
                gameType
            })
        });
        const syncData = await syncRes.json();
        if (!syncRes.ok) {
            throw new Error(syncData.message || 'Failed to save sync');
        }

        if (statusEl) statusEl.textContent = `Synced ${syncData.synced} players`;
        await loadDogTagOverview();
        await dogTagApplyDivisionData({
            division: { id: divisionId, name: dogTagGetSelectedDivisionName() },
            settings: {
                ...settingsPayload,
                gameType,
                configured: true,
                lastSyncedAt: new Date().toISOString()
            },
            players: syncData.players || [],
            pendingOnly: syncData.pendingOnly || (syncData.players || []).filter((p) => p.pendingBr > 0 || p.pendingWz > 0),
            totals: syncData.totals || {}
        });
        populateDogTagDivisionSelect();
        const sel = document.getElementById('dogTagDivisionSelect');
        if (sel) sel.value = divisionId;
        showAlertModal(
            `Synced ${syncData.synced} players. ${syncData.totals?.pendingBr || 0} BR and ${syncData.totals?.pendingWz || 0} WZ pending to issue.`,
            'success',
            'Fargo Sync'
        );
    } catch (e) {
        console.error('syncDogTagsFromFargo:', e);
        if (statusEl) statusEl.textContent = '';
        showAlertModal(e.message || 'Fargo sync failed', 'error', PLAYER_STATS_UI_NAME);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function saveDogTagSettingsSilent() {
    return dogTagSaveCurrentDivisionSettings(true);
}

function dogTagEnsureHistoryEditModal() {
    let el = document.getElementById('dogTagHistoryEditModal');
    if (el) return el;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div class="modal fade" id="dogTagHistoryEditModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
            <div class="modal-header py-2">
                <h5 class="modal-title small"><i class="fas fa-edit me-2"></i>Edit issuance</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-2">
                <p class="small mb-2 text-muted" id="dogTagHistoryEditSummary"></p>
                <div class="mb-2">
                    <label class="form-label small mb-1" for="dogTagHistoryEditQty">Quantity issued</label>
                    <input type="number" class="form-control form-control-sm" id="dogTagHistoryEditQty" min="1" value="1">
                </div>
                <div class="mb-0">
                    <label class="form-label small mb-1" for="dogTagHistoryEditNotes">Notes <span class="text-muted">(optional)</span></label>
                    <input type="text" class="form-control form-control-sm" id="dogTagHistoryEditNotes" maxlength="200" placeholder="e.g. handed out at league">
                </div>
            </div>
            <div class="modal-footer py-2">
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning btn-sm" id="dogTagHistoryEditSaveBtn">Save changes</button>
            </div>
        </div>
    </div>
</div>`;
    el = wrap.firstElementChild;
    document.body.appendChild(el);

    document.getElementById('dogTagHistoryEditSaveBtn')?.addEventListener('click', () => {
        dogTagSaveHistoryEdit();
    });

    return el;
}

function dogTagOpenHistoryEditModal(record) {
    if (!record?.id) return;
    dogTagEnsureHistoryEditModal();
    window.__dogTagHistoryEditId = record.id;

    const summary = document.getElementById('dogTagHistoryEditSummary');
    const qtyEl = document.getElementById('dogTagHistoryEditQty');
    const notesEl = document.getElementById('dogTagHistoryEditNotes');
    if (summary) {
        summary.textContent = `${record.playerName} · ${record.label} · ${new Date(record.issuedAt).toLocaleString()}`;
    }
    if (qtyEl) qtyEl.value = String(Math.max(1, record.quantity || 1));
    if (notesEl) notesEl.value = record.notes || '';

    const modalEl = document.getElementById('dogTagHistoryEditModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

async function dogTagSaveHistoryEdit() {
    const issuanceId = window.__dogTagHistoryEditId;
    const divisionId = dogTagGetDivisionId();
    if (!issuanceId || !divisionId) return;

    const qtyEl = document.getElementById('dogTagHistoryEditQty');
    const notesEl = document.getElementById('dogTagHistoryEditNotes');
    const quantity = Math.max(1, parseInt(qtyEl?.value, 10) || 1);
    const notes = notesEl?.value?.trim() || '';

    const saveBtn = document.getElementById('dogTagHistoryEditSaveBtn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const response = await apiCall(
            `/dog-tags/divisions/${encodeURIComponent(divisionId)}/history/${encodeURIComponent(issuanceId)}`,
            {
                method: 'PUT',
                body: JSON.stringify({
                    quantity,
                    notes,
                    gameType: dogTagGetGameType()
                })
            }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update record');

        const modalEl = document.getElementById('dogTagHistoryEditModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        }
        await dogTagReloadPlayersAfterHistoryChange();
        showAlertModal('Issuance record updated', 'success', PLAYER_STATS_UI_NAME);
    } catch (e) {
        showAlertModal(e.message || 'Could not update record', 'error', PLAYER_STATS_UI_NAME);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function dogTagHandleHistoryDelete(issuanceId, playerName) {
    const divisionId = dogTagGetDivisionId();
    if (!issuanceId || !divisionId) return;

    const label = playerName ? ` for ${playerName}` : '';
    if (!window.confirm(`Remove this issuance record${label}? Issued counts will be recalculated.`)) {
        return;
    }

    try {
        const response = await apiCall(
            `/dog-tags/divisions/${encodeURIComponent(divisionId)}/history/${encodeURIComponent(issuanceId)}?${dogTagGameTypeQuery()}`,
            { method: 'DELETE' }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to delete record');

        await dogTagReloadPlayersAfterHistoryChange();
        showAlertModal('Issuance record removed', 'success', PLAYER_STATS_UI_NAME);
    } catch (e) {
        showAlertModal(e.message || 'Could not delete record', 'error', PLAYER_STATS_UI_NAME);
    }
}

async function dogTagReloadPlayersAfterHistoryChange() {
    const divisionId = dogTagGetDivisionId();
    if (!divisionId) return;

    try {
        const response = await dogTagFetchGet(
            `/dog-tags/divisions/${encodeURIComponent(divisionId)}?${dogTagGameTypeQuery()}`
        );
        if (!response.ok) return;
        const data = await response.json();
        window.__dogTagCurrentData = data;
        dogTagRenderSummary(data);
        dogTagUpdateTabCounts(data);
        dogTagRenderPendingTable(data);
        dogTagRenderAllTable(data);
        await loadDogTagOverview();
        populateDogTagDivisionSelect();
        const sel = document.getElementById('dogTagDivisionSelect');
        if (sel) sel.value = divisionId;
        dogTagRenderQuickNav();
        await loadDogTagHistory(divisionId);
    } catch (e) {
        console.warn('dogTagReloadPlayersAfterHistoryChange:', e);
    }
}

async function loadDogTagHistory(divisionId) {
    const wrap = document.getElementById('dogTagHistoryWrap');
    if (!wrap) return;
    try {
        const response = await dogTagFetchGet(
            `/dog-tags/divisions/${encodeURIComponent(divisionId)}/history?limit=50&${dogTagGameTypeQuery()}`
        );
        if (!response.ok) {
            wrap.innerHTML = '<p class="text-muted small">Could not load history</p>';
            return;
        }
        const data = await response.json();
        window.__dogTagHistoryCache = data.history || [];
        const rows = window.__dogTagHistoryCache.map((h) => `
            <tr>
                <td>${dogTagEscapeHtml(new Date(h.issuedAt).toLocaleString())}</td>
                <td>${dogTagEscapeHtml(h.playerName)}</td>
                <td>${dogTagEscapeHtml(h.label)}</td>
                <td class="text-center">${h.quantity}</td>
                <td class="small text-muted">${dogTagEscapeHtml(h.notes || h.issuedBy || '')}</td>
                <td class="text-nowrap dog-tag-history-actions">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-dog-history-edit="${dogTagEscapeHtml(h.id)}"
                        title="Edit quantity or notes"><i class="fas fa-pen"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger" data-dog-history-delete="${dogTagEscapeHtml(h.id)}"
                        data-dog-history-player="${dogTagEscapeHtml(h.playerName)}"
                        title="Remove this issuance"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`).join('');
        wrap.innerHTML = rows
            ? `<p class="text-muted small mb-2">Edit or remove mistaken entries — player issued totals update automatically.</p>
                <div class="dog-tag-table-wrap table-responsive"><table class="table table-sm table-hover dog-tag-table">
                <thead><tr><th>When</th><th>Player</th><th>Tag</th><th class="text-center">Qty</th><th>Notes / By</th><th></th></tr></thead>
                <tbody>${rows}</tbody></table></div>`
            : dogTagEmptyState('fa-history', 'No issue history yet', 'When you mark BR or WZ as issued, those records appear here.');
    } catch (e) {
        wrap.innerHTML = '<p class="text-muted small">Could not load history</p>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    dogTagBindModalTableEvents();
    dogTagBindFocusPlayersBtn();

    const divSel = document.getElementById('dogTagDivisionSelect');
    if (divSel) {
        divSel.addEventListener('change', async function () {
            dogTagSetLastDivisionId(dogTagGetDivisionId());
            await loadDogTagDivisionData();
        });
    }

    const gtSel = document.getElementById('dogTagGameType');
    if (gtSel) {
        gtSel.addEventListener('change', async function () {
            const divId = dogTagGetDivisionId();
            if (!divId) return;
            const prevGt = window.dogTagActiveGameType || dogTagGetLastGameType(divId);
            const newGt = dogTagGetGameType();
            if (prevGt !== newGt) {
                window.__dogTagSwitchingGameType = true;
                const payload = dogTagSettingsPayloadForGameType(prevGt);
                try {
                    await apiCall(`/dog-tags/divisions/${encodeURIComponent(divId)}/settings`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } catch (e) {
                    console.warn('dog tag game type switch save:', e);
                }
            }
            dogTagSetLastGameType(divId, newGt);
            dogTagApplyGameTypeTheme(newGt);
            await loadDogTagDivisionData();
        });
    }

    ['dogTagFargoLeagueId', 'dogTagFargoDivisionId', 'dogTagFargoUrl'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', dogTagScheduleAutoSave);
        el.addEventListener('blur', dogTagScheduleAutoSave);
    });
});
