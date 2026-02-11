// Utility functions
import { THEME_STORAGE_KEY } from './config.js';
import { appState } from './state.js';

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return '$0.00';
  }
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateFromISO(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getSavedTheme() {
  const t = (localStorage.getItem(THEME_STORAGE_KEY) || '').toLowerCase();
  return t === 'light' ? 'light' : 'dark';
}

export function getEffectiveTheme() {
  const t = (appState.currentOperator?.ui_theme || appState.currentOperator?.uiTheme || '').toString().toLowerCase();
  if (t === 'light' || t === 'dark') return t;
  return getSavedTheme();
}

export function applyTheme(theme) {
  const body = document.body;
  if (!body) return;
  body.classList.toggle('theme-light', theme === 'light');
  body.classList.toggle('theme-dark', theme !== 'light');
}

export function normStr(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}
