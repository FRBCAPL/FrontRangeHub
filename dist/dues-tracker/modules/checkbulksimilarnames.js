/**
 * Check all player names from Smart Builder import against existing players
 * Returns object with all potential matches for user review
 */
function checkBulkSimilarPlayerNames(teamsToImport) {
    if (!teamsToImport || teamsToImport.length === 0) return { hasSimilarNames: false, matches: [] };
    
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Collect all existing player names from all teams
    const existingPlayers = new Map(); // normalized name -> original name
    
    if (teams && Array.isArray(teams)) {
        teams.forEach(team => {
            if (team.captainName) {
                const norm = normName(team.captainName);
                if (!existingPlayers.has(norm)) {
                    existingPlayers.set(norm, { name: team.captainName, teams: [team.teamName] });
                } else {
                    existingPlayers.get(norm).teams.push(team.teamName);
                }
            }
            
            if (team.teamMembers && Array.isArray(team.teamMembers)) {
                team.teamMembers.forEach(member => {
                    if (member.name) {
                        const norm = normName(member.name);
                        if (!existingPlayers.has(norm)) {
                            existingPlayers.set(norm, { name: member.name, teams: [team.teamName] });
                        } else if (!existingPlayers.get(norm).teams.includes(team.teamName)) {
                            existingPlayers.get(norm).teams.push(team.teamName);
                        }
                    }
                });
            }
        });
    }
    
    // Collect all incoming player names
    const incomingPlayers = [];
    teamsToImport.forEach((team, teamIndex) => {
        if (team.captain) {
            incomingPlayers.push({ name: team.captain, teamName: team.name, teamIndex, isCaptain: true });
        }
        if (team.players && Array.isArray(team.players)) {
            team.players.forEach(playerName => {
                if (playerName && playerName !== team.captain) {
                    incomingPlayers.push({ name: playerName, teamName: team.name, teamIndex, isCaptain: false });
                }
            });
        }
    });
    
    const matches = [];
    const processedPairs = new Set(); // Avoid duplicate match entries
    
    incomingPlayers.forEach(incoming => {
        const incomingNorm = normName(incoming.name);
        const incomingParts = incomingNorm.split(' ').filter(p => p.length > 0);
        
        existingPlayers.forEach((existing, existingNorm) => {
            // Skip if exact normalized match (same person, already handled by normalization)
            if (incomingNorm === existingNorm) return;
            
            const pairKey = `${incomingNorm}|${existingNorm}`;
            if (processedPairs.has(pairKey)) return;
            
            const existingParts = existingNorm.split(' ').filter(p => p.length > 0);
            let reason = null;
            let confidence = 'low';
            
            // Check for partial matches
            if (incomingParts.length >= 2 && existingParts.length >= 2) {
                const incomingFirst = incomingParts[0];
                const incomingLast = incomingParts[incomingParts.length - 1];
                const existingFirst = existingParts[0];
                const existingLast = existingParts[existingParts.length - 1];
                
                // Same last name
                if (incomingLast === existingLast) {
                    if (incomingFirst === existingFirst) {
                        reason = 'same first and last name (possible duplicate)';
                        confidence = 'high';
                    } else if (incomingFirst.startsWith(existingFirst) || existingFirst.startsWith(incomingFirst)) {
                        reason = 'similar first name, same last name';
                        confidence = 'medium';
                    } else if (levenshteinDistance(incomingFirst, existingFirst) <= 2) {
                        reason = 'possible typo in first name, same last name';
                        confidence = 'medium';
                    }
                }
                
                // Reversed name order
                if (!reason && incomingParts.length === 2 && existingParts.length === 2) {
                    if (incomingParts[0] === existingParts[1] && incomingParts[1] === existingParts[0]) {
                        reason = 'reversed name order';
                        confidence = 'high';
                    }
                }
            }
            
            if (reason) {
                processedPairs.add(pairKey);
                matches.push({
                    incomingName: incoming.name,
                    incomingTeam: incoming.teamName,
                    incomingTeamIndex: incoming.teamIndex,
                    existingName: existing.name,
                    existingTeams: existing.teams,
                    reason: reason,
                    confidence: confidence,
                    useExisting: false // User's choice: true = use existing name, false = keep incoming name
                });
            }
        });
    });
    
    // Sort by confidence (high first)
    matches.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.confidence] - order[b.confidence];
    });
    
    return {
        hasSimilarNames: matches.length > 0,
        matches: matches
    };
}

/**
 * Show modal for bulk name review before Smart Builder import
 * Returns promise that resolves to user's choices
 */
function showBulkSimilarNameModal(matches) {
    return new Promise((resolve) => {
        const highConfidence = matches.filter(m => m.confidence === 'high');
        const mediumConfidence = matches.filter(m => m.confidence === 'medium');
        
        const modalHtml = `
            <div class="modal fade" id="bulkSimilarNameModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle me-2"></i>Similar Names Found (${matches.length})
                            </h5>
                        </div>
                        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                            <p class="mb-3">The following players being imported have similar names to existing players. Please review each one:</p>
                            
                            ${highConfidence.length > 0 ? `
                                <h6 class="text-danger mb-2"><i class="fas fa-exclamation-circle me-1"></i>High Confidence Matches</h6>
                                <div class="mb-3">
                                    ${highConfidence.map((match, idx) => createMatchRow(match, idx, 'high')).join('')}
                                </div>
                            ` : ''}
                            
                            ${mediumConfidence.length > 0 ? `
                                <h6 class="text-warning mb-2"><i class="fas fa-question-circle me-1"></i>Possible Matches</h6>
                                <div class="mb-3">
                                    ${mediumConfidence.map((match, idx) => createMatchRow(match, idx + highConfidence.length, 'medium')).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="alert alert-info mt-3 mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Tip:</strong> Selecting "Use existing" will use the name exactly as it appears in your system, ensuring consistent records.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" id="bulkNameSelectAllExisting">
                                <i class="fas fa-check-double me-1"></i>Use All Existing
                            </button>
                            <button type="button" class="btn btn-outline-secondary" id="bulkNameSelectAllNew">
                                <i class="fas fa-user-plus me-1"></i>Keep All Incoming
                            </button>
                            <button type="button" class="btn btn-secondary" id="bulkNameCancel">Cancel Import</button>
                            <button type="button" class="btn btn-primary" id="bulkNameContinue">
                                <i class="fas fa-check me-1"></i>Continue with Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.getElementById('bulkSimilarNameModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalEl = document.getElementById('bulkSimilarNameModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // Handle button clicks
        document.getElementById('bulkNameSelectAllExisting').addEventListener('click', () => {
            document.querySelectorAll('.bulk-name-choice[value="existing"]').forEach(radio => {
                radio.checked = true;
            });
        });
        
        document.getElementById('bulkNameSelectAllNew').addEventListener('click', () => {
            document.querySelectorAll('.bulk-name-choice[value="new"]').forEach(radio => {
                radio.checked = true;
            });
        });
        
        document.getElementById('bulkNameContinue').addEventListener('click', () => {
            // Collect user's choices
            const choices = [];
            matches.forEach((match, idx) => {
                const useExisting = document.querySelector(`input[name="nameChoice_${idx}"]:checked`)?.value === 'existing';
                choices.push({
                    ...match,
                    useExisting: useExisting
                });
            });
            modal.hide();
            resolve({ action: 'continue', choices: choices });
        });
        
        document.getElementById('bulkNameCancel').addEventListener('click', () => {
            modal.hide();
            resolve({ action: 'cancel', choices: [] });
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
        });
        
        modal.show();
    });
}

function createMatchRow(match, idx, confidence) {
    const confidenceClass = confidence === 'high' ? 'border-danger' : 'border-warning';
    const confidenceBadge = confidence === 'high' 
        ? '<span class="badge bg-danger">Likely Same Person</span>' 
        : '<span class="badge bg-warning text-dark">Possible Match</span>';
    
    return `
        <div class="card mb-2 ${confidenceClass}">
            <div class="card-body py-2 px-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            ${confidenceBadge}
                            <small class="text-muted">${match.reason}</small>
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted d-block">Importing:</small>
                                <strong>${match.incomingName}</strong>
                                <small class="text-muted d-block">Team: ${match.incomingTeam}</small>
                            </div>
                            <div class="col-6">
                                <small class="text-muted d-block">Existing:</small>
                                <strong>${match.existingName}</strong>
                                <small class="text-muted d-block">Team(s): ${match.existingTeams.join(', ')}</small>
                            </div>
                        </div>
                    </div>
                    <div class="ms-3">
                        <div class="btn-group-vertical btn-group-sm" role="group">
                            <input type="radio" class="btn-check bulk-name-choice" name="nameChoice_${idx}" id="nameNew_${idx}" value="new" checked>
                            <label class="btn btn-outline-primary" for="nameNew_${idx}">
                                Keep "${match.incomingName}"
                            </label>
                            <input type="radio" class="btn-check bulk-name-choice" name="nameChoice_${idx}" id="nameExisting_${idx}" value="existing">
                            <label class="btn btn-outline-success" for="nameExisting_${idx}">
                                Use "${match.existingName}"
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Apply user's name choices to the team data before creating teams
 * Modifies the fargoTeamData in place
 */
function applyNameChoicesToTeamData(fargoTeamData, choices) {
    if (!choices || choices.length === 0) return;
    
    const normName = typeof normPlayerKey === 'function' ? normPlayerKey : (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Build a map of incoming name -> existing name for replacements
    const replacements = new Map();
    choices.forEach(choice => {
        if (choice.useExisting) {
            replacements.set(normName(choice.incomingName), choice.existingName);
        }
    });
    
    if (replacements.size === 0) return;
    
    // Apply replacements to team data
    fargoTeamData.forEach(team => {
        // Check captain
        if (team.captain) {
            const norm = normName(team.captain);
            if (replacements.has(norm)) {
                console.log(`Replacing captain name: "${team.captain}" -> "${replacements.get(norm)}"`);
                team.captain = replacements.get(norm);
            }
        }
        
        // Check players
        if (team.players && Array.isArray(team.players)) {
            team.players = team.players.map(playerName => {
                const norm = normName(playerName);
                if (replacements.has(norm)) {
                    console.log(`Replacing player name: "${playerName}" -> "${replacements.get(norm)}"`);
                    return replacements.get(norm);
                }
                return playerName;
            });
        }
    });
}
