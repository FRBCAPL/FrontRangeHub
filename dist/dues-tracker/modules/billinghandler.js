function billingHandler (e) {
                if (e.target && e.target.matches && e.target.matches('input[name="dues-tracker-billing"]')) {
                    syncPlanPricesFromBillingToggle();
                }
            }
