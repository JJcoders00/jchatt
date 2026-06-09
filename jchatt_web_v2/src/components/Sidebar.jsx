import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Settings, Ghost, LogOut, Plus, X, Upload, MessageCircle, Download, User } from 'lucide-react';
import { rtdb, auth, storage } from '../firebase';
import { ref as dbRef, onValue, push, set, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { playPopSound } from '../utils/audio';
import { compressImage } from '../utils/compressImage';
import { LocalNotifications } from '@capacitor/local-notifications';
import StatusViewer from './StatusViewer';
import './Sidebar.css';
import './SidebarStatus.css';

export default function Sidebar({ currentUser, activeChat, setActiveChat, ghostMode, setGhostMode, userSettings }) {
  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [recentChatsMap, setRecentChatsMap] = useState({});
  const [search, setSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState({});
  const [activeTab, setActiveTab] = useState('All'); // All, Messages, Groups, Calls
  const prevRecentChatsRef = useRef({});
  const [inAppToast, setInAppToast] = useState(null);
  
  // Statuses State
  const [usersStatuses, setUsersStatuses] = useState([]);
  const [activeStatusUserId, setActiveStatusUserId] = useState(null);
  const statusInputRef = useRef(null);

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Profile state
  const [profileName, setProfileName] = useState(currentUser.displayName || '');
  const [profileAbout, setProfileAbout] = useState('Available');
  const [profilePhoto, setProfilePhoto] = useState(currentUser.photoURL || '');
  const profileInputRef = useRef(null);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    const meRef = dbRef(rtdb, `users/${currentUser.uid}`);
    onValue(meRef, snap => {
      const data = snap.val();
      if (data && data.about) setProfileAbout(data.about);
      if (data && data.photoURL) setProfilePhoto(data.photoURL);
      if (data && data.displayName) setProfileName(data.displayName);
    });

    const usersRef = dbRef(rtdb, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.keys(data).map(uid => ({
          uid,
          ...data[uid],
          chatId: currentUser.uid < uid ? `${currentUser.uid}_${uid}` : `${uid}_${currentUser.uid}`,
          isGroup: false
        })).filter(u => u.uid !== currentUser.uid);
        setAllUsers(usersList);
      }
    });

    // Fetch Recent Chats Map
    const recentRef = dbRef(rtdb, `recentChats/${currentUser.uid}`);
    const unsubscribeRecent = onValue(recentRef, (snapshot) => {
      const data = snapshot.val();
      setRecentChatsMap(data || {});
    });

    // Fetch Statuses
    const statusesRef = dbRef(rtdb, 'statuses');
    const unsubscribeStatuses = onValue(statusesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        let validStatuses = [];
        
        Object.keys(data).forEach(uid => {
          const userObj = data[uid];
          const activeStatuses = Object.keys(userObj)
            .map(key => userObj[key])
            .filter(s => (now - s.timestamp) < oneDay)
            .sort((a,b) => a.timestamp - b.timestamp);
            
          if (activeStatuses.length > 0) {
            validStatuses.push({
              uid,
              name: uid === currentUser.uid ? 'My Status' : (allUsers.find(u => u.uid === uid)?.displayName || 'User'),
              photoURL: uid === currentUser.uid ? profilePhoto : (allUsers.find(u => u.uid === uid)?.photoURL),
              statuses: activeStatuses,
              lastUpdated: activeStatuses[activeStatuses.length-1].timestamp
            });
          }
        });
        
        validStatuses.sort((a, b) => {
          if (a.uid === currentUser.uid) return -1;
          if (b.uid === currentUser.uid) return 1;
          return b.lastUpdated - a.lastUpdated;
        });

        setUsersStatuses(validStatuses);
      } else {
        setUsersStatuses([]);
      }
    });

    const blockedRef = dbRef(rtdb, `users/${currentUser.uid}/blocked`);
    const unsubscribeBlocked = onValue(blockedRef, (snap) => {
      setBlockedUsers(snap.val() || {});
    });

    return () => {
      unsubscribeUsers();
      unsubscribeStatuses();
      unsubscribeRecent();
      unsubscribeBlocked();
    };
  }, [currentUser, allUsers.length, profilePhoto]);

  useEffect(() => {
    const groupsRef = dbRef(rtdb, 'groups');
    const unsubscribeGroups = onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      let groupsList = [];
      if (data) {
        groupsList = Object.keys(data)
          .map(key => ({
            uid: key,
            chatId: key,
            name: data[key].name,
            photoURL: data[key].photoURL,
            isGroup: true,
            members: data[key].members
          }))
          .filter(g => g.members && g.members[currentUser.uid]);
      }
      
      const merged = [...allUsers.map(u => ({
        uid: u.uid,
        chatId: u.chatId,
        name: u.displayName,
        photoURL: u.photoURL,
        online: u.online,
        isGroup: false
      })), ...groupsList];
      
      setChats(merged);
    });
    
    return () => unsubscribeGroups();
  }, [allUsers, currentUser.uid]);

  // Background Notifications
  useEffect(() => {
    const notifyCapacitor = async (name) => {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Jchatt',
              body: `New message from ${name}`,
              id: Math.floor(Date.now() / 1000) % 2147483647,
              schedule: { at: new Date(Date.now() + 100) },
              sound: null,
              attachments: null,
              actionTypeId: "",
              extra: null
            }
          ]
        });
      } catch (e) {}
    };

    if (chats.length === 0) {
      prevRecentChatsRef.current = recentChatsMap;
      return;
    }
    
    Object.keys(recentChatsMap).forEach(chatId => {
      const oldTime = prevRecentChatsRef.current[chatId] || 0;
      const newTime = recentChatsMap[chatId];
      // Only notify if there is a new message, and (it's not the active chat OR the app is in the background)
      const isAppHidden = document.hidden || (window.isAppActive === false);
      
      if (newTime > oldTime && oldTime !== 0 && (activeChat?.id !== chatId || isAppHidden)) {
        const chatInfo = chats.find(c => c.chatId === chatId);
        if (chatInfo && !blockedUsers[chatInfo.uid]) {
          if ('Notification' in window && Notification.permission === 'granted') {
             try { new Notification('Jchatt', { body: `New message from ${chatInfo.name}`, icon: '/icon-192.png' }); } catch(e){}
          }
          notifyCapacitor(chatInfo.name);
          
          if (userSettings?.soundEnabled !== false) {
             playPopSound();
          }

          // In-App Toast
          if (!isAppHidden) {
             setInAppToast({
                id: Date.now(),
                title: chatInfo.name,
                message: 'New message received',
                chat: chatInfo
             });
             setTimeout(() => setInAppToast(null), 4000);
          }
        }
      }
    });
    prevRecentChatsRef.current = recentChatsMap;
  }, [recentChatsMap, chats, userSettings, activeChat, blockedUsers]);

  const handleLogout = () => signOut(auth);

  const updateProfile = async () => {
    const userRef = dbRef(rtdb, `users/${currentUser.uid}`);
    await update(userRef, { displayName: profileName, about: profileAbout, photoURL: profilePhoto });
    setShowProfileModal(false);
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64Data = await compressImage(file, 150, 0.8);
      setProfilePhoto(base64Data);
      setIsUploading(false);
    } catch (err) {
      alert("Profile Photo Upload Error: " + err.message);
      setIsUploading(false);
    }
  };

  const handleStatusUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const caption = window.prompt("Add a caption for your status (optional):");
    
    try {
      const base64Data = await compressImage(file, 1080, 0.7);
      const newStatusRef = push(dbRef(rtdb, `statuses/${currentUser.uid}`));
      await set(newStatusRef, {
        mediaUrl: base64Data,
        type: file.type,
        caption: caption || '',
        timestamp: Date.now()
      });
    } catch (err) {
      alert("Status Upload Error: " + err.message);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    const membersMap = { [currentUser.uid]: true };
    selectedMembers.forEach(uid => { membersMap[uid] = true; });

    const newGroupRef = push(dbRef(rtdb, 'groups'));
    await set(newGroupRef, {
      name: groupName,
      adminId: currentUser.uid,
      members: membersMap,
      createdAt: Date.now()
    });
    setGroupName('');
    setSelectedMembers([]);
    setShowGroupModal(false);
  };

  const toggleSetting = async (key, value) => {
    const settingsRef = dbRef(rtdb, `settings/${currentUser.uid}`);
    await update(settingsRef, { [key]: value });
  };

  const toggleMemberSelection = (uid) => {
    if (selectedMembers.includes(uid)) {
      setSelectedMembers(selectedMembers.filter(id => id !== uid));
    } else {
      setSelectedMembers([...selectedMembers, uid]);
    }
  };

  const startNewChat = (contact) => {
    setActiveChat({
      id: contact.chatId,
      name: contact.name || contact.displayName,
      uid: contact.uid,
      online: contact.online,
      photoURL: contact.photoURL,
      isGroup: false
    });
    setShowContactsModal(false);
  };

  // Filter Active Chats Only
  const activeChats = chats
    .filter(c => recentChatsMap[c.chatId] !== undefined && !blockedUsers[c.uid])
    .filter(c => {
      if (activeTab === 'Messages') return !c.isGroup;
      if (activeTab === 'Groups') return c.isGroup;
      if (activeTab === 'Calls') return false; // Hide from chat list
      return true; // 'All'
    })
    .map(c => ({...c, lastUpdated: recentChatsMap[c.chatId]}))
    .sort((a,b) => b.lastUpdated - a.lastUpdated);

  const filteredActiveChats = activeChats.filter(c => {
    if (activeTab === 'Groups' && !c.isGroup) return false;
    if (activeTab === 'Messages' && c.isGroup) return false;
    if (activeTab === 'Calls') return false; // Hide chats in Calls tab for now
    return c.name?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredContacts = contactSearch.length >= 3 
    ? allUsers.filter(u => 
        !blockedUsers[u.uid] &&
        (u.email?.toLowerCase().includes(contactSearch.toLowerCase()) || 
        u.displayName?.toLowerCase().includes(contactSearch.toLowerCase()))
      )
    : [];

  const hasMyStatus = usersStatuses.some(u => u.uid === currentUser.uid);

  return (
    <div className="sidebar glass-panel">
      {/* In-App Toast */}
      {inAppToast && (
        <div className="in-app-toast" onClick={() => {
          setActiveChat(inAppToast.chat);
          setInAppToast(null);
        }}>
          <div className="toast-content">
            <div className="toast-title">{inAppToast.title}</div>
            <div className="toast-desc">{inAppToast.message}</div>
          </div>
          <button className="toast-close" onClick={(e) => { e.stopPropagation(); setInAppToast(null); }}><X size={14}/></button>
        </div>
      )}

      {activeStatusUserId && (
        <StatusViewer 
          usersStatuses={usersStatuses} 
          activeUserId={activeStatusUserId} 
          onClose={() => setActiveStatusUserId(null)} 
        />
      )}

      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="close-btn"><X size={20}/></button>
            </div>
            <div className="profile-edit-body">
              <div className="profile-upload" onClick={() => !isUploading && profileInputRef.current?.click()}>
                <img src={profilePhoto || 'https://via.placeholder.com/100'} alt="Profile" className="large-avatar" style={{opacity: isUploading ? 0.5 : 1}} />
                <div className="upload-overlay">
                  {isUploading ? <span style={{fontSize:'12px', fontWeight:'bold', color:'white'}}>Uploading...</span> : <Upload size={24}/>}
                </div>
                <input type="file" ref={profileInputRef} style={{display: 'none'}} onChange={handleProfilePhotoUpload} accept="image/*" disabled={isUploading} />
              </div>
              <div className="form-group">
              <label>Name</label>
              <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} />
              <label>About</label>
              <input type="text" className="form-input" value={profileAbout} onChange={e => setProfileAbout(e.target.value)} />
              <button className="primary-btn" onClick={updateProfile}>Save</button>
            </div>
          </div>
        </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>New Group</h3>
              <button onClick={() => setShowGroupModal(false)} className="close-btn"><X size={20}/></button>
            </div>
            <div className="modal-body">
              <input type="text" className="form-input mb-3" placeholder="Group Subject" value={groupName} onChange={e => setGroupName(e.target.value)} />
              <div className="member-selection">
                <h4>Select Members:</h4>
                <div className="member-list-scroll">
                  {allUsers.map(u => (
                    <div key={u.uid} className="member-row" onClick={() => toggleMemberSelection(u.uid)}>
                      <input type="checkbox" checked={selectedMembers.includes(u.uid)} readOnly />
                      <span>{u.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="primary-btn" onClick={createGroup} disabled={!groupName || selectedMembers.length === 0}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* New Contacts Modal */}
      {showContactsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{maxWidth: 400}}>
            <div className="modal-header">
              <h3>New Chat</h3>
              <button onClick={() => setShowContactsModal(false)} className="close-btn"><X size={20}/></button>
            </div>
            <div className="search-bar" style={{padding: '10px 20px', borderBottom: '1px solid var(--border-color)'}}>
              <input 
                type="text" 
                placeholder="Search by Email or Name..." 
                className="search-input" 
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
              />
            </div>
            <div className="modal-body" style={{padding: 0}}>
              <div className="member-list-scroll" style={{maxHeight: '300px', padding: '8px', border: 'none'}}>
                {filteredContacts.length > 0 ? filteredContacts.map(u => (
                  <div key={u.uid} className="chat-item" onClick={() => startNewChat(u)}>
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="Avatar" className="chat-avatar" style={{borderRadius: '50%', width: 40, height: 40}} />
                    ) : (
                      <div className="chat-avatar" style={{borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={20} /></div>
                    )}
                    <div className="chat-details">
                      <span className="chat-name">{u.displayName}</span>
                      <span className="chat-last-msg" style={{fontSize: '0.75rem'}}>{u.email}</span>
                    </div>
                  </div>
                )) : (
                  <div style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                    {contactSearch.length < 3 ? "Type at least 3 characters of an email or name to search." : `No users found matching "${contactSearch}"`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="close-btn"><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="setting-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <span>Notification Sounds</span>
                <input type="checkbox" checked={userSettings?.soundEnabled ?? true} onChange={(e) => toggleSetting('soundEnabled', e.target.checked)} />
              </div>
              <div className="setting-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>Read Receipts (Blue Ticks)</span>
                <input type="checkbox" checked={userSettings?.readReceipts ?? true} onChange={(e) => toggleSetting('readReceipts', e.target.checked)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-header">
        <div className="header-top">
          <div className="profile-section" onClick={() => setShowProfileModal(true)} title="Edit Profile">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Avatar" className="avatar" />
            ) : (
              <div className="avatar" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-primary)'}}><User size={24} /></div>
            )}
          </div>
          <h2 className="app-logo">Jchatt</h2>
          <div className="header-actions">
            <button className="action-btn" onClick={() => setShowGroupModal(true)} title="New Group">
              <Plus size={22} />
            </button>
            <button 
              className={`action-btn ${ghostMode ? 'ghost-active' : ''}`}
              onClick={() => setGhostMode(!ghostMode)}
              title="Ghost Mode (Invisible)"
            >
              <Ghost size={22} />
            </button>
          </div>
        </div>
        
        <div className="sidebar-tabs">
          <button className={`tab-item ${activeTab === 'All' ? 'active' : ''}`} onClick={() => setActiveTab('All')}>All</button>
          <button className={`tab-item ${activeTab === 'Messages' ? 'active' : ''}`} onClick={() => setActiveTab('Messages')}>Messages</button>
          <button className={`tab-item ${activeTab === 'Groups' ? 'active' : ''}`} onClick={() => setActiveTab('Groups')}>Groups</button>
          <button className={`tab-item ${activeTab === 'Calls' ? 'active' : ''}`} onClick={() => setActiveTab('Calls')}>Calls</button>
        </div>
      </div>

      <div className="statuses-row">
        <div className="status-item add-status">
          <div className="status-avatar-wrapper my-status" onClick={() => hasMyStatus ? setActiveStatusUserId(currentUser.uid) : statusInputRef.current?.click()}>
            <img src={profilePhoto || 'https://via.placeholder.com/50'} alt="My Status" />
            {!hasMyStatus && <div className="add-status-badge"><Plus size={12} /></div>}
          </div>
          <span>{hasMyStatus ? 'My Status' : 'Add Status'}</span>
          <input type="file" ref={statusInputRef} style={{display:'none'}} accept="image/*,video/*" onChange={handleStatusUpload} />
        </div>
        
        {usersStatuses.filter(u => u.uid !== currentUser.uid).map(userStatus => (
          <div className="status-item" key={userStatus.uid} onClick={() => setActiveStatusUserId(userStatus.uid)}>
            <div className="status-avatar-wrapper has-status">
              {userStatus.photoURL ? (
                <img src={userStatus.photoURL} alt={userStatus.name} />
              ) : (
                <div className="placeholder" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--bg-secondary)'}}><User size={24} color="var(--text-primary)" /></div>
              )}
            </div>
            <span>{userStatus.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      {/* Search Bar Removed from here, kept logic if needed or place in a smaller area */}
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Search chats..." 
          className="search-input" 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="chat-list">
        {activeTab === 'Calls' ? (
          <div className="empty-chats-message" style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            Call history coming soon...
          </div>
        ) : filteredActiveChats.length === 0 && search === '' ? (
          <div className="empty-chats-message" style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No chats found. Start a new one!
          </div>
        ) : null}
        
        {filteredActiveChats.map(c => (
          <div 
            key={c.chatId} 
            className={`chat-item ${activeChat?.id === c.chatId ? 'active' : ''}`}
            onClick={() => setActiveChat({ 
              id: c.chatId, 
              name: c.name, 
              uid: c.uid, 
              online: c.online, 
              photoURL: c.photoURL,
              isGroup: c.isGroup 
            })}
          >
            {c.photoURL ? (
              <img src={c.photoURL} alt="Avatar" className="chat-avatar" style={{borderRadius: c.isGroup ? '12px' : '50%'}} />
            ) : (
              <div className="chat-avatar" style={{borderRadius: c.isGroup ? '12px' : '50%'}}>{c.isGroup ? <Users size={20}/> : (c.name?.charAt(0) || '?')}</div>
            )}
            <div className="chat-details">
              <div className="chat-top">
                <span className="chat-name">{c.name}</span>
                {c.online && !c.isGroup && <span className="online-dot"></span>}
              </div>
              <div className="chat-bottom">
                <span className="chat-last-message">{c.isGroup ? 'Group Chat' : (c.online ? 'Online' : 'Offline')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Floating Action Button */}
      <button 
        className="fab-new-chat"
        onClick={() => setShowContactsModal(true)}
      >
        <Plus size={28} />
      </button>

      <div className="bottom-nav">
        <button className={`nav-item ${activeChat === null && activeTab === 'All' ? 'active' : ''}`} onClick={() => { setActiveChat(null); setActiveTab('All'); }}>
          <MessageSquare size={24} />
          <span>Home</span>
        </button>
        <button className="nav-item" onClick={() => setShowContactsModal(true)}>
          <Users size={24} />
          <span>Contacts</span>
        </button>
        <button className="nav-item" onClick={() => setShowSettingsModal(true)}>
          <Settings size={24} />
          <span>Settings</span>
        </button>
        <button className="nav-item" onClick={handleLogout}>
          <LogOut size={24} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
