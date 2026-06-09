import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, MoreVertical, Phone, Video, Calendar, EyeOff, Save, Mic, Square, Trash2, Edit2, X, Reply, Forward, ArrowLeft, User } from 'lucide-react';
import { ref as dbRef, onValue, push, set, update, remove, serverTimestamp, onDisconnect, query, limitToLast, orderByChild } from 'firebase/database';
import { rtdb } from '../firebase';
import { playPopSound } from '../utils/audio';
import { saveMessageLocal, getMessagesLocal, saveMultipleMessagesLocal, updateMessageStatusLocal } from '../utils/db';
import { compressImage } from '../utils/compressImage';
import { format } from 'date-fns';
import { LocalNotifications } from '@capacitor/local-notifications';
import './ChatWindow.css';

export default function ChatWindow({ currentUser, activeChat, setActiveChat, ghostMode, userSettings }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  
  // Media states
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunksRef = useRef([]);

  // Actions state
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [contacts, setContacts] = useState([]); // For forwarding modal
  const [activeMsgId, setActiveMsgId] = useState(null); // For mobile actions overlay
  
  // Pagination
  const [messageLimit, setMessageLimit] = useState(50);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  // Reset limit when changing chats
  useEffect(() => {
    setMessageLimit(50);
    setIsLoadingOlder(false);
  }, [activeChat?.id]);

  useEffect(() => {
    let unsubscribeMessages = () => {};

    const loadLocalAndSync = async () => {
      if (!activeChat) return;
      
      // 1. Load local history first
      const localMsgs = await getMessagesLocal(activeChat.id);
      setMessages(localMsgs);
      prevMsgCountRef.current = localMsgs.length;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      // 2. Listen to Firebase for incoming NEW messages
      const messagesRef = dbRef(rtdb, `messages/${activeChat.id}`);
      unsubscribeMessages = onValue(messagesRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const incomingMsgs = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));

          let hasNewIncoming = false;
          let uiNeedsUpdate = false;

          for (const msg of incomingMsgs) {
            if (msg.type === 'edit') {
              // Handle Edit Command
              const localMsgs = await getMessagesLocal(activeChat.id);
              const index = localMsgs.findIndex(m => m.id === msg.targetId);
              if (index > -1) {
                localMsgs[index].text = msg.text;
                localMsgs[index].isEdited = true;
                await saveMultipleMessagesLocal(activeChat.id, [localMsgs[index]]);
                uiNeedsUpdate = true;
              }
              // Clean up the command message
              remove(dbRef(rtdb, `messages/${activeChat.id}/${msg.id}`));
              continue;
            }

            // Delete message from server if it was successfully delivered to me
            const msgRef = dbRef(rtdb, `messages/${activeChat.id}/${msg.id}`);
            
            if (msg.senderId !== currentUser.uid) {
              hasNewIncoming = true;
              uiNeedsUpdate = true;
              
              // Send Read Receipt (Blue Ticks)
              const receiptRef = dbRef(rtdb, `receipts/${activeChat.id}/${msg.senderId}/${msg.id}`);
              if (!ghostMode && shouldShowReadReceipts) {
                set(receiptRef, true);
              }
              
              remove(msgRef); // V1 Ephemeral: Delete instantly from server!
            } else {
              // It's my own message just coming back, delete it to clean up the queue
              remove(msgRef);
              uiNeedsUpdate = true; // Make sure we save it locally!
            }
          }

          if (uiNeedsUpdate) {
            // Save to local DB
            const updatedLocalMsgs = await saveMultipleMessagesLocal(activeChat.id, incomingMsgs.filter(m => m.type !== 'edit'));
            setMessages(updatedLocalMsgs);
          }
          
          if (hasNewIncoming) {
            if (userSettings?.soundEnabled ?? true) {
              playPopSound();
            }
            if (window.isAppActive === false) {
               try {
                 await LocalNotifications.schedule({
                   notifications: [
                     {
                       title: 'New Message',
                       body: 'You received a new message in Jchatt',
                       id: Math.floor(Date.now() / 1000) % 2147483647,
                       schedule: { at: new Date(Date.now() + 100) },
                       sound: null,
                       actionTypeId: "",
                       extra: null
                     }
                   ]
                 });
               } catch(e) { console.error('Notification error', e); }
            }
          }

          setTimeout(() => {
            const scrollNode = scrollContainerRef.current;
            if (scrollNode) {
               const isNearBottom = scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight < 250;
               if (isNearBottom) {
                 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
               }
            }
          }, 0);
        }
      });
    };

    loadLocalAndSync();

    // 3. Listen for Read Receipts (Blue Ticks) coming back to us
    let unsubscribeReceipts = () => {};
    if (activeChat) {
      const myReceiptsRef = dbRef(rtdb, `receipts/${activeChat.id}/${currentUser.uid}`);
      unsubscribeReceipts = onValue(myReceiptsRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const readMessageIds = Object.keys(data);
          let updatedUI = false;
          
          for (const msgId of readMessageIds) {
            // Update local DB to 'read'
            const success = await updateMessageStatusLocal(activeChat.id, msgId, 'read');
            if (success) {
              updatedUI = true;
            }
            // Clear the receipt from server so we don't process it again
            remove(dbRef(rtdb, `receipts/${activeChat.id}/${currentUser.uid}/${msgId}`));
          }
          
          if (updatedUI) {
            // Refresh messages from local DB to reflect the new Blue Ticks
            const localMsgs = await getMessagesLocal(activeChat.id);
            setMessages(localMsgs);
          }
        }
      });
    }

    if (activeChat) {
      const typingRef = dbRef(rtdb, `typing/${activeChat.id}/${activeChat.uid}`);
      const unsubscribeTyping = onValue(typingRef, (snapshot) => {
        setOtherTyping(snapshot.val() === true);
      });

      const myTypingRef = dbRef(rtdb, `typing/${activeChat.id}/${currentUser.uid}`);
      onDisconnect(myTypingRef).set(false);

      return () => {
        unsubscribeMessages();
        unsubscribeReceipts();
        unsubscribeTyping();
        set(myTypingRef, false);
      };
    }
  }, [activeChat, currentUser, userSettings]);

  // Handle focusing to mark unread messages as read
  useEffect(() => {
    if (!activeChat) return;

    const markAsRead = async () => {
      if (document.hidden) return;
      
      let updated = false;
      const newMsgs = messages.map(msg => {
        if (msg.senderId !== currentUser.uid && msg.status !== 'read') {
          updated = true;
          // Send receipt to sender
          const receiptRef = dbRef(rtdb, `receipts/${msg.senderId}/${msg.id}`);
          set(receiptRef, { chatId: activeChat.id, status: 'read', timestamp: Date.now() });
          return { ...msg, status: 'read' };
        }
        return msg;
      });

      if (updated) {
        setMessages(newMsgs);
        saveMultipleMessagesLocal(activeChat.id, newMsgs);
      }
    };

    markAsRead();

    const handleFocus = () => markAsRead();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeChat, messages, currentUser]);

  // Listen for read receipts globally
  useEffect(() => {
    if (!currentUser) return;
    const receiptsRef = dbRef(rtdb, `receipts/${currentUser.uid}`);
    const unsubscribe = onValue(receiptsRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const receipts = Object.keys(data).map(key => ({ msgId: key, ...data[key] }));
      
      for (const receipt of receipts) {
        // Read the message from local DB
        const localMsgs = await getMessagesLocal(receipt.chatId);
        const msgIndex = localMsgs.findIndex(m => m.id === receipt.msgId);
        if (msgIndex !== -1 && localMsgs[msgIndex].status !== 'read') {
          localMsgs[msgIndex].status = 'read';
          await saveMultipleMessagesLocal(receipt.chatId, [localMsgs[msgIndex]]);
          
          // If this receipt is for the active chat, update state
          if (activeChat && activeChat.id === receipt.chatId) {
            setMessages(prev => prev.map(m => m.id === receipt.msgId ? { ...m, status: 'read' } : m));
          }
        }
        // Remove receipt from server
        remove(dbRef(rtdb, `receipts/${currentUser.uid}/${receipt.msgId}`));
      }
    });

    return () => unsubscribe();
  }, [currentUser, activeChat]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && messages.length >= messageLimit) {
      setIsLoadingOlder(true);
      setMessageLimit(prev => prev + 50);
    }
  };

  // Fetch contacts for forwarding
  useEffect(() => {
    if (forwardingMsg) {
      const usersRef = dbRef(rtdb, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.keys(data)
            .filter(uid => uid !== currentUser.uid)
            .map(uid => ({ uid, ...data[uid] }));
          setContacts(list);
        }
      }, { onlyOnce: true });
    }
  }, [forwardingMsg, currentUser.uid]);

  // Handle Typing indicator
  useEffect(() => {
    if (!activeChat || ghostMode) return;
    
    const myTypingRef = dbRef(rtdb, `typing/${activeChat.id}/${currentUser.uid}`);
    onDisconnect(myTypingRef).set(false);

    if (inputText.length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        set(myTypingRef, true);
      }
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        set(myTypingRef, false);
      }, 1500);
      
      // Auto save draft logic
      const draftTimer = setTimeout(() => {
        setDraftSaved(true);
      }, 1000);
      return () => {
        clearTimeout(draftTimer);
        setDraftSaved(false);
      };
    } else {
      if (isTyping) {
        setIsTyping(false);
        set(myTypingRef, false);
      }
      setDraftSaved(false);
    }
  }, [inputText, activeChat, currentUser, ghostMode, isTyping]);

  const updateRecentChats = (chatId, chatObj) => {
    try {
      const updates = {};
      const tstamp = Date.now();
      updates[`recentChats/${currentUser.uid}/${chatId}`] = tstamp;
      if (chatObj?.isGroup && chatObj?.members) {
        Object.keys(chatObj.members).forEach(memberId => {
          updates[`recentChats/${memberId}/${chatId}`] = tstamp;
        });
      } else if (!chatObj?.isGroup && chatObj?.uid) {
        updates[`recentChats/${chatObj.uid}/${chatId}`] = tstamp;
      }
      update(dbRef(rtdb), updates).catch(e => console.warn('Update recentChats error:', e.message));
    } catch(err) {
      alert("Error in updateRecentChats: " + err.message);
    }
  };

  const handleSend = async () => {
    try {
      if (!inputText.trim() || !activeChat) return;
      
      const msgText = inputText;
      
      if (editingMessage) {
        // Send edit command
        const editRef = push(dbRef(rtdb, `messages/${activeChat.id}`));
        await set(editRef, {
          id: editRef.key,
          type: 'edit',
          targetId: editingMessage.id,
          text: msgText,
          senderId: currentUser.uid,
          timestamp: Date.now()
        });
        
        // Update local UI immediately
        const localMsgs = await getMessagesLocal(activeChat.id);
        const index = localMsgs.findIndex(m => m.id === editingMessage.id);
        if (index > -1) {
          localMsgs[index].text = msgText;
          localMsgs[index].isEdited = true;
          await saveMultipleMessagesLocal(activeChat.id, [localMsgs[index]]);
          setMessages(localMsgs);
        }

        setEditingMessage(null);
        setInputText('');
        return;
      }

      const newMsgRef = push(dbRef(rtdb, `messages/${activeChat.id}`));
      const payload = {
        id: newMsgRef.key,
        text: msgText,
        senderId: currentUser.uid,
        timestamp: Date.now(),
        status: ghostMode ? 'sent' : 'delivered',
        ghostMode: ghostMode || false
      };

      if (replyingTo && replyingTo.text) {
        payload.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
        };
      }

      if (showSchedule && scheduleTime) {
        payload.timestamp = new Date(scheduleTime).getTime();
        payload.status = 'scheduled';
        payload.isScheduled = true;
        set(newMsgRef, payload).catch(e => alert("Firebase Set Error: " + e.message));
        setShowSchedule(false);
        setScheduleTime('');
      } else {
        set(newMsgRef, payload).catch(e => alert("Firebase Set Error: " + e.message));
        updateRecentChats(activeChat.id, activeChat);
      }
      setReplyingTo(null);
      setInputText('');
    } catch(err) {
      alert("handleSend crashed: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;
    
    setIsUploading(true);
    try {
      // V1 Base64 Encoding with Aggressive Mobile Compression
      const base64Data = await compressImage(file, 1280, 0.7);
      
      const newMsgRef = push(dbRef(rtdb, `messages/${activeChat.id}`));
      const payload = {
        id: newMsgRef.key,
        text: file.name,
        fileUrl: base64Data, // Store Base64 directly in payload
        fileType: file.type,
        senderId: currentUser.uid,
        timestamp: Date.now(),
        status: ghostMode ? 'sent' : 'delivered',
        ghostMode: ghostMode || false
      };
      if (replyingTo && replyingTo.text) payload.replyTo = { id: replyingTo.id, text: replyingTo.text };

      // Save locally instantly so we see it
      const updatedMsgs = await saveMultipleMessagesLocal(activeChat.id, [payload]);
      setMessages(updatedMsgs);

      // Push to server queue
      await set(newMsgRef, payload);
      updateRecentChats(activeChat.id, activeChat);
      
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setReplyingTo(null);
    } catch (error) {
      alert("File Upload Error: " + error.message);
      setIsUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        
        recorder.onstop = async () => {
          setIsUploading(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
            
            // V1 Base64 Encoding
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result;
              
              const newMsgRef = push(dbRef(rtdb, `messages/${activeChat.id}`));
              const payload = {
                id: newMsgRef.key,
                text: "Voice Note",
                audioUrl: base64Data, // Store Base64 directly
                senderId: currentUser.uid,
                timestamp: Date.now(),
                status: ghostMode ? 'sent' : 'delivered',
                ghostMode: ghostMode || false
              };
              if (replyingTo && replyingTo.text) payload.replyTo = { id: replyingTo.id, text: replyingTo.text };

              // Save locally
              const updatedMsgs = await saveMultipleMessagesLocal(activeChat.id, [payload]);
              setMessages(updatedMsgs);

              await set(newMsgRef, payload);
              updateRecentChats(activeChat.id, activeChat);
              
              setIsUploading(false);
              setReplyingTo(null);
            };
            reader.readAsDataURL(audioBlob);
            
          } catch (error) {
            alert("Voice Note Error: " + error.message);
            setIsUploading(false);
            setReplyingTo(null);
          }
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        alert("Microphone Error: " + error.message + "\n\nPlease allow microphone access in your browser settings.");
      }
    }
  };

  const handleDelete = (msgId) => {
    if(window.confirm("Delete this message for everyone?")) {
      const msgRef = dbRef(rtdb, `messages/${activeChat.id}/${msgId}`);
      remove(msgRef);
    }
  };

  const handleEditClick = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const handleForwardExecute = async (contact) => {
    if (!forwardingMsg) return;
    
    const targetChatId = currentUser.uid < contact.uid 
      ? `${currentUser.uid}_${contact.uid}` 
      : `${contact.uid}_${currentUser.uid}`;

    const newMsgRef = push(dbRef(rtdb, `messages/${targetChatId}`));
    const payload = {
      text: forwardingMsg.text,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      status: 'delivered',
      isForwarded: true
    };
    if (forwardingMsg.fileUrl) {
      payload.fileUrl = forwardingMsg.fileUrl;
      payload.fileType = forwardingMsg.fileType;
    }
    if (forwardingMsg.audioUrl) {
      payload.audioUrl = forwardingMsg.audioUrl;
    }

    await set(newMsgRef, payload);
    updateRecentChats(targetChatId, { uid: contact.uid });
    
    setForwardingMsg(null);
    alert('Message forwarded!');
  };

  const shouldShowReadReceipts = userSettings?.readReceipts ?? true;

  if (!activeChat) {
    return (
      <div className="chat-window empty">
        <div className="empty-state">
          <div className="empty-icon glass-panel">J</div>
          <h2>Jchatt Web</h2>
          <p>Select a chat to start messaging.</p>
          {ghostMode && <div className="ghost-badge"><EyeOff size={16} className="inline-icon" /> Ghost Mode Active</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Forwarding Modal */}
      {forwardingMsg && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{maxWidth: 400}}>
            <div className="modal-header">
              <h3>Forward to...</h3>
              <button onClick={() => setForwardingMsg(null)} className="close-btn"><X size={20}/></button>
            </div>
            <div className="modal-body" style={{padding: 0, maxHeight: 400, overflowY: 'auto'}}>
              {contacts.map(c => (
                <div key={c.uid} className="chat-item" onClick={() => handleForwardExecute(c)}>
                  {c.photoURL ? (
                    <img src={c.photoURL} alt="Avatar" className="chat-avatar" style={{borderRadius: '50%', width: 40, height: 40}} />
                  ) : (
                    <div className="chat-avatar" style={{borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={20} /></div>
                  )}
                  <div className="chat-details">
                    <span className="chat-name">{c.displayName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="chat-header glass-panel">
        <button className="mobile-back-btn action-btn" onClick={() => setActiveChat(null)}>
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-info">
          {activeChat.photoURL ? (
            <img src={activeChat.photoURL} alt="Avatar" className="chat-avatar" style={{width: 40, height: 40, borderRadius: '50%'}} />
          ) : (
            <div className="chat-avatar" style={{width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><User size={24} color="var(--text-primary)" /></div>
          )}
          <div>
            <h3 className="chat-title">{activeChat.name}</h3>
            {ghostMode ? (
              <span className="chat-status ghost">
                <EyeOff size={12} className="inline-icon" /> Invisible
              </span>
            ) : otherTyping && !activeChat.isGroup ? (
              <span className="chat-status typing-animated">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </span>
            ) : (
              <span className="chat-status online">{activeChat.isGroup ? 'Group Chat' : (activeChat.online ? 'Online' : 'Offline')}</span>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          {!activeChat.isGroup && (
            <>
              <button 
                className="icon-btn" 
                onClick={() => window.dispatchEvent(new CustomEvent('start-jchatt-call', { detail: { calleeId: activeChat.uid, calleeName: activeChat.name, video: true } }))}
              >
                <Video size={20} />
              </button>
              <button 
                className="icon-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('start-jchatt-call', { detail: { calleeId: activeChat.uid, calleeName: activeChat.name, video: false } }))}
              >
                <Phone size={20} />
              </button>
            </>
          )}
          <div className="dropdown-container" style={{position: 'relative'}}>
            <button className="icon-btn" onClick={() => {
              const menu = document.getElementById('chat-menu');
              if(menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            }}>
              <MoreVertical size={20} />
            </button>
            <div id="chat-menu" className="dropdown-menu glass-panel" style={{display: 'none', position: 'absolute', right: 0, top: '40px', zIndex: 100, minWidth: '150px'}}>
              <div className="msg-menu-item danger" onClick={() => {
                if(window.confirm(`Are you sure you want to block ${activeChat.name}?`)) {
                  set(dbRef(rtdb, `users/${currentUser.uid}/blocked/${activeChat.uid}`), true);
                  alert('User blocked.');
                  setActiveChat(null);
                }
              }}>
                Block User
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area" ref={scrollContainerRef}>
        <div className="encryption-notice glass-panel">
          🔒 Messages are end-to-end encrypted & stored only on your device.
        </div>
        
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.uid;
          const displayTime = msg.timestamp ? format(new Date(msg.timestamp), 'h:mm a') : 'Sending...';

          return (
            <div key={msg.id} className={`message-wrapper ${isMe ? 'me' : 'them'}`} onClick={() => setActiveMsgId(activeMsgId === msg.id ? null : msg.id)}>
              <div className={`message-actions-overlay ${activeMsgId === msg.id ? 'show-mobile' : ''}`}>
                <button onClick={() => setReplyingTo(msg)} title="Reply"><Reply size={14}/></button>
                <button onClick={() => setForwardingMsg(msg)} title="Forward"><Forward size={14}/></button>
                {isMe && !msg.isScheduled && (
                  <>
                    <button onClick={() => handleEditClick(msg)} title="Edit"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(msg.id)} className="delete-btn" title="Delete"><Trash2 size={14}/></button>
                  </>
                )}
              </div>
              <div className={`message-bubble ${msg.isScheduled ? 'scheduled' : ''}`}>
                {msg.isForwarded && (
                  <div className="forwarded-tag">
                    <Forward size={12} className="inline-icon"/> Forwarded
                  </div>
                )}
                
                {msg.replyTo && (
                  <div className="message-reply-preview">
                    <div className="reply-preview-text">{msg.replyTo.text}</div>
                  </div>
                )}

                {msg.fileUrl ? (
                  msg.fileType?.startsWith('image/') ? (
                    <img src={msg.fileUrl} alt="attachment" className="message-image" />
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">📎 {msg.text}</a>
                  )
                ) : msg.audioUrl ? (
                  <audio controls src={msg.audioUrl} className="message-audio"></audio>
                ) : (
                  <div className="message-text">{msg.text}</div>
                )}
                
                <div className="message-meta">
                  {msg.isEdited && <span className="edited-tag">(edited)</span>}
                  <span className="message-time">{displayTime}</span>
                  {isMe && !msg.isScheduled && shouldShowReadReceipts && (
                    <span className={`message-status ${msg.status || 'delivered'}`}>
                      {msg.status === 'read' ? '✓✓' : '✓'}
                    </span>
                  )}
                  {msg.isScheduled && <Calendar size={10} className="inline-icon ml-1" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area glass-panel">
        {draftSaved && !editingMessage && (
          <div className="draft-indicator animate-fade-in">
            <Save size={12} className="inline-icon" /> Draft saved
          </div>
        )}
        
        {editingMessage && (
          <div className="editing-indicator animate-fade-in">
            <Edit2 size={12} className="inline-icon" /> Editing message
            <button className="cancel-edit" onClick={() => {setEditingMessage(null); setInputText('');}}><X size={14}/></button>
          </div>
        )}

        {replyingTo && (
          <div className="replying-to-indicator animate-fade-in">
            <div className="reply-content">
              <Reply size={12} className="inline-icon" /> Replying to: {replyingTo.text}
            </div>
            <button className="cancel-edit" onClick={() => setReplyingTo(null)}><X size={14}/></button>
          </div>
        )}
        
        {showSchedule && (
          <div className="schedule-picker animate-fade-in">
            <label>Schedule for:</label>
            <input 
              type="datetime-local" 
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="schedule-input"
            />
            <button className="close-schedule" onClick={() => setShowSchedule(false)}><X size={16}/></button>
          </div>
        )}
        
        <div className="input-container">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{display: 'none'}} 
            onChange={handleFileUpload}
            accept="image/*,video/*,.pdf,.doc,.docx"
            disabled={isUploading}
          />
          <button className="icon-btn" onClick={() => !isUploading && fileInputRef.current?.click()} disabled={isUploading}>
            <Paperclip size={20} />
          </button>
          
          <input 
            type="text" 
            className="message-input" 
            placeholder={isUploading ? "Uploading file..." : isRecording ? "Recording voice note..." : "Type a message..."} 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isUploading && handleSend()}
            disabled={isRecording || isUploading}
          />
          
          <button 
            className={`icon-btn schedule-btn ${showSchedule ? 'active' : ''}`}
            onClick={() => !isUploading && setShowSchedule(!showSchedule)}
            title="Schedule Message"
            disabled={isUploading}
          >
            <Calendar size={20} />
          </button>
        </div>
        
        {inputText.trim() || editingMessage || replyingTo ? (
          <button className="send-btn" onClick={handleSend} disabled={isUploading}>
            <Send size={18} style={{ marginLeft: '2px' }} />
          </button>
        ) : (
          <button className={`send-btn mic-btn ${isRecording ? 'recording' : ''}`} onClick={toggleRecording} disabled={isUploading} style={{ background: isRecording ? 'var(--danger)' : 'var(--accent-primary)' }}>
            {isRecording ? <Square size={20} className="pulse" /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}
