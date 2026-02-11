function formatUsage(used, limit) {
            if (limit === null) return { text: `${used} / Unlimited`, percentage: 0, colorClass: 'text-success' };
            const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
            const colorClass = percentage >= 90 ? 'text-danger' : percentage >= 70 ? 'text-warning' : 'text-success';
            return { text: `${used} / ${limit}`, percentage, colorClass };
        }
