"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  text: string;
  type: "system" | "me" | "partner";
};

export default function Home() {
  const [status, setStatus] = useState("Offline");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isMatched, setIsMatched] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // ZMEN na svoj Render backend
  const BACKEND_WS_URL = "wss://ometinbe.onrender.com/ws";

  const addMessage = (text: string, type: ChatMessage["type"] = "system") => {
    setMessages((prev) => [...prev, { text, type }]);
  };

  const connectSocket = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(BACKEND_WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("Pripojeny na server");
      addMessage("Pripojenie uspesne.", "system");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        addMessage(data.message, "system");
      }

      if (data.type === "waiting") {
        setIsMatched(false);
        setStatus("Cakas na partnera...");
        addMessage(data.message, "system");
      }

      if (data.type === "matched") {
        setIsMatched(true);
        setStatus("Si spojeny s partnerom");
        addMessage(data.message, "system");
      }

      if (data.type === "message") {
        addMessage(data.text, "partner");
      }

      if (data.type === "partner_disconnected") {
        setIsMatched(false);
        setStatus("Partner sa odpojil");
        addMessage(data.message, "system");
      }

      if (data.type === "stopped") {
        setIsMatched(false);
        setStatus("Vyhladavanie zastavene");
        addMessage(data.message, "system");
      }
    };

    socket.onclose = () => {
      setIsMatched(false);
      setStatus("Odpojeny od servera");
      addMessage("Spojenie so serverom bolo ukoncene.", "system");
    };

    socket.onerror = () => {
      addMessage("Chyba websocket spojenia.", "system");
    };
  };

  const startSearch = () => {
    connectSocket();

    const interval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "start" }));
        clearInterval(interval);
      }
    }, 100);
  };

  const nextPartner = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "next" }));
    }
  };

  const stopSearch = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "stop" }));
    }
  };

  const sendMessage = () => {
    const text = input.trim();

    if (!text) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      addMessage("Nie si pripojeny na server.", "system");
      return;
    }

    if (!isMatched) {
      addMessage("Este nemas partnera.", "system");
      return;
    }

    socketRef.current.send(JSON.stringify({
      type: "message",
      text,
    }));

    addMessage(text, "me");
    setInput("");
  };

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Ometin Chat</h1>
        <p style={styles.subtitle}>Prva verzia random chat appky</p>

        <div style={styles.statusBox}>
          <span style={styles.statusLabel}>Status: </span>
          <span>{status}</span>
        </div>

        <div style={styles.chatBox}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.message,
                ...(msg.type === "me"
                  ? styles.me
                  : msg.type === "partner"
                  ? styles.partner
                  : styles.system),
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div style={styles.buttonRow}>
          <button onClick={startSearch} style={{ ...styles.button, ...styles.startButton }}>
            Start
          </button>
          <button onClick={nextPartner} style={{ ...styles.button, ...styles.nextButton }}>
            Next
          </button>
          <button onClick={stopSearch} style={{ ...styles.button, ...styles.stopButton }}>
            Stop
          </button>
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Napis spravu..."
            style={styles.input}
          />
          <button onClick={sendMessage} style={{ ...styles.button, ...styles.sendButton }}>
            Send
          </button>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "900px",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 700,
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "20px",
    color: "#94a3b8",
  },
  statusBox: {
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "14px",
    padding: "14px 16px",
    marginBottom: "18px",
  },
  statusLabel: {
    fontWeight: 700,
  },
  chatBox: {
    height: "420px",
    overflowY: "auto",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  message: {
    maxWidth: "80%",
    padding: "12px 14px",
    borderRadius: "14px",
    wordBreak: "break-word",
  },
  system: {
    background: "#334155",
    maxWidth: "100%",
  },
  me: {
    background: "#2563eb",
    marginLeft: "auto",
  },
  partner: {
    background: "#16a34a",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  inputRow: {
    display: "flex",
    gap: "12px",
  },
  input: {
    flex: 1,
    background: "#020617",
    color: "white",
    border: "1px solid #334155",
    borderRadius: "14px",
    padding: "14px 16px",
    outline: "none",
  },
  button: {
    border: "none",
    borderRadius: "14px",
    padding: "12px 18px",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  startButton: {
    background: "#2563eb",
  },
  nextButton: {
    background: "#d97706",
  },
  stopButton: {
    background: "#e11d48",
  },
  sendButton: {
    background: "#059669",
  },
};
