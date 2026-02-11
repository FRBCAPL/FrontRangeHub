function syncPlanPricesFromBillingToggle() {
  const billing = document.querySelector('input[name="dues-tracker-billing"]:checked');
  const period = billing ? billing.value : 'monthly';
  document.querySelectorAll('.plan-price-display').forEach(function (span) {
    const m = span.getAttribute('data-monthly');
    const y = span.getAttribute('data-yearly');
    const monthly = (m !== null && m !== '') ? parseFloat(m) : 0;
    const yearly = (y !== null && y !== '') ? parseFloat(y) : null;
    if (period === 'yearly' && yearly != null && !isNaN(yearly)) {
      span.textContent = formatCurrency(yearly) + '/yr';
    } else {
      span.textContent = formatCurrency(monthly) + '/mo';
    }
  });
}
