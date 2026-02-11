function updateAppBranding(organizationName) {
    const displayName = organizationName || 'Duezy';
    const fullTitle = organizationName ? `Duezy for ${organizationName}` : 'Duezy – League dues, sorted.';
    
    // Update page title
    document.title = fullTitle;
    
    // Update navbar brand
    const navbarBrand = document.getElementById('navbarBrand');
    if (navbarBrand) {
        navbarBrand.innerHTML = `<i class="fas fa-pool me-2"></i>${fullTitle} <span class="badge bg-warning text-dark fs-6 fw-normal px-2 py-1 ms-2" title="This app is in beta. We're actively improving it.">Beta</span>`;
    }
    
    // Login screen always shows product name for branding
    const loginTitle = document.getElementById('loginScreenTitle');
    if (loginTitle) {
        loginTitle.textContent = 'Duezy';
    }
    
    // Store in global for later use
    window.appBranding = {
        organizationName: displayName,
        fullTitle: fullTitle
    };
}
