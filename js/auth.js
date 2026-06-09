/**
 * auth.js — Authentication (Firestore removed, uses IndexedDB for local user data)
 * 
 * IMPORTANT: saveUserLocally is best-effort and never blocks login/redirect.
 * The redirect to /feed/ is handled by onAuthStateChanged which fires 
 * immediately after successful sign-in.
 */

import { auth, googleProvider } from '../js/firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

// ─── Auth redirect guard ──────────────────────────────────────────────────────
// If user is already logged in and on an auth page, redirect to feed.
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    const isAuthPage = path.includes('/login') || path.includes('/signup');
    if (user && isAuthPage) {
        window.location.href = '/feed/';
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const showError = (msg) => {
    const errorEl = document.getElementById('error-message');
    if (!errorEl) return;
    let displayMsg = msg;
    if (msg.includes('auth/invalid-credential'))    displayMsg = 'Invalid email or password.';
    if (msg.includes('auth/email-already-in-use'))  displayMsg = 'Email is already in use.';
    if (msg.includes('auth/weak-password'))         displayMsg = 'Password should be at least 6 characters.';
    if (msg.includes('auth/popup-closed-by-user'))  displayMsg = 'Sign-in popup was closed. Please try again.';
    errorEl.textContent = displayMsg;
    errorEl.style.display = 'block';
};

const setLoading = (buttonEl, isLoading) => {
    if (!buttonEl) return;
    if (isLoading) {
        buttonEl.dataset.originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = 'Loading...';
        buttonEl.disabled = true;
        buttonEl.style.opacity = '0.7';
    } else {
        buttonEl.innerHTML = buttonEl.dataset.originalText;
        buttonEl.disabled = false;
        buttonEl.style.opacity = '1';
    }
};

/**
 * Save authenticated user into IndexedDB.
 * This is best-effort — if Dexie isn't loaded or DB fails, we silently skip.
 * The user will be saved properly when app.js loads via ensureUserExists().
 */
const saveUserLocally = async (user) => {
    try {
        // Dynamic import to avoid blocking if db.js/Dexie isn't ready
        const { DEXIE_READY, upsertUser } = await import('../js/db.js');
        await DEXIE_READY;
        await upsertUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=random`
        });
    } catch (err) {
        // Best-effort — app.js will save the user when feed loads
        console.warn('[Auth] Could not save user to IndexedDB:', err.message);
    }
};

// ─── Login Form ───────────────────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('.btn-primary');

        setLoading(submitBtn, true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            // Best-effort save; redirect happens via onAuthStateChanged
            saveUserLocally(cred.user);
        } catch (error) {
            showError(error.message);
            setLoading(submitBtn, false);
        }
    });
}

// ─── Signup Form ──────────────────────────────────────────────────────────────
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email           = document.getElementById('email').value;
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn       = signupForm.querySelector('.btn-primary');

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        setLoading(submitBtn, true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, {
                displayName: email.split('@')[0]
            });
            // Best-effort save; redirect happens via onAuthStateChanged
            saveUserLocally(cred.user);
        } catch (error) {
            showError(error.message);
            setLoading(submitBtn, false);
        }
    });
}

// ─── Google Auth ──────────────────────────────────────────────────────────────
const handleGoogleAuth = async (e) => {
    const btn = e.currentTarget;
    setLoading(btn, true);
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // Best-effort save; redirect happens via onAuthStateChanged
        saveUserLocally(result.user);
    } catch (error) {
        showError(error.message);
        setLoading(btn, false);
    }
};

const googleLoginBtn  = document.getElementById('google-login');
const googleSignupBtn = document.getElementById('google-signup');
if (googleLoginBtn)  googleLoginBtn.addEventListener('click', handleGoogleAuth);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);
