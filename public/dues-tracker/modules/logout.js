function logout() {
    if (pendingApprovalsIntervalId) {
        clearInterval(pendingApprovalsIntervalId);
        pendingApprovalsIntervalId = null;
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentOperator');
    authToken = null;
    currentOperator = null;
    showLoginScreen();
}
