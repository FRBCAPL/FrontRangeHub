function isDivisionArchivedRecord(d) {
    return d && (d.isArchived === true || d.isArchived === 'true');
}

function skipTempDivision(d) {
    if (!d) return true;
    if (d._id && d._id.startsWith('temp_')) return true;
    if (d.id && d.id.startsWith('temp_')) return true;
    if (!d.isActive && d.description === 'Temporary') return true;
    return false;
}

/** Active (non-archived) divisions from the main `divisions` list. */
function getActiveDivisionsForRestore() {
    const list = typeof divisions !== 'undefined' && Array.isArray(divisions) ? divisions : [];
    return list.filter((d) => {
        if (skipTempDivision(d)) return false;
        if (isDivisionArchivedRecord(d)) return false;
        return d.isActive !== false;
    });
}

async function unarchiveDivisionWithDoc(divisionId, divisionDoc) {
    if (!divisionDoc) {
        throw new Error('Missing division record to reactivate. Try refreshing the page.');
    }
    const update = { ...divisionDoc, isArchived: false, archivedAt: null };
    const putRes = await apiCall(`/divisions/${divisionId}`, {
        method: 'PUT',
        body: JSON.stringify(update)
    });
    if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reactivate division.');
    }
}

async function showRestoreTeamModal(team, teamId) {
    const modal = document.getElementById('restoreTeamModal');
    const teamNameEl = document.getElementById('restoreTeamName');
    const divisionSelect = document.getElementById('restoreTeamDivision');
    const noDivisionsEl = document.getElementById('restoreTeamNoDivisions');
    const divisionSelectContainer = document.getElementById('restoreTeamDivisionSelect');
    const confirmBtn = document.getElementById('confirmRestoreTeamBtn');

    if (!modal || !teamNameEl || !divisionSelect || !confirmBtn) {
        const confirmed = confirm(
            `Restore "${team.teamName}"?\n\nThe team will be restored and will appear in the main teams list again.`
        );
        if (confirmed) {
            await executeRestoreTeam(team, teamId, team.division || null);
        }
        return;
    }

    teamNameEl.textContent = `"${team.teamName}"`;
    divisionSelect.innerHTML = '<option value="">Loading divisions…</option>';
    divisionSelect.disabled = true;
    noDivisionsEl.style.display = 'none';
    divisionSelectContainer.style.display = 'block';
    confirmBtn.disabled = true;

    let archivedFromApi = [];
    try {
        const archRes = await apiCall('/divisions?archivedOnly=true');
        if (archRes && archRes.ok) {
            archivedFromApi = await archRes.json();
        }
    } catch (e) {
        archivedFromApi = [];
    }

    const activeFromMain = getActiveDivisionsForRestore();
    const archivedFromApiFiltered = (Array.isArray(archivedFromApi) ? archivedFromApi : []).filter((d) => {
        if (skipTempDivision(d)) return false;
        return isDivisionArchivedRecord(d);
    });
    const archivedFromMainList = (typeof divisions !== 'undefined' && Array.isArray(divisions) ? divisions : []).filter(
        (d) => !skipTempDivision(d) && isDivisionArchivedRecord(d)
    );
    const archivedById = new Map();
    [...archivedFromApiFiltered, ...archivedFromMainList].forEach((d) => {
        const id = String(d._id || d.id || '');
        if (id && !archivedById.has(id)) archivedById.set(id, d);
    });
    const archivedOnly = [...archivedById.values()];

    const activeIds = new Set(
        activeFromMain.map((d) => String(d._id || d.id || '')).filter(Boolean)
    );
    const restoreChoices = [
        ...activeFromMain.map((division) => ({ division, needsDivisionRestore: false })),
        ...archivedOnly
            .filter((d) => !activeIds.has(String(d._id || d.id || '')))
            .map((division) => ({ division, needsDivisionRestore: true }))
    ];

    divisionSelect.innerHTML = '<option value="">Select Division</option>';
    divisionSelect.disabled = false;

    const matchesTeamDivision = (division) => {
        if (typeof window.teamDivisionMatchesDivisionRecord === 'function') {
            return window.teamDivisionMatchesDivisionRecord(team, division);
        }
        const t = (team.division || '').trim();
        const n = (division.name || '').trim();
        if (!t || !n) return false;
        return t === n || t.toLowerCase() === n.toLowerCase();
    };

    /** @type {Record<string, object>} full division docs for archived rows (PUT needs full body on some APIs) */
    const archivedDivisionDocById = {};
    restoreChoices.forEach(({ division, needsDivisionRestore }) => {
        if (needsDivisionRestore) {
            const id = String(division._id || division.id || '');
            if (id) archivedDivisionDocById[id] = division;
        }
    });
    modal._restoreTeamArchivedDivisionById = archivedDivisionDocById;

    if (restoreChoices.length === 0) {
        noDivisionsEl.style.display = 'block';
        divisionSelectContainer.style.display = 'none';
        confirmBtn.disabled = true;
    } else {
        noDivisionsEl.style.display = 'none';
        divisionSelectContainer.style.display = 'block';

        restoreChoices.forEach(({ division, needsDivisionRestore }) => {
            const option = document.createElement('option');
            const id = division._id || division.id;
            option.value = id ? String(id) : '';
            option.dataset.divisionName = division.name || '';
            option.dataset.needsDivisionRestore = needsDivisionRestore ? '1' : '';
            option.textContent =
                (division.name || 'Division') +
                (needsDivisionRestore ? ' (archived — reactivates division)' : '');
            if (matchesTeamDivision(division)) {
                option.selected = true;
            }
            divisionSelect.appendChild(option);
        });

        confirmBtn.disabled = !divisionSelect.value;
    }

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    divisionSelect.onchange = function () {
        newConfirmBtn.disabled = !divisionSelect.value;
    };

    newConfirmBtn.addEventListener('click', async () => {
        const selectedDivisionEl = document.getElementById('restoreTeamDivision');
        const opt = selectedDivisionEl && selectedDivisionEl.selectedOptions && selectedDivisionEl.selectedOptions[0];
        const divisionId = selectedDivisionEl ? selectedDivisionEl.value : '';
        const divisionName = opt && opt.dataset ? opt.dataset.divisionName || '' : '';
        const needsDivisionRestore = opt && opt.dataset && opt.dataset.needsDivisionRestore === '1';

        if (restoreChoices.length > 0 && !divisionId) {
            showAlertModal('Please select a division to restore the team to.', 'warning', 'Selection Required');
            return;
        }

        if (restoreChoices.length === 0) {
            showAlertModal(
                'Cannot restore team: No divisions available. Create a new division or contact support.',
                'error',
                'No Divisions'
            );
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
            return;
        }

        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();

        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach((backdrop) => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 100);

        try {
            if (needsDivisionRestore && divisionId) {
                const payloads = modal._restoreTeamArchivedDivisionById || {};
                const divDoc = payloads[divisionId];
                showLoadingMessage('Reactivating division…');
                await unarchiveDivisionWithDoc(divisionId, divDoc);
                if (typeof loadDivisions === 'function') await loadDivisions();
                hideLoadingMessage();
            }
            await executeRestoreTeam(team, teamId, divisionName || null);
        } catch (e) {
            hideLoadingMessage();
            console.error(e);
            showAlertModal(e.message || 'Could not restore team or division.', 'error', 'Error');
        }
    });

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

if (typeof window !== 'undefined') {
    window.showRestoreTeamModal = showRestoreTeamModal;
}
