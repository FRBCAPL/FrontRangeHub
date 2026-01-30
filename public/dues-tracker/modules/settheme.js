function setTheme(theme) {
    const normalized = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
    applyTheme(normalized);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = normalized === 'dark';

    // Save per-account (best effort)
    saveThemeToProfile(normalized);
}
