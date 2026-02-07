/**
 * User feedback modal: send comments, suggestions, bug reports to admin.
 */

function showFeedbackModal() {
    try {
        const modal = document.getElementById('feedbackModal');
        if (!modal) {
            console.error('Feedback modal not found');
            if (typeof showAlertModal === 'function') {
                showAlertModal('Feedback form could not be opened. Please refresh and try again.', 'error', 'Error');
            }
            return;
        }
        const form = document.getElementById('feedbackForm');
        const msgEl = document.getElementById('feedbackMessage');
        const charCount = document.getElementById('feedbackCharCount');
        const formError = document.getElementById('feedbackFormError');
        const formSuccess = document.getElementById('feedbackFormSuccess');
        if (form) form.reset();
        if (msgEl) msgEl.value = '';
        if (charCount) charCount.textContent = '0';
        if (formError) { formError.style.display = 'none'; formError.textContent = ''; }
        if (formSuccess) { formSuccess.style.display = 'none'; formSuccess.textContent = ''; }
        if (msgEl && !window._feedbackCharListener) {
            window._feedbackCharListener = true;
            msgEl.addEventListener('input', function () {
                if (charCount) charCount.textContent = (msgEl.value || '').length;
            });
        }
        const m = window.bootstrap && bootstrap.Modal.getOrCreateInstance(modal);
        if (m) m.show();
    } catch (err) {
        console.error('Error showing feedback modal:', err);
        if (typeof showAlertModal === 'function') {
            showAlertModal('Error opening feedback form. Please try again.', 'error', 'Error');
        }
    }
}

async function submitFeedback() {
    const msgEl = document.getElementById('feedbackMessage');
    const typeEl = document.getElementById('feedbackType');
    const formError = document.getElementById('feedbackFormError');
    const formSuccess = document.getElementById('feedbackFormSuccess');
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    if (!msgEl || !typeEl) return;
    const message = (msgEl.value || '').trim();
    if (!message) {
        if (formError) {
            formError.textContent = 'Please enter a message.';
            formError.style.display = 'block';
        }
        if (formSuccess) formSuccess.style.display = 'none';
        return;
    }
    if (typeof apiCall !== 'function') {
        if (formError) {
            formError.textContent = 'App not ready. Please refresh and try again.';
            formError.style.display = 'block';
        }
        return;
    }
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Sending...';
    }
    if (formError) { formError.style.display = 'none'; formError.textContent = ''; }
    if (formSuccess) formSuccess.style.display = 'none';
    try {
        const response = await apiCall('/feedback', {
            method: 'POST',
            body: JSON.stringify({
                message: message,
                feedbackType: (typeEl.value || 'suggestion')
            })
        });
        const data = response.ok ? await response.json().catch(function () { return {}; }) : {};
        if (response.ok && (data.sent || data.success !== false)) {
            if (formSuccess) {
                formSuccess.textContent = 'Thanks! Your feedback has been sent to the admin.';
                formSuccess.style.display = 'block';
            }
            if (formError) formError.style.display = 'none';
            if (msgEl) msgEl.value = '';
            const charCount = document.getElementById('feedbackCharCount');
            if (charCount) charCount.textContent = '0';
            setTimeout(function () {
                const modal = document.getElementById('feedbackModal');
                if (modal && window.bootstrap && bootstrap.Modal.getInstance(modal)) {
                    bootstrap.Modal.getInstance(modal).hide();
                }
            }, 1500);
        } else {
            const errMsg = (data && data.message) ? data.message : (response.status === 401 ? 'Please log in again.' : 'Failed to send. Please try again.');
            if (formError) {
                formError.textContent = errMsg;
                formError.style.display = 'block';
            }
            if (formSuccess) formSuccess.style.display = 'none';
        }
    } catch (err) {
        console.error('Feedback submit error:', err);
        if (formError) {
            formError.textContent = err.message || 'Network error. Please try again.';
            formError.style.display = 'block';
        }
        if (formSuccess) formSuccess.style.display = 'none';
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText || '<i class="fas fa-paper-plane me-1"></i>Send';
        }
    }
}
