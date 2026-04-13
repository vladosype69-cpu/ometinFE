"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  text: string;
  type: "system" | "me" | "partner";
};

type SidebarUser = {
  id: number;
  name: string;
  image: string;
};

const TOP_USERS: SidebarUser[] = [
  { id: 1, name: "Alex", image: "https://picsum.photos/seed/top1/120/120" },
  { id: 2, name: "Nina", image: "https://picsum.photos/seed/top2/120/120" },
  { id: 3, name: "Leo", image: "https://picsum.photos/seed/top3/120/120" },
  { id: 4, name: "Mia", image: "https://picsum.photos/seed/top4/120/120" },
  { id: 5, name: "Adam", image: "https://picsum.photos/seed/top5/120/120" },
];

const MY_MATCHES: SidebarUser[] = [
  { id: 6, name: "Emma", image: "https://picsum.photos/seed/match1/120/120" },
  { id: 7, name: "Sofia", image: "https://picsum.photos/seed/match2/120/120" },
  { id: 8, name: "Liam", image: "https://picsum.photos/seed/match3/120/120" },
  { id: 9, name: "Olivia", image: "https://picsum.photos/seed/match4/120/120" },
  { id: 10, name: "Noah", image: "https://picsum.photos/seed/match5/120/120" },
];

const SWIPE_CARDS = [
  {
    id: 1,
    name: "Lara, 22",
    bio: "Milujem hudbu, cestovanie a dlhé nočné chaty.",
    image: "https://picsum.photos/seed/swipe1/700/900",
  },
  {
    id: 2,
    name: "Daniel, 24",
    bio: "Fitness, filmy a spontánne výlety.",
    image: "https://picsum.photos/seed/swipe2/700/900",
  },
  {
    id: 3,
    name: "Sára, 21",
    bio: "Káva, umenie a chill večery.",
    image: "https://picsum.photos/seed/swipe3/700/900",
  },
];

export default function Home() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE || "https://YOUR-BACKEND.onrender.com";
  const WS_BASE =
    process.env.NEXT_PUBLIC_WS_BASE || "wss://YOUR-BACKEND.onrender.com/ws";

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("Offline");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isMatched, setIsMatched] = useState(false);
  const [inSwipeMode, setInSwipeMode] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"top" | "matches">(
    "top"
  );
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const sidebarUsers = useMemo(
    () => (activeSidebarTab === "top" ? TOP_USERS : MY_MATCHES),
    [activeSidebarTab]
  );

  const currentSwipeCard = SWIPE_CARDS[swipeIndex % SWIPE_CARDS.length];

  const addChat = (
    text: string,
    type: "system" | "me" | "partner" = "system"
  ) => {
    setMessages((prev) => [...prev, { text, type }]);
  };

  const cleanupPeer = () => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const createPeerConnection = () => {
    cleanupPeer();

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
          })
        );
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      });
    }

    peerRef.current = pc;
    return pc;
  };

  const ensureSocket = () => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(WS_BASE);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("Pripojený na server");
      addChat("Pripojenie na server úspešné.", "system");
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        addChat("Socket je aktívny.", "system");
      }

      if (data.type === "waiting") {
        setIsMatched(false);
        setStatus("Čakáš na partnera...");
        addChat("Čakáš na partnera...", "system");
      }

      if (data.type === "matched") {
        setIsMatched(true);
        setStatus("Partner nájdený");
        addChat("Našiel sa partner.", "system");
      }

      if (data.type === "partner_disconnected") {
        setIsMatched(false);
        setStatus("Partner sa odpojil");
        addChat("Partner sa odpojil.", "system");
        cleanupPeer();
      }

      if (data.type === "message") {
        addChat(data.text, "partner");
      }

      if (data.type === "webrtc-offer") {
        try {
          const pc = createPeerConnection();
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socketRef.current?.send(
            JSON.stringify({
              type: "webrtc-answer",
              answer,
            })
          );

          setStatus("Video spojenie sa vytvára...");
        } catch {
          addChat("Chyba pri spracovaní offer.", "system");
        }
      }

      if (data.type === "webrtc-answer") {
        try {
          if (!peerRef.current) return;
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setStatus("Video spojenie aktívne");
        } catch {
          addChat("Chyba pri spracovaní answer.", "system");
        }
      }

      if (data.type === "ice-candidate") {
        try {
          if (!peerRef.current || !data.candidate) return;
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          addChat("Chyba pri ICE candidate.", "system");
        }
      }

      if (data.type === "start-webrtc") {
        try {
          const pc = createPeerConnection();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socketRef.current?.send(
            JSON.stringify({
              type: "webrtc-offer",
              offer,
            })
          );

          setStatus("Volanie sa vytvára...");
        } catch {
          addChat("Nepodarilo sa spustiť WebRTC.", "system");
        }
      }
    };

    socket.onerror = () => {
      setStatus("WebSocket error");
      addChat("Chyba websocket spojenia.", "system");
    };

    socket.onclose = () => {
      setStatus("Odpojený od servera");
      setIsMatched(false);
      addChat("Spojenie so serverom bolo ukončené.", "system");
      cleanupPeer();
    };
  };

  const waitForSocketOpen = async () => {
    const socket = socketRef.current;
    if (!socket) return false;

    if (socket.readyState === WebSocket.OPEN) return true;

    return await new Promise<boolean>((resolve) => {
      let tries = 0;

      const interval = setInterval(() => {
        tries += 1;

        if (socket.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          resolve(true);
        } else if (tries > 50) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  };

  const prepareMedia = async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    setCameraEnabled(stream.getVideoTracks().some((t) => t.enabled));
    setMicEnabled(stream.getAudioTracks().some((t) => t.enabled));

    return stream;
  };

  const startMatching = async () => {
    try {
      ensureSocket();

      const opened = await waitForSocketOpen();
      if (!opened) {
        setStatus("WebSocket sa nepripojil");
        addChat("Nepodarilo sa pripojiť na server.", "system");
        return;
      }

      try {
        await prepareMedia();
      } catch {
        setStatus("Kamera/mikrofón nie sú povolené");
        addChat("Povoľ kameru a mikrofón v browseri.", "system");
        return;
      }

      socketRef.current?.send(JSON.stringify({ type: "start" }));
      setStatus("Hľadám partnera...");
      addChat("Začalo sa vyhľadávanie partnera.", "system");
    } catch {
      setStatus("Chyba pri štarte");
      addChat("Nepodarilo sa spustiť hľadanie.", "system");
    }
  };

  const sendMessage = () => {
    const text = input.trim();

    if (!text) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addChat("Nie si pripojený na server.", "system");
      return;
    }

    if (!isMatched) {
      addChat("Ešte nemáš partnera.", "system");
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        text,
      })
    );

    addChat(text, "me");
    setInput("");
  };

  const nextPartner = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addChat("Nie si pripojený na server.", "system");
      return;
    }

    cleanupPeer();
    setIsMatched(false);
    setStatus("Preskakujem partnera...");
    socketRef.current.send(JSON.stringify({ type: "next" }));
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextState = !cameraEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setCameraEnabled(nextState);
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextState = !micEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setMicEnabled(nextState);
  };

  const swipeLike = () => {
    addChat(`Dal si LIKE na ${currentSwipeCard.name}.`, "system");
    setSwipeIndex((prev) => prev + 1);
  };

  const swipeSkip = () => {
    addChat(`Preskočil si ${currentSwipeCard.name}.`, "system");
    setSwipeIndex((prev) => prev + 1);
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      cleanupPeer();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#1f1f1f] p-4 text-white">
      <div className="mx-auto flex h-[92vh] max-w-[1280px] overflow-hidden rounded-sm border border-[#521010] bg-[#2a2a2a]">
        <aside className="flex w-[280px] flex-col bg-[#d7d7d7] text-black">
          <div className="flex items-center justify-between bg-[#4b0707] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white">
                <img
                  src="https://picsum.photos/seed/meuser/120/120"
                  alt="Me"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-sm font-semibold">Tvoj profil</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleCamera}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
                title="Kamera"
              >
                {cameraEnabled ? "📹" : "🚫"}
              </button>
              <button
                onClick={toggleMic}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
                title="Mikrofón"
              >
                {micEnabled ? "🎤" : "🔇"}
              </button>
              <button
                onClick={() => setInSwipeMode((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
                title="Prepni režim"
              >
                {inSwipeMode ? "💬" : "🔥"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 bg-[#cfcfcf] text-center text-xs font-bold uppercase text-[#f5f5f5]">
            <button
              onClick={() => setActiveSidebarTab("top")}
              className={`px-3 py-3 ${
                activeSidebarTab === "top" ? "bg-[#bfbfbf] text-white" : "text-[#e9e9e9]"
              }`}
            >
              Top užívatelia
            </button>
            <button
              onClick={() => setActiveSidebarTab("matches")}
              className={`px-3 py-3 ${
                activeSidebarTab === "matches"
                  ? "bg-[#bfbfbf] text-white"
                  : "text-[#e9e9e9]"
              }`}
            >
              Moje zhody
            </button>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-5">
            {sidebarUsers.map((user) => (
              <div key={user.id} className="space-y-2">
                <div className="aspect-square overflow-hidden bg-white shadow-sm">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="truncate text-center text-xs font-medium text-[#444]">
                  {user.name}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-[#f3f3f3] text-black">
          {!inSwipeMode ? (
            <>
              <div className="grid flex-[0_0_58%] grid-cols-2 gap-[12px] border-b-4 border-[#4b0707] bg-[#4b0707] p-[2px]">
                <div className="relative overflow-hidden bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-4 py-2 text-sm text-white">
                    Ty
                  </div>
                </div>

                <div className="relative overflow-hidden bg-black">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-4 py-2 text-sm text-white">
                    Partner
                  </div>
                </div>
              </div>

              <div className="flex gap-1 bg-[#4b0707] px-2 pb-2">
                <button
                  onClick={startMatching}
                  className="flex-1 bg-[#0d5477] py-5 text-2xl font-bold uppercase tracking-wide text-white"
                >
                  Like 👍
                </button>
                <button
                  onClick={nextPartner}
                  className="flex-1 bg-[#b86200] py-5 text-2xl font-bold uppercase tracking-wide text-white"
                >
                  Skip ⏭
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-[#efefef] p-3">
                <div className="mb-2 flex items-center justify-between text-sm text-[#666]">
                  <span>Status: {status}</span>
                  <a
                    href={`${API_BASE}/api/health`}
                    target="_blank"
                    className="text-[#0d5477] underline"
                    rel="noreferrer"
                  >
                    Health
                  </a>
                </div>

                <div className="flex-1 overflow-y-auto border border-[#cfcfcf] bg-white p-3">
                  <div className="space-y-2">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                          msg.type === "me"
                            ? "ml-auto bg-[#0d5477] text-white"
                            : msg.type === "partner"
                            ? "bg-[#dedede] text-black"
                            : "max-w-full bg-[#f4f4f4] text-[#555]"
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder="Start typing..."
                    className="flex-1 border border-[#cfcfcf] bg-white px-3 py-3 outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-[#0d5477] px-5 py-3 font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-[#e8e8e8] p-6">
              <div className="w-full max-w-[520px]">
                <div className="overflow-hidden border-4 border-[#4b0707] bg-white shadow-2xl">
                  <div className="relative h-[620px] w-full">
                    <img
                      src={currentSwipeCard.image}
                      alt={currentSwipeCard.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                      <h2 className="text-3xl font-bold">{currentSwipeCard.name}</h2>
                      <p className="mt-2 text-sm text-white/90">
                        {currentSwipeCard.bio}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 bg-[#4b0707] p-2">
                    <button
                      onClick={swipeLike}
                      className="bg-[#0d5477] py-5 text-2xl font-bold uppercase text-white"
                    >
                      Like 👍
                    </button>
                    <button
                      onClick={swipeSkip}
                      className="bg-[#b86200] py-5 text-2xl font-bold uppercase text-white"
                    >
                      Skip ⏭
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center text-sm text-[#555]">
                  Swipe režim · prepni hore ikonou 🔥/💬
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
