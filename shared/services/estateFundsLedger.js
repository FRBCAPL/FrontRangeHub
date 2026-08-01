/**
 * Estate Funds ledger — transaction CRUD and computed balance sync.
 * Used by estateInventoryService (expenses, deposits, sales, distributions).
 */

import { supabase } from '../config/supabase.js';
import {
  FUNDS_TXN_CATEGORIES,
  computeAccountFundsBalance,
  withComputedAccountBalances
} from '../utils/estateFunds.js';

const TXN_SELECT =
  'id, owner_id, estate_id, account_id, amount, txn_date, category, memo, expense_id, item_id, distribution_id, sibling_key, document_url, created_at, updated_at';

const ACCOUNT_BALANCE_SELECT =
  'id, owner_id, estate_id, kind, account_name, institution, last4, balance, opening_balance, is_primary, as_of_date, notes, created_at, updated_at';

function fail(error) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || error?.error_description || 'Request failed.';
  return { success: false, error: message };
}

function ok(data) {
  return { success: true, data };
}

function normalizeCategory(category) {
  const c = String(category || '')
    .trim()
    .toLowerCase();
  return FUNDS_TXN_CATEGORIES.includes(c) ? c : null;
}

/** Signed amount: deposits positive, withdrawals negative. */
function normalizeSignedAmount(amount, { forceNegative = false, forcePositive = false } = {}) {
  let n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return { ok: false, error: 'Enter a non-zero amount.' };
  if (forceNegative) n = -Math.abs(n);
  if (forcePositive) n = Math.abs(n);
  return { ok: true, amount: Math.round(n * 100) / 100 };
}

export async function listAccountTransactionsForEstate(estate) {
  if (!estate?.userId) return fail('Not signed in.');
  let q = supabase
    .from('estate_account_transactions')
    .select(TXN_SELECT)
    .eq('owner_id', estate.userId)
    .order('txn_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  const { data, error } = await q;
  if (error) {
    if (/estate_account_transactions|schema cache|does not exist/i.test(error.message || '')) {
      return ok([]);
    }
    return fail(error);
  }
  return ok(data || []);
}

export async function listAccountTransactions(estate, accountId) {
  if (!estate?.userId) return fail('Not signed in.');
  if (!accountId) return fail('Account id required.');
  let q = supabase
    .from('estate_account_transactions')
    .select(TXN_SELECT)
    .eq('owner_id', estate.userId)
    .eq('account_id', accountId)
    .order('txn_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (estate.estateId) q = q.eq('estate_id', estate.estateId);
  const { data, error } = await q;
  if (error) {
    if (/estate_account_transactions|schema cache|does not exist/i.test(error.message || '')) {
      return ok([]);
    }
    return fail(error);
  }
  return ok(data || []);
}

export async function syncAccountComputedBalance(estate, accountId) {
  if (!accountId) return fail('Account id required.');
  const { data: account, error: acctErr } = await supabase
    .from('estate_accounts')
    .select(ACCOUNT_BALANCE_SELECT)
    .eq('id', accountId)
    .eq('owner_id', estate.userId)
    .maybeSingle();
  if (acctErr) return fail(acctErr);
  if (!account) return fail('Account not found.');
  if (account.kind === 'debt') return ok(account);

  const txns = await listAccountTransactions(estate, accountId);
  if (!txns.success) return txns;
  const computed = computeAccountFundsBalance(account, txns.data);
  const { data, error } = await supabase
    .from('estate_accounts')
    .update({
      balance: computed,
      updated_at: new Date().toISOString()
    })
    .eq('id', accountId)
    .eq('owner_id', estate.userId)
    .select(ACCOUNT_BALANCE_SELECT)
    .single();
  if (error) return fail(error);
  return ok({ ...data, computed_balance: computed });
}

/**
 * Post a funds transaction and refresh the cached account balance.
 * @param {object} estate — from resolveOwnedEstate
 * @param {object} input
 */
export async function addAccountTransaction(estate, input = {}) {
  if (!estate?.userId) return fail('Not signed in.');
  const accountId = String(input.accountId || input.account_id || '').trim();
  if (!accountId) return fail('Choose an estate account for this money movement.');

  const category = normalizeCategory(input.category);
  if (!category) return fail('Choose a valid transaction category.');

  const forceNegative = ['expense', 'distribution', 'transfer_out'].includes(category);
  const forcePositive = ['deposit', 'sale_proceeds', 'transfer_in'].includes(category);
  // adjustment keeps the signed amount the PR entered
  const normalized = normalizeSignedAmount(input.amount, {
    forceNegative: forceNegative && category !== 'adjustment',
    forcePositive: forcePositive && category !== 'adjustment'
  });
  if (!normalized.ok) return fail(normalized.error);

  const { data: account, error: acctErr } = await supabase
    .from('estate_accounts')
    .select('id, kind, estate_id, owner_id')
    .eq('id', accountId)
    .eq('owner_id', estate.userId)
    .maybeSingle();
  if (acctErr) return fail(acctErr);
  if (!account) return fail('Account not found.');
  if (account.kind === 'debt') {
    return fail('Funds transactions only apply to estate fund accounts, not debts.');
  }

  const insertRow = {
    owner_id: estate.userId,
    estate_id: estate.estateId || account.estate_id || null,
    account_id: accountId,
    amount: normalized.amount,
    txn_date: input.txnDate || input.txn_date || new Date().toISOString().slice(0, 10),
    category,
    memo: String(input.memo || '').trim() || null,
    expense_id: input.expenseId || input.expense_id || null,
    item_id: input.itemId || input.item_id || null,
    distribution_id: input.distributionId || input.distribution_id || null,
    sibling_key: String(input.siblingKey || input.sibling_key || '').trim() || null,
    document_url: String(input.documentUrl || input.document_url || '').trim() || null
  };

  const { data, error } = await supabase
    .from('estate_account_transactions')
    .insert(insertRow)
    .select(TXN_SELECT)
    .single();

  if (error) {
    if (/estate_account_transactions|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Estate Funds needs the funds SQL migration. Run supabase-migrations/estate-funds-transactions-2026-08.sql, then try again.'
      );
    }
    return fail(error);
  }

  await syncAccountComputedBalance(estate, accountId);
  return ok(data);
}

export async function deleteAccountTransaction(estate, transactionId) {
  if (!transactionId) return fail('Transaction id required.');
  const { data: existing, error: findErr } = await supabase
    .from('estate_account_transactions')
    .select('id, account_id')
    .eq('id', transactionId)
    .eq('owner_id', estate.userId)
    .maybeSingle();
  if (findErr) return fail(findErr);
  if (!existing) return fail('Transaction not found.');

  const { error } = await supabase
    .from('estate_account_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('owner_id', estate.userId);
  if (error) return fail(error);

  await syncAccountComputedBalance(estate, existing.account_id);
  return ok(true);
}

/** Enrich account rows with computed balances (graceful if txn table missing). */
export async function enrichAccountsWithFunds(estate, accounts) {
  const txns = await listAccountTransactionsForEstate(estate);
  if (!txns.success) {
    return {
      accounts: accounts || [],
      transactions: [],
      fundsComputed: false
    };
  }
  return {
    accounts: withComputedAccountBalances(accounts || [], txns.data),
    transactions: txns.data || [],
    fundsComputed: true
  };
}

export { TXN_SELECT, ACCOUNT_BALANCE_SELECT };
