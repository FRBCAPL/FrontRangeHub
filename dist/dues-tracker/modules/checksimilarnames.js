/**
 * Check if a player name is similar to existing players across all teams
 * Returns array of similar names found
 */
function checkSimilarPlayerNames(newName, currentTeamId = null) {
    if (!newName || !newName.trim()) return [];
    
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const newNameNorm = normName(newName);
    const newNameParts = newNameNorm.split(' ').filter(p => p.length > 0);
    
    // Collect all existing player names from all teams
    const existingPlayers = new Set();
    
    if (teams && Array.isArray(teams)) {
        teams.forEach(team => {
            // Skip checking against the same team if we're editing
            // (allow same names within a team for now, focus on cross-team duplicates)
            
            // Add captain
            if (team.captainName) {
                existingPlayers.add(team.captainName);
            }
            
            // Add team members
            if (team.teamMembers && Array.isArray(team.teamMembers)) {
                team.teamMembers.forEach(member => {
                    if (member.name) {
                        existingPlayers.add(member.name);
                    }
                });
            }
        });
    }
    
    const similarNames = [];
    
    existingPlayers.forEach(existingName => {
        const existingNorm = normName(existingName);
        
        // Skip if exact match (same person, already in system)
        if (existingNorm === newNameNorm) {
            // Only add if it's not the exact same string (case/spacing difference)
            if (existingName !== newName) {
                similarNames.push({
                    name: existingName,
                    reason: 'exact match (different formatting)',
                    confidence: 'high'
                });
            }
            return;
        }
        
        const existingParts = existingNorm.split(' ').filter(p => p.length > 0);
        
        // Check for partial matches
        // Case 1: Same last name, similar first name
        if (newNameParts.length >= 2 && existingParts.length >= 2) {
            const newFirst = newNameParts[0];
            const newLast = newNameParts[newNameParts.length - 1];
            const existingFirst = existingParts[0];
            const existingLast = existingParts[existingParts.length - 1];
            
            // Same last name
            if (newLast === existingLast) {
                // Check if first names are similar (nickname, abbreviation, etc.)
                if (newFirst === existingFirst) {
                    // Same first and last, different middle name/nickname
                    similarNames.push({
                        name: existingName,
                        reason: 'same first and last name',
                        confidence: 'high'
                    });
                } else if (newFirst.startsWith(existingFirst) || existingFirst.startsWith(newFirst)) {
                    // One is abbreviation of other (Bob/Robert, Mike/Michael)
                    similarNames.push({
                        name: existingName,
                        reason: 'similar first name, same last name',
                        confidence: 'medium'
                    });
                } else if (levenshteinDistance(newFirst, existingFirst) <= 2) {
                    // Typo or very similar (Jon/John, Sara/Sarah)
                    similarNames.push({
                        name: existingName,
                        reason: 'possible typo or similar first name, same last name',
                        confidence: 'medium'
                    });
                }
            }
        }
        
        // Case 2: Reversed name order (Smith John vs John Smith)
        if (newNameParts.length === 2 && existingParts.length === 2) {
            if (newNameParts[0] === existingParts[1] && newNameParts[1] === existingParts[0]) {
                similarNames.push({
                    name: existingName,
                    reason: 'reversed name order',
                    confidence: 'high'
                });
            }
        }
    });
    
    return similarNames;
}

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Used to detect typos and similar names
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    
    return matrix[len1][len2];
}

/**
 * Show modal asking user if similar names are the same person
 * Returns promise that resolves to user's choice
 */
function showSimilarNameConfirmation(newName, similarNames) {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="modal fade" id="similarNameModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>Similar Name Found
                            </h5>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">You're adding: <strong>${newName}</strong></p>
                            <p class="mb-2">This name is similar to existing player(s):</p>
                            <ul class="list-group mb-3">
                                ${similarNames.map(s => `
                                    <li class="list-group-item">
                                        <strong>${s.name}</strong>
                                        <br><small class="text-muted">${s.reason}</small>
                                    </li>
                                `).join('')}
                            </ul>
                            <p class="mb-0"><strong>Is this the same person?</strong></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-success" id="similarNameSamePerson">
                                <i class="fas fa-check me-1"></i>Yes, same person (use existing name)
                            </button>
                            <button type="button" class="btn btn-primary" id="similarNameDifferentPerson">
                                <i class="fas fa-user-plus me-1"></i>No, different person (continue)
                            </button>
                            <button type="button" class="btn btn-secondary" id="similarNameCancel">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing similar name modal
        const existingModal = document.getElementById('similarNameModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalEl = document.getElementById('similarNameModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // Handle button clicks
        document.getElementById('similarNameSamePerson').addEventListener('click', () => {
            modal.hide();
            // Return the existing name to use instead
            resolve({ action: 'use-existing', existingName: similarNames[0].name });
        });
        
        document.getElementById('similarNameDifferentPerson').addEventListener('click', () => {
            modal.hide();
            resolve({ action: 'continue', existingName: null });
        });
        
        document.getElementById('similarNameCancel').addEventListener('click', () => {
            modal.hide();
            resolve({ action: 'cancel', existingName: null });
        });
        
        // Clean up modal after it's hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
        });
        
        modal.show();
    });
}
