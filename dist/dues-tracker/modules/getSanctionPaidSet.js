/**
 * Single source of truth for "who has paid sanction" so main card and Players tab match.
 * Returns a Set of normalized player names (roster players only) who have paid.
 * @param {Array} teams - list of team objects (captainName, teamMembers, weeklyPayments)
 * @param {Object} options - optional: { dateRangeReport, isPaymentInDateRange }
 * @returns {Set<string>} normalized names of roster players who have paid
 */
function getSanctionPaidSet(teams, options) {
    if (!teams || !teams.length) return new Set();
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase();
    const rosterNames = new Set();
    teams.forEach(team => {
        if (team.captainName) rosterNames.add(normName(team.captainName));
        if (team.teamMembers) team.teamMembers.forEach(m => { if (m && m.name) rosterNames.add(normName(m.name)); });
    });
    const paidSet = new Set();
    const dateRangeReport = options && options.dateRangeReport;
    const isPaymentInDateRange = options && typeof options.isPaymentInDateRange === 'function' ? options.isPaymentInDateRange : null;

    teams.forEach(team => {
        // (1) From weekly payments (paid/partial) — only add names that exist in roster
        if (team.weeklyPayments && team.weeklyPayments.length > 0) {
            team.weeklyPayments.forEach(payment => {
                const isPaid = payment.paid === 'true' || payment.paid === true;
                const isPartial = payment.paid === 'partial';
                if (!isPaid && !isPartial) return;
                if (dateRangeReport && isPaymentInDateRange && !isPaymentInDateRange(payment, dateRangeReport.start, dateRangeReport.end)) return;
                if (payment.bcaSanctionPlayers && Array.isArray(payment.bcaSanctionPlayers) && payment.bcaSanctionPlayers.length > 0) {
                    payment.bcaSanctionPlayers.forEach(playerName => {
                        const n = normName(playerName);
                        if (rosterNames.has(n)) paidSet.add(n);
                    });
                }
            });
        }
        // (2) From team members (captain is in teamMembers — no separate captain count)
        if (team.teamMembers) {
            team.teamMembers.forEach(m => {
                if (!m.name) return;
                if (m.bcaSanctionPaid) paidSet.add(normName(m.name));
            });
        }
        // (3) Captain not in teamMembers (legacy)
        if (team.captainName) {
            const capKey = normName(team.captainName);
            if (!team.teamMembers || !team.teamMembers.some(m => normName(m.name) === capKey)) {
                if (team.captainBcaSanctionPaid) paidSet.add(capKey);
            }
        }
    });
    return paidSet;
}

if (typeof window !== 'undefined') window.getSanctionPaidSet = getSanctionPaidSet;
