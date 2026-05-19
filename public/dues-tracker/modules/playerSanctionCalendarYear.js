/**
 * Calendar-year sanction (Jan 1 – Dec 31) helpers for session rollover.
 * Sanction follows the player for the year, not the league session.
 */
(function (global) {
    function normKey(name) {
        if (typeof rosterPlayerNormKey === 'function') return rosterPlayerNormKey(name);
        if (typeof normPlayerKey === 'function') return normPlayerKey(name);
        return (name || '').trim().toLowerCase();
    }

    function getSanctionCalendarYear(date) {
        const d = date ? new Date(date) : new Date();
        return d.getFullYear();
    }

    function calendarYearRange(year) {
        const y = year || getSanctionCalendarYear();
        return { start: y + '-01-01', end: y + '-12-31' };
    }

    function parseIsoDateOnly(val) {
        if (!val) return null;
        const s = String(val).trim().split('T')[0];
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }

    function isDateInCalendarYear(val, year) {
        const d = parseIsoDateOnly(val);
        if (!d || isNaN(d.getTime())) return false;
        return d.getFullYear() === year;
    }

    function isPaymentInCalendarYear(payment, year) {
        const d = payment && (payment.paymentDate || payment.payment_date);
        if (!d) return true;
        return isDateInCalendarYear(d, year);
    }

    function globalSanctionValidForYear(globalPlayer, year) {
        if (!globalPlayer) return { paid: false, previously: false };
        const paid = globalPlayer.bca_sanction_paid === true || globalPlayer.bcaSanctionPaid === true;
        const prev =
            globalPlayer.previously_sanctioned === true || globalPlayer.previouslySanctioned === true;
        const end = globalPlayer.sanction_end_date || globalPlayer.sanctionEndDate;
        if (paid && end) {
            const endD = parseIsoDateOnly(end);
            if (endD && endD.getFullYear() < year) return { paid: false, previously: prev };
        }
        if (paid) {
            const start = globalPlayer.sanction_start_date || globalPlayer.sanctionStartDate;
            if (start && !isDateInCalendarYear(start, year) && end) {
                const endD = parseIsoDateOnly(end);
                if (endD && endD.getFullYear() === year) return { paid: true, previously: false };
            }
            return { paid: true, previously: false };
        }
        return { paid: false, previously: prev };
    }

    /**
     * Build player sanction cache from already-loaded teams (no per-player API calls).
     */
    function buildGlobalCacheFromTeams(allTeams) {
        const cache = {};
        (allTeams || []).forEach(function (team) {
            (team.teamMembers || []).forEach(function (m) {
                if (!m || !m.name) return;
                const key = normKey(m.name);
                const paid = m.bcaSanctionPaid === true || m.bcaSanctionPaid === 'true';
                const prev = m.previouslySanctioned === true || m.previouslySanctioned === 'true';
                const existing = cache[key];
                if (!existing) {
                    cache[key] = {
                        bca_sanction_paid: paid,
                        previously_sanctioned: prev,
                        sanction_start_date: m.sanctionStartDate || m.sanction_start_date || null,
                        sanction_end_date: m.sanctionEndDate || m.sanction_end_date || null
                    };
                    return;
                }
                if (paid) existing.bca_sanction_paid = true;
                if (prev) existing.previously_sanctioned = true;
            });
        });
        return cache;
    }

    /**
     * Scan all teams (including archived) for who was sanctioned in a calendar year.
     */
    function buildCalendarYearSanctionIndex(allTeams, year) {
        const index = new Map();
        const y = year || getSanctionCalendarYear();
        const range = calendarYearRange(y);

        const paidSet =
            typeof getSanctionPaidSet === 'function'
                ? getSanctionPaidSet(allTeams || [], {
                      dateRangeReport: range,
                      isPaymentInDateRange: function (payment) {
                          return isPaymentInCalendarYear(payment, y);
                      }
                  })
                : new Set();

        function merge(name, patch) {
            if (!name || !String(name).trim()) return;
            const key = normKey(name);
            if (!key) return;
            const existing = index.get(key) || {
                paidInDuezy: false,
                previouslySanctioned: false,
                displayName: String(name).trim()
            };
            if (patch.paidInDuezy) existing.paidInDuezy = true;
            if (patch.previouslySanctioned) existing.previouslySanctioned = true;
            if (patch.displayName) existing.displayName = patch.displayName;
            index.set(key, existing);
        }

        (allTeams || []).forEach(function (team) {
            const members = team.teamMembers || [];
            members.forEach(function (m) {
                if (!m || !m.name) return;
                const key = normKey(m.name);
                const rosterPaid = m.bcaSanctionPaid === true || m.bcaSanctionPaid === 'true';
                const prev =
                    m.previouslySanctioned === true || m.previouslySanctioned === 'true';
                const end = m.sanctionEndDate || m.sanction_end_date;
                const start = m.sanctionStartDate || m.sanction_start_date;
                let paidThisYear = paidSet.has(key) || rosterPaid;
                if (rosterPaid && end && !isDateInCalendarYear(end, y)) paidThisYear = paidSet.has(key);
                if (rosterPaid && start && end) {
                    const endY = parseIsoDateOnly(end);
                    if (endY && endY.getFullYear() === y) paidThisYear = true;
                }
                merge(m.name, {
                    paidInDuezy: paidThisYear,
                    previouslySanctioned: prev && !paidThisYear
                });
            });
            if (team.captainName) {
                const capKey = normKey(team.captainName);
                const capMember = members.find(function (m) {
                    return m && normKey(m.name) === capKey;
                });
                if (!capMember && (team.captainBcaSanctionPaid || team.captainPreviouslySanctioned)) {
                    merge(team.captainName, {
                        paidInDuezy: !!team.captainBcaSanctionPaid,
                        previouslySanctioned: !!team.captainPreviouslySanctioned
                    });
                }
            }
        });

        paidSet.forEach(function (key) {
            merge(key, { paidInDuezy: true, displayName: key });
        });

        return index;
    }

    function memberSanctionForNewSession(playerName, sanctionIndex, globalCache, year) {
        const key = normKey(playerName);
        const y = year || getSanctionCalendarYear();
        const global = globalCache && globalCache[key];
        const g = globalSanctionValidForYear(global, y);
        const idx = sanctionIndex && sanctionIndex.get(key);

        const paidThisYear = g.paid || (idx && idx.paidInDuezy);
        const prev =
            g.previously ||
            (idx && idx.previouslySanctioned && !paidThisYear) ||
            false;

        return {
            bcaSanctionPaid: false,
            previouslySanctioned: !!(prev || (paidThisYear && !g.paid)),
            sanctionGoodForYear: !!(paidThisYear || prev || g.previously),
            needsGlobalSync: !!(idx && (idx.paidInDuezy || idx.previouslySanctioned) && !g.paid && !g.previously),
            syncAsPaid: !!(idx && idx.paidInDuezy),
            syncAsPreviously: !!(idx && idx.previouslySanctioned && !idx.paidInDuezy)
        };
    }

    /** @deprecated Use buildGlobalCacheFromTeams — avoids hundreds of /players/.../status calls. */
    async function fetchGlobalSanctionCache(playerNames, allTeams) {
        if (allTeams && allTeams.length) {
            return buildGlobalCacheFromTeams(allTeams);
        }
        return buildGlobalCacheFromTeams([]);
    }

    global.getSanctionCalendarYear = getSanctionCalendarYear;
    global.calendarYearRange = calendarYearRange;
    global.buildCalendarYearSanctionIndex = buildCalendarYearSanctionIndex;
    global.buildGlobalCacheFromTeams = buildGlobalCacheFromTeams;
    global.memberSanctionForNewSession = memberSanctionForNewSession;
    global.fetchGlobalSanctionCache = fetchGlobalSanctionCache;
    global.globalSanctionValidForYear = globalSanctionValidForYear;
})(typeof window !== 'undefined' ? window : globalThis);
