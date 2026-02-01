/**
 * Card detail modals - open full breakdown when "Show more" clicked.
 * Cards expand inline to show preview; "Show more" opens modal with full content.
 */
(function () {
    'use strict';

    window._cardModalContents = window._cardModalContents || {};

    // Toggle chevron icon when collapse expands/collapses (run when DOM ready)
    function setupChevronToggle() {
        const collapseIds = ['totalTeamsDetails', 'teamsBehindDetails', 'sanctionFeesDetails', 'totalDuesDetails', 'prizeFundDetails', 'nationalOrgDetails', 'leagueIncomeDetails'];
        collapseIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('show.bs.collapse', function () {
                const btn = document.querySelector('[data-bs-target="#' + id + '"]');
                if (btn) { var i = btn.querySelector('i'); if (i) i.className = i.className.replace('fa-chevron-down', 'fa-chevron-up'); }
            });
            el.addEventListener('hide.bs.collapse', function () {
                const btn = document.querySelector('[data-bs-target="#' + id + '"]');
                if (btn) { var i = btn.querySelector('i'); if (i) i.className = i.className.replace('fa-chevron-up', 'fa-chevron-down'); }
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupChevronToggle);
    } else {
        setupChevronToggle();
    }

    function openModal(modalId, title) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;
        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl && title) titleEl.textContent = title;
        const bodyEl = modalEl.querySelector('.modal-body');
        const content = window._cardModalContents && window._cardModalContents[modalId] ? window._cardModalContents[modalId] : '<p class="text-muted mb-0">No data</p>';
        if (bodyEl) bodyEl.innerHTML = '<div class="card-detail-modal-content" style="font-size: 0.95rem; line-height: 1.5;">' + content + '</div>';
        const instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    }

    window.openTotalTeamsModal = function () { openModal('totalTeamsDetailModal', 'Total Teams'); };
    window.openTeamsBehindModal = function () { openModal('teamsBehindDetailModal', 'Teams Behind'); };
    window.openTotalDuesModal = function () { openModal('totalDuesDetailModal', 'Total Dues Collected'); };
    window.openSanctionFeesModal = function () { openModal('sanctionFeesDetailModal', 'Sanction Fee Collected'); };
    window.openPrizeFundModal = function () { openModal('prizeFundDetailModal', 'Prize Fund'); };
    window.openNationalOrgModal = function () { openModal('nationalOrgDetailModal', 'Parent / National Organization'); };
    window.openLeagueIncomeModal = function () { openModal('leagueIncomeDetailModal', 'League Income'); };
})();
