import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './StatusViewer.css';

export default function StatusViewer({ usersStatuses, activeUserId, onClose }) {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  useEffect(() => {
    if (activeUserId && usersStatuses.length > 0) {
      const index = usersStatuses.findIndex(u => u.uid === activeUserId);
      if (index !== -1) {
        setCurrentUserIndex(index);
        setCurrentStatusIndex(0);
      }
    }
  }, [activeUserId, usersStatuses]);

  useEffect(() => {
    if (usersStatuses.length === 0) return;

    // Auto progress after 5 seconds per status
    const timer = setTimeout(() => {
      handleNext();
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentStatusIndex, currentUserIndex, usersStatuses]);

  if (usersStatuses.length === 0) return null;

  const currentUserData = usersStatuses[currentUserIndex];
  if (!currentUserData || !currentUserData.statuses) return null;
  
  const currentStatus = currentUserData.statuses[currentStatusIndex];

  const handleNext = () => {
    if (currentStatusIndex < currentUserData.statuses.length - 1) {
      setCurrentStatusIndex(prev => prev + 1);
    } else if (currentUserIndex < usersStatuses.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStatusIndex(0);
    } else {
      onClose(); // End of all statuses
    }
  };

  const handlePrev = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      const prevUserStatuses = usersStatuses[currentUserIndex - 1].statuses;
      setCurrentStatusIndex(prevUserStatuses.length - 1);
    }
  };

  return (
    <div className="status-viewer-overlay">
      <div className="status-header">
        <div className="progress-bars">
          {currentUserData.statuses.map((s, i) => (
            <div key={i} className="progress-bar-container">
              <div 
                className="progress-fill" 
                style={{ 
                  width: i < currentStatusIndex ? '100%' : i === currentStatusIndex ? '100%' : '0%',
                  transition: i === currentStatusIndex ? 'width 5s linear' : 'none'
                }}
              />
            </div>
          ))}
        </div>
        <div className="status-user-info">
          {currentUserData.photoURL ? (
            <img src={currentUserData.photoURL} alt="Avatar" className="status-avatar" />
          ) : (
            <div className="status-avatar-placeholder" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}><User size={24} /></div>
          )}
          <div>
            <h3>{currentUserData.name}</h3>
            <span className="status-time">
              {currentStatus ? formatDistanceToNow(new Date(currentStatus.timestamp), { addSuffix: true }) : ''}
            </span>
          </div>
        </div>
        <button className="close-status-btn" onClick={onClose}><X size={28} /></button>
      </div>

      <div className="status-content">
        <div className="status-nav left" onClick={handlePrev}>
          <ChevronLeft size={48} />
        </div>
        
        {currentStatus && (
          <div className="status-media-container">
            {currentStatus.type?.startsWith('video/') ? (
              <video src={currentStatus.mediaUrl} autoPlay className="status-media" />
            ) : (
              <img src={currentStatus.mediaUrl} alt="Status" className="status-media" />
            )}
            {currentStatus.caption && (
              <div className="status-caption">{currentStatus.caption}</div>
            )}
          </div>
        )}

        <div className="status-nav right" onClick={handleNext}>
          <ChevronRight size={48} />
        </div>
      </div>
    </div>
  );
}
