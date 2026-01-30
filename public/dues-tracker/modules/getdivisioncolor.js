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
    
    // Return the hex color that matches the CSS class colors
    const colorMap = [
        '#f44336',  // Red (division-color-0)
        '#e91e63',  // Pink (division-color-1)
        '#9c27b0',  // Purple (division-color-2)
        '#673ab7',  // Deep Purple (division-color-3)
        '#3f51b5',  // Indigo (division-color-4)
        '#2196f3',  // Blue (division-color-5)
        '#03a9f4',  // Light Blue (division-color-6)
        '#00bcd4',  // Cyan (division-color-7)
        '#009688',  // Teal (division-color-8)
        '#4caf50',  // Green (division-color-9)
        '#8bc34a',  // Light Green (division-color-10)
        '#ff9800'   // Orange (division-color-11)
    ];
    
    return colorMap[colorIndex] || '#607d8b'; // Fallback to slate
}
