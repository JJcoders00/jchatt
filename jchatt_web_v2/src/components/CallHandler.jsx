import React, { useEffect, useRef, useState } from 'react';
import { rtdb } from '../firebase';
import { ref as dbRef, onValue, set, onDisconnect, remove, onChildAdded } from 'firebase/database';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MessageSquare } from 'lucide-react';
import { startRinging, stopRinging } from '../utils/audio';
import { LocalNotifications } from '@capacitor/local-notifications';
import './CallHandler.css';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ]
};

export default function CallHandler({ currentUser, userSettings }) {
  const [callState, setCallState] = useState('idle'); // idle, receiving, calling, connected
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isVideo, setIsVideo] = useState(true);
  
  // Media states
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIdRef = useRef(null); // Keep a ref for listeners
  const isAnsweringRef = useRef(false);

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Listen for incoming calls on our user node
  useEffect(() => {
    if (!currentUser) return;

    const myIncomingRef = dbRef(rtdb, `users/${currentUser.uid}/incomingCall`);
    const unsubscribe = onValue(myIncomingRef, (snapshot) => {
      const data = snapshot.val();
      if (!data && callStateRef.current === 'receiving' && !isAnsweringRef.current) {
        // Caller cancelled
        endCallLocally();
      } else if (data && callStateRef.current === 'idle') {
        // Ignore calls older than 45 seconds (ghost rings)
        if (data.timestamp && Date.now() - data.timestamp > 45000) {
          remove(myIncomingRef);
          return;
        }
        
        // Incoming call!
        setIncomingCall(data);
        setActiveRoomId(data.roomId);
        roomIdRef.current = data.roomId;
        setCallState('receiving');
        isAnsweringRef.current = false; // Reset when receiving a new call
        
        // Force Notification on all incoming calls for better reliability
        try {
          LocalNotifications.schedule({
            notifications: [
              {
                title: 'Incoming Call',
                body: `${data.callerName} is calling you...`,
                id: Math.floor(Date.now() / 1000) % 2147483647,
                schedule: { at: new Date(Date.now() + 100) },
                actionTypeId: "",
                extra: null
              }
            ]
          });
        } catch(e) {}
        
        if ('Notification' in window && Notification.permission === 'granted' && window.isAppActive) {
          try {
            const notif = new Notification('Incoming Jchatt Call', { 
              body: `${data.callerName} is calling you...`, 
              icon: '/icon-192.png',
              requireInteraction: true
            });
            notif.onclick = () => window.focus();
          } catch(e) {}
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, callState]);

  // Listen for room status changes if we are in a call
  useEffect(() => {
    if (!activeRoomId) return;

    const roomStatusRef = dbRef(rtdb, `calls/${activeRoomId}/status`);
    const unsub = onValue(roomStatusRef, (snapshot) => {
      const status = snapshot.val();
      if (status === 'ended' && callState !== 'idle') {
        endCallLocally();
      }
    });

    return () => unsub();
  }, [activeRoomId, callState]);

  // Audio effect
  useEffect(() => {
    if (callState === 'receiving' && (userSettings?.soundEnabled ?? true)) {
      startRinging();
    } else {
      stopRinging();
    }
    return () => stopRinging();
  }, [callState, userSettings]);

  // Listen globally to window events to start calls from ChatWindow
  useEffect(() => {
    const handleStartCall = async (e) => {
      const { calleeId, calleeName, video } = e.detail;
      setIsVideo(video);
      await startCall(calleeId, calleeName, video);
    };

    window.addEventListener('start-jchatt-call', handleStartCall);
    return () => window.removeEventListener('start-jchatt-call', handleStartCall);
  }, [currentUser]);

  const setupMedia = async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      alert("Microphone/Camera permission denied. Please allow them in your browser/app settings.");
      return null;
    }
  };

  const setupPeerConnection = (roomId, role) => {
    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Listen for remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateRef = dbRef(rtdb, `calls/${roomId}/candidates/${role}/${Date.now()}`);
        set(candidateRef, event.candidate.toJSON());
      }
    };

    // Listen for remote ICE candidates
    const remoteRole = role === 'caller' ? 'callee' : 'caller';
    const candidatesRef = dbRef(rtdb, `calls/${roomId}/candidates/${remoteRole}`);
    onChildAdded(candidatesRef, (data) => {
      const candidate = new RTCIceCandidate(data.val());
      pc.addIceCandidate(candidate);
    });

    return pc;
  };

  const startCall = async (calleeId, calleeName, video) => {
    const stream = await setupMedia(video);
    if (!stream) return;

    setCallState('calling');
    const roomId = `room_${Date.now()}_${currentUser.uid}`;
    setActiveRoomId(roomId);
    roomIdRef.current = roomId;

    const pc = setupPeerConnection(roomId, 'caller');

    // Create Offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // Setup Room
    await set(dbRef(rtdb, `calls/${roomId}`), {
      status: 'ringing',
      offer: { type: 'offer', sdp: offerDescription.sdp }
    });

    // Notify Callee
    await set(dbRef(rtdb, `users/${calleeId}/incomingCall`), {
      roomId,
      callerId: currentUser.uid,
      callerName: currentUser.displayName || 'Someone',
      video: video,
      timestamp: Date.now()
    });

    // Listen for answer
    const answerRef = dbRef(rtdb, `calls/${roomId}/answer`);
    const unsubAnswer = onValue(answerRef, async (snapshot) => {
      const answer = snapshot.val();
      if (answer && callStateRef.current === 'calling') {
        const answerDesc = new RTCSessionDescription(answer);
        await pc.setRemoteDescription(answerDesc);
        setCallState('connected');
        unsubAnswer();
      }
    });
  };

  const answerCall = async () => {
    if (!incomingCall) return;
    
    isAnsweringRef.current = true;

    setIsVideo(incomingCall.video);
    const stream = await setupMedia(incomingCall.video);
    if (!stream) {
      rejectCall();
      return;
    }

    setCallState('connected');
    callStateRef.current = 'connected'; // Synchronously update ref to prevent closure mismatch listener wipe
    const roomId = incomingCall.roomId;
    const pc = setupPeerConnection(roomId, 'callee');

    // Read Offer
    const roomRef = dbRef(rtdb, `calls/${roomId}/offer`);
    onValue(roomRef, async (snapshot) => {
      const offer = snapshot.val();
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Create Answer
        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        // Write Answer
        await set(dbRef(rtdb, `calls/${roomId}/answer`), {
          type: 'answer',
          sdp: answerDescription.sdp
        });
        await set(dbRef(rtdb, `calls/${roomId}/status`), 'connected');
      }
    }, { onlyOnce: true });

    // Clear incoming bell
    await remove(dbRef(rtdb, `users/${currentUser.uid}/incomingCall`));
  };

  const rejectCall = async () => {
    if (incomingCall) {
      await set(dbRef(rtdb, `calls/${incomingCall.roomId}/status`), 'ended');
      await remove(dbRef(rtdb, `users/${currentUser.uid}/incomingCall`));
    }
    endCallLocally();
  };

  const endCallLocally = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setCallState('idle');
    setIncomingCall(null);
    setActiveRoomId(null);
    roomIdRef.current = null;
  };

  const endCall = async () => {
    if (activeRoomId) {
      await set(dbRef(rtdb, `calls/${activeRoomId}/status`), 'ended');
    }
    if (callState === 'calling' && incomingCall?.calleeId) {
       // We don't have calleeId saved here if we are the caller.
       // It's cleaner to have callee listen to room status.
    }
    // Clean up our bell just in case
    await remove(dbRef(rtdb, `users/${currentUser.uid}/incomingCall`));
    
    endCallLocally();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoActive(videoTrack.enabled);
      }
    }
  };

  if (callState === 'idle') return null;

  return (
    <div className={`call-overlay ${!isVideo ? 'audio-only-mode' : ''}`}>
      
      {/* Receiving Call UI */}
      {callState === 'receiving' && (
        <div className={`call-box incoming ${!isVideo ? 'whatsapp-audio' : ''}`}>
          {!isVideo && <div className="wa-brand"><Phone size={14}/> Jchatt</div>}
          <h2 className="caller-name">{incomingCall?.callerName}</h2>
          <p className="call-type">{!isVideo ? 'Jchatt Audio...' : 'Jchatt Video...'}</p>
          
          <div className="caller-avatar pulse">
            {incomingCall?.callerName?.charAt(0) || '?'}
          </div>
          
          <div className="call-actions">
            <button className="fab fab-decline" onClick={rejectCall}>
              <PhoneOff size={32}/>
            </button>
            <button className="fab fab-accept" onClick={answerCall}>
              {incomingCall?.video ? <Video size={32}/> : <Phone size={32}/>}
            </button>
          </div>
        </div>
      )}

      {/* Calling / Connected UI */}
      {(callState === 'calling' || callState === 'connected') && (
        <div className={`call-box active-call ${!isVideo ? 'whatsapp-audio' : ''}`}>
          
          {isVideo ? (
            <div className="video-container">
              <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
            </div>
          ) : (
            <>
              <div className="wa-brand"><Phone size={14}/> Jchatt</div>
              <h2 className="caller-name">{incomingCall?.callerName || 'Unknown Contact'}</h2>
              <p className="call-type">{callState === 'calling' ? 'Calling...' : '00:00'}</p>
              <div className="caller-avatar">
                 {incomingCall?.callerName?.charAt(0) || 'U'}
              </div>
            </>
          )}
          
          {isVideo && (
            <div className="call-header top">
              <h2 className="status-text">{callState === 'calling' ? 'Calling...' : ''}</h2>
            </div>
          )}

          <div className={`call-actions bottom ${!isVideo ? 'wa-actions' : ''}`}>
            {!isVideo && (
               <div className="wa-buttons-row">
                 <div className="wa-btn-container">
                   <button className={`fab-wa ${!micActive ? 'muted' : ''}`} onClick={toggleMic}>
                     {micActive ? <Mic size={24}/> : <MicOff size={24}/>}
                   </button>
                   <span>Mute</span>
                 </div>
                 <div className="wa-btn-container">
                   <button className="fab-wa" onClick={() => {}}>
                     <MessageSquare size={24}/>
                   </button>
                   <span>Message</span>
                 </div>
                 <div className="wa-btn-container">
                   <button className="fab-wa" onClick={() => {}}>
                     <Phone size={24}/>
                   </button>
                   <span>Speaker</span>
                 </div>
               </div>
            )}
            
            {isVideo && (
              <>
                <button className={`fab fab-control ${!micActive ? 'muted' : ''}`} onClick={toggleMic}>
                  {micActive ? <Mic size={28}/> : <MicOff size={28}/>}
                </button>
                <button className={`fab fab-control ${!videoActive ? 'muted' : ''}`} onClick={toggleVideo}>
                  {videoActive ? <Video size={28}/> : <VideoOff size={28}/>}
                </button>
              </>
            )}
            
            <button className="fab fab-decline wa-decline" onClick={endCall}>
              <PhoneOff size={28}/>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
