import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit,
} from "./firebase-config.js";
import {
  countAllUnreadMessages,
  unreadMessagesByChat,
} from "./unread-messages-tracker.js";
const contactsList = document.getElementById("contactsList");
const emptyChatPlaceholder = document.getElementById("emptyChatPlaceholder");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const chatInputArea = document.getElementById("chatInputArea");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const projectSidebar = document.getElementById("projectSidebar");
const chatProjectInfo = document.getElementById("chatProjectInfo");
const projectTitle = document.getElementById("projectTitle");
const projectLocation = document.getElementById("projectLocation");
const projectDates = document.getElementById("projectDates");
const projectBudget = document.getElementById("projectBudget");
const projectDescription = document
  .getElementById("projectDescription")
  .querySelector("p");
const projectImage = document.getElementById("projectImage");
const chatUserName = document.getElementById("chatUserName");
const projectTitleName = document.getElementById("projectTitleName");
const chatUserStatus = document.getElementById("chatUserStatus");
const deleteChat = document.getElementById("deleteChat");
const searchContacts = document.getElementById("searchContacts");
const emptyContactsPlaceholder = document.querySelector(
  ".empty-contacts-placeholder"
);
const viewProfileBtn = document.getElementById("viewProfileBtn");
const viewFullProjectBtn = document.getElementById("viewFullProjectBtn");
let currentUser = null;
let currentChat = null;
let currentProject = null;
let messagesListener = null;
let contactsListener = null;
document.addEventListener("DOMContentLoaded", initializeChat);
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <p>${message}</p>
      <button class="close-notification">×</button>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  const timeout = setTimeout(() => {
    closeNotification(notification);
  }, 5000);
  notification
    .querySelector(".close-notification")
    .addEventListener("click", () => {
      clearTimeout(timeout);
      closeNotification(notification);
    });
  function closeNotification(notificationElement) {
    notificationElement.classList.remove("show");
    setTimeout(() => {
      if (notificationElement.parentNode) {
        notificationElement.parentNode.removeChild(notificationElement);
      }
    }, 300);
  }
}
function addNotificationStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 350px;
      background-color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 8px;
      overflow: hidden;
      z-index: 1000;
      transform: translateX(120%);
      transition: transform 0.3s ease;
    }
    .notification.show {
      transform: translateX(0);
    }
    .notification.success {
      border-left: 4px solid #4CAF50;
    }
    .notification.error {
      border-left: 4px solid #F44336;
    }
    .notification.info {
      border-left: 4px solid #2196F3;
    }
    .notification-content {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .notification p {
      margin: 0;
      padding-right: 12px;
    }
    .close-notification {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
    }
    .close-notification:hover {
      color: #333;
    }
    .loading-indicator {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    .loading-indicator p {
      color: white;
      margin-top: 16px;
      font-weight: 500;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);
}
function initializeChat() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const userRole =
        userData?.userInfo && userData.userInfo["5_Tipo de Cuenta"];
      const generateComputoBtn = document.getElementById("generateComputoBtn");
      const createComputoBtn = document.getElementById("createComputoBtn");
      if (userRole === "contractor") {
        if (generateComputoBtn) generateComputoBtn.style.display = "none";
        if (createComputoBtn) createComputoBtn.style.display = "none";
      }
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get("project");
      const withUserId = urlParams.get("with");
      if (withUserId) {
        if (projectId) {
          openOrCreateChat(projectId, withUserId);
        } else {
          await openChatWithUser(withUserId);
        }
      } else {
        loadChats();
      }
      setupEventListeners();
      addNotificationStyles();
    } else {
      window.location.href = "login.html";
    }
  });
}
async function loadChats() {
  if (contactsListener) {
    contactsListener();
  }
  if (window.unsubscribeChatMessages) {
    window.unsubscribeChatMessages();
  }
  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.uid)
  );
  contactsListener = onSnapshot(chatsQuery, async (snapshot) => {
    const processedChats = new Set();
    if (snapshot.empty) {
      contactsList.innerHTML = ""; // Clear the list first
      emptyContactsPlaceholder.style.display = "flex";
      contactsList.style.display = "none";
      return;
    }
    emptyContactsPlaceholder.style.display = "none";
    contactsList.style.display = "flex";
    for (const change of snapshot.docChanges()) {
      const chatId = change.doc.id;
      const chatData = change.doc.data();
      if (
        chatData.deletedAt &&
        currentChat &&
        currentChat.id === chatId &&
        chatData.deletedBy !== currentUser.uid
      ) {
        showNotification(
          "Este chat ha sido eliminado por el otro participante.",
          "info"
        );
        resetChatInterface();
        setTimeout(() => {
          if (window.location.search) {
            showNotification(
              "Este chat ha sido eliminado por el otro participante. Serás redirigido al Inicio.",
              "info"
            );
            window.location.href = "chat.html";
          } else {
            return;
          }
        }, 3000);
        const contactElement = document.querySelector(
          `.contact-item[data-chat-id="${chatId}"]`
        );
        if (contactElement) {
          contactElement.remove();
        }
        if (contactsList.children.length === 0) {
          emptyContactsPlaceholder.style.display = "flex";
          contactsList.style.display = "none";
        }
        continue;
      }
      if (processedChats.has(chatId)) continue;
      processedChats.add(chatId);
      if (change.type === "removed") {
        const existingItem = document.querySelector(
          `.contact-item[data-chat-id="${chatId}"]`
        );
        if (existingItem) existingItem.remove();
        if (currentChat && currentChat.id === chatId) {
          resetChatInterface();
        }
        if (contactsList.children.length === 0) {
          emptyContactsPlaceholder.style.display = "flex";
          contactsList.style.display = "none";
        }
        continue;
      }
      const otherParticipantId = chatData.participants.find(
        (id) => id !== currentUser.uid
      );
      const otherUserDoc = await getDoc(doc(db, "users", otherParticipantId));
      let otherUserData = otherUserDoc.data() || {};
      const otherUserName =
        otherUserData.name ||
        otherUserData.displayName ||
        (otherUserData.userInfo &&
          (otherUserData.userInfo["2_Nombre y Apellido"] ||
            otherUserData.userInfo["4_Primer Nombre"])) ||
        otherUserData.email ||
        "Usuario";
      let projectTitle = "Chat directo";
      if (chatData.projectId && chatData.projectId !== "general") {
        const projectDoc = await getDoc(
          doc(db, "projects", chatData.projectId)
        );
        if (projectDoc.exists()) {
          projectTitle = projectDoc.data().title || "Sin título";
        }
      }
      const lastMessageQuery = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const lastMessageSnapshot = await getDocs(lastMessageQuery);
      const lastMessage = !lastMessageSnapshot.empty
        ? lastMessageSnapshot.docs[0].data()
        : null;
      const isFromCurrentUser =
        lastMessage && lastMessage.senderId === currentUser.uid;
      const chatInfo = {
        id: chatId,
        otherUser: {
          id: otherParticipantId,
          name: otherUserName,
        },
        project: {
          id: chatData.projectId,
          title: projectTitle,
        },
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              timestamp: lastMessage.timestamp,
              unread:
                lastMessage.senderId !== currentUser.uid && !lastMessage.read,
              senderId: lastMessage.senderId,
              isFromCurrentUser: isFromCurrentUser,
            }
          : null,
      };
      const existingItem = document.querySelector(
        `.contact-item[data-chat-id="${chatId}"]`
      );
      if (existingItem) {
        updateContactItem(existingItem, chatInfo);
      } else {
        createContactItem(chatInfo);
      }
    }
  });
}
function updateContactItem(contactElement, chat) {
  let timeString = "";
  let timePrefix = "A las: "; // Por defecto para horas
  if (chat.lastMessage && chat.lastMessage.timestamp) {
    const msgDate = chat.lastMessage.timestamp.toDate();
    const today = new Date();
    if (msgDate.toDateString() === today.toDateString()) {
      timeString = msgDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      timePrefix = "A las: "; // Prefijo para horas
    } else {
      timeString = msgDate.toLocaleDateString();
      timePrefix = "Fecha: "; // Prefijo para fechas
    }
  }
  const projectTitle =
    chat.project.id === "general" ? "Chat directo" : chat.project.title || "";
  const nameElement = contactElement.querySelector(".contact-name-time h4");
  const timeElement = contactElement.querySelector(".contact-name-time .time");
  const projectElement = contactElement.querySelector(
    ".contact-name-time span"
  );
  const lastMessageElement = contactElement.querySelector(".last-message p");
  const timeTextElement = contactElement.querySelector(
    ".contact-project p.time"
  );
  if (nameElement) nameElement.textContent = chat.otherUser.name;
  if (timeElement) timeElement.textContent = timeString;
  if (projectElement) projectElement.textContent = projectTitle;
  let messageText = "No hay mensajes";
  if (chat.lastMessage) {
    const messagePrefix = chat.lastMessage.isFromCurrentUser
      ? "Tú: "
      : `${chat.otherUser.name}: `;
    messageText = `${messagePrefix}${chat.lastMessage.text}`;
  }
  if (lastMessageElement) lastMessageElement.textContent = messageText;
  if (timeTextElement) {
    timeTextElement.textContent = `${timePrefix}${timeString}${
      timePrefix === "A las: " ? "hs" : ""
    }`;
  }
  const unreadBadge = contactElement.querySelector(".unread-badge");
  const unreadCount = unreadMessagesByChat[chat.id] || 0;
  if (
    chat.lastMessage &&
    chat.lastMessage.unread &&
    !chat.lastMessage.isFromCurrentUser
  ) {
    if (!unreadBadge) {
      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = unreadCount;
      contactElement.querySelector(".last-message").appendChild(badge);
    } else {
      unreadBadge.textContent = unreadCount;
    }
    contactElement.classList.add("unread-chat");
  } else if (unreadBadge) {
    unreadBadge.remove();
    contactElement.classList.remove("unread-chat");
  }
}
function createContactItem(chat) {
  const contactItem = document.createElement("div");
  contactItem.className = "contact-item";
  if (
    chat.lastMessage &&
    chat.lastMessage.unread &&
    !chat.lastMessage.isFromCurrentUser
  ) {
    contactItem.classList.add("unread-chat");
  }
  contactItem.dataset.chatId = chat.id;
  contactItem.dataset.projectId = chat.project.id;
  contactItem.dataset.userId = chat.otherUser.id;
  let messagePrefix = "";
  let messageText = "No hay mensajes";
  if (chat.lastMessage) {
    messagePrefix = chat.lastMessage.isFromCurrentUser
      ? "Tú: "
      : `${chat.otherUser.name}: `;
    messageText = `${messagePrefix}${chat.lastMessage.text}`;
  }
  if (currentChat && currentChat.id === chat.id) {
    contactItem.classList.add("active");
  }
  let timeString = "";
  let timePrefix = "A las: "; // Por defecto para horas
  if (chat.lastMessage && chat.lastMessage.timestamp) {
    const msgDate = chat.lastMessage.timestamp.toDate();
    const today = new Date();
    if (msgDate.toDateString() === today.toDateString()) {
      timeString = msgDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      timePrefix = "A las: "; // Prefijo para horas
    } else {
      timeString = msgDate.toLocaleDateString();
      timePrefix = "Fecha: "; // Prefijo para fechas
    }
  }
  const unreadCount = unreadMessagesByChat[chat.id] || 0;
  const timeElement =
    chat.lastMessage && chat.lastMessage.timestamp
      ? `<p class="time">${timePrefix}${timeString}${
          timePrefix === "A las: " ? "hs" : ""
        }</p>`
      : `<p class="time"></p>`; // Elemento vacío cuando no hay mensajes
  const unreadBadgeHTML =
    chat.lastMessage &&
    chat.lastMessage.unread &&
    !chat.lastMessage.isFromCurrentUser &&
    unreadCount > 0
      ? `<span class="unread-badge">${unreadCount}</span>`
      : "";
  const projectTitle =
    chat.project.id === "general" ? "Chat directo" : chat.project.title || "";
  contactItem.innerHTML = `
      <div class="contact-info">
        <div class="contact-name-time">
          <h4 style="margin-bottom: 0.3rem">${chat.otherUser.name}</h4>
          <span>${projectTitle}</span>
        </div>
        <div class="contact-project">
        ${timeElement}
        </div>
        <div class="last-message">
          <p>${messageText}</p>
          ${unreadBadgeHTML}
        </div>
      </div>
    `;
  contactItem.addEventListener("click", () => {
    openChat(chat.id, chat.project.id, chat.otherUser.id);
  });
  contactsList.appendChild(contactItem);
}
async function openOrCreateChat(projectId, otherUserId) {
  try {
    const chatsQuery = query(
      collection(db, "chats"),
      where("projectId", "==", projectId),
      where("participants", "array-contains", currentUser.uid)
    );
    const querySnapshot = await getDocs(chatsQuery);
    let chatId = null;
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      if (chatData.participants.includes(otherUserId)) {
        chatId = doc.id;
      }
    });
    if (chatId) {
      openChat(chatId, projectId, otherUserId);
    } else {
      const newChatRef = await addDoc(collection(db, "chats"), {
        projectId: projectId,
        participants: [currentUser.uid, otherUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      openChat(newChatRef.id, projectId, otherUserId);
    }
  } catch (error) {
    console.error("Error al abrir o crear chat:", error);
  }
}
async function openChatWithUser(otherUserId) {
  try {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    const querySnapshot = await getDocs(chatsQuery);
    let existingChat = null;
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      if (chatData.participants.includes(otherUserId) && !existingChat) {
        existingChat = {
          id: doc.id,
          ...chatData,
        };
      }
    });
    if (existingChat) {
      openChat(existingChat.id, existingChat.projectId, otherUserId);
    } else {
      const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
      if (!otherUserDoc.exists()) {
        showNotification("No se encontró al usuario solicitado", "error");
        loadChats();
        return;
      }
      const newChatRef = await addDoc(collection(db, "chats"), {
        projectId: "general", // Valor predeterminado para chats sin proyecto específico
        participants: [currentUser.uid, otherUserId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        chatType: "direct", // Indicar que es un chat directo sin proyecto
      });
      await addDoc(collection(db, "chats", newChatRef.id, "messages"), {
        text: "¡Nuevo chat iniciado!",
        senderId: "system", // Mensaje del sistema
        timestamp: serverTimestamp(),
        localTimestamp: new Date(),
        read: true,
        isSystemMessage: true,
      });
      await loadChats();
      setTimeout(() => {
        openChat(newChatRef.id, "general", otherUserId);
      }, 500);
      showNotification(
        "Se ha creado una nueva conversación con este usuario",
        "success"
      );
    }
  } catch (error) {
    console.error("Error al buscar o crear chat con usuario:", error);
    showNotification("Error al cargar la conversación", "error");
    loadChats();
  }
}
async function openChat(chatId, projectId, otherUserId) {
  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }
  if (window.unsubscribeChatMessages) {
    window.unsubscribeChatMessages();
    window.unsubscribeChatMessages = null;
  }
  currentChat = { id: chatId, projectId, otherUserId };
  currentProject = { id: projectId };
  const contactItems = document.querySelectorAll(".contact-item");
  contactItems.forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.chatId === chatId) {
      item.classList.add("active");
    }
  });
  const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
  const otherUserData = otherUserDoc.data() || {};
  const otherUserName =
    otherUserData.name ||
    otherUserData.displayName ||
    (otherUserData.userInfo &&
      (otherUserData.userInfo["2_Nombre y Apellido"] ||
        otherUserData.userInfo["4_Primer Nombre"])) ||
    otherUserData.email ||
    "Usuario";
  chatUserName.textContent = otherUserName;
  if (projectId === "general") {
    projectSidebar.style.display = "none";
    chatProjectInfo.innerHTML = `<i class="fa-solid fa-comments"></i><span>Conversación con ${otherUserName}</span>`;
    createComputoBtn.style.display = "none";
    projectTitleName.textContent = `Conversación con ${otherUserName}`;
    if (viewFullProjectBtn) {
      viewFullProjectBtn.style.display = "none"; // Ocultar botón de ver proyecto completo
    }
  } else {
    await loadProjectDetails(projectId);
    if (viewFullProjectBtn) {
      viewFullProjectBtn.style.display = "block";
    }
    projectTitleName.textContent =
      currentProject.title || "Proyecto sin título";
  }
  emptyChatPlaceholder.style.display = "none";
  chatHeader.classList.remove("chatHidden");
  chatMessages.classList.remove("chatHidden");
  chatInputArea.classList.remove("chatHidden");
  projectSidebar.classList.remove("chatHidden");
  loadMessages(chatId);
  markMessagesAsRead(chatId);
}
async function loadProjectDetails(projectId) {
  try {
    const projectDoc = await getDoc(doc(db, "projects", projectId));
    if (projectDoc.exists()) {
      const projectData = projectDoc.data();
      currentProject = { id: projectId, ...projectData };
      projectTitle.textContent = projectData.title || "Proyecto sin título";
      projectLocation.textContent =
        projectData.location || "Ubicación no especificada";
      projectDates.textContent = `Publicado: ${formatDate(
        projectData.createdAt?.toDate()
      )}`;
      projectBudget.textContent = `Presupuesto: ${formatCurrency(
        projectData.budget
      )}`;
      projectDescription.textContent =
        projectData.description || "Sin descripción";
      if (projectData.imageUrl && projectData.imageUrl.trim() !== "") {
        projectImage.src = projectData.imageUrl;
        projectImage.alt = projectData.title || "Imagen del proyecto";
      } else if (projectData.images && projectData.images.length > 0) {
        projectImage.src = projectData.images[0].secure_url;
        projectImage.alt = projectData.title || "Imagen del proyecto";
      } else {
        projectImage.src = "https://placehold.co/600x400";
        projectImage.alt = "Imagen de placeholder";
      }
    } else {
      console.error("No se encontró el proyecto");
    }
  } catch (error) {
    console.error("Error al cargar detalles del proyecto:", error);
  }
}
function loadMessages(chatId) {
  chatMessages.innerHTML = "";
  if (window.unsubscribeChatMessages) {
    window.unsubscribeChatMessages();
  }
  const messagesQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("timestamp", "asc"),
    limit(100)
  );
  window.unsubscribeChatMessages = onSnapshot(messagesQuery, (snapshot) => {
    console.log(`Recibidos ${snapshot.docs.length} mensajes en total`);
    let allMessages = [];
    snapshot.docs.forEach((doc) => {
      const messageId = doc.id;
      const messageData = doc.data();
      const timestamp =
        messageData.timestamp?.toDate?.() ||
        (messageData.timestamp?.seconds
          ? new Date(messageData.timestamp.seconds * 1000)
          : null) ||
        messageData.localTimestamp ||
        new Date();
      allMessages.push({
        id: messageId,
        data: messageData,
        timestamp: timestamp,
      });
    });
    allMessages.sort((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
    chatMessages.innerHTML = "";
    allMessages.forEach((message) => {
      displayMessage(message.id, message.data);
    });
    scrollToBottom();
    markMessagesAsRead(chatId);
  });
  messagesListener = window.unsubscribeChatMessages;
}
function displayMessage(messageId, messageData) {
  const isCurrentUser = messageData.senderId === currentUser.uid;
  console.log("Mensaje:", {
    id: messageId,
    texto: messageData.text,
    remitente: messageData.senderId,
    usuarioActual: currentUser.uid,
    esUsuarioActual: isCurrentUser,
    timestamp: messageData.timestamp,
    localTimestamp: messageData.localTimestamp,
  });
  const messageElement = document.createElement("div");
  messageElement.className = `message ${isCurrentUser ? "sent" : "received"}`;
  messageElement.dataset.id = messageId;
  messageElement.dataset.sender = messageData.senderId;
  let timestampDate;
  if (messageData.timestamp?.toDate instanceof Function) {
    timestampDate = messageData.timestamp.toDate();
  } else if (messageData.timestamp?.seconds) {
    timestampDate = new Date(messageData.timestamp.seconds * 1000);
  } else if (messageData.localTimestamp instanceof Date) {
    timestampDate = messageData.localTimestamp;
  } else if (messageData.localTimestamp) {
    timestampDate = new Date(messageData.localTimestamp);
  } else {
    timestampDate = new Date();
  }
  let timeString = "";
  try {
    timeString = timestampDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    console.error("Error formatting message timestamp:", err);
    timeString = "";
  }
  messageElement.innerHTML = `
    <div class="message-content">
      <div class="message-bubble">
        <p>${messageData.text}</p>
      </div>
      <div class="message-info">
        <span class="message-time">${timeString}</span>
        <span class="message-timestamp" style="display:none;">${timestampDate.getTime()}</span>
      </div>
    </div>
  `;
  chatMessages.appendChild(messageElement);
}
async function sendMessage() {
  const messageText = messageInput.value.trim();
  if (!messageText || !currentChat) {
    return;
  }
  try {
    const localTimestamp = new Date();
    messageInput.value = "";
    const newMessageRef = await addDoc(
      collection(db, "chats", currentChat.id, "messages"),
      {
        text: messageText,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        localTimestamp: localTimestamp, // Este es crucial para ordenar correctamente
        read: false,
      }
    );
    await updateDoc(doc(db, "chats", currentChat.id), {
      updatedAt: serverTimestamp(),
      lastMessage: {
        text: messageText,
        timestamp: serverTimestamp(),
        localTimestamp: localTimestamp, // Agregar este campo también aquí
        senderId: currentUser.uid,
      },
    });
    updateContactPreview(
      currentChat.id,
      messageText,
      localTimestamp,
      false,
      true
    );
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
  }
}
function updateContactPreview(
  chatId,
  messageText,
  timestamp,
  unread,
  isFromCurrentUser
) {
  const contactItem = document.querySelector(
    `.contact-item[data-chat-id="${chatId}"]`
  );
  if (!contactItem) return;
  const otherUserName =
    contactItem.querySelector(".contact-name-time h4")?.textContent ||
    "Usuario";
  const prefix = isFromCurrentUser ? "Tú: " : `${otherUserName}: `;
  const fullMessage = `${prefix}${messageText}`;
  const lastMessageElement = contactItem.querySelector(".last-message p");
  if (lastMessageElement) {
    lastMessageElement.textContent = fullMessage;
  }
  const today = new Date();
  let timePrefix = "A las: ";
  let timeString = "";
  if (timestamp.toDateString() === today.toDateString()) {
    timeString = timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    timePrefix = "A las: ";
  } else {
    timeString = timestamp.toLocaleDateString();
    timePrefix = "Fecha: ";
  }
  const timeElement = contactItem.querySelector(".contact-project p.time");
  if (timeElement) {
    timeElement.textContent = `${timePrefix}${timeString}${
      timePrefix === "A las: " ? "hs" : ""
    }`;
  }
  if (contactItem.parentNode) {
    contactItem.parentNode.prepend(contactItem);
  }
}
async function markMessagesAsRead(chatId) {
  try {
    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      where("senderId", "!=", currentUser.uid),
      where("read", "==", false)
    );
    const unreadMessages = await getDocs(messagesQuery);
    if (!unreadMessages.empty) {
      const updatePromises = unreadMessages.docs.map(async (messageDoc) => {
        return updateDoc(doc(db, "chats", chatId, "messages", messageDoc.id), {
          read: true,
        });
      });
      await Promise.all(updatePromises);
      const contactItem = document.querySelector(
        `.contact-item[data-chat-id="${chatId}"]`
      );
      if (contactItem) {
        const unreadBadge = contactItem.querySelector(".unread-badge");
        if (unreadBadge) {
          unreadBadge.remove();
        }
        contactItem.classList.remove("unread-chat");
      }
      await countAllUnreadMessages();
    }
  } catch (error) {
    console.error("Error al marcar mensajes como leídos:", error);
  }
}
async function deleteChatConversation() {
  if (!currentChat) {
    console.log("No hay chat activo para eliminar");
    return;
  }
  try {
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading-indicator";
    loadingIndicator.innerHTML = `
      <div class="spinner"></div>
      <p>Eliminando conversación...</p>
    `;
    document.body.appendChild(loadingIndicator);
    deleteChat.disabled = true;
    deleteChat.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
    const chatToDeleteId = currentChat.id;
    const otherParticipantId = currentChat.otherUserId;
    console.log(`Obteniendo mensajes del chat ${chatToDeleteId}...`);
    const messagesSnapshot = await getDocs(
      collection(db, "chats", chatToDeleteId, "messages")
    );
    console.log(`Eliminando ${messagesSnapshot.docs.length} mensajes...`);
    const batchSize = 10; // Tamaño del lote para eliminar mensajes
    let deleteCount = 0;
    for (let i = 0; i < messagesSnapshot.docs.length; i += batchSize) {
      const currentBatch = messagesSnapshot.docs.slice(i, i + batchSize);
      const batchPromises = currentBatch.map((messageDoc) =>
        deleteDoc(doc(db, "chats", chatToDeleteId, "messages", messageDoc.id))
      );
      await Promise.all(batchPromises);
      deleteCount += currentBatch.length;
      console.log(
        `Progreso: ${deleteCount}/${messagesSnapshot.docs.length} mensajes eliminados`
      );
    }
    await updateDoc(doc(db, "chats", chatToDeleteId), {
      deletedAt: serverTimestamp(),
      deletedBy: currentUser.uid,
    });
    setTimeout(async () => {
      await deleteDoc(doc(db, "chats", chatToDeleteId));
    }, 2000);
    const contactItem = document.querySelector(
      `.contact-item[data-chat-id="${chatToDeleteId}"]`
    );
    if (contactItem) {
      contactItem.style.opacity = "0";
      contactItem.style.transition = "opacity 0.5s";
      setTimeout(() => {
        contactItem.remove();
        if (contactsList.children.length === 0) {
          emptyContactsPlaceholder.style.display = "flex";
          contactsList.style.display = "none";
        }
      }, 500);
    }
    resetChatInterface();
    showNotification("Chat eliminado correctamente.", "success");
    document.body.removeChild(loadingIndicator);
    setTimeout(() => {
      if (window.location.search) {
        showNotification(
          "Chat eliminado correctamente. Serás redirigido al Inicio.",
          "success"
        );
        window.location.href = "chat.html";
      } else {
        return;
      }
    }, 2000);
    deleteChat.disabled = false;
    deleteChat.innerHTML = '<i class="fas fa-trash"></i> Eliminar Chat';
  } catch (error) {
    console.error("Error al eliminar chat:", error);
    deleteChat.disabled = false;
    deleteChat.innerHTML = '<i class="fas fa-trash"></i> Eliminar Chat';
    showNotification("Error al eliminar el chat. Inténtalo de nuevo.", "error");
    const loadingIndicator = document.querySelector(".loading-indicator");
    if (loadingIndicator) {
      document.body.removeChild(loadingIndicator);
    }
  }
}
function searchChats(query) {
  const contactItems = document.querySelectorAll(".contact-item");
  const searchTerm = query.toLowerCase();
  contactItems.forEach((item) => {
    const nameElement = item.querySelector(
      ".contact-info .contact-name-time h4"
    );
    const projectElement = item.querySelector(
      ".contact-info .contact-name-time span"
    );
    const name = nameElement ? nameElement.textContent.toLowerCase() : "";
    const project = projectElement
      ? projectElement.textContent.toLowerCase()
      : "";
    if (name.includes(searchTerm) || project.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}
function resetChatInterface() {
  chatHeader.classList.add("chatHidden");
  chatMessages.classList.add("chatHidden");
  chatInputArea.classList.add("chatHidden");
  projectSidebar.classList.add("chatHidden");
  emptyChatPlaceholder.style.display = "flex";
  currentChat = null;
  currentProject = null;
  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }
}
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function setupEventListeners() {
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  searchContacts.addEventListener("input", (e) => {
    searchChats(e.target.value);
  });
  deleteChat.addEventListener("click", deleteChatConversation);
  viewFullProjectBtn.addEventListener("click", () => {
    if (!currentProject || !currentProject.id) {
      showNotification(
        "No se puede acceder al proyecto en este momento",
        "error"
      );
      return;
    }
    window.location.href = `project-detail.html?id=${currentProject.id}`;
  });
  viewProfileBtn.addEventListener("click", () => {
    if (!currentChat || !currentChat.otherUserId) {
      showNotification(
        "No se puede acceder al perfil en este momento",
        "error"
      );
      return;
    }
    getDoc(doc(db, "users", currentChat.otherUserId))
      .then((userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole =
            userData.userInfo && userData.userInfo["5_Tipo de Cuenta"];
          const currentLoggedInUserId = currentUser.uid;
          const isOwnProfile =
            currentChat.otherUserId === currentLoggedInUserId;
          const viewingParam = isOwnProfile ? "own" : "other";
          if (userRole === "professional") {
            window.location.href = `profile-professional.html?user=${currentChat.otherUserId}&viewing=${viewingParam}`;
          } else {
            window.location.href = `profile-contractor.html?user=${currentChat.otherUserId}&viewing=${viewingParam}`;
          }
        } else {
          showNotification("No se encontró información del usuario", "error");
        }
      })
      .catch((error) => {
        console.error("Error al obtener datos del usuario:", error);
        showNotification("Error al acceder al perfil del usuario", "error");
      });
  });
}
function formatDate(date) {
  if (!date) return "Fecha no disponible";
  return date.toLocaleDateString();
}
function formatCurrency(amount) {
  if (!amount) return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
const generateComputoBtn = document.getElementById("generateComputoBtn");
if (generateComputoBtn) {
  generateComputoBtn.addEventListener("click", () => {
    redirectToComputoGenerator();
  });
}
const createComputoBtn = document.getElementById("createComputoBtn");
if (createComputoBtn) {
  createComputoBtn.addEventListener("click", () => {
    redirectToComputoGenerator();
  });
}
function redirectToComputoGenerator() {
  if (!currentChat || !currentProject) {
    showNotification(
      "No se puede generar un contrato sin un proyecto activo",
      "error"
    );
    return;
  }
  getDoc(doc(db, "projects", currentProject.id))
    .then(async (projectDoc) => {
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        const ownerId = projectData.userId; // ID del dueño del proyecto
        if (!ownerId) {
          showNotification(
            "No se pudo identificar al propietario del proyecto",
            "error"
          );
          return;
        }
        let professionalId = null;
        const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
        const currentUserData = currentUserDoc.data();
        const currentUserRole =
          currentUserData?.userInfo &&
          currentUserData.userInfo["5_Tipo de Cuenta"];
        const otherUserDoc = await getDoc(
          doc(db, "users", currentChat.otherUserId)
        );
        const otherUserData = otherUserDoc.data();
        const otherUserRole =
          otherUserData?.userInfo && otherUserData.userInfo["5_Tipo de Cuenta"];
        if (currentUserRole === "professional") {
          professionalId = currentUser.uid;
        } else if (otherUserRole === "professional") {
          professionalId = currentChat.otherUserId;
        } else {
          showNotification(
            "No se pudo identificar al profesional en esta conversación",
            "error"
          );
          return;
        }
        const contractUrl = `tax-calculator.html?id=${ownerId}&project=${currentProject.id}&professional=${professionalId}`;
        window.location.href = contractUrl;
      } else {
        showNotification("No se encontró información del proyecto", "error");
      }
    })
    .catch((error) => {
      console.error("Error al obtener datos del proyecto:", error);
      showNotification(
        "Error al acceder a la información del proyecto",
        "error"
      );
    });
}
