import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { rtdb } from '../firebase';
import { initAudioContext } from '../utils/audio';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    initAudioContext();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        const userRef = ref(rtdb, `users/${user.uid}`);
        await set(userRef, {
          displayName: email.split('@')[0],
          email: user.email,
          photoURL: '',
          lastSeen: Date.now(),
          online: true
        });
      }
    } catch (error) {
      console.error("Auth error:", error);
      let msg = error.message;
      if (error.code === 'auth/weak-password') msg = "Password must be at least 6 characters long.";
      else if (error.code === 'auth/email-already-in-use') msg = "This email is already registered! Please sign in instead.";
      else if (error.code === 'auth/invalid-email') msg = "Please enter a valid email address.";
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
      
      alert("Authentication Failed:\n\n" + msg);
    }
  };

  const handleGoogleLogin = async () => {
    initAudioContext();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Save user to database
      const userRef = ref(rtdb, `users/${user.uid}`);
      set(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastSeen: Date.now(),
        online: true
      });
      
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-icon">J</div>
        <h2>Welcome to Jchatt</h2>
        <p>The premium real-time messenger.</p>
        
        <form onSubmit={handleEmailAuth} className="email-login-form">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="form-input mb-3"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="form-input mb-3"
          />
          <button type="submit" className="primary-btn" style={{width: '100%', marginBottom: '12px'}}>
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="toggle-auth" style={{marginBottom: '20px', fontSize: '0.9rem'}}>
          <span style={{color: 'var(--text-secondary)'}}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button onClick={() => setIsLogin(!isLogin)} style={{color: 'var(--accent-primary)', fontWeight: 'bold'}}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>

        <div className="divider" style={{borderTop: '1px solid var(--border-color)', margin: '10px 0', width: '100%'}}></div>

        <button className="google-btn" onClick={handleGoogleLogin} style={{marginTop: '10px'}}>
          Sign in with Google (Web Only)
        </button>
      </div>
    </div>
  );
}
