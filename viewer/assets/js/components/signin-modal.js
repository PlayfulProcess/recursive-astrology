/**
 * Shared Sign-in Modal Component for Landing App
 * Used by grammar-viewer.html, view.html, and other pages that need auth
 *
 * Usage:
 * 1. Include this script: <script src="assets/js/components/signin-modal.js"></script>
 * 2. The modal HTML and CSS are injected automatically
 * 3. Call SigninModal.open(onSuccess) to show the modal
 *    - onSuccess(user) is called after successful authentication
 * 4. Call SigninModal.close() to close the modal
 * 5. Check SigninModal.currentUser for the current authenticated user
 */

(function() {
    'use strict';

    // hCaptcha site key from environment (set via window.ENV or directly)
    const HCAPTCHA_SITEKEY = window.ENV?.HCAPTCHA_SITEKEY || window.HCAPTCHA_SITEKEY;

    // Inject CSS styles
    const styles = `
        .signin-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .signin-modal-overlay.active {
            display: flex;
        }
        /* Round 62 (Jun 1 2026): switched modal from dark-only to light theme
           for readability. Backdrop stays dark; modal surface is white with
           gray-900 text, gray-300 borders. Purple accents preserved. */
        .signin-modal {
            background: #ffffff;
            border-radius: 1rem;
            padding: 2rem;
            max-width: 400px;
            width: 100%;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            color: #111827;
        }
        .signin-modal .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            color: #6b7280;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.25rem;
            line-height: 1;
        }
        .signin-modal .modal-close:hover {
            color: #111827;
        }
        .signin-modal .modal-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .signin-modal .modal-description {
            color: #4b5563;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
        }
        .signin-modal .form-group {
            margin-bottom: 1rem;
        }
        .signin-modal .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
        }
        .signin-modal .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #ffffff !important;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            color: #111827 !important;
            font-size: 1rem;
            box-sizing: border-box;
            -webkit-text-fill-color: #111827 !important;
        }
        .signin-modal .form-input::placeholder {
            color: #9ca3af;
            -webkit-text-fill-color: #9ca3af;
        }
        .signin-modal .form-input:-webkit-autofill,
        .signin-modal .form-input:-webkit-autofill:hover,
        .signin-modal .form-input:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
            -webkit-text-fill-color: #111827 !important;
            caret-color: #111827 !important;
        }
        .signin-modal .form-input:focus {
            outline: none;
            border-color: #8b5cf6;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
        }
        .signin-modal .form-input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: #f9fafb !important;
        }
        .signin-modal .btn-primary {
            width: 100%;
            padding: 0.75rem 1.5rem;
            background: #8b5cf6;
            color: white;
            font-weight: 600;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
            margin-top: 0.5rem;
        }
        .signin-modal .btn-primary:hover {
            background: #7c3aed;
        }
        .signin-modal .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .signin-modal .error-message {
            color: #dc2626;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }
        .signin-modal .email-tips {
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 0.5rem;
            padding: 0.75rem;
            margin-bottom: 1rem;
            font-size: 0.75rem;
        }
        .signin-modal .email-tips p {
            color: #5b21b6;
            margin: 0 0 0.25rem 0;
        }
        .signin-modal .email-tips p:last-child {
            margin-bottom: 0;
        }
        .signin-modal .already-have-code {
            text-align: center;
            margin-top: 0.75rem;
        }
        .signin-modal .already-have-code button {
            background: none;
            border: none;
            color: #7c3aed;
            font-size: 0.875rem;
            cursor: pointer;
            text-decoration: underline;
        }
        .signin-modal .already-have-code button:hover {
            color: #5b21b6;
        }
        .signin-modal .back-to-email {
            text-align: center;
            margin-top: 0.75rem;
        }
        .signin-modal .back-to-email button {
            background: none;
            border: none;
            color: #6b7280;
            font-size: 0.875rem;
            cursor: pointer;
        }
        .signin-modal .back-to-email button:hover {
            color: #111827;
        }
        .signin-modal .divider {
            display: flex;
            align-items: center;
            margin: 1.25rem 0;
            color: #6b7280;
            font-size: 0.75rem;
        }
        .signin-modal .divider::before,
        .signin-modal .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e5e7eb;
        }
        .signin-modal .divider span {
            padding: 0 0.75rem;
        }
        .signin-modal .btn-guest {
            width: 100%;
            padding: 0.625rem 1.5rem;
            background: transparent;
            color: #4b5563;
            font-weight: 500;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .signin-modal .btn-guest:hover {
            background: #f3f4f6;
            color: #111827;
            border-color: #9ca3af;
        }
        .signin-modal .btn-guest:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .signin-modal .guest-notice {
            color: #6b7280;
            font-size: 0.7rem;
            text-align: center;
            margin-top: 0.5rem;
        }
        /* hCaptcha styles */
        .signin-modal .captcha-section {
            display: none;
        }
        .signin-modal .captcha-section.active {
            display: block;
        }
        .signin-modal .captcha-container {
            display: flex;
            justify-content: center;
            min-height: 78px;
            margin: 1rem 0;
        }
        .signin-modal .captcha-loading {
            color: #6b7280;
            font-size: 0.875rem;
            text-align: center;
        }
        .signin-modal .captcha-description {
            color: #374151;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 1rem;
        }
        .signin-modal .captcha-buttons {
            display: flex;
            gap: 0.75rem;
        }
        .signin-modal .captcha-buttons button {
            flex: 1;
        }
        .signin-modal .btn-secondary {
            padding: 0.625rem 1rem;
            background: transparent;
            color: #4b5563;
            font-weight: 500;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .signin-modal .btn-secondary:hover {
            background: #f3f4f6;
            color: #111827;
        }
        .signin-modal .btn-secondary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;

    // Inject HTML
    const html = `
        <div id="shared-signin-modal" class="signin-modal-overlay">
            <div class="signin-modal">
                <button class="modal-close" id="signin-modal-close">&times;</button>
                <h2 class="modal-title" id="signin-modal-title">Sign In</h2>
                <p class="modal-description" id="signin-modal-description">
                    Sign in to continue.
                </p>

                <!-- Main sign-in form -->
                <div id="signin-modal-main-form">
                    <div class="email-tips">
                        <p><strong>Email Delivery Tips:</strong></p>
                        <p>• <strong>Gmail works best</strong> for reliable delivery</p>
                        <p>• Yahoo/Outlook: add <strong>pp@playfulprocess.com</strong> to contacts</p>
                        <p>• Check your <strong>Spam folder</strong> if you don't see it</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="signin-modal-email">Email</label>
                        <input type="email" id="signin-modal-email" class="form-input" placeholder="you@example.com">
                    </div>
                    <div class="form-group" id="signin-modal-otp-group" style="display: none;">
                        <label class="form-label" for="signin-modal-otp">Verification Code</label>
                        <input type="text" id="signin-modal-otp" class="form-input" placeholder="Enter 8-digit code" maxlength="8">
                    </div>
                    <div id="signin-modal-error" class="error-message" style="display: none;"></div>
                    <button type="button" id="signin-modal-btn" class="btn-primary">Send Verification Code</button>
                    <div class="already-have-code" id="signin-modal-already-have-code">
                        <button type="button" id="signin-modal-skip-to-otp">Already have a code?</button>
                    </div>
                    <div class="back-to-email" id="signin-modal-back-to-email" style="display: none;">
                        <button type="button" id="signin-modal-back-btn">← Back to email</button>
                    </div>
                    <div class="divider" id="signin-modal-divider"><span>or</span></div>
                    <button type="button" id="signin-modal-guest-btn" class="btn-guest">Continue as Guest</button>
                    <p class="guest-notice" id="signin-modal-guest-notice">No sign-up required</p>
                </div>

                <!-- Captcha section (shown when guest clicks and captcha is enabled) -->
                <div id="signin-modal-captcha-section" class="captcha-section">
                    <p class="captcha-description">Complete the captcha to continue as guest</p>
                    <div id="signin-modal-captcha-container" class="captcha-container">
                        <div id="signin-modal-captcha-loading" class="captcha-loading">Loading captcha...</div>
                    </div>
                    <div id="signin-modal-captcha-error" class="error-message" style="display: none;"></div>
                    <div class="captcha-buttons">
                        <button type="button" id="signin-modal-captcha-cancel" class="btn-secondary">Cancel</button>
                        <button type="button" id="signin-modal-captcha-continue" class="btn-primary" disabled>Continue</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // State
    let otpSent = false;
    let onSuccessCallback = null;
    let supabaseClient = null;
    let captchaToken = null;
    let captchaWidgetId = null;
    let hcaptchaLoaded = false;

    // Initialize when DOM is ready
    function init() {
        // Add styles
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);

        // Add HTML
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container.firstElementChild);

        // Get supabase client from window
        supabaseClient = window.supabaseClient;

        // Set up event listeners
        document.getElementById('signin-modal-close').addEventListener('click', close);
        document.getElementById('signin-modal-btn').addEventListener('click', handleAuth);
        document.getElementById('signin-modal-skip-to-otp').addEventListener('click', skipToOtp);
        document.getElementById('signin-modal-back-btn').addEventListener('click', backToEmail);
        document.getElementById('signin-modal-guest-btn').addEventListener('click', handleGuestButtonClick);
        document.getElementById('signin-modal-captcha-cancel').addEventListener('click', cancelCaptcha);
        document.getElementById('signin-modal-captcha-continue').addEventListener('click', handleGuestSignin);

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
        });

        // Close on overlay click
        document.getElementById('shared-signin-modal').addEventListener('click', (e) => {
            if (e.target.id === 'shared-signin-modal') close();
        });

        // Enter key submits
        document.getElementById('signin-modal-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAuth();
        });
        document.getElementById('signin-modal-otp').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAuth();
        });
    }

    // Load hCaptcha script
    function loadHCaptcha() {
        return new Promise((resolve) => {
            if (window.hcaptcha) {
                hcaptchaLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
            script.async = true;
            script.onload = () => {
                hcaptchaLoaded = true;
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    // Render hCaptcha widget
    async function renderCaptcha() {
        if (!HCAPTCHA_SITEKEY) return;

        const container = document.getElementById('signin-modal-captcha-container');
        const loading = document.getElementById('signin-modal-captcha-loading');

        loading.style.display = 'block';

        await loadHCaptcha();
        // Small delay to ensure hcaptcha is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        loading.style.display = 'none';

        if (window.hcaptcha && container) {
            // Clear any existing widget
            container.innerHTML = '';

            try {
                captchaWidgetId = window.hcaptcha.render(container, {
                    sitekey: HCAPTCHA_SITEKEY,
                    theme: 'light',
                    callback: (token) => {
                        captchaToken = token;
                        document.getElementById('signin-modal-captcha-continue').disabled = false;
                    },
                    'expired-callback': () => {
                        captchaToken = null;
                        document.getElementById('signin-modal-captcha-continue').disabled = true;
                        showCaptchaError('Captcha expired. Please try again.');
                    },
                    'error-callback': () => {
                        captchaToken = null;
                        document.getElementById('signin-modal-captcha-continue').disabled = true;
                        showCaptchaError('Captcha error. Please try again.');
                    }
                });
            } catch (e) {
                console.error('hCaptcha render error:', e);
            }
        }
    }

    function showCaptchaError(message) {
        const errorEl = document.getElementById('signin-modal-captcha-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    function hideCaptchaError() {
        document.getElementById('signin-modal-captcha-error').style.display = 'none';
    }

    function showCaptchaSection() {
        document.getElementById('signin-modal-main-form').style.display = 'none';
        document.getElementById('signin-modal-captcha-section').classList.add('active');
        renderCaptcha();
    }

    function hideCaptchaSection() {
        document.getElementById('signin-modal-main-form').style.display = 'block';
        document.getElementById('signin-modal-captcha-section').classList.remove('active');
        captchaToken = null;
        captchaWidgetId = null;
        document.getElementById('signin-modal-captcha-continue').disabled = true;
        hideCaptchaError();
    }

    function cancelCaptcha() {
        hideCaptchaSection();
    }

    // Handle guest button click - show captcha if enabled
    function handleGuestButtonClick() {
        if (HCAPTCHA_SITEKEY) {
            showCaptchaSection();
        } else {
            handleGuestSignin();
        }
    }

    function open(options = {}) {
        const { onSuccess, title, description } = options;
        onSuccessCallback = onSuccess || null;

        // Reset state
        otpSent = false;
        captchaToken = null;
        document.getElementById('signin-modal-email').value = '';
        document.getElementById('signin-modal-email').disabled = false;
        document.getElementById('signin-modal-otp').value = '';
        document.getElementById('signin-modal-otp-group').style.display = 'none';
        document.getElementById('signin-modal-btn').textContent = 'Send Verification Code';
        document.getElementById('signin-modal-btn').disabled = false;
        document.getElementById('signin-modal-error').style.display = 'none';
        document.getElementById('signin-modal-already-have-code').style.display = 'block';
        document.getElementById('signin-modal-back-to-email').style.display = 'none';
        document.getElementById('signin-modal-divider').style.display = 'flex';
        document.getElementById('signin-modal-guest-btn').style.display = 'block';
        document.getElementById('signin-modal-guest-btn').disabled = false;
        document.getElementById('signin-modal-guest-btn').textContent = 'Continue as Guest';
        document.getElementById('signin-modal-guest-notice').style.display = 'block';
        hideCaptchaSection();

        // Set custom title/description if provided
        if (title) {
            document.getElementById('signin-modal-title').textContent = title;
        }
        if (description) {
            document.getElementById('signin-modal-description').textContent = description;
        }

        // Show modal
        document.getElementById('shared-signin-modal').classList.add('active');
        document.getElementById('signin-modal-email').focus();
    }

    function close() {
        document.getElementById('shared-signin-modal').classList.remove('active');
        hideCaptchaSection();
    }

    function skipToOtp() {
        const email = document.getElementById('signin-modal-email').value.trim();
        if (!email) {
            showError('Please enter your email address first');
            return;
        }
        otpSent = true;
        document.getElementById('signin-modal-email').disabled = true;
        document.getElementById('signin-modal-otp-group').style.display = 'block';
        document.getElementById('signin-modal-otp').focus();
        document.getElementById('signin-modal-btn').textContent = 'Verify Code';
        document.getElementById('signin-modal-already-have-code').style.display = 'none';
        document.getElementById('signin-modal-back-to-email').style.display = 'block';
        document.getElementById('signin-modal-divider').style.display = 'none';
        document.getElementById('signin-modal-guest-btn').style.display = 'none';
        document.getElementById('signin-modal-guest-notice').style.display = 'none';
        hideError();
    }

    function backToEmail() {
        otpSent = false;
        document.getElementById('signin-modal-email').disabled = false;
        document.getElementById('signin-modal-otp').value = '';
        document.getElementById('signin-modal-otp-group').style.display = 'none';
        document.getElementById('signin-modal-btn').textContent = 'Send Verification Code';
        document.getElementById('signin-modal-already-have-code').style.display = 'block';
        document.getElementById('signin-modal-back-to-email').style.display = 'none';
        document.getElementById('signin-modal-divider').style.display = 'flex';
        document.getElementById('signin-modal-guest-btn').style.display = 'block';
        document.getElementById('signin-modal-guest-notice').style.display = 'block';
        document.getElementById('signin-modal-email').focus();
        hideError();
    }

    async function handleGuestSignin() {
        // Round 38: see handleAuth — same fix (don't fall back to
        // window.supabase, which is the library not the client).
        if (!supabaseClient) {
            supabaseClient = window.supabaseClient || null;
        }
        if (!supabaseClient && window.RecursiveAuth?.init) {
            try {
                supabaseClient = window.RecursiveAuth.init();
            } catch (initErr) {
                console.error('signin-modal: RecursiveAuth.init() failed', initErr);
            }
        }

        if (!supabaseClient) {
            await new Promise(resolve => setTimeout(resolve, 100));
            supabaseClient = window.supabaseClient || null;
            if (!supabaseClient && window.RecursiveAuth?.init) {
                try {
                    supabaseClient = window.RecursiveAuth.init();
                } catch {}
            }
        }

        if (!supabaseClient) {
            showCaptchaError('Authentication service loading... Please try again in a moment.');
            return;
        }

        const continueBtn = document.getElementById('signin-modal-captcha-continue');
        const guestBtn = document.getElementById('signin-modal-guest-btn');

        // If in captcha mode
        if (document.getElementById('signin-modal-captcha-section').classList.contains('active')) {
            continueBtn.disabled = true;
            continueBtn.textContent = 'Creating...';
            hideCaptchaError();

            try {
                // Verify captcha token with backend if we have one
                if (HCAPTCHA_SITEKEY && captchaToken) {
                    // Try to verify via altars API (will work if on same domain or CORS allows)
                    // For landing app, we'll use a simple fetch to the altars verify endpoint
                    const altarsUrl = window.ENV?.ALTARS_URL || 'https://flow.recursive.eco';
                    try {
                        const verifyResponse = await fetch(`${altarsUrl}/api/verify-captcha`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: captchaToken }),
                        });

                        if (!verifyResponse.ok) {
                            const result = await verifyResponse.json();
                            throw new Error(result.error || 'Captcha verification failed');
                        }
                    } catch (verifyError) {
                        // If CORS blocks us, just proceed (captcha widget already validated client-side)
                        console.warn('Captcha verification via API failed, proceeding with client-side validation:', verifyError);
                    }
                }

                const { data, error } = await supabaseClient.auth.signInAnonymously();

                if (error) throw error;

                SigninModal.currentUser = data.user;
                // Round 38: fire so the landing header (and any other
                // listener) can refresh post-sign-in without a page
                // reload. site-shell-inline.js listens for this event
                // and re-runs initializeAuthState() to read the now-
                // populated cookie.
                try { window.dispatchEvent(new CustomEvent('recursive:authchanged', { detail: { user: data.user } })); } catch {}
                close();

                // Call success callback
                if (onSuccessCallback) {
                    onSuccessCallback(data.user);
                }
            } catch (err) {
                console.error('Anonymous sign in error:', err);
                showCaptchaError('Failed to create guest account: ' + err.message);
                continueBtn.disabled = false;
                continueBtn.textContent = 'Continue';
                // Reset captcha
                if (window.hcaptcha && captchaWidgetId !== null) {
                    window.hcaptcha.reset(captchaWidgetId);
                }
                captchaToken = null;
            }
        } else {
            // Direct guest signin (no captcha required)
            guestBtn.disabled = true;
            guestBtn.textContent = 'Creating guest account...';
            hideError();

            try {
                const { data, error } = await supabaseClient.auth.signInAnonymously();

                if (error) throw error;

                SigninModal.currentUser = data.user;
                // Round 38: fire so the landing header (and any other
                // listener) can refresh post-sign-in without a page
                // reload. site-shell-inline.js listens for this event
                // and re-runs initializeAuthState() to read the now-
                // populated cookie.
                try { window.dispatchEvent(new CustomEvent('recursive:authchanged', { detail: { user: data.user } })); } catch {}
                close();

                // Call success callback
                if (onSuccessCallback) {
                    onSuccessCallback(data.user);
                }
            } catch (err) {
                console.error('Anonymous sign in error:', err);
                showError('Failed to create guest account: ' + err.message);
                guestBtn.disabled = false;
                guestBtn.textContent = 'Continue as Guest';
            }
        }
    }

    function showError(message) {
        const errorEl = document.getElementById('signin-modal-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    function hideError() {
        document.getElementById('signin-modal-error').style.display = 'none';
    }

    async function handleAuth() {
        // Round 38: fixed the round-37 fix. The original fallback
        // `window.supabaseClient || window.supabase` was buggy —
        // `window.supabase` is the LIBRARY (createClient lives there),
        // NOT a client instance. When window.supabaseClient was null
        // (the very situation round 37 tried to fix), this picked the
        // library, satisfied the `!supabaseClient` guard below, and
        // skipped the RecursiveAuth.init() call → library.auth
        // undefined at signInWithOtp.
        //
        // New order:
        //   1. Try the explicit client window.supabaseClient.
        //   2. If still null, call RecursiveAuth.init() to create one.
        //   3. Wait 100ms in case of a deferred-script race.
        //   4. Give up with a user-visible error.
        if (!supabaseClient) {
            supabaseClient = window.supabaseClient || null;
        }
        if (!supabaseClient && window.RecursiveAuth?.init) {
            try {
                supabaseClient = window.RecursiveAuth.init();
            } catch (initErr) {
                console.error('signin-modal: RecursiveAuth.init() failed', initErr);
            }
        }

        if (!supabaseClient) {
            // Try to wait a moment and check again (covers race with
            // a deferred supabase-js@2 load).
            await new Promise(resolve => setTimeout(resolve, 100));
            supabaseClient = window.supabaseClient || null;
            if (!supabaseClient && window.RecursiveAuth?.init) {
                try {
                    supabaseClient = window.RecursiveAuth.init();
                } catch {}
            }
        }

        if (!supabaseClient) {
            showError('Authentication service loading... Please try again in a moment.');
            return;
        }

        const email = document.getElementById('signin-modal-email').value.trim();
        const otp = document.getElementById('signin-modal-otp').value.trim();
        const authBtn = document.getElementById('signin-modal-btn');

        hideError();

        if (!email) {
            showError('Please enter your email address');
            return;
        }

        if (otpSent) {
            // Verify OTP
            if (!otp) {
                showError('Please enter the verification code');
                return;
            }

            authBtn.disabled = true;
            authBtn.textContent = 'Verifying...';

            try {
                const { data, error } = await supabaseClient.auth.verifyOtp({
                    email,
                    token: otp,
                    type: 'email'
                });

                if (error) throw error;

                SigninModal.currentUser = data.user;
                // Round 38: fire so the landing header (and any other
                // listener) can refresh post-sign-in without a page
                // reload. site-shell-inline.js listens for this event
                // and re-runs initializeAuthState() to read the now-
                // populated cookie.
                try { window.dispatchEvent(new CustomEvent('recursive:authchanged', { detail: { user: data.user } })); } catch {}
                close();

                // Call success callback
                if (onSuccessCallback) {
                    onSuccessCallback(data.user);
                }
            } catch (err) {
                console.error('OTP verification error:', err);
                showError('Invalid code. Please try again.');
                authBtn.disabled = false;
                authBtn.textContent = 'Verify Code';
            }
        } else {
            // Send OTP
            authBtn.disabled = true;
            authBtn.textContent = 'Sending...';

            try {
                const { error } = await supabaseClient.auth.signInWithOtp({
                    email,
                    options: { shouldCreateUser: true }
                });

                if (error) throw error;

                otpSent = true;
                document.getElementById('signin-modal-email').disabled = true;
                document.getElementById('signin-modal-otp-group').style.display = 'block';
                document.getElementById('signin-modal-otp').focus();
                document.getElementById('signin-modal-already-have-code').style.display = 'none';
                document.getElementById('signin-modal-back-to-email').style.display = 'block';
                document.getElementById('signin-modal-divider').style.display = 'none';
                document.getElementById('signin-modal-guest-btn').style.display = 'none';
                document.getElementById('signin-modal-guest-notice').style.display = 'none';
                authBtn.textContent = 'Verify Code';
                authBtn.disabled = false;
            } catch (err) {
                console.error('Sign in error:', err);
                showError('Failed to send code: ' + err.message);
                authBtn.disabled = false;
                authBtn.textContent = 'Send Verification Code';
            }
        }
    }

    // Check auth state
    async function checkAuth() {
        // Try multiple ways to get supabase client
        if (!supabaseClient) {
            supabaseClient = window.supabaseClient || window.supabase;
        }
        if (!supabaseClient) {
            // Wait a moment for supabase to initialize
            await new Promise(resolve => setTimeout(resolve, 200));
            supabaseClient = window.supabaseClient || window.supabase;
        }
        if (supabaseClient) {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                SigninModal.currentUser = user;
                return user;
            } catch (err) {
                console.error('Auth check error:', err);
            }
        }
        return null;
    }

    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export public API
    window.SigninModal = {
        open,
        close,
        checkAuth,
        currentUser: null
    };
})();
