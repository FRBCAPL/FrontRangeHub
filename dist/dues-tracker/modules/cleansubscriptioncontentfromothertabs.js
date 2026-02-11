function cleanSubscriptionContentFromOtherTabs() {
    const subscriptionPane = document.getElementById('subscription-pane');
    const nonSubscriptionTabs = ['profile-pane', 'financial-pane', 'sanction-pane'];
    
    // FIRST: Ensure subscription-pane is the ONLY place with subscription content
    // Remove subscriptionInfo and availablePlans from ANYWHERE except subscription-pane
    const allSubscriptionInfo = document.querySelectorAll('#subscriptionInfo');
    const allAvailablePlans = document.querySelectorAll('#availablePlans');
    
    allSubscriptionInfo.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing subscriptionInfo from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    allAvailablePlans.forEach(el => {
        if (!subscriptionPane || !subscriptionPane.contains(el)) {
            console.warn(`🧹 Removing availablePlans from wrong location:`, el.parentElement?.id || 'unknown');
            el.remove();
        }
    });
    
    // Now clean each non-subscription tab - ONLY remove subscription-specific elements
    nonSubscriptionTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (!tab) return;
        
        // DON'T hide tabs here - that's handled by the tab switching logic
        // Only remove subscription-specific content
        
        // Remove subscriptionInfo div (should never be in other tabs)
        const subscriptionInfo = tab.querySelector('#subscriptionInfo');
        if (subscriptionInfo) {
            console.warn(`🧹 Removing subscriptionInfo from ${tabId}`);
            subscriptionInfo.remove();
        }
        
        // Remove availablePlans div (should never be in other tabs)
        const availablePlans = tab.querySelector('#availablePlans');
        if (availablePlans) {
            console.warn(`🧹 Removing availablePlans from ${tabId}`);
            availablePlans.remove();
        }
        
        // Remove subscription cards - but be VERY specific to avoid removing legitimate cards
        const allCards = tab.querySelectorAll('.card');
        allCards.forEach(card => {
            // Skip if card is in subscription-pane (shouldn't happen, but double-check)
            if (subscriptionPane && subscriptionPane.contains(card)) {
                return;
            }
            
            // Only remove if it has VERY specific subscription indicators
            const hasSubscriptionHeader = card.querySelector('.subscription-plan-header');
            const hasAvailablePlansDiv = card.querySelector('#availablePlans');
            const hasSubscriptionInfoDiv = card.querySelector('#subscriptionInfo');
            
            // Check text content for subscription-specific phrases (be very specific)
            const cardText = card.textContent || '';
            const hasUsageLimits = cardText.includes('Usage & Limits') && cardText.includes('teams') && cardText.includes('divisions');
            const hasUpgradePlans = cardText.includes('Available Upgrade Plans') || cardText.includes('Upgrade Your Plan');
            const hasTrialInfo = cardText.includes('Trial Active') || cardText.includes('30-Day Enterprise Trial');
            
            // Only remove if it's clearly a subscription card
            if (hasSubscriptionHeader || hasAvailablePlansDiv || hasSubscriptionInfoDiv || 
                (hasUsageLimits && hasUpgradePlans) || hasTrialInfo) {
                console.warn(`🧹 Removing subscription card from ${tabId}`);
                card.remove();
            }
        });
        
        // Remove subscription-plan-header divs
        const subscriptionDivs = tab.querySelectorAll('.subscription-plan-header');
        subscriptionDivs.forEach(div => {
            if (!subscriptionPane || !subscriptionPane.contains(div)) {
                console.warn(`🧹 Removing subscription div from ${tabId}`);
                div.remove();
            }
        });
    });
}
