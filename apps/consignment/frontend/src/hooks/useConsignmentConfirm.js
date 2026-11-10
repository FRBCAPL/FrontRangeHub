import { createContext, useContext } from 'react';

/**
 * In-app replacement for window.confirm / window.prompt (ConsignmentConfirmProvider in ConsignmentApp).
 *   const { confirm, prompt } = useConsignmentConfirm();
 *   if (!(await confirm({ title, message, lines, confirmLabel }))) return;
 *   const note = await prompt({ title, message, inputLabel, confirmLabel }); // null when cancelled, else trimmed text
 * A plain string works too and becomes the title.
 */
export const ConsignmentConfirmContext = createContext(null);

export function confirmOptions(options) {
  const o = typeof options === 'string' ? { title: options } : { ...options };
  return {
    title: o.title || 'Are you sure?',
    message: o.message || '',
    lines: Array.isArray(o.lines) ? o.lines.filter(Boolean) : [],
    confirmLabel: o.confirmLabel || 'Yes',
    cancelLabel: o.cancelLabel || 'Cancel',
    inputLabel: o.inputLabel || '',
    placeholder: o.placeholder || '',
  };
}

const plainText = (o) => [o.title, o.message, ...o.lines].filter(Boolean).join('\n\n');

/** Outside the provider (shouldn't happen) the browser dialogs still work. */
const BROWSER_FALLBACK = {
  confirm: async (options) => window.confirm(plainText(confirmOptions(options))),
  prompt: async (options) => {
    const answer = window.prompt(plainText(confirmOptions(options)), '');
    return answer === null ? null : answer.trim();
  },
};

export default function useConsignmentConfirm() {
  return useContext(ConsignmentConfirmContext) || BROWSER_FALLBACK;
}
