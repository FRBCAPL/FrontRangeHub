// Palette of division colors (same order as CSS classes)
const DIVISION_COLOR_PALETTE = [
    '#f44336',  // Red
    '#e91e63',  // Pink
    '#9c27b0',  // Purple
    '#673ab7',  // Deep Purple
    '#3f51b5',  // Indigo
    '#2196f3',  // Blue
    '#03a9f4',  // Light Blue
    '#00bcd4',  // Cyan
    '#009688',  // Teal
    '#4caf50',  // Green
    '#8bc34a',  // Light Green
    '#ff9800'   // Orange
];

// Normalize hex color for comparison (lowercase, expand 3-char to 6-char)
function normalizeHexColor(hex) {
    if (!hex || typeof hex !== 'string') return '';
    let h = hex.trim().toLowerCase();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return h ? '#' + h : '';
}

// Return a division color not already in use by existing divisions
function getUnusedDivisionColor() {
    const usedColors = new Set();
    if (typeof divisions !== 'undefined' && divisions) {
        divisions.forEach(d => {
            if (d.color) {
                const norm = normalizeHexColor(d.color);
                if (norm) usedColors.add(norm);
            }
        });
    }
    const paletteNorm = DIVISION_COLOR_PALETTE.map(normalizeHexColor);
    for (let i = 0; i < paletteNorm.length; i++) {
        if (!usedColors.has(paletteNorm[i])) {
            return DIVISION_COLOR_PALETTE[i];
        }
    }
    return '#607d8b'; // Fallback slate if all 12 are used
}

function getDivisionColor(divisionName) {
    if (!divisionName) return '#607d8b'; // Default slate color (matches division-default)
    
    // Find the division object (case-insensitive, trimmed comparison)
    const divisionNameTrimmed = divisionName.trim();
    const division = divisions.find(d => {
        if (!d.name) return false;
        const dNameTrimmed = d.name.trim();
        // Try exact match first
        if (dNameTrimmed === divisionNameTrimmed) return true;
        // Try case-insensitive match
        if (dNameTrimmed.toLowerCase() === divisionNameTrimmed.toLowerCase()) return true;
        return false;
    });
    
    // If division has a stored color, use it
    if (division && division.color) {
        return division.color;
    }
    
    // Otherwise, use the same color mapping as getDivisionClass to match the division badge
    // This ensures the player count badge matches the division badge color
    let hash = 0;
    const name = divisionName.toLowerCase().trim();
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get a color index (same as getDivisionClass)
    const colorIndex = Math.abs(hash) % 12; // 12 different colors
    
    return DIVISION_COLOR_PALETTE[colorIndex] || '#607d8b'; // Fallback to slate
}
