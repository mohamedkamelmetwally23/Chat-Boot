// Chat Application Logic

// ✅ Backend API بدل OpenRouter
const API_URL = "http://localhost:3000/api/chat";

// State
let currentChatId = null;
let chats = {};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadChats();
  loadHistory();
  setupEventListeners();
});

function setupEventListeners() {
  const input = document.getElementById("user-input");

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  input.style.height = "auto";

  // إنشاء chat جديد
  if (!currentChatId) {
    currentChatId = generateId();
    chats[currentChatId] = {
      title: message.substring(0, 30),
      messages: [],
      createdAt: Date.now(),
    };
  }

  const userMsg = {
    role: "user",
    content: message,
    timestamp: Date.now(),
  };

  chats[currentChatId].messages.push(userMsg);

  if (chats[currentChatId].messages.length === 1) {
    chats[currentChatId].title = message.substring(0, 30);
  }

  displayMessage("user", message);
  hideEmptyState();

  const loadingId = "loading-" + generateId();
  displayLoading(loadingId);
  saveChats();

  try {
    const response = await callAPI();
    removeLoading(loadingId);

    const botMsg = {
      role: "bot",
      content: response,
      timestamp: Date.now(),
    };

    chats[currentChatId].messages.push(botMsg);

    displayMessage("bot", response);
    saveChats();
    loadHistory();
  } catch (error) {
    removeLoading(loadingId);
    displayMessage("bot", `Error: ${error.message}`);
  }
}

async function callAPI() {
  const history = chats[currentChatId]?.messages || [];

  const messages = history.map((msg) => ({
    role: msg.role === "bot" ? "assistant" : "user",
    content: msg.content,
  }));

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API Error");
  }

  const data = await response.json();

  // 🔥 مهم: backend بيرجع نفس شكل OpenRouter
  return data.choices?.[0]?.message?.content || "No response";
}

function displayMessage(role, content) {
  const container = document.getElementById("chat-container");

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const icon = role === "user" ? "👤" : "🤖";
  const formattedContent = formatContent(content);

  messageDiv.innerHTML = `
    <div class="message-icon">${icon}</div>
    <div class="message-content">${formattedContent}</div>
  `;

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function formatContent(content) {
  return content
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function displayLoading(id) {
  const container = document.getElementById("chat-container");

  const loadingDiv = document.createElement("div");
  loadingDiv.id = id;
  loadingDiv.className = "message bot loading";

  loadingDiv.innerHTML = `
    <div class="message-icon">🤖</div>
    <div class="message-content">
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  container.appendChild(loadingDiv);
  container.scrollTop = container.scrollHeight;
}

function removeLoading(id) {
  const loading = document.getElementById(id);
  if (loading) loading.remove();
}

function hideEmptyState() {
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.style.display = "none";
}

function newChat() {
  currentChatId = null;

  const container = document.getElementById("chat-container");
  container.innerHTML = `
    <div class="empty-state" id="empty-state">
      <div class="logo">💬</div>
      <h1>How can I help you today?</h1>
      <p>Start a conversation below</p>
    </div>
  `;

  loadHistory();
}

function loadChat(chatId) {
  currentChatId = chatId;

  const container = document.getElementById("chat-container");
  container.innerHTML = "";

  if (chats[chatId]) {
    chats[chatId].messages.forEach((msg) =>
      displayMessage(msg.role, msg.content),
    );
  }

  loadHistory();
}

function deleteChat(chatId, event) {
  event.stopPropagation();

  delete chats[chatId];

  if (currentChatId === chatId) newChat();

  saveChats();
  loadHistory();
}

function loadHistory() {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  Object.keys(chats)
    .reverse()
    .forEach((chatId) => {
      const chat = chats[chatId];

      const item = document.createElement("div");
      item.className = `history-item ${
        chatId === currentChatId ? "active" : ""
      }`;

      item.onclick = () => loadChat(chatId);

      item.innerHTML = `
        <span>${chat.title}</span>
        <span class="delete-btn" onclick="deleteChat('${chatId}', event)">
          🗑️
        </span>
      `;

      historyList.appendChild(item);
    });
}

function saveChats() {
  localStorage.setItem("ai-chat-history", JSON.stringify(chats));
}

function loadChats() {
  const saved = localStorage.getItem("ai-chat-history");
  if (saved) chats = JSON.parse(saved);
}

// expose functions
window.sendMessage = sendMessage;
window.newChat = newChat;
window.loadChat = loadChat;
window.deleteChat = deleteChat;
