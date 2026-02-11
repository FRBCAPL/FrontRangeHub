/**
 * Handle name input blur event - check for similar names
 * Called when user finishes entering a player name
 */
async function handleNameInputBlur(inputElement) {
    if (!inputElement || typeof checkSimilarPlayerNames !== 'function') {
        return; // Name checker not loaded
    }
    
    const newName = inputElement.value.trim();
    if (!newName) return; // Empty name, skip check
    
    // Check for similar names
    const similarNames = checkSimilarPlayerNames(newName);
    
    if (similarNames.length > 0) {
        // Show confirmation modal
        const result = await showSimilarNameConfirmation(newName, similarNames);
        
        if (result.action === 'use-existing') {
            // User confirmed it's the same person - use existing name
            inputElement.value = result.existingName;
            console.log(`Updated name from "${newName}" to "${result.existingName}"`);
        } else if (result.action === 'cancel') {
            // User cancelled - clear the input and focus it
            inputElement.value = '';
            inputElement.focus();
        }
        // If 'continue', do nothing - let them use the new name as entered
    }
}
