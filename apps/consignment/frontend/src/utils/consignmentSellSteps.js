export const SELL_STEPS = [
  { id: 'method', title: 'How do you want to sell?' },
  { id: 'contact', title: 'How do we reach you?' },
  { id: 'item', title: 'What are you selling?' },
  { id: 'details', title: 'Details & photos' },
  { id: 'price', title: 'Set your price' },
  { id: 'review', title: 'Review & submit' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First problem on a step, or '' when the seller can move on. */
export function sellStepError(stepId, form) {
  if (stepId === 'contact') {
    if (!form.seller_name.trim()) return 'Enter your name.';
    if (!form.seller_phone.trim() && !form.seller_email.trim()) return 'Enter a phone number or email so FRPL can reach you.';
    if (form.seller_email.trim() && !EMAIL_RE.test(form.seller_email.trim())) return 'That email doesn’t look right.';
  }
  if (stepId === 'item' && !form.name.trim()) return 'Give the item a name, like “Predator Throne cue”.';
  if (stepId === 'price') {
    const payout = Number(form.seller_payout);
    if (!(payout > 0)) {
      return form.sale_method === 'auction' ? 'Enter your reserve (the lowest price you’ll accept).' : 'Enter your price.';
    }
    if (form.sale_method === 'auction' && form.buy_now_price !== '' && Number(form.buy_now_price) <= payout) {
      return 'Buy It Now must be higher than the reserve.';
    }
  }
  if (stepId === 'review' && !form.agreement) return 'Please agree to the terms to submit.';
  return '';
}
