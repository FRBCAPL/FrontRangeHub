/* Edit Division modal - Financial tab: lock saved fields as read-only on load, individual edit icons to unlock */

const DIVISION_FINANCIAL_FIELD_IDS = [
    'divisionWeeklyDues',
    'divisionPrizeFundPercentage', 'divisionFirstOrgPercentage', 'divisionSecondOrgPercentage',
    'divisionPrizeFundAmount', 'divisionFirstOrganizationAmount', 'divisionSecondOrganizationAmount'
];
const DIVISION_FINANCIAL_DISTRIBUTION_IDS = [
    'divisionPrizeFundPercentage', 'divisionFirstOrgPercentage', 'divisionSecondOrgPercentage',
    'divisionPrizeFundAmount', 'divisionFirstOrganizationAmount', 'divisionSecondOrganizationAmount'
];
const DIVISION_FINANCIAL_RADIO_NAMES = [
    'divisionCalculationMethod',
    'divisionPrizeFundAmountType', 'divisionFirstOrgAmountType', 'divisionSecondOrgAmountType'
];
const DIVISION_CALCULATION_METHOD_RADIO = 'divisionCalculationMethod';

function hasDivisionDistributionValuesInForm() {
    return DIVISION_FINANCIAL_DISTRIBUTION_IDS.some(id => {
        const el = document.getElementById(id);
        return el && String(el.value || '').trim() !== '';
    });
}

/** Show "Using default" badge or "Override" notice based on division and form state */
function updateDivisionFinancialDefaultIndicator(division) {
    const usingDefaultBadge = document.getElementById('divisionFinancialUsingDefaultBadge');
    const overrideNotice = document.getElementById('divisionFinancialOverrideNotice');
    const useDefaultBtn = document.getElementById('divisionUseDefaultBtn');
    if (!usingDefaultBadge || !overrideNotice) return;

    const hasSaved = division && hasDivisionSavedFinancialSettings(division);
    const hasFormValues = hasDivisionDistributionValuesInForm();

    if (hasSaved || hasFormValues) {
        usingDefaultBadge.style.display = 'none';
        overrideNotice.style.display = 'flex';
        if (useDefaultBtn) useDefaultBtn.disabled = false;
    } else {
        usingDefaultBadge.style.display = 'flex';
        overrideNotice.style.display = 'none';
        if (useDefaultBtn) useDefaultBtn.disabled = false;
    }
}

function hasDivisionSavedFinancialSettings(division) {
    if (!division) return false;
    const hasDues = division.duesPerPlayerPerMatch != null && division.duesPerPlayerPerMatch !== '';
    const hasPercent = (division.prize_fund_percentage != null && division.prize_fund_percentage !== '') ||
        (division.first_organization_percentage != null && division.first_organization_percentage !== '');
    const hasAmount = (division.prize_fund_amount != null && division.prize_fund_amount !== '') ||
        (division.first_organization_amount != null && division.first_organization_amount !== '');
    return hasDues || hasPercent || hasAmount;
}

function setDivisionFinancialFieldsEditable(fieldIds, radioNames, editable) {
    (fieldIds || []).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') el.disabled = !editable;
            else el.readOnly = !editable;
        }
    });
    (radioNames || []).forEach(name => {
        if (name === DIVISION_CALCULATION_METHOD_RADIO) {
            setDivisionCalculationMethodLocked(!editable);
        } else {
            document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                radio.disabled = !editable;
            });
        }
    });
}

function setDivisionCalculationMethodLocked(locked) {
    const radios = document.querySelectorAll(`input[name="${DIVISION_CALCULATION_METHOD_RADIO}"]`);
    radios.forEach(radio => {
        if (locked) {
            radio.disabled = false;
            radio.dataset.divisionLocked = 'true';
            radio.addEventListener('click', preventDivisionCalculationMethodChange, true);
        } else {
            radio.disabled = false;
            delete radio.dataset.divisionLocked;
            radio.removeEventListener('click', preventDivisionCalculationMethodChange, true);
        }
    });
}

function preventDivisionCalculationMethodChange(e) {
    if (e.target.dataset.divisionLocked === 'true') {
        e.preventDefault();
        e.stopPropagation();
    }
}

function setAllDivisionFinancialFieldsEditable(editable) {
    setDivisionFinancialFieldsEditable(DIVISION_FINANCIAL_FIELD_IDS, DIVISION_FINANCIAL_RADIO_NAMES, editable);
    setDivisionCalculationMethodLocked(!editable);
}

function applyDivisionFinancialFieldsLockState(division) {
    const hint = document.getElementById('divisionFinancialLockedHint');
    const editIcons = document.querySelectorAll('.division-financial-edit-icon');
    if (!hint) return;

    const saved = hasDivisionSavedFinancialSettings(division);
    if (saved) {
        const divHasExplicit = division.use_dollar_amounts != null || division.useDollarAmounts != null;
        const useDollar = divHasExplicit
            ? (division.use_dollar_amounts === true || division.use_dollar_amounts === 'true' ||
                division.use_dollar_amounts === 1 || division.useDollarAmounts === true)
            : (typeof currentOperator !== 'undefined' && (currentOperator?.use_dollar_amounts || currentOperator?.useDollarAmounts));
        const methodPct = document.getElementById('divisionMethodPercentage');
        const methodDollar = document.getElementById('divisionMethodDollarAmount');

        setAllDivisionFinancialFieldsEditable(false);

        if (methodPct && methodDollar) {
            if (useDollar) {
                methodPct.checked = false;
                methodDollar.checked = true;
            } else {
                methodPct.checked = true;
                methodDollar.checked = false;
            }
        }
        if (typeof toggleDivisionCalculationMethod === 'function') toggleDivisionCalculationMethod();

        hint.style.display = 'block';
        editIcons.forEach(icon => {
            icon.style.display = '';
            icon.classList.remove('fa-lock');
            icon.classList.add('fa-pen');
            icon.title = 'Edit';
        });
    } else {
        setAllDivisionFinancialFieldsEditable(true);
        hint.style.display = 'none';
        editIcons.forEach(icon => { icon.style.display = 'none'; });
    }
    updateDivisionFinancialDefaultIndicator(division);
}

function toggleDivisionFinancialFieldEdit(iconEl) {
    const group = iconEl?.closest('.division-financial-field-group');
    if (!group) return;

    const fieldsStr = group.dataset.fields || '';
    const radiosStr = group.dataset.radios || '';
    const fieldIds = fieldsStr ? fieldsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const radioNames = radiosStr ? radiosStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    setDivisionFinancialFieldsEditable(fieldIds, radioNames, true);

    iconEl.style.display = 'none';
}

function resetDivisionFinancialLockState() {
    setAllDivisionFinancialFieldsEditable(true);
    const hint = document.getElementById('divisionFinancialLockedHint');
    const editIcons = document.querySelectorAll('.division-financial-edit-icon');
    if (hint) hint.style.display = 'none';
    editIcons.forEach(icon => { icon.style.display = 'none'; });
    updateDivisionFinancialDefaultIndicator(null);
}

function getCurrentDivisionForIndicator() {
    try {
        if (typeof currentDivisionId !== 'undefined' && currentDivisionId && typeof divisions !== 'undefined' && Array.isArray(divisions))
            return divisions.find(d => d._id === currentDivisionId) || null;
    } catch (e) {}
    return null;
}

function setupDivisionFinancialDefaultIndicatorListeners() {
    if (window._divisionFinancialIndicatorListenersSetup) return;
    window._divisionFinancialIndicatorListenersSetup = true;
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id && DIVISION_FINANCIAL_DISTRIBUTION_IDS.indexOf(e.target.id) !== -1)
            updateDivisionFinancialDefaultIndicator(getCurrentDivisionForIndicator());
    });
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id && DIVISION_FINANCIAL_DISTRIBUTION_IDS.indexOf(e.target.id) !== -1)
            updateDivisionFinancialDefaultIndicator(getCurrentDivisionForIndicator());
    });
}

if (typeof window !== 'undefined') {
    window.applyDivisionFinancialFieldsLockState = applyDivisionFinancialFieldsLockState;
    window.toggleDivisionFinancialFieldEdit = toggleDivisionFinancialFieldEdit;
    window.resetDivisionFinancialLockState = resetDivisionFinancialLockState;
    window.updateDivisionFinancialDefaultIndicator = updateDivisionFinancialDefaultIndicator;
    window.hasDivisionSavedFinancialSettings = hasDivisionSavedFinancialSettings;
    setupDivisionFinancialDefaultIndicatorListeners();
}
