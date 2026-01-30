/* Financial tab: lock saved fields as read-only on load, individual edit icons to unlock */

const FINANCIAL_FIELD_IDS = [
    'profileDefaultDues',
    'profilePrizeFundPercentage', 'profilePrizeFundName',
    'profileFirstOrganizationPercentage', 'profileFirstOrganizationName',
    'profileSecondOrganizationPercentage', 'profileSecondOrganizationName',
    'profilePrizeFundAmount', 'profileFirstOrganizationAmount', 'profileSecondOrganizationAmount',
    'profileFirstOrganizationNameDollar', 'profileSecondOrganizationNameDollar'
];
const FINANCIAL_RADIO_NAMES = [
    'prizeFundAmountType', 'firstOrganizationAmountType', 'secondOrganizationAmountType'
];
const CALCULATION_METHOD_RADIO = 'calculationMethod';

function hasSavedFinancialSettings(operator) {
    if (!operator) return false;
    const hasDues = operator.default_dues_per_player_per_match != null && operator.default_dues_per_player_per_match !== '';
    const hasPercent = operator.prize_fund_percentage != null && operator.prize_fund_percentage !== '';
    const hasAmount = operator.prize_fund_amount != null && operator.prize_fund_amount !== '';
    return hasDues || hasPercent || hasAmount;
}

function setFinancialFieldsEditable(fieldIds, radioNames, editable) {
    (fieldIds || []).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.readOnly = !editable;
    });
    (radioNames || []).forEach(name => {
        if (name === CALCULATION_METHOD_RADIO) {
            setCalculationMethodLocked(!editable);
        } else {
            document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                radio.disabled = !editable;
            });
        }
    });
}

function setCalculationMethodLocked(locked) {
    const radios = document.querySelectorAll(`input[name="${CALCULATION_METHOD_RADIO}"]`);
    radios.forEach(radio => {
        if (locked) {
            radio.disabled = false;
            radio.dataset.locked = 'true';
            radio.addEventListener('click', preventCalculationMethodChange, true);
        } else {
            radio.disabled = false;
            delete radio.dataset.locked;
            radio.removeEventListener('click', preventCalculationMethodChange, true);
        }
    });
}

function preventCalculationMethodChange(e) {
    if (e.target.dataset.locked === 'true') {
        e.preventDefault();
        e.stopPropagation();
    }
}

function setAllFinancialFieldsEditable(editable) {
    setFinancialFieldsEditable(FINANCIAL_FIELD_IDS, FINANCIAL_RADIO_NAMES, editable);
    setCalculationMethodLocked(!editable);
}

function applyFinancialFieldsLockState(operator) {
    const hint = document.getElementById('financialLockedHint');
    const editIcons = document.querySelectorAll('.financial-edit-icon');
    if (!hint) return;

    const saved = hasSavedFinancialSettings(operator);
    if (saved) {
        // Ensure calculation method radio reflects saved distribution type
        const useDollar = operator.use_dollar_amounts === true || operator.use_dollar_amounts === 'true' ||
            operator.use_dollar_amounts === 1 || operator.useDollarAmounts === true;
        const methodPct = document.getElementById('methodPercentage');
        const methodDollar = document.getElementById('methodDollarAmount');

        setAllFinancialFieldsEditable(false);

        // Set radio checked state AFTER locking - some browsers don't preserve checked when disabling
        if (methodPct && methodDollar) {
            if (useDollar) {
                methodPct.checked = false;
                methodDollar.checked = true;
            } else {
                methodPct.checked = true;
                methodDollar.checked = false;
            }
        }
        if (typeof toggleCalculationMethod === 'function') toggleCalculationMethod();

        hint.style.display = 'block';
        editIcons.forEach(icon => {
            icon.style.display = '';
            icon.classList.remove('fa-lock');
            icon.classList.add('fa-pen');
            icon.title = 'Edit';
        });
    } else {
        setAllFinancialFieldsEditable(true);
        hint.style.display = 'none';
        editIcons.forEach(icon => { icon.style.display = 'none'; });
    }
}

function toggleFinancialFieldEdit(iconEl) {
    const group = iconEl?.closest('.financial-field-group');
    if (!group) return;

    const fieldsStr = group.dataset.fields || '';
    const radiosStr = group.dataset.radios || '';
    const fieldIds = fieldsStr ? fieldsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const radioNames = radiosStr ? radiosStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    setFinancialFieldsEditable(fieldIds, radioNames, true);

    iconEl.style.display = 'none';
}

if (typeof window !== 'undefined') {
    window.applyFinancialFieldsLockState = applyFinancialFieldsLockState;
    window.toggleFinancialFieldEdit = toggleFinancialFieldEdit;
}
