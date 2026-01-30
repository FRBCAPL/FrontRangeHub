function initializeModalTooltips(modalElement) {
    // Check if Bootstrap is available
    const Bootstrap = getBootstrap();
    if (!Bootstrap || !Bootstrap.Tooltip) {
        console.warn('Bootstrap Tooltip not available');
        return;
    }
    
    if (!modalElement) {
        return;
    }
    
    // Initialize all tooltips within the modal
    const tooltipTriggerList = modalElement.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        // Destroy existing tooltip if it exists
        const existingTooltip = Bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        try {
            new Bootstrap.Tooltip(tooltipTriggerEl);
        } catch (e) {
            console.warn('Failed to initialize tooltip:', e);
        }
    });
}
