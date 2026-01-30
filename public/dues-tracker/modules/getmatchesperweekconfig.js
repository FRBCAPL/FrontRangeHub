function getMatchesPerWeekConfig(division) {
    const safe = division || {};
    if (safe.isDoublePlay) {
        const first = parseInt(safe.firstMatchesPerWeek, 10) || 5;
        const second = parseInt(safe.secondMatchesPerWeek, 10) || 5;
        return { isDoublePlay: true, first, second, total: first + second };
    }
    const matches = parseInt(safe.matchesPerWeek, 10) || 5;
    return { isDoublePlay: false, first: 0, second: 0, total: matches };
}
