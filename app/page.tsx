"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import NavTabs from '@/components/NavTabs';
import { Profile } from '@/components/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://YOUR-BACKEND.onrender.com';
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || 'wss://YOUR-BACKEND.onrender.com/ws';

export default function Home() {
  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState('Offline');
  const [chatInput, setChatInput] = useState('');
  const [chat, setChat] = useState<{ text: string; who: 'me' | 'partner' | 'system' }[]>([]);
  const [profiles, setProfiles] = useState<{ topUsers: Profile[]; matches: Profile[]; swipeDeck: Profile[] }>({
    topUsers: [],
    matches: [],
    swipeDeck: [],
  });
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [roomActive, setRoomActive] = useState(false);

  const featuredProfile = useMemo(() => profiles.swipeDeck[0], [profiles.swipeDeck]);

  const addChat = (text: string, who: 'me' | 'partner' | 'system') => {
    setChat((prev) => [...prev, { text, who }]);
  };

  const ensureSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(WS_BASE);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('Connected');
      socket.send(JSON.stringify({ type: 'introduce', name: 'User' }));
      addChat('Si pripojený na server.', 'system');
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'system') addChat(data.message, 'system');
      if (data.type === 'waiting') {
        setStatus('Čakáš na partnera...');
        setRoomActive(false);
        addChat(data.message, 'system');
      }
      if (data.type === 'matched') {
        setStatus('Matched');
        setRoomActive(true);
        addChat(data.message, 'system');
        await preparePeerConnection();
        if (data.role === 'offerer') {
          await createOffer();
        }
      }
      if (data.type === 'chat_message') {
        addChat(data.text, 'partner');
      }
      if (data.type === 'partner_disconnected') {
        setStatus('Partner left');
        setRoomActive(false);
        closePeer();
        addChat(data.message, 'system');
      }
      if (data.type === 'webrtc_offer') {
        await preparePeerConnection();
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerRef.current?.createAnswer();
        if (answer) {
          await peerRef.current?.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: 'webrtc_answer', answer }));
        }
      }
      if (data.type === 'webrtc_answer') {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
      if (data.type === 'ice_candidate' && data.candidate) {
        try {
          await peerRef.current?.addIceCandidate(data.candidate);
        } catch {
          // ignore bad candidate
        }
      }
      if (data.type === 'toggle_camera') {
        addChat(data.enabled ? 'Partner zapol kameru.' : 'Partner vypol kameru.', 'system');
      }
      if (data.type === 'toggle_mic') {
        addChat(data.enabled ? 'Partner zapol mikrofón.' : 'Partner stíšil mikrofón.', 'system');
      }
    };

    socket.onclose = () => {
      setStatus('Disconnected');
      setRoomActive(false);
      closePeer();
    };
  };

  const prepareMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const preparePeerConnection = async () => {
    if (peerRef.current) return peerRef.current;

    const stream = await prepareMedia();
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ice_candidate', candidate: event.candidate }));
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setStatus('Live video connected');
      }
      if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
        setRoomActive(false);
      }
    };

    peerRef.current = peer;
    return peer;
  };

  const createOffer = async () => {
    const peer = await preparePeerConnection();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current?.send(JSON.stringify({ type: 'webrtc_offer', offer }));
  };

  const closePeer = () => {
    peerRef.current?.close();
    peerRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const startMatching = async () => {
    ensureSocket();
    await prepareMedia();
    setTimeout(() => {
      socketRef.current?.send(JSON.stringify({ type: 'start' }));
    }, 300);
  };

  const skipPartner = () => {
    socketRef.current?.send(JSON.stringify({ type: 'next' }));
    closePeer();
    setStatus('Hľadám ďalšieho partnera...');
  };

  const stopMatching = () => {
    socketRef.current?.send(JSON.stringify({ type: 'stop' }));
    closePeer();
    setRoomActive(false);
    setStatus('Stopped');
  };

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    socketRef.current?.send(JSON.stringify({ type: 'chat_message', text }));
    addChat(text, 'me');
    setChatInput('');
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !cameraEnabled;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraEnabled(next);
    socketRef.current?.send(JSON.stringify({ type: 'toggle_camera', enabled: next }));
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicEnabled(next);
    socketRef.current?.send(JSON.stringify({ type: 'toggle_mic', enabled: next }));
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/profiles`)
      .then((res) => res.json())
      .then((data) => setProfiles(data))
      .catch(() => undefined);

    return () => {
      socketRef.current?.close();
      closePeer();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <main className="pageShell">
      <div className="appFrame liveFrame">
        <Sidebar
          titleLeft="TOP UŽÍVATELIA"
          titleRight="MOJE ZHODY"
          leftProfiles={profiles.topUsers}
          rightProfiles={profiles.matches}
        />

        <section className="mainStage">
          <NavTabs active="live" />

          <div className="videoColumns">
            <div className="videoPanel">
              <div className="panelMediaWrap">
                {featuredProfile ? (
                  <Image src={featuredProfile.image} alt={featuredProfile.name} fill sizes="50vw" className="coverImg dimBehind" />
                ) : null}
                <video ref={localVideoRef} autoPlay muted playsInline className="videoEl" />
                <div className="videoLabel leftLabel">TY</div>
                <div className="topOverlayText">{status}</div>
              </div>

              <div className="actionStrip">
                <button className="primaryAction likeBtn" onClick={startMatching}>LIKE 👍</button>
                <button className="primaryAction skipBtn" onClick={skipPartner}>SKIP ⏩</button>
              </div>
            </div>

            <div className="videoPanel">
              <div className="panelMediaWrap">
                {featuredProfile ? (
                  <Image src={featuredProfile.image} alt={featuredProfile.name} fill sizes="50vw" className="coverImg dimBehind" />
                ) : null}
                <video ref={remoteVideoRef} autoPlay playsInline className="videoEl" />
                <div className="videoLabel rightLabel">PARTNER</div>
              </div>
            </div>
          </div>

          <div className="chatBoxShell">
            <div className="toolbarRow">
              <button className="circleAction" onClick={toggleCamera}>{cameraEnabled ? '📷' : '🚫📷'}</button>
              <button className="circleAction" onClick={toggleMic}>{micEnabled ? '🎙️' : '🔇'}</button>
              <button className="circleAction" onClick={stopMatching}>⛔</button>
              <span className={roomActive ? 'statusBadge active' : 'statusBadge'}>{roomActive ? 'LIVE' : 'IDLE'}</span>
            </div>

            <div className="chatLog">
              {chat.map((entry, index) => (
                <div key={`${entry.text}-${index}`} className={`chatBubble ${entry.who}`}>
                  {entry.text}
                </div>
              ))}
            </div>

            <div className="chatInputRow">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Start typing..."
                className="chatInput"
              />
              <button className="sendBtn" onClick={sendMessage}>Send</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
