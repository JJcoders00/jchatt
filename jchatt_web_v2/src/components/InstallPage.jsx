import React, { useEffect, useState } from 'react';
import './InstallPage.css';

function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    } else {
      alert("PWA installation is not supported on this browser or already installed. Try 'Add to Home Screen' from your browser menu.");
    }
  };

  return (
    <div className="install-page">
      <div className="install-container glass-panel">
        <h1>Install Jchatt</h1>
        <p className="subtitle">Seamless Communication. Everywhere.</p>
        
        {/* Placeholder for the user's promo image */}
        <img src="/promo.jpeg" alt="Jchatt Promo" className="promo-image" onError={(e) => e.target.style.display='none'} />

        <div className="install-options">
          <div className="option-card">
            <h3>📱 Android APK</h3>
            <p>Download the official Jchatt Android app for the best experience.</p>
            <a href="https://jjcoders00.github.io/jchatt/app-debug.apk" className="primary-btn" download>Download APK</a>
          </div>

          <div className="option-card">
            <h3>🌐 Web App (PWA)</h3>
            <p>Add Jchatt directly to your home screen without downloading an APK.</p>
            <button className="primary-btn" onClick={handleInstallPWA}>Add to Home Screen</button>
          </div>
        </div>

        <button className="back-btn" onClick={() => window.location.href = '/'}>Go to Web Chat</button>
      </div>
    </div>
  );
}

export default InstallPage;
