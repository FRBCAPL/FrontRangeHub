function addTeamMember(name = '', email = '', bcaSanctionPaid = false, bcaPreviouslySanctioned = false, index = null) {
    const tbody = document.getElementById('teamMembersList');
    if (!tbody) {
        console.error('teamMembersList tbody not found');
        return;
    }
    
    // Create a table row instead of a div
    const newMemberRow = document.createElement('tr');
    newMemberRow.className = 'member-row';
    
    // Format the name if it's provided
    const formattedName = name ? formatPlayerName(name) : '';
    
    // Create a unique identifier for this player's radio buttons
    // Use the player name if available, otherwise use index or timestamp
    const uniqueId = formattedName ? formattedName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') : `player_${index || Date.now()}`;
    const radioName = `bcaSanctionPaid_${uniqueId}`;
    
    // Handle null/undefined email values - convert to empty string
    const emailValue = (email && email !== 'null' && email !== 'undefined') ? email : '';
    
    newMemberRow.innerHTML = `
        <td>
            <input type="text" class="form-control form-control-sm" placeholder="Player name" name="memberName" value="${formattedName}" oninput="updateCaptainDropdown()" onblur="handleNameInputBlur(this)">
        </td>
        <td>
            <input type="email" class="form-control form-control-sm" placeholder="Email (optional)" name="memberEmail" value="${emailValue}">
        </td>
        <td>
            <div class="bca-status-container">
                <div class="btn-group w-100" role="group" data-sanction-status-tooltip="true" title="${sanctionFeeName} Status: Pending/Paid = ${formatCurrency(sanctionFeeAmount)} fee | Previously = Already sanctioned">
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPending_${uniqueId}_${index || Date.now()}" value="false" ${!bcaSanctionPaid && !bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-warning btn-sm" for="bcaPending_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-clock"></i> Pending
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPaid_${uniqueId}_${index || Date.now()}" value="true" ${bcaSanctionPaid ? 'checked' : ''}>
                    <label class="btn btn-outline-success btn-sm" for="bcaPaid_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-check"></i> Paid
                    </label>
                    
                    <input type="radio" class="btn-check" name="${radioName}" id="bcaPreviously_${uniqueId}_${index || Date.now()}" value="previously" ${bcaPreviouslySanctioned ? 'checked' : ''}>
                    <label class="btn btn-outline-info btn-sm" for="bcaPreviously_${uniqueId}_${index || Date.now()}">
                        <i class="fas fa-history"></i> Previously
                    </label>
                </div>
            </div>
        </td>
        <td>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeMember(this)" title="Remove member">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(newMemberRow);
    updateCaptainDropdown();
}
