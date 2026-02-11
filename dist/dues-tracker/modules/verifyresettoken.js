async function verifyResetToken(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/dues-tracker/verify-reset-token/${token}`);
            const data = await response.json();
            
            if (response.ok && data.valid) {
                // Show reset password modal
                document.getElementById('resetPasswordToken').value = token;
                document.getElementById('resetPasswordEmailDisplay').textContent = `Resetting password for: ${data.email}`;
                const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
                modal.show();
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert('Invalid or expired reset token. Please request a new password reset.');
            }
        } catch (error) {
            console.error('Error verifying reset token:', error);
            alert('Error verifying reset token. Please try again.');
        }
    }
