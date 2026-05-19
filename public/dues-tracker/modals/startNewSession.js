/**
 * Start New Session — archive prior division, create new division, copy rosters,
 * carry calendar-year sanction status per player.
 */
(function () {
    var _teamsCache = null;
    var _teamsCacheAt = 0;
    var TEAMS_CACHE_MS = 90000;

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    async function apiCallWithRetry(url, options, retries) {
        var max = retries != null ? retries : 4;
        var lastRes = null;
        for (var attempt = 0; attempt <= max; attempt++) {
            lastRes = await apiCall(url, options);
            if (lastRes.status !== 429) return lastRes;
            if (attempt < max) {
                await sleep(800 + attempt * 1200);
            }
        }
        return lastRes;
    }

    function apiErrorMessage(res, fallback) {
        if (res && res.status === 429) {
            return 'Too many requests — wait about a minute, refresh the page, then try again.';
        }
        return fallback || 'Request failed';
    }

    function activeDivisionsList() {
        return (divisions || []).filter(function (d) {
            if (!d || !d.name) return false;
            if (d._id && String(d._id).startsWith('temp_')) return false;
            if (d.isArchived === true || d.isArchived === 'true') return false;
            if (!d.isActive && d.description === 'Temporary') return false;
            return true;
        });
    }

    function parseDoublePlayNames(division) {
        var fn = division.firstDivisionName || '';
        var fg = division.firstDivisionGameType || '';
        var sn = division.secondDivisionName || '';
        var sg = division.secondDivisionGameType || '';
        if (division.name && division.name.includes(' / ')) {
            var parts = division.name.split(' / ');
            if (parts[0] && parts[0].includes(' - ')) {
                var i = parts[0].indexOf(' - ');
                fn = parts[0].substring(0, i).trim();
                fg = parts[0].substring(i + 3).trim();
            }
            if (parts[1] && parts[1].includes(' - ')) {
                var i2 = parts[1].indexOf(' - ');
                sn = parts[1].substring(0, i2).trim();
                sg = parts[1].substring(i2 + 3).trim();
            }
        }
        return { fn: fn, fg: fg, sn: sn, sg: sg };
    }

    function formatDoublePlayDivisionName(fn, fg, sn, sg) {
        return fn + ' - ' + fg + ' / ' + sn + ' - ' + sg;
    }

    function formatRegularDivisionName(base, gameType) {
        if (!gameType) return base;
        if (base.indexOf(' - ' + gameType) !== -1) return base;
        return base + ' - ' + gameType;
    }

    function extractGameTypeFromDivisionName(name) {
        if (!name || name.indexOf(' - ') === -1) return '';
        if (name.includes(' / ')) return '';
        return name.split(' - ').pop().trim();
    }

    function getSourceDivision() {
        var sel = document.getElementById('startSessionSourceDivision');
        var id = sel && sel.value;
        if (!id) return null;
        return (divisions || []).find(function (d) {
            return (d._id || d.id) === id;
        });
    }

    function populateSourceDivisionSelect() {
        var sel = document.getElementById('startSessionSourceDivision');
        if (!sel) return;
        var prev = sel.value;
        sel.innerHTML = '<option value="">Select division…</option>';
        activeDivisionsList().forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = d._id || d.id;
            opt.textContent = d.name;
            sel.appendChild(opt);
        });
        if (prev) sel.value = prev;
    }

    function fillFormFromSource() {
        var div = getSourceDivision();
        var year = typeof getSanctionCalendarYear === 'function' ? getSanctionCalendarYear() : new Date().getFullYear();
        var dpWrap = document.getElementById('startSessionDoublePlayFields');
        var regWrap = document.getElementById('startSessionRegularFields');
        var previewEl = document.getElementById('startSessionPreview');

        if (!div) {
            if (dpWrap) dpWrap.classList.add('d-none');
            if (regWrap) regWrap.classList.remove('d-none');
            if (previewEl) previewEl.innerHTML = '<span class="text-muted">Select a division, then click Refresh preview.</span>';
            return;
        }

        var archiveCb = document.getElementById('startSessionArchiveOld');
        if (archiveCb) archiveCb.checked = true;

        var startEl = document.getElementById('startSessionStartDate');
        var endEl = document.getElementById('startSessionEndDate');
        if (startEl && div.startDate) startEl.value = String(div.startDate).split('T')[0];
        if (endEl && div.endDate) endEl.value = String(div.endDate).split('T')[0];

        if (div.isDoublePlay) {
            if (dpWrap) dpWrap.classList.remove('d-none');
            if (regWrap) regWrap.classList.add('d-none');
            var p = parseDoublePlayNames(div);
            var suffix = ' ' + year;
            var fnEl = document.getElementById('startSessionFirstDivName');
            var fgEl = document.getElementById('startSessionFirstGameType');
            var snEl = document.getElementById('startSessionSecondDivName');
            var sgEl = document.getElementById('startSessionSecondGameType');
            if (fnEl) fnEl.value = (p.fn || 'Division 1') + suffix;
            if (fgEl) fgEl.value = p.fg || '';
            if (snEl) snEl.value = (p.sn || 'Division 2') + suffix;
            if (sgEl) sgEl.value = p.sg || '';
        } else {
            if (dpWrap) dpWrap.classList.add('d-none');
            if (regWrap) regWrap.classList.remove('d-none');
            var nameEl = document.getElementById('startSessionNewDivisionName');
            var gtEl = document.getElementById('startSessionGameType');
            var gt = div.gameType || extractGameTypeFromDivisionName(div.name);
            var base = div.name || '';
            var baseOnly = gt && base.endsWith(' - ' + gt) ? base.slice(0, -((' - ' + gt).length)) : base;
            if (nameEl) nameEl.value = baseOnly + ' ' + year;
            if (gtEl) gtEl.value = gt || '';
        }
        if (previewEl) {
            previewEl.innerHTML =
                '<span class="text-muted">Click <strong>Refresh preview</strong> to load team counts (one request).</span>';
        }
    }

    function getNewDivisionNameFromForm(source) {
        if (source.isDoublePlay) {
            var fn = (document.getElementById('startSessionFirstDivName')?.value || '').trim();
            var fg = (document.getElementById('startSessionFirstGameType')?.value || '').trim();
            var sn = (document.getElementById('startSessionSecondDivName')?.value || '').trim();
            var sg = (document.getElementById('startSessionSecondGameType')?.value || '').trim();
            if (!fn || !fg || !sn || !sg) return null;
            return formatDoublePlayDivisionName(fn, fg, sn, sg);
        }
        var base = (document.getElementById('startSessionNewDivisionName')?.value || '').trim();
        var gt = (document.getElementById('startSessionGameType')?.value || '').trim();
        if (!base) return null;
        return formatRegularDivisionName(base, gt);
    }

    function buildDivisionPayload(source, newName) {
        var startDate = document.getElementById('startSessionStartDate')?.value || source.startDate || '';
        var endDate = document.getElementById('startSessionEndDate')?.value || source.endDate || '';
        var payload = {
            name: newName,
            duesPerPlayerPerMatch: parseFloat(source.duesPerPlayerPerMatch) || 0,
            playersPerWeek: parseInt(source.playersPerWeek, 10) || 5,
            matchesPerWeek: parseInt(source.matchesPerWeek, 10) || 5,
            firstMatchesPerWeek: parseInt(source.firstMatchesPerWeek, 10) || 5,
            secondMatchesPerWeek: parseInt(source.secondMatchesPerWeek, 10) || 5,
            numberOfTeams: parseInt(source.numberOfTeams, 10) || 0,
            totalWeeks: parseInt(source.totalWeeks, 10) || 0,
            startDate: startDate ? String(startDate).split('T')[0] : '',
            endDate: endDate ? String(endDate).split('T')[0] : '',
            isDoublePlay: !!source.isDoublePlay,
            description: source.description || '',
            color: source.color || null
        };
        if (source.useDollarAmounts) {
            payload.useDollarAmounts = true;
            if (source.prizeFundAmount != null) {
                payload.prizeFundAmount = source.prizeFundAmount;
                payload.prizeFundAmountType = source.prizeFundAmountType;
            }
            if (source.firstOrganizationAmount != null) {
                payload.firstOrganizationAmount = source.firstOrganizationAmount;
                payload.firstOrganizationAmountType = source.firstOrganizationAmountType;
            }
            if (source.secondOrganizationAmount != null) {
                payload.secondOrganizationAmount = source.secondOrganizationAmount;
                payload.secondOrganizationAmountType = source.secondOrganizationAmountType;
            }
        } else {
            payload.useDollarAmounts = false;
            if (source.prizeFundPercentage != null) payload.prizeFundPercentage = source.prizeFundPercentage;
            if (source.firstOrganizationPercentage != null) {
                payload.firstOrganizationPercentage = source.firstOrganizationPercentage;
            }
            if (source.secondOrganizationPercentage != null) {
                payload.secondOrganizationPercentage = source.secondOrganizationPercentage;
            }
        }
        if (source.prizeFundName) payload.prizeFundName = source.prizeFundName;
        return payload;
    }

    function cloneMemberForNewSession(member, sanctionIndex, globalCache, year) {
        var flags =
            typeof memberSanctionForNewSession === 'function'
                ? memberSanctionForNewSession(member.name, sanctionIndex, globalCache, year)
                : { bcaSanctionPaid: false, previouslySanctioned: false, sanctionGoodForYear: false };

        var previously = !!flags.previouslySanctioned;
        if (flags.sanctionGoodForYear && !flags.syncAsPaid) {
            previously = true;
        }

        return {
            name: member.name,
            email: member.email || '',
            phone: member.phone || '',
            bcaSanctionPaid: false,
            previouslySanctioned: previously
        };
    }

    function buildTeamPayload(team, newDivisionName, sanctionIndex, globalCache, year) {
        var cleanMembers = (team.teamMembers || []).map(function (m) {
            return cloneMemberForNewSession(m, sanctionIndex, globalCache, year);
        });
        var capName = team.captainName || (cleanMembers[0] && cleanMembers[0].name) || '';
        return {
            teamName: team.teamName,
            division: newDivisionName,
            location: team.location || '',
            teamMembers: cleanMembers,
            captainName: capName,
            captainEmail: team.captainEmail || '',
            captainPhone: team.captainPhone || ''
        };
    }

    async function syncPlayersToGlobalRegistry(sourceTeams, sanctionIndex, globalCache, year) {
        var y = year || getSanctionCalendarYear();
        var synced = new Set();
        var queue = [];

        sourceTeams.forEach(function (team) {
            (team.teamMembers || []).forEach(function (m) {
                if (!m || !m.name) return;
                var flags =
                    typeof memberSanctionForNewSession === 'function'
                        ? memberSanctionForNewSession(m.name, sanctionIndex, globalCache, y)
                        : null;
                if (!flags || !flags.needsGlobalSync) return;
                var key =
                    typeof rosterPlayerNormKey === 'function'
                        ? rosterPlayerNormKey(m.name)
                        : m.name.trim().toLowerCase();
                if (synced.has(key)) return;
                synced.add(key);
                queue.push({ member: m, flags: flags });
            });
        });

        for (var i = 0; i < queue.length; i++) {
            var item = queue[i];
            var m = item.member;
            var flags = item.flags;
            var updates = { email: m.email || null, phone: m.phone || null };
            if (flags.syncAsPaid) {
                updates.bcaSanctionPaid = true;
                updates.previouslySanctioned = false;
                updates.sanctionStartDate = y + '-01-01';
                updates.sanctionEndDate = y + '-12-31';
            } else if (flags.syncAsPreviously || flags.sanctionGoodForYear) {
                updates.bcaSanctionPaid = false;
                updates.previouslySanctioned = true;
            } else {
                continue;
            }
            try {
                var res = await apiCallWithRetry(
                    '/players/' + encodeURIComponent(m.name.trim()) + '/status',
                    { method: 'PUT', body: JSON.stringify(updates) },
                    2
                );
                if (!res.ok) console.warn('Global sync failed for', m.name, res.status);
            } catch (e) {
                console.warn('Global sync failed for', m.name, e);
            }
            if (i < queue.length - 1) await sleep(120);
        }
    }

    async function loadAllTeamsIncludingArchived(forceRefresh) {
        var now = Date.now();
        if (!forceRefresh && _teamsCache && now - _teamsCacheAt < TEAMS_CACHE_MS) {
            return _teamsCache;
        }
        var res = await apiCallWithRetry('/teams?page=1&limit=10000&includeArchived=true', { method: 'GET' }, 3);
        if (res.ok) {
            var data = await res.json();
            _teamsCache = Array.isArray(data) ? data : data.teams || [];
            _teamsCacheAt = now;
            return _teamsCache;
        }
        if (_teamsCache) return _teamsCache;
        return teams || [];
    }

    function filterSourceTeams(allTeams, source) {
        return allTeams.filter(function (t) {
            if (t.isArchived || t.isActive === false) return false;
            return typeof teamDivisionMatchesDivisionRecord === 'function'
                ? teamDivisionMatchesDivisionRecord(t, source)
                : (t.division || '').trim() === (source.name || '').trim();
        });
    }

    function buildSanctionContext(allTeams, sourceTeams, year) {
        var sanctionIndex = buildCalendarYearSanctionIndex(allTeams, year);
        var globalCache =
            typeof buildGlobalCacheFromTeams === 'function'
                ? buildGlobalCacheFromTeams(allTeams)
                : typeof fetchGlobalSanctionCache === 'function'
                  ? fetchGlobalSanctionCache([], allTeams)
                  : {};
        return { sanctionIndex: sanctionIndex, globalCache: globalCache };
    }

    async function updateStartSessionPreview() {
        var previewEl = document.getElementById('startSessionPreview');
        if (!previewEl) return;
        var source = getSourceDivision();
        if (!source) {
            previewEl.innerHTML = '<span class="text-muted">Select a division to see preview.</span>';
            return;
        }
        var newName = getNewDivisionNameFromForm(source);
        if (!newName) {
            previewEl.innerHTML = '<span class="text-warning">Enter the new division name(s).</span>';
            return;
        }

        previewEl.innerHTML = '<span class="text-muted">Loading preview…</span>';
        try {
            var allTeams = await loadAllTeamsIncludingArchived(false);
            var sourceTeams = filterSourceTeams(allTeams, source);
            var year = getSanctionCalendarYear();
            var ctx = buildSanctionContext(allTeams, sourceTeams, year);
            var names = 0;
            var carryCount = 0;
            sourceTeams.forEach(function (t) {
                (t.teamMembers || []).forEach(function (m) {
                    if (m && m.name) names++;
                    var f = memberSanctionForNewSession(m.name, ctx.sanctionIndex, ctx.globalCache, year);
                    if (f.sanctionGoodForYear) carryCount++;
                });
            });
            previewEl.innerHTML =
                '<strong>' +
                sourceTeams.length +
                '</strong> team(s), <strong>' +
                names +
                '</strong> roster spot(s). <strong>' +
                carryCount +
                '</strong> keep <strong>' +
                year +
                '</strong> sanction. Weekly dues start empty.';
        } catch (e) {
            previewEl.innerHTML = '<span class="text-danger">Could not load preview. Try again in a minute.</span>';
        }
    }

    function openStartNewSessionModal() {
        populateSourceDivisionSelect();
        var modalEl = document.getElementById('startNewSessionModal');
        if (!modalEl) return;
        fillFormFromSource();
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    async function runStartNewSession() {
        var source = getSourceDivision();
        if (!source) {
            showAlertModal('Select the division you are ending.', 'warning', 'Start New Session');
            return;
        }
        var newName = getNewDivisionNameFromForm(source);
        if (!newName) {
            showAlertModal('Enter a name for the new division.', 'warning', 'Start New Session');
            return;
        }

        var archiveOld = document.getElementById('startSessionArchiveOld')?.checked !== false;
        var divId = source._id || source.id;
        var runBtn = document.getElementById('startSessionRunBtn');
        if (runBtn) runBtn.disabled = true;

        try {
            showLoadingMessage('Starting new session…');

            var allTeams = await loadAllTeamsIncludingArchived(true);
            var sourceTeams = filterSourceTeams(allTeams, source);
            if (!sourceTeams.length) {
                throw new Error('No active teams found in that division.');
            }

            var year = getSanctionCalendarYear();
            var ctx = buildSanctionContext(allTeams, sourceTeams, year);

            if (archiveOld) {
                if (typeof executeArchiveDivision !== 'function') {
                    throw new Error('Archive helper not available. Refresh the page and try again.');
                }
                await executeArchiveDivision(divId, true, {
                    preloadedTeams: allTeams,
                    quiet: true,
                    skipSuccessAlert: true,
                    skipReload: true,
                    delayMs: 80
                });
            }

            var divisionPayload = buildDivisionPayload(source, newName);
            var divRes = await apiCallWithRetry(
                '/divisions',
                { method: 'POST', body: JSON.stringify(divisionPayload) },
                4
            );
            if (!divRes.ok) {
                var err = await divRes.json().catch(function () {
                    return {};
                });
                throw new Error(err.message || apiErrorMessage(divRes, 'Failed to create new division'));
            }

            var teamPayloads = sourceTeams.map(function (t) {
                return buildTeamPayload(t, newName, ctx.sanctionIndex, ctx.globalCache, year);
            });

            var created = 0;
            var failed = [];
            for (var i = 0; i < teamPayloads.length; i++) {
                var tp = teamPayloads[i];
                var postRes = await apiCallWithRetry(
                    '/teams',
                    { method: 'POST', body: JSON.stringify(tp) },
                    3
                );
                if (!postRes.ok) {
                    var terr = await postRes.json().catch(function () {
                        return {};
                    });
                    failed.push(tp.teamName + ': ' + (terr.message || postRes.status));
                    continue;
                }
                created++;
                if (i < teamPayloads.length - 1) await sleep(100);
            }

            if (created > 0) {
                await syncPlayersToGlobalRegistry(sourceTeams, ctx.sanctionIndex, ctx.globalCache, year);
            }

            _teamsCache = null;

            hideLoadingMessage();
            bootstrap.Modal.getInstance(document.getElementById('startNewSessionModal'))?.hide();
            bootstrap.Modal.getInstance(document.getElementById('divisionManagementModal'))?.hide();

            if (typeof loadData === 'function') await loadData();

            var msg =
                'New session ready: "' +
                newName +
                '" with ' +
                created +
                ' of ' +
                sourceTeams.length +
                ' teams. Sanction carried for ' +
                year +
                '.';
            if (failed.length) msg += ' Failed: ' + failed.slice(0, 3).join('; ');
            showAlertModal(msg, created === sourceTeams.length ? 'success' : 'warning', 'New Session Started');
        } catch (err) {
            hideLoadingMessage();
            console.error('Start new session failed:', err);
            showAlertModal(err.message || 'Could not start new session.', 'error', 'Error');
        } finally {
            if (runBtn) runBtn.disabled = false;
        }
    }

    function wireStartNewSessionModal() {
        var modal = document.getElementById('startNewSessionModal');
        if (!modal || modal.dataset.wired === '1') return;
        modal.dataset.wired = '1';

        var src = document.getElementById('startSessionSourceDivision');
        if (src) src.addEventListener('change', fillFormFromSource);

        var runBtn = document.getElementById('startSessionRunBtn');
        if (runBtn) runBtn.addEventListener('click', runStartNewSession);

        var refreshBtn = document.getElementById('startSessionRefreshPreview');
        if (refreshBtn) refreshBtn.addEventListener('click', updateStartSessionPreview);
    }

    if (typeof window !== 'undefined') {
        window.openStartNewSessionModal = openStartNewSessionModal;
        window.updateStartSessionPreview = updateStartSessionPreview;
        window.runStartNewSession = runStartNewSession;
        window.wireStartNewSessionModal = wireStartNewSessionModal;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireStartNewSessionModal);
    } else {
        wireStartNewSessionModal();
    }
})();
