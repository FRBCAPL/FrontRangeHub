/**
 * Show/hide combined payment period settings and anchor fields based on
 * "Combine prize fund and national org" checkbox and period type.
 */
(function () {
    'use strict';

    var _listenersAttached = false;

    function updateCombinedPaymentPeriodUIVisibility() {
        const combineEl = document.getElementById('profileCombinePrizeAndNationalCheck');
        const container = document.getElementById('combinedPaymentPeriodContainer');
        const typeSelect = document.getElementById('profileCombinedPaymentPeriodType');
        const wrapMonthly = document.getElementById('profileCombinedPaymentAnchorWrapMonthly');
        const wrapWeekly = document.getElementById('profileCombinedPaymentAnchorWrapWeekly');
        const wrapBiWeekly = document.getElementById('profileCombinedPaymentAnchorWrapBiWeekly');

        if (!container) return;

        const combineOn = combineEl && combineEl.checked;
        container.style.display = combineOn ? '' : 'none';

        if (!combineOn) return;

        const type = (typeSelect && typeSelect.value) ? typeSelect.value : 'monthly';
        if (wrapMonthly) wrapMonthly.style.display = type === 'monthly' ? '' : 'none';
        if (wrapWeekly) wrapWeekly.style.display = type === 'weekly' ? '' : 'none';
        if (wrapBiWeekly) wrapBiWeekly.style.display = type === 'bi-weekly' ? '' : 'none';
    }

    function attachListeners() {
        if (_listenersAttached) return;
        _listenersAttached = true;

        const combineEl = document.getElementById('profileCombinePrizeAndNationalCheck');
        const typeSelect = document.getElementById('profileCombinedPaymentPeriodType');
        if (combineEl) combineEl.addEventListener('change', updateCombinedPaymentPeriodUIVisibility);
        if (typeSelect) typeSelect.addEventListener('change', updateCombinedPaymentPeriodUIVisibility);
    }

    window.updateCombinedPaymentPeriodUIVisibility = updateCombinedPaymentPeriodUIVisibility;
    window.attachCombinedPaymentPeriodUIListeners = function () {
        attachListeners();
        updateCombinedPaymentPeriodUIVisibility();
    };
})();
