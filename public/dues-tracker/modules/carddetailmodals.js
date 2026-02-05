/**
 * Card detail modals - open full breakdown when "Show more" clicked.
 * Cards expand inline to show preview; "Show more" opens modal with full content.
 */
(function () {
    'use strict';

    window._cardModalContents = window._cardModalContents || {};

    // Toggle chevron icon when collapse expands/collapses (run when DOM ready)
    function setupChevronToggle() {
        const collapseIds = ['totalTeamsDetails'];
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
    window.openTotalDuesByDivisionModal = function () {
        const modalEl = document.getElementById('totalDuesByDivisionModal');
        const bodyEl = document.getElementById('totalDuesByDivisionModalBody');
        if (!modalEl || !bodyEl) return;
        const content = window._totalDuesByDivisionHtml;
        if (!content) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">No division breakdown. Open Total Dues Collected and click &quot;View by division&quot;.</p>';
        } else {
            bodyEl.innerHTML = '<div class="card-detail-modal-content" style="font-size: 0.95rem; line-height: 1.5;">' + content + '</div>';
        }
        var instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    };
    window.openSanctionFeesModal = function () { openModal('sanctionFeesDetailModal', 'Sanction Fee Collected'); };
    window.openPrizeFundModal = function () { openModal('prizeFundDetailModal', 'Prize Fund'); };
    window.openNationalOrgModal = function () { openModal('nationalOrgDetailModal', 'Parent / National Organization'); };

    window.openPrizeFundByDivisionModal = function () {
        const modalEl = document.getElementById('prizeFundByDivisionModal');
        const bodyEl = document.getElementById('prizeFundByDivisionModalBody');
        if (!modalEl || !bodyEl) return;
        const content = window._prizeFundByDivisionHtml;
        if (!content) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">No division breakdown. Open Prize Fund and click &quot;View by division&quot;.</p>';
        } else {
            bodyEl.innerHTML = '<div class="card-detail-modal-content" style="font-size: 0.95rem; line-height: 1.5;">' + content + '</div>';
        }
        var instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    };

    document.addEventListener('click', function (e) {
        var row = e.target && e.target.closest ? e.target.closest('.prize-division-row') : null;
        if (row) {
            var modal = document.getElementById('prizeFundByDivisionModal');
            if (modal && modal.classList.contains('show')) {
                var next = row.nextElementSibling;
                if (next && next.classList.contains('prize-division-detail-row')) {
                    next.style.display = next.style.display === 'none' ? 'table-row' : 'none';
                }
            }
            return;
        }
        row = e.target && e.target.closest ? e.target.closest('.dues-division-row') : null;
        if (row) {
            var modalDues = document.getElementById('totalDuesByDivisionModal');
            if (modalDues && modalDues.classList.contains('show')) {
                var nextDues = row.nextElementSibling;
                if (nextDues && nextDues.classList.contains('dues-division-detail-row')) {
                    nextDues.style.display = nextDues.style.display === 'none' ? 'table-row' : 'none';
                }
            }
            return;
        }
        row = e.target && e.target.closest ? e.target.closest('.league-division-row') : null;
        if (row) {
            var modalLeague = document.getElementById('leagueIncomeByDivisionModal');
            if (modalLeague && modalLeague.classList.contains('show')) {
                var nextLeague = row.nextElementSibling;
                if (nextLeague && nextLeague.classList.contains('league-division-detail-row')) {
                    nextLeague.style.display = nextLeague.style.display === 'none' ? 'table-row' : 'none';
                }
            }
        }
    });

    window.openNationalOrgByDivisionModal = function () {
        const modalEl = document.getElementById('nationalOrgByDivisionModal');
        const bodyEl = document.getElementById('nationalOrgByDivisionModalBody');
        if (!modalEl || !bodyEl) return;
        const content = window._nationalOrgByDivisionHtml;
        if (!content) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">No division breakdown. Open Parent / National Organization and click &quot;View by division&quot;.</p>';
        } else {
            bodyEl.innerHTML = '<div class="card-detail-modal-content" style="font-size: 0.95rem; line-height: 1.5;">' + content + '</div>';
        }
        var instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    };

    window.openNationalOrgHistoryModal = function () {
        const modalEl = document.getElementById('nationalOrgHistoryModal');
        const bodyEl = document.getElementById('nationalOrgHistoryModalBody');
        if (!modalEl || !bodyEl) return;
        const history = window._nationalOrgPaymentHistory;
        if (!history || history.length === 0) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">No past periods to show. Combined payment history appears when you have a combined payment period set (e.g. monthly).</p>';
        } else {
            const formatCurrency = typeof window.formatCurrency === 'function' ? window.formatCurrency : function (n) { return '$' + (Number(n).toFixed(2)); };
            const rows = history.map(function (row) {
                const diffClass = row.difference >= 0 ? 'text-warning' : 'text-success';
                return '<tr><td>' + row.label + '</td><td>' + formatCurrency(row.expected) + '</td><td>' + formatCurrency(row.collected) + '</td><td class="' + diffClass + '">' + formatCurrency(row.difference) + '</td></tr>';
            }).join('');
            bodyEl.innerHTML = '<p class="small text-muted mb-3">Combined payment to national office (Prize Fund + Parent/National org) per period.</p>' +
                '<table class="modal-breakdown-table table table-sm mb-0">' +
                '<thead><tr><th>Period</th><th>Expected</th><th>Collected</th><th>Difference</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table>';
        }
        var instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    };

    window.openLeagueIncomeModal = function () { openModal('leagueIncomeDetailModal', 'League Income'); };
    window.openLeagueIncomeByDivisionModal = function () {
        const modalEl = document.getElementById('leagueIncomeByDivisionModal');
        const bodyEl = document.getElementById('leagueIncomeByDivisionModalBody');
        if (!modalEl || !bodyEl) return;
        const content = window._leagueIncomeByDivisionHtml;
        if (!content) {
            bodyEl.innerHTML = '<p class="text-muted mb-0">No division breakdown. Open League Income and click &quot;View by division&quot;.</p>';
        } else {
            bodyEl.innerHTML = '<div class="card-detail-modal-content" style="font-size: 0.95rem; line-height: 1.5;">' + content + '</div>';
        }
        var instance = bootstrap.Modal.getOrCreateInstance(modalEl);
        instance.show();
    };
})();
