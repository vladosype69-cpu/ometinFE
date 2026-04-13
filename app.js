const BACKEND_URL = "ws://127.0.0.1:8000/ws";
// neskôr pre Render sem dáš napr.
// const BACKEND_URL = "wss://tvoj-backend.onrender.com/ws";

const statusEl = document.getElementById("status");
const chatEl = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const stopBtn = document.getElementById("stopBtn");
const sendBtn = document.getElementById("sendBtn");

let socket = null;
let isMatched = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function addMessage(text, type = "system") {
  const div = document.createElement("div");
  div.classList.add("message", type);
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return;
  }

  socket = new WebSocket(BACKEND_URL);

  socket.onopen = () => {
    setStatus("Pripojený na server");
    addMessage("Pripojenie úspešné.", "system");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "connected") {
      addMessage(data.message, "system");
    }

    if (data.type === "waiting") {
      isMatched = false;
      setStatus("Čakáš na partnera...");
      addMessage(data.message, "system");
    }

    if (data.type === "matched") {
      isMatched = true;
      setStatus("Si spojený s partnerom");
      addMessage(data.message, "system");
    }

    if (data.type === "message") {
      addMessage(data.text, "partner");
    }

    if (data.type === "partner_disconnected") {
      isMatched = false;
      setStatus("Partner sa odpojil");
      addMessage(data.message, "system");
    }

    if (data.type === "stopped") {
      isMatched = false;
      setStatus("Vyhľadávanie zastavené");
      addMessage(data.message, "system");
    }
  };

  socket.onclose = () => {
    isMatched = false;
    setStatus("Odpojený od servera");
    addMessage("Spojenie so serverom bolo ukončené.", "system");
  };

  socket.onerror = () => {
    addMessage("Chyba websocket spojenia.", "system");
  };
}

startBtn.addEventListener("click", () => {
  connectSocket();

  const waitForOpen = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "start" }));
      clearInterval(waitForOpen);
    }
  }, 100);
});

nextBtn.addEventListener("click", () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "next" }));
  }
});

stopBtn.addEventListener("click", () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "stop" }));
  }
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addMessage("Nie si pripojený na server.", "system");
    return;
  }

  if (!isMatched) {
    addMessage("Ešte nemáš partnera.", "system");
    return;
  }

  socket.send(JSON.stringify({
    type: "message",
    text
  }));

  addMessage(text, "me");
  messageInput.value = "";
}
