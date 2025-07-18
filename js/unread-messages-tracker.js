import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "./firebase-config.js";
let totalUnreadMessages = 0;
let unreadMessagesByChat = {}; // Objeto para llevar la cuenta por chat
let messagesCountElement = null;
let userMenuNotificationElement = null;
document.addEventListener("DOMContentLoaded", initializeNotifications);
function initializeNotifications() {
  messagesCountElement = document.querySelector("#messagesLink .count");
  userMenuNotificationElement = document.querySelector("#userMenuNotification");
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setupUnreadMessagesCounter(user);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && auth.currentUser) {
      countAllUnreadMessages();
    }
  });
}
function setupUnreadMessagesCounter(user) {
  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", user.uid)
  );
  onSnapshot(chatsQuery, () => {
    countAllUnreadMessages();
  });
}
async function countAllUnreadMessages() {
  if (!auth.currentUser) return 0;
  try {
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", auth.currentUser.uid)
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    let totalCount = 0;
    unreadMessagesByChat = {};
    const countPromises = chatsSnapshot.docs.map(async (chatDoc) => {
      const chatId = chatDoc.id;
      const unreadQuery = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "!=", auth.currentUser.uid),
        where("read", "==", false)
      );
      const unreadSnapshot = await getDocs(unreadQuery);
      const chatUnreadCount = unreadSnapshot.size;
      unreadMessagesByChat[chatId] = chatUnreadCount;
      return chatUnreadCount;
    });
    const counts = await Promise.all(countPromises);
    totalCount = counts.reduce((acc, count) => acc + count, 0);
    totalUnreadMessages = totalCount;
    updateNavbarMessageCounter(totalCount);
    updateUserMenuNotification(totalCount);
    return totalCount;
  } catch (error) {
    console.error("Error al contar mensajes no leídos:", error);
    return 0;
  }
}
function updateNavbarMessageCounter(count) {
  const messagesCountElement = document.querySelector("#messagesLink .count");
  if (messagesCountElement) {
    messagesCountElement.textContent = count;
    if (count > 0) {
      messagesCountElement.style.display = "inline-flex";
      messagesCountElement.classList.add("has-notifications");
    } else {
      messagesCountElement.style.display = "none";
      messagesCountElement.classList.remove("has-notifications");
    }
  }
}
function updateUserMenuNotification(count) {
  const userMenuNotification = document.querySelector("#userMenuNotification");
  if (userMenuNotification) {
    userMenuNotification.textContent = count;
    if (count > 0) {
      userMenuNotification.style.display = "flex";
    } else {
      userMenuNotification.style.display = "none";
    }
  }
}
export { countAllUnreadMessages, totalUnreadMessages, unreadMessagesByChat };
