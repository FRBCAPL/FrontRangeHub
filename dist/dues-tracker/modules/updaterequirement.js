function updateRequirement(id, met) {
    const el = document.getElementById(id);
    if (el) {
        const icon = el.querySelector('i');
        if (icon) {
            icon.className = met ? 'fas fa-check text-success me-1' : 'fas fa-times text-danger me-1';
        }
        el.className = met ? 'text-success d-block' : 'text-muted d-block';
    }
}
