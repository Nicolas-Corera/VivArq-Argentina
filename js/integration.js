import {
  auth,
  db,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "./firebase-config.js";
const availableIntegrations = {
  professional: [
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "fab fa-linkedin-in",
      description:
        "Conecta tu cuenta de LinkedIn para compartir más información profesional",
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      permissions: ["profile", "email", "share"],
    },
    {
      id: "github",
      name: "GitHub",
      icon: "fab fa-github",
      description:
        "Conecta tu repositorio de GitHub para mostrar tu portafolio de proyectos",
      authUrl: "https://github.com/login/oauth/authorize",
      permissions: ["repo", "user"],
    },
    {
      id: "behance",
      name: "Behance",
      icon: "fab fa-behance",
      description:
        "Conecta tu portafolio de Behance para compartir tus diseños",
      authUrl: "https://www.behance.net/v2/oauth/authenticate",
      permissions: ["public_profile", "projects"],
    },
  ],
  personal: [
    {
      id: "facebook",
      name: "Facebook",
      icon: "fab fa-facebook",
      description:
        "Conecta tu cuenta de Facebook para compartir actualizaciones y contenido",
      authUrl: "https://www.facebook.com/v11.0/dialog/oauth",
      permissions: ["public_profile", "email"],
    },
    {
      id: "google",
      name: "Google Drive",
      icon: "fab fa-google-drive",
      description:
        "Conecta tu Google Drive para acceder a tus archivos de proyectos",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      permissions: ["drive.file", "profile"],
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: "fab fa-whatsapp",
      description: "Conecta WhatsApp para recibir notificaciones importantes",
      authUrl: "https://api.whatsapp.com/qr/",
      permissions: ["phone", "chat"],
    },
  ],
};
let availableIntegrationsContainer;
let connectedIntegrationsContainer;
let currentUserType;
export function initIntegrations() {
  availableIntegrationsContainer = document.querySelector(
    ".available-integrations"
  );
  connectedIntegrationsContainer = document.getElementById(
    "connected-integrations"
  );
  if (!connectedIntegrationsContainer) {
    const integrationsSection = document.querySelector(".settings-section");
    const connectedSection = document.createElement("div");
    connectedSection.innerHTML = `
      <div class="settings-header">
        <h3>Integraciones Conectadas</h3>
        <p>Servicios que has conectado a tu cuenta</p>
      </div>
      <div class="integrations-list" id="connected-integrations">
      </div>
    `;
    integrationsSection.parentNode.insertBefore(
      connectedSection,
      integrationsSection
    );
    connectedIntegrationsContainer = document.getElementById(
      "connected-integrations"
    );
  }
  const accountTypeElement = document.getElementById("accountTypeProfile");
  currentUserType =
    accountTypeElement &&
    accountTypeElement.textContent.includes("Professional")
      ? "professional"
      : "personal";
  const userId = localStorage.getItem("logguedInUserId");
  if (userId) {
    loadUserIntegrations(userId);
  }
}
async function loadUserIntegrations(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const integrations = userData.integrations || [];
      availableIntegrationsContainer.innerHTML = "";
      connectedIntegrationsContainer.innerHTML = "";
      const relevantIntegrations = availableIntegrations[currentUserType];
      integrations.forEach((integration) => {
        const integrationData =
          relevantIntegrations.find((i) => i.id === integration.id) ||
          availableIntegrations.professional.find(
            (i) => i.id === integration.id
          ) ||
          availableIntegrations.personal.find((i) => i.id === integration.id);
        if (integrationData) {
          renderConnectedIntegration(integration, integrationData);
        }
      });
      const connectedIds = integrations.map((i) => i.id);
      relevantIntegrations.forEach((integration) => {
        if (!connectedIds.includes(integration.id)) {
          renderAvailableIntegration(integration);
        }
      });
      attachIntegrationEventListeners(userId);
    }
  } catch (error) {
    console.error("Error loading user integrations:", error);
    showNotification("Error loading integrations", "error");
  }
}
function renderAvailableIntegration(integration) {
  const card = document.createElement("div");
  card.className = "integration-card";
  card.dataset.integrationId = integration.id;
  card.innerHTML = `
    <div class="integration-icon">
      <i class="${integration.icon}"></i>
    </div>
    <h4>${integration.name}</h4>
    <p>${integration.description}</p>
    <button class="btn btn-primary connect-integration">Conectar</button>
  `;
  availableIntegrationsContainer.appendChild(card);
}
function renderConnectedIntegration(userIntegration, integrationData) {
  const item = document.createElement("div");
  item.className = "integration-item";
  item.dataset.integrationId = integrationData.id;
  const connectedDate = userIntegration.connectedAt
    ? new Date(userIntegration.connectedAt.seconds * 1000).toLocaleDateString()
    : "Fecha desconocida";
  item.innerHTML = `
    <div class="integration-logo">
      <i class="${integrationData.icon}"></i>
    </div>
    <div class="integration-info">
      <h4>${integrationData.name}</h4>
      <p>Conectado desde: ${connectedDate}</p>
      <p class="integration-permissions">Permisos: ${integrationData.permissions.join(
        ", "
      )}</p>
    </div>
    <div class="integration-actions">
      <button class="btn btn-error btn-small disconnect-integration">Desconectar</button>
    </div>
  `;
  connectedIntegrationsContainer.appendChild(item);
}
function attachIntegrationEventListeners(userId) {
  document.querySelectorAll(".connect-integration").forEach((button) => {
    button.addEventListener("click", function () {
      const card = this.closest(".integration-card");
      const integrationId = card.dataset.integrationId;
      connectIntegration(userId, integrationId);
    });
  });
  document.querySelectorAll(".disconnect-integration").forEach((button) => {
    button.addEventListener("click", function () {
      const item = this.closest(".integration-item");
      const integrationId = item.dataset.integrationId;
      disconnectIntegration(userId, integrationId);
    });
  });
}
function connectIntegration(userId, integrationId) {
  const integrationData =
    availableIntegrations[currentUserType].find(
      (i) => i.id === integrationId
    ) ||
    availableIntegrations.professional.find((i) => i.id === integrationId) ||
    availableIntegrations.personal.find((i) => i.id === integrationId);
  if (!integrationData) {
    showNotification("Integration not found", "error");
    return;
  }
  const windowFeatures = "width=600,height=700,status=yes,scrollbars=yes";
  const popupWindow = window.open(
    integrationData.authUrl,
    "oauth",
    windowFeatures
  );
  setTimeout(async () => {
    if (popupWindow) {
      popupWindow.close();
    }
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentIntegrations = userData.integrations || [];
        if (currentIntegrations.some((i) => i.id === integrationId)) {
          showNotification("Esta integración ya está conectada", "info");
          return;
        }
        const newIntegration = {
          id: integrationId,
          connectedAt: serverTimestamp(),
          accessToken: "mock-token-" + Math.random().toString(36).substring(2),
          refreshToken:
            "mock-refresh-" + Math.random().toString(36).substring(2),
        };
        await updateDoc(userRef, {
          integrations: [...currentIntegrations, newIntegration],
        });
        const card = document.querySelector(
          `.integration-card[data-integration-id="${integrationId}"]`
        );
        if (card) {
          card.remove();
        }
        renderConnectedIntegration(newIntegration, integrationData);
        attachIntegrationEventListeners(userId);
        showNotification(
          `${integrationData.name} conectado exitosamente`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error connecting integration:", error);
      showNotification("Error al conectar la integración", "error");
    }
  }, 2000);
}
async function disconnectIntegration(userId, integrationId) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentIntegrations = userData.integrations || [];
      const integrationToRemove = currentIntegrations.find(
        (i) => i.id === integrationId
      );
      if (!integrationToRemove) {
        showNotification("Integration not found", "error");
        return;
      }
      const updatedIntegrations = currentIntegrations.filter(
        (i) => i.id !== integrationId
      );
      await updateDoc(userRef, {
        integrations: updatedIntegrations,
      });
      const integrationData =
        availableIntegrations[currentUserType].find(
          (i) => i.id === integrationId
        ) ||
        availableIntegrations.professional.find(
          (i) => i.id === integrationId
        ) ||
        availableIntegrations.personal.find((i) => i.id === integrationId);
      const item = document.querySelector(
        `.integration-item[data-integration-id="${integrationId}"]`
      );
      if (item) {
        item.remove();
      }
      if (
        integrationData &&
        currentUserType === (integrationData.userType || currentUserType)
      ) {
        renderAvailableIntegration(integrationData);
        attachIntegrationEventListeners(userId);
      }
      showNotification(
        `${integrationData?.name || "Integración"} desconectada exitosamente`,
        "success"
      );
    }
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    showNotification("Error al desconectar la integración", "error");
  }
}
function showNotification(message, type) {
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    document.body.appendChild(notification);
  }
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}
export { loadUserIntegrations, connectIntegration, disconnectIntegration };
