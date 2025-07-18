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

// Objeto para llevar el conteo de mensajes no leídos por proyecto
let unreadMessagesByProject = {};

document.addEventListener("DOMContentLoaded", initializeProjectNotifications);

function initializeProjectNotifications() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setupProjectUnreadMessagesCounter(user);
    }
  });
}

function setupProjectUnreadMessagesCounter(user) {
  // Buscar todos los proyectos del usuario para monitorear mensajes
  const projectsQuery = query(
    collection(db, "projects"),
    where("userId", "==", user.uid)
  );

  getDocs(projectsQuery)
    .then((projectsSnapshot) => {
      projectsSnapshot.forEach((projectDoc) => {
        const projectId = projectDoc.id;

        // Para cada proyecto, consultar mensajes no leídos
        setupProjectMessagesListener(projectId, user.uid);
      });
    })
    .catch((error) => {
      console.error("Error al obtener proyectos:", error);
    });
}

function setupProjectMessagesListener(projectId, userId) {
  // Consulta para los chats relacionados con este proyecto específico
  const chatsQuery = query(
    collection(db, "chats"),
    where("projectId", "==", projectId),
    where("participants", "array-contains", userId)
  );

  // Establecer un listener para cambios en los chats de este proyecto
  onSnapshot(chatsQuery, (chatsSnapshot) => {
    countProjectUnreadMessages(projectId, userId);
  });
}

async function countProjectUnreadMessages(projectId, userId) {
  try {
    // Consulta para los chats relacionados con este proyecto específico
    const chatsQuery = query(
      collection(db, "chats"),
      where("projectId", "==", projectId),
      where("participants", "array-contains", userId)
    );

    const chatsSnapshot = await getDocs(chatsQuery);
    let projectUnreadCount = 0;

    // Contar mensajes no leídos en todos los chats de este proyecto
    const countPromises = chatsSnapshot.docs.map(async (chatDoc) => {
      const chatId = chatDoc.id;
      const unreadQuery = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "!=", userId),
        where("read", "==", false)
      );

      const unreadSnapshot = await getDocs(unreadQuery);
      return unreadSnapshot.size;
    });

    const counts = await Promise.all(countPromises);
    projectUnreadCount = counts.reduce((acc, count) => acc + count, 0);

    // Actualizar el contador para este proyecto
    unreadMessagesByProject[projectId] = projectUnreadCount;

    // Actualizar el indicador visual para este proyecto
    updateProjectNotificationBadge(projectId, projectUnreadCount);

    return projectUnreadCount;
  } catch (error) {
    console.error(
      `Error al contar mensajes no leídos para el proyecto ${projectId}:`,
      error
    );
    return 0;
  }
}

function updateProjectNotificationBadge(projectId, count) {
  // Buscar todas las tarjetas de proyecto con este ID
  const projectCards = document.querySelectorAll(
    `.project-card[data-id="${projectId}"]`
  );

  projectCards.forEach((card) => {
    // Buscar o crear el elemento de notificación
    let notificationBadge = card.querySelector(".project-notification-badge");

    if (!notificationBadge) {
      // Si no existe, crear el elemento de la campana con el contador
      notificationBadge = document.createElement("div");
      notificationBadge.className = "project-notification-badge";

      // Crear el ícono de campana
      const bellIcon = document.createElement("i");
      bellIcon.className = "fas fa-bell";
      notificationBadge.appendChild(bellIcon);

      // Crear el contador
      const counter = document.createElement("span");
      counter.className = "notification-count";
      notificationBadge.appendChild(counter);

      // Insertar en la imagen del proyecto
      const projectImage = card.querySelector(".project-image");
      if (projectImage) {
        projectImage.appendChild(notificationBadge);
      }
    }

    // Actualizar el contador
    const counter = notificationBadge.querySelector(".notification-count");
    if (counter) {
      counter.textContent = count;

      // Mostrar u ocultar según sea necesario
      if (count > 0) {
        notificationBadge.style.display = "flex";
      } else {
        notificationBadge.style.display = "none";
      }
    }
  });
}

// Función para verificar mensajes al cargar una nueva página o proyecto
function checkProjectMessages(projectId) {
  if (auth.currentUser) {
    countProjectUnreadMessages(projectId, auth.currentUser.uid);
  }
}

// Exportar funciones y datos para uso externo
export {
  checkProjectMessages,
  unreadMessagesByProject,
  countProjectUnreadMessages,
};
