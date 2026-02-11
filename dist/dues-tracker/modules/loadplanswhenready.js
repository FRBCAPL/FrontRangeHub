async function loadPlansWhenReady() {
                    let attempts = 0;
                    const maxAttempts = 15; // Increased attempts
                    
                    while (attempts < maxAttempts) {
                        // Make sure we're looking in the subscription-pane
                        const subscriptionPane = document.getElementById('subscription-pane');
                        const plansDiv = subscriptionPane ? subscriptionPane.querySelector('#availablePlans') : document.getElementById('availablePlans');
                        
                        if (plansDiv && subscriptionPane && subscriptionPane.contains(plansDiv)) {
                            console.log(`✅ Found availablePlans div in subscription-pane on attempt ${attempts + 1}`);
                            try {
                                await loadAvailablePlans(actualTier);
                                return; // Success, exit
                            } catch (err) {
                                console.error('❌ Error in loadAvailablePlans:', err);
                                return;
                            }
                        }
                        attempts++;
                        if (attempts % 3 === 0) {
                            console.log(`⏳ Waiting for availablePlans div in subscription-pane (attempt ${attempts}/${maxAttempts})...`);
                        }
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                    console.error('❌ availablePlans div not found in subscription-pane after', maxAttempts, 'attempts');
                    // Try one more time with loadAvailablePlans which has its own retry logic
                    try {
                        await loadAvailablePlans(actualTier);
                    } catch (err) {
                        console.error('❌ Final attempt to load plans failed:', err);
                    }
                }
