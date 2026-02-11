function updatePaginationUI() {
    const paginationControls = document.getElementById('paginationControls');
    const currentPageDisplay = document.getElementById('currentPageDisplay');
    const totalPagesDisplay = document.getElementById('totalPagesDisplay');
    const totalTeamsDisplay = document.getElementById('totalTeamsDisplay');
    const paginationFirst = document.getElementById('paginationFirst');
    const paginationPrev = document.getElementById('paginationPrev');
    const paginationNext = document.getElementById('paginationNext');
    const paginationLast = document.getElementById('paginationLast');
    const teamsPerPageSelect = document.getElementById('teamsPerPageSelect');
    
    if (!paginationControls) return;
    
    // Show pagination controls if we have teams and pagination is applicable
    // Hide only if we have 0 teams or exactly 1 page with all teams visible
    const shouldShow = totalTeamsCount > 0 && (totalPages > 1 || totalTeamsCount > teamsPerPage);
    
    if (shouldShow) {
        paginationControls.style.display = 'flex';
    } else {
        paginationControls.style.display = 'none';
    }
    
    // Update displays (handle edge cases)
    if (currentPageDisplay) currentPageDisplay.textContent = Math.max(1, currentPage);
    if (totalPagesDisplay) totalPagesDisplay.textContent = Math.max(1, totalPages);
    if (totalTeamsDisplay) totalTeamsDisplay.textContent = totalTeamsCount || 0;
    
    // Update teams per page select
    if (teamsPerPageSelect) {
        teamsPerPageSelect.value = teamsPerPage;
    }
    
    // Update button states
    if (paginationFirst) {
        paginationFirst.disabled = currentPage === 1;
    }
    if (paginationPrev) {
        paginationPrev.disabled = currentPage === 1;
    }
    if (paginationNext) {
        paginationNext.disabled = currentPage >= totalPages;
    }
    if (paginationLast) {
        paginationLast.disabled = currentPage >= totalPages;
    }
}
