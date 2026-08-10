/**
 * Rewrite bundled expense receipt URLs to relative pack paths for offline HTML/JSON.
 */

function mapUrl(urlToLocal, url) {
  const key = String(url || '').trim();
  if (!key) return null;
  return urlToLocal.get(key) || null;
}

function rewriteExpenseRow(row, urlToLocal) {
  if (!row || typeof row !== 'object') return row;
  const remote = row.receipt_url || row.receiptUrl || null;
  const local = mapUrl(urlToLocal, remote);
  if (!local) return row;
  return {
    ...row,
    receipt_url: local,
    receiptUrl: local,
    remote_receipt_url: remote,
    remoteReceiptUrl: remote
  };
}

/**
 * Deep-rewrite known expense receipt fields for records-pack offline use.
 * Preserves original HTTPS on remote_receipt_url / remoteReceiptUrl.
 *
 * @param {object} data
 * @param {Map<string, string>} urlToLocal - remote URL → relative path e.g. 14-expense-receipts/id-0.jpg
 */
export function applyOfflineExpenseReceiptUrls(data, urlToLocal) {
  if (!data || typeof data !== 'object' || !(urlToLocal instanceof Map) || !urlToLocal.size) {
    return data;
  }

  const clone = structuredClone
    ? structuredClone(data)
    : JSON.parse(JSON.stringify(data));

  const rewriteList = (list) =>
    Array.isArray(list) ? list.map((row) => rewriteExpenseRow(row, urlToLocal)) : list;

  if (clone.finance) {
    clone.finance = {
      ...clone.finance,
      expenses: rewriteList(clone.finance.expenses)
    };
  }
  if (Array.isArray(clone.expenses)) {
    clone.expenses = rewriteList(clone.expenses);
  }
  if (clone.schedules?.expenses) {
    clone.schedules = {
      ...clone.schedules,
      expenses: rewriteList(clone.schedules.expenses)
    };
  }
  if (clone.formal_accounting) {
    clone.formal_accounting = applyOfflineExpenseReceiptUrls(
      clone.formal_accounting,
      urlToLocal
    );
  }

  return clone;
}

/**
 * Also replace any leftover absolute expense URLs in HTML (safety net).
 */
export function rewriteExpenseUrlsInHtml(html, urlToLocal) {
  let out = String(html || '');
  if (!(urlToLocal instanceof Map) || !urlToLocal.size) return out;

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  for (const [remote, local] of urlToLocal.entries()) {
    if (!remote || !local) continue;
    out = out.split(remote).join(local);
    const escaped = escapeHtml(remote);
    if (escaped !== remote) out = out.split(escaped).join(local);
    try {
      const encoded = encodeURI(remote);
      if (encoded !== remote) out = out.split(encoded).join(local);
    } catch {
      /* ignore */
    }
  }
  return out;
}

export default {
  applyOfflineExpenseReceiptUrls,
  rewriteExpenseUrlsInHtml
};
