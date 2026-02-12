async function signInWithGoogle() {
    try {
        // Set flag to indicate this OAuth is for the dues tracker
        localStorage.setItem('__DUES_TRACKER_OAUTH__', 'true');
        
        // Wait for Supabase to be available
        let supabase = getSupabaseClient();
        if (!supabase) {
            await new Promise((resolve) => {
                const checkSupabase = setInterval(() => {
                    supabase = getSupabaseClient();
                    if (supabase) {
                        clearInterval(checkSupabase);
                        resolve();
                    }
                }, 100);
            });
            supabase = getSupabaseClient();
        }
        
        if (!supabase) {
            throw new Error('Supabase not loaded');
        }
        
        // Get the correct redirect URL - use the full path to the dues tracker page
        // This ensures Supabase redirects directly to the dues tracker, not through React Router
        const redirectUrl = window.location.origin + '/dues-tracker/index.html';
        
        console.log('🔐 Dues Tracker: Initiating Google OAuth with redirect:', redirectUrl);
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Supabase URL:', SUPABASE_URL);
        
        // Specify redirectTo to go directly to the dues tracker static HTML file
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        
        if (error) {
            console.error('❌ Google sign in error:', error);
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) {
                errorDiv.textContent = `Google sign in failed: ${error.message || 'Unknown error'}`;
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        if (data?.url) {
            console.log('✅ OAuth redirect URL generated:', data.url);
            try {
                if (window.top !== window.self) {
                    window.top.location.href = data.url;
                } else {
                    window.location.href = data.url;
                }
            } catch (e) {
                window.location.href = data.url;
            }
            return;
        } else {
            console.warn('⚠️ No redirect URL returned from Supabase');
        }
    } catch (error) {
        console.error('Google sign in error:', error);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = 'Google sign in failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }
}
