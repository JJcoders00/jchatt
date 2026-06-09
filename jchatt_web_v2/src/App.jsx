import React, { useState, useEffect, useRef } from 'react';
import { auth, rtdb } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import CallHandler from './components/CallHandler';
import Login from './components/Login';
import { App as CapacitorApp } from '@capacitor/app';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { initAudioContext } from './utils/audio';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [userSettings, setUserSettings] = useState({ soundEnabled: true, readReceipts: true });
  const [loading, setLoading] = useState(true);
  
  // App Install state
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const installPromptEvent = useRef(null);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const neverShow = localStorage.getItem('neverShowInstallPrompt');

    if (!isStandalone && neverShow !== 'true') {
      setShowInstallPrompt(true);
    }

    const handler = (e) => {
      e.preventDefault();
      installPromptEvent.current = e;
      if (!isStandalone && neverShow !== 'true') {
        setShowInstallPrompt(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = () => {
    window.location.href = '/install';
  };

  const handleNeverShow = () => {
    localStorage.setItem('neverShowInstallPrompt', 'true');
    setShowInstallPrompt(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Request Desktop Notifications permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }

        // Fetch user settings
        const settingsRef = ref(rtdb, `/settings/${currentUser.uid}`);
        onValue(settingsRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserSettings(snapshot.val());
          }
        });

        // Presence system
        const userStatusRef = ref(rtdb, `users/${currentUser.uid}/online`);
        const userLastSeenRef = ref(rtdb, `users/${currentUser.uid}/lastSeen`);

        // Track connection status
        const connectedRef = ref(rtdb, '.info/connected');
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            onDisconnect(userStatusRef).set(false);
            onDisconnect(userLastSeenRef).set(serverTimestamp());
            if (!ghostMode) {
              set(userStatusRef, true);
              set(userLastSeenRef, serverTimestamp());
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [ghostMode]);

  useEffect(() => {
    if (user) {
      const userStatusRef = ref(rtdb, `users/${user.uid}/online`);
      if (ghostMode) {
        set(userStatusRef, false);
      } else {
        set(userStatusRef, true);
      }
    }
  }, [ghostMode, user]);

  useEffect(() => {
    // Keep JS running in the background for notifications using Foreground Service
    const setupForegroundService = async () => {
      try {
        await ForegroundService.startForegroundService({
          id: 101,
          title: 'Jchatt is running',
          body: 'Listening for new messages and calls.',
          smallIcon: 'ic_stat_icon_config_sample' // Default generic icon
        });
      } catch(e) {
        console.log('Foreground Service failed or not supported:', e);
      }
    };
    setupForegroundService();
    
    // Fallback BackgroundTask for iOS / devices without Foreground Service permission
    const setupBackgroundTask = async () => {
      window.isAppActive = true; // Initialize
      CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        window.isAppActive = isActive;
        if (!isActive) {
          const taskId = await BackgroundTask.beforeExit(async () => {
            // In this function, the app is running in the background.
            // We just let Firebase keep its websocket open.
            
            // To ensure the background task doesn't die immediately, we just wait.
            // When Firebase gets a message, Sidebar.jsx local notification triggers.
            
            // Note: Android eventually kills this task (usually ~3-10 minutes).
            setTimeout(() => {
              BackgroundTask.finish({ taskId });
            }, 1000 * 60 * 10); // Keep alive for 10 minutes max
          });
        }
      });
    };
    
    setupBackgroundTask();
    
    // Request Local Notifications permission (required for Android 13+)
    const requestNotifPermissions = async () => {
      try {
        await LocalNotifications.requestPermissions();
      } catch (e) {
        console.error("LocalNotifications permissions error:", e);
      }
    };
    requestNotifPermissions();
    
    // Unlock Web Audio API on first user interaction
    const unlockAudio = () => {
      initAudioContext();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'white'}}>Loading...</div>;

  if (!user) return <Login />;

  return (
    <div className={`app-container ${activeChat ? 'chat-active' : 'sidebar-active'}`} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {showInstallPrompt && (
        <div className="install-app-popup glass-panel">
          <div className="install-app-content">
            <h3>📱 Get the Jchatt App</h3>
            <p>Install our app for the best experience with background calls and notifications!</p>
          </div>
          <div className="install-app-actions">
            <button className="primary-btn" onClick={handleInstallApp}>Install</button>
            <button className="action-btn" onClick={() => setShowInstallPrompt(false)}>Not Now</button>
            <button className="action-btn" onClick={handleNeverShow} style={{color: '#ff4d4d', background: 'transparent', border: '1px solid #ff4d4d'}}>Never</button>
          </div>
        </div>
      )}

      <CallHandler currentUser={user} userSettings={userSettings} />
      <Sidebar 
        currentUser={user}
        activeChat={activeChat} 
        setActiveChat={setActiveChat} 
        ghostMode={ghostMode}
        setGhostMode={setGhostMode}
        userSettings={userSettings}
      />
      <ChatWindow 
        currentUser={user}
        activeChat={activeChat} 
        setActiveChat={setActiveChat}
        ghostMode={ghostMode}
        userSettings={userSettings}
      />
    </div>
  );
}

export default App;
