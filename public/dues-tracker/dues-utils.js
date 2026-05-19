function formatDate(d){return new Date(d).toLocaleDateString()}
function formatCurrency(a){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a)}

/** Get effective payment amount: payment.amount or sum of individualPayments (for per-player payments) */
function getPaymentAmount(payment){
    if(!payment)return 0;
    var top=parseFloat(payment.amount);
    if(top>0)return top;
    var ind=payment.individualPayments||payment.individual_payments;
    if(Array.isArray(ind)&&ind.length>0){
        return ind.reduce(function(s,p){return s+(parseFloat(p&&p.amount)||0);},0);
    }
    return 0;
}

function formatDateFromISO(iso){
    if(!iso)return '';
    var s=String(iso).trim();
    var match=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(match){var m=parseInt(match[2],10);var d=parseInt(match[3],10);return m+"/"+d+"/"+match[1];}
    return formatDate(iso);
}

/**
 * Normalized player key for identity matching across the app.
 * Use for deduplication: same person = same key.
 * - trims, lowercases, collapses internal whitespace to single space
 * - strips nicknames in quotes/parentheses (e.g., "Howard 'Howie' Norman" → "howard norman")
 */
function normPlayerKey(name){
    if(!name)return'';
    var s = String(name).trim().toLowerCase();
    // Remove nicknames in single quotes, double quotes, or parentheses
    s = s.replace(/['"][^'"]*['"]/g, ''); // 'Howie' or "Howie"
    s = s.replace(/\([^)]*\)/g, '');      // (Howie)
    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

/**
 * One key per roster person for paid-set, Players tab, and CSI reconcile.
 * Normalizes "Last, First" to the same key as "First Last" before normPlayerKey.
 */
/**
 * Map weekly payment records by week number for display and amount-due math.
 * paymentDate is display-only; never used to pick which week a payment belongs to.
 */
function buildWeeklyPaymentByWeek(weeklyPayments, maxWeek) {
    const map = {};
    if (!Array.isArray(weeklyPayments)) return map;
    const cap = Math.max(1, Number(maxWeek) || 0);
    weeklyPayments
        .slice()
        .sort((a, b) => Number(a.week) - Number(b.week))
        .forEach((p) => {
            const payWeek = Number(p.week);
            if (payWeek >= 1 && payWeek <= cap) map[payWeek] = p;
        });
    return map;
}

function rosterPlayerNormKey(name) {
    if (!name) return '';
    var trimmed = String(name).trim();
    if (!trimmed) return '';
    if (typeof formatPlayerName === 'function') {
        var formatted = formatPlayerName(trimmed);
        if (formatted) trimmed = formatted;
    } else if (trimmed.indexOf(',') !== -1) {
        var parts = trimmed.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
        if (parts.length === 2) trimmed = parts[1] + ' ' + parts[0];
    }
    return normPlayerKey(trimmed);
}