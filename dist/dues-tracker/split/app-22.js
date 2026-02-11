                            function estimateVisualWidth(text) {
                                let width = 0;
                                const wideChars = 'WMmw@';
                                const narrowChars = 'il1|![]{}()';
                                for (let char of text) {
                                    if (wideChars.includes(char)) {
                                        width += 1.3; // Wide characters
                                    } else if (narrowChars.includes(char)) {
                                        width += 0.6; // Narrow characters
                                    } else if (char === ' ') {
                                        width += 0.4; // Spaces
                                    } else {
                                        width += 1.0; // Normal characters
                                    }
                                }
                                return width;
                            }
                            
                            // Sort common features by visual width (shortest to longest)
                            // Manual override: "Payment management" should come after "Sanction fee tracking"
                            const commonFeatures = [
                                'Full dues tracking',
                                'Payment management',
                                'Sanction fee tracking',
                                'Team roster management',
                                'Financial breakdowns',
                                'Projection mode',
                                'Weekly payment tracking',
                                'Makeup match payments',
                                'Player status management'
                            ].sort((a, b) => {
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1; // Payment management comes after
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1; // Sanction fee tracking comes before
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                // If widths are equal, sort alphabetically
                                return a.localeCompare(b);
                            });
                            
                            // Features only include the common features (limits are shown separately)
                            let features = [...commonFeatures];
                            
                            // Add export/reporting feature for Pro and Enterprise plans only
                            if (tier === 'pro' || tier === 'enterprise') {
                                features.push('Data export & reporting');
                            }
                            
                            // Sort features again after adding export (to maintain visual width sorting)
                            features.sort((a, b) => {
                                // Keep export at the end
                                if (a === 'Data export & reporting') return 1;
                                if (b === 'Data export & reporting') return -1;
                                
                                // Manual ordering: Payment management after Sanction fee tracking
                                if (a === 'Payment management' && b === 'Sanction fee tracking') {
                                    return 1;
                                }
                                if (a === 'Sanction fee tracking' && b === 'Payment management') {
                                    return -1;
                                }
                                
                                const widthA = estimateVisualWidth(a);
                                const widthB = estimateVisualWidth(b);
                                if (widthA !== widthB) {
                                    return widthA - widthB;
                                }
                                return a.localeCompare(b);
                            });
                            const priceMonthly = plan.price_monthly != null ? parseFloat(plan.price_monthly) : (plan.price ? parseFloat(plan.price) : 0);
                            const priceYearly = plan.price_yearly != null ? parseFloat(plan.price_yearly) : null;
                            const badgeColor = tier === 'basic' ? 'primary' : 
                                             tier === 'pro' ? 'warning' : 'success';
                            const planName = plan.name || (tier.charAt(0).toUpperCase() + tier.slice(1));
                            const colSize = upgradePlans.length === 1 ? '12' : upgradePlans.length === 2 ? '6' : '4';
                            
                            return `
                                <div class="col-md-${colSize}">
                                    <div class="card h-100 border-2 ${tier === 'pro' ? 'border-warning shadow-sm' : ''}" data-plan-tier="${tier}">
                                        <div class="card-header bg-${badgeColor} text-white">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <h6 class="mb-0">
                                                    <i class="fas fa-star me-2"></i>${planName}
                                                </h6>
                                                <span class="badge bg-light text-dark plan-price-display" data-tier="${tier}" data-monthly="${priceMonthly}" data-yearly="${priceYearly != null ? priceYearly : ''}">${formatCurrency(priceMonthly)}/mo</span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            ${(() => {
                                                // Use simple short descriptions based on tier
                                                let shortDesc = '';
                                                if (tier === 'basic' || tier === 'free') {
                                                    shortDesc = 'Great for small leagues';
                                                } else if (tier === 'pro') {
                                                    shortDesc = 'Best for growing leagues';
                                                } else if (tier === 'enterprise') {
                                                    shortDesc = 'Excellent for large & established leagues';
                                                }
                                                return shortDesc ? `<p class="text-muted small mb-3">${shortDesc}</p>` : '';
                                            })()}
                                            
                                            ${tier !== 'enterprise' ? `
                                            <div class="mb-3">
                                                <strong>Limits:</strong>
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        ${plan.max_divisions === null || plan.max_divisions === undefined ? 'Unlimited' : plan.max_divisions} division${plan.max_divisions !== 1 ? 's' : ''}<br><span style="margin-left: 1.5rem;">(or ${Math.floor((plan.max_divisions || 0)/2)} double play)</span>
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_teams === null || plan.max_teams === undefined ? 'Unlimited' : plan.max_teams} teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Up to ${plan.max_team_members === null || plan.max_team_members === undefined ? 'Unlimited' : plan.max_team_members} players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        16 teams per division max
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        8 players per team roster
                                                    </li>
                                                </ul>
                                            </div>
                                            ` : `
                                            <div class="mb-3">
                                                <ul class="list-unstyled mt-2 mb-0 small">
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited divisions
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited players
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited teams per division
                                                    </li>
                                                    <li><i class="fas fa-check text-success me-2"></i>
                                                        Unlimited rosters
                                                    </li>
                                                </ul>
                                            </div>
                                            `}
                                            
                                            ${features.length > 0 ? `
                                                <div class="mb-3">
                                                    <strong>Features:</strong>
                                                    <ul class="list-unstyled mt-2 mb-0 small">
                                                        ${features.map(feature => `
                                                            <li><i class="fas fa-check text-success me-2"></i>${typeof feature === 'string' ? feature : JSON.stringify(feature)}</li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                            
                                            ${UPGRADES_DISABLED ? `
                                            <div class="p-2 mt-auto rounded bg-light text-dark small text-center">
                                                <i class="fas fa-envelope me-1"></i>Contact us to upgrade
                                            </div>
                                            ` : `
                                            <button class="btn btn-${badgeColor} w-100 mt-auto upgrade-plan-btn" data-tier="${tier}" data-plan-name="${(planName || '').replace(/"/g, '&quot;')}" onclick="upgradeToPlan('${tier}', '${planName.replace(/'/g, "\\'")}', this)">
                                                <i class="fas fa-arrow-up me-2"></i>Upgrade to ${planName}
                                            </button>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } catch (planError) {
                            console.error(`Error building HTML for plan ${index}:`, planError, plan);
                            return `<div class="col-12"><div class="alert alert-warning">Error displaying plan: ${planError.message}</div></div>`;
                        }
                    }).join('')}
                </div>
                ${((typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) || (typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO)) ? `
                <div class="alert alert-secondary mt-4 mb-0 text-center">
                    <h6 class="mb-2"><i class="fas fa-wallet me-2"></i>Or pay with Cash App or Venmo</h6>
                    <p class="small mb-2">Send the amount for your chosen plan (see above) via Cash App or Venmo. Include your <strong>email</strong> and <strong>plan name</strong> (e.g. Pro Monthly) in the payment note. We'll upgrade your account within 24–48 hours.</p>
                    <div class="small text-muted mb-2">Plan prices: ${upgradePlans.map(p => {
                        const name = p.name || ((p.tier || '').charAt(0).toUpperCase() + (p.tier || '').slice(1));
                        const mo = p.price_monthly != null ? formatCurrency(p.price_monthly) + '/mo' : null;
                        const yr = p.price_yearly != null ? formatCurrency(p.price_yearly) + '/yr' : null;
                        const parts = [mo, yr].filter(Boolean);
                        return name + ': ' + (parts.length ? parts.join(' or ') : '—');
                    }).join(' \u2022 ')}</div>
                    <div class="row g-3 mt-2 justify-content-center align-items-start">
                        ${(typeof DONATION_CASHAPP !== 'undefined' && DONATION_CASHAPP) ? `
                        <div class="col-auto">
                            <div class="text-center">
                                <img src="images/cashapp-qr.png" alt="Cash App QR — pay for subscription" class="rounded" style="width: 120px; height: 120px; object-fit: contain;">
                                <div class="small mt-1 fw-semibold">${String(DONATION_CASHAPP)}</div>
                                <a class="btn btn-sm btn-success mt-1" href="https://cash.app/${String(DONATION_CASHAPP).replace(/^\$/, '')}" target="_blank" rel="noopener"><i class="fas fa-dollar-sign me-1"></i>Cash App</a>
                            </div>
                        </div>
                        ` : ''}
                        ${(typeof DONATION_VENMO !== 'undefined' && DONATION_VENMO) ? `
                        <div class="col-auto">
                            <div class="text-center">
                                <img src="images/venmo-qr.png" alt="Venmo QR — pay for subscription" class="rounded" style="width: 120px; height: 120px; object-fit: contain;">
                                <div class="small mt-1 fw-semibold">${String(DONATION_VENMO)}</div>
                                <a class="btn btn-sm btn-primary mt-1" href="https://venmo.com/u/${String(DONATION_VENMO).replace(/^@/, '').replace(/^u\/?/i, '')}" target="_blank" rel="noopener">Venmo</a>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
            `;
            
            console.log('Plans HTML generated, length:', plansHTML.length);
            console.log('Setting plans HTML, element exists:', !!availablePlansDiv);
            console.log('Plans HTML preview (first 500 chars):', plansHTML.substring(0, 500));
            
        } catch (htmlError) {
            console.error('Error generating plans HTML:', htmlError);
            plansHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Error displaying plans</strong>
                    <p class="mb-0 mt-2">${htmlError.message}</p>
                </div>
            `;
        }
        
        // Set the HTML (outside try/catch so it always runs)
        if (availablePlansDiv && plansHTML) {
            console.log('📝 Setting plans HTML, div exists:', !!availablePlansDiv, 'HTML length:', plansHTML.length);
            
            // CRITICAL: Ensure availablePlansDiv is in subscription-pane before setting HTML
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv is NOT in subscription-pane! Moving it...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
            }
            
            // Set the plans HTML
            availablePlansDiv.innerHTML = plansHTML;
            console.log('✅ Plans HTML set successfully');

            // Billing toggle: sync plan prices when Monthly/Yearly changes
            var billingHandler = function (e) {
                if (e.target && e.target.matches && e.target.matches('input[name="dues-tracker-billing"]')) {
                    syncPlanPricesFromBillingToggle();
                }
            };
            if (availablePlansDiv._billingToggleHandler) {
                availablePlansDiv.removeEventListener('change', availablePlansDiv._billingToggleHandler);
            }
            availablePlansDiv._billingToggleHandler = billingHandler;
            availablePlansDiv.addEventListener('change', billingHandler);
            syncPlanPricesFromBillingToggle();
            
            // CRITICAL: Verify plans div is still in subscription-pane after setting HTML
            if (subscriptionPane && !subscriptionPane.contains(availablePlansDiv)) {
                console.error('⚠️ availablePlansDiv moved after setting HTML! Moving back...');
                availablePlansDiv.remove();
                const subscriptionInfo = document.getElementById('subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                } else {
                    subscriptionPane.appendChild(availablePlansDiv);
                }
                // Re-set HTML since we moved it
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // CRITICAL: If div has no parent after setting HTML, reattach it
            if (!availablePlansDiv.parentElement) {
                console.error('⚠️ availablePlansDiv has no parent after setting HTML! Reattaching...');
                const subscriptionInfo = subscriptionPane?.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    subscriptionInfo.appendChild(availablePlansDiv);
                    // Re-set HTML after reattaching
                    availablePlansDiv.innerHTML = plansHTML;
                } else if (subscriptionPane) {
                    subscriptionPane.appendChild(availablePlansDiv);
                    availablePlansDiv.innerHTML = plansHTML;
                }
            }
            
            // Verify plans HTML was actually set
            if (availablePlansDiv.innerHTML.length < 100) {
                console.error('⚠️ Plans HTML too short after setting! Re-setting...');
                availablePlansDiv.innerHTML = plansHTML;
            }
            
            // Ensure subscription pane is visible
            if (subscriptionPane) {
                subscriptionPane.classList.add('show', 'active');
                subscriptionPane.style.display = 'block';
                subscriptionPane.style.visibility = 'visible';
                console.log('✅ Final: subscription-pane classes:', subscriptionPane.className, 'display:', subscriptionPane.style.display);
            }
            
            // Immediately clean up any subscription content from other tabs (multiple times)
            cleanSubscriptionContentFromOtherTabs();
            setTimeout(() => {
                cleanSubscriptionContentFromOtherTabs();
                // Final verification
                const finalPlansDiv = document.getElementById('availablePlans');
                if (finalPlansDiv) {
                    console.log('✅ Final plans check - in subscription-pane:', subscriptionPane?.contains(finalPlansDiv), 'HTML length:', finalPlansDiv.innerHTML.length);
                }
            }, 50);
            setTimeout(() => cleanSubscriptionContentFromOtherTabs(), 200);
            
            // Force a reflow to ensure rendering
            availablePlansDiv.offsetHeight;
            
            // Immediately verify it was set
            const immediateCheck = document.getElementById('availablePlans');
            if (immediateCheck) {
                console.log('✅ Immediate verification - innerHTML length:', immediateCheck.innerHTML.length);
                console.log('✅ Immediate verification - div visible:', immediateCheck.offsetParent !== null);
                // Verify it's in subscription-pane
                const checkParent = immediateCheck.closest('.tab-pane');
                if (checkParent && checkParent.id !== 'subscription-pane') {
                    console.error('⚠️ availablePlans is in wrong tab!', checkParent.id);
                    immediateCheck.remove();
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        subscriptionInfo.appendChild(immediateCheck);
                    }
                }
                if (immediateCheck.innerHTML.length < 100) {
                    console.error('⚠️ Plans HTML too short, retrying...');
                    immediateCheck.innerHTML = plansHTML;
                }
            }
            
            // Also verify after a delay
            setTimeout(() => {
                const verifyDiv = document.getElementById('availablePlans');
                if (verifyDiv) {
                    console.log('✅ Delayed verification - innerHTML length:', verifyDiv.innerHTML.length);
                    console.log('✅ Delayed verification - div visible:', verifyDiv.offsetParent !== null);
                    // Final cleanup check
                    cleanSubscriptionContentFromOtherTabs();
                    if (verifyDiv.innerHTML.length < 100) {
                        console.error('⚠️ Plans HTML was not set correctly after delay! Retrying...');
                        verifyDiv.innerHTML = plansHTML;
                    }
                    
                    // Check if subscription pane is visible
                    const pane = document.getElementById('subscription-pane');
                    if (pane) {
                        console.log('✅ Subscription pane classes:', pane.className);
                        console.log('✅ Subscription pane visible:', pane.offsetParent !== null);
                        console.log('✅ Subscription pane display:', window.getComputedStyle(pane).display);
                    }
                } else {
                    console.error('❌ availablePlans div disappeared!');
                }
            }, 200);
            } else {
                console.error('❌ Cannot set plans HTML');
                console.error('  - availablePlansDiv exists:', !!availablePlansDiv);
                console.error('  - plansHTML length:', plansHTML ? plansHTML.length : 0);
                
                // Try multiple strategies to find or create the div
                let targetDiv = availablePlansDiv;
                
                if (!targetDiv) {
                    // Strategy 1: Find it in subscription pane
                    const subscriptionPane = document.getElementById('subscription-pane');
                    if (subscriptionPane) {
                        targetDiv = subscriptionPane.querySelector('#availablePlans');
                        console.log('Found via querySelector:', !!targetDiv);
                    }
                }
                
                if (!targetDiv) {
                    // Strategy 2: Find subscriptionInfo and check for availablePlans
                    const subscriptionInfo = document.getElementById('subscriptionInfo');
                    if (subscriptionInfo) {
                        targetDiv = subscriptionInfo.querySelector('#availablePlans');
                        console.log('Found in subscriptionInfo:', !!targetDiv);
                        
                        // If still not found, create it
                        if (!targetDiv && plansHTML) {
                            console.log('⚠️ Creating availablePlans div manually');
                            targetDiv = document.createElement('div');
                            targetDiv.id = 'availablePlans';
                            subscriptionInfo.appendChild(targetDiv);
                            console.log('✅ Created availablePlans div');
                        }
                    }
                }
                
                if (targetDiv && plansHTML) {
                    targetDiv.innerHTML = plansHTML;
                    console.log('✅ Set plans HTML in fallback location');
                } else {
                    console.error('❌ Could not find or create availablePlans div');
                    console.error('Subscription pane:', !!document.getElementById('subscription-pane'));
                    console.error('Subscription info:', !!document.getElementById('subscriptionInfo'));
                }
            }
        
    } catch (error) {
        console.error('❌ Error loading available plans:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentTier: currentTier,
            availablePlansDivExists: !!availablePlansDiv
        });
        
        // Try to show error in the div if it exists
        if (availablePlansDiv) {
            availablePlansDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Unable to load upgrade plans</strong>
                    <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                    <small class="text-muted">Please check the browser console for more details or try refreshing the page.</small>
                </div>
            `;
        } else {
            // Try to find or create the div
            const subscriptionPane = document.getElementById('subscription-pane');
            if (subscriptionPane) {
                const subscriptionInfo = subscriptionPane.querySelector('#subscriptionInfo');
                if (subscriptionInfo) {
                    let errorDiv = document.getElementById('availablePlans');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.id = 'availablePlans';
                        subscriptionInfo.appendChild(errorDiv);
                    }
                    errorDiv.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Unable to load upgrade plans</strong>
                            <p class="mb-0 mt-2">${error.message || 'An error occurred while loading subscription plans.'}</p>
                        </div>
                    `;
                }
            }
        }
    }
}

// Function to handle plan upgrade
async function upgradeToPlan(planTier, planName, buttonElement) {
    const button = buttonElement || (window.event ? window.event.target.closest('button') : null);
    let originalText = '';
    if (button) {
        originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }

