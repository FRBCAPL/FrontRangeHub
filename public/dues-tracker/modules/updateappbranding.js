function updateAppBranding(organizationName) {
    const displayName = organizationName || 'Dues Tracker';
    const fullTitle = `${displayName} - Dues Tracker`;
    
    // Update page title
    document.title = fullTitle;
    
    // Update navbar brand
    const navbarBrand = document.getElementById('navbarBrand');
    if (navbarBrand) {
        navbarBrand.innerHTML = `<i class="fas fa-pool me-2"></i>${fullTitle}`;
    }
    
    // Update login screen title (if visible)
    const loginTitle = document.getElementById('loginScreenTitle');
    if (loginTitle) {
        loginTitle.textContent = displayName;
    }
    
    // Store in global for later use
    window.appBranding = {
        organizationName: displayName,
        fullTitle: fullTitle
    };
}
