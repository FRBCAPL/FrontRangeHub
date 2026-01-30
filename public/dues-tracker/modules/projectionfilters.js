/**
 * Projection mode filters: period (week/month/custom) and division.
 * Used by Pro and higher plans.
 */

// Projection period: 'end' | '1week' | '1month' | '2months' | '6months' | 'custom'
window.projectionPeriod = window.projectionPeriod || 'end';
window.projectionCustomStartDate = window.projectionCustomStartDate || null;
window.projectionCustomEndDate = window.projectionCustomEndDate || null;

/**
 * Get the max weeks to project based on period setting.
 * For 'end', returns null (no cap - use division end).
 * For custom, computes weeks from division start to custom end date.
 */
function getProjectionWeeksCap(teamDivision, currentWeek) {
    const period = window.projectionPeriod || 'end';
    if (period === 'end') return null;

    const caps = {
        '1week': 1,
        '1month': 4,
        '2months': 9,
        '6months': 26
    };
    if (caps[period] !== undefined) return caps[period];

    if (period === 'custom') {
        const startDateStr = window.projectionCustomStartDate;
        const endDateStr = window.projectionCustomEndDate;
        if (!endDateStr || !teamDivision?.startDate) return 0;
        try {
            const [sy, sm, sd] = teamDivision.startDate.split('T')[0].split('-').map(Number);
            const divStart = new Date(sy, sm - 1, sd);
            divStart.setHours(0, 0, 0, 0);
            const [ey, em, ed] = endDateStr.split('-').map(Number);
            const rangeEnd = new Date(ey, em - 1, ed);
            rangeEnd.setHours(23, 59, 59, 999);
            let rangeStart;
            if (startDateStr) {
                const [rsy, rsm, rsd] = startDateStr.split('-').map(Number);
                rangeStart = new Date(rsy, rsm - 1, rsd);
                rangeStart.setHours(0, 0, 0, 0);
            } else {
                rangeStart = new Date();
                rangeStart.setHours(0, 0, 0, 0);
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (rangeEnd < today) return 0;
            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
            let weeksInRange = 0;
            for (let w = currentWeek + 1; w <= (currentWeek + 52); w++) {
                const weekStart = new Date(divStart.getTime() + (w - 1) * msPerWeek);
                const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                if (weekStart <= rangeEnd && weekEnd >= rangeStart) weeksInRange++;
                else if (weekStart > rangeEnd) break;
            }
            return weeksInRange;
        } catch (e) {
            return 0;
        }
    }
    return null;
}

/**
 * Get remaining weeks for projection, capped by period setting.
 */
function getProjectionRemainingWeeks(teamDivision, currentWeek) {
    const baseRemaining = typeof getRemainingWeeks === 'function'
        ? getRemainingWeeks(teamDivision, currentWeek)
        : 0;
    const cap = getProjectionWeeksCap(teamDivision, currentWeek);
    if (cap === null) return baseRemaining;
    return Math.min(baseRemaining, Math.max(0, cap));
}
