import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
} from "./firebase-config.js";
import {
  getFirestore,
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
} from "./firebase-config.js";
import {
  checkProjectMessages,
  unreadMessagesByProject,
} from "./projectNotification.js";
const auth = getAuth();
const db = getFirestore();
function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(function () {
    messageDiv.style.opacity = 0;
    messageDiv.style.display = "none";
  }, 5000);
}
let isEditMode = false;
let currentUserId = null;
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuario autenticado:", user.uid);
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get("user");
      const isViewingOther = urlParams.get("viewing") === "other";
      const userIdToLoad = urlUserId || user.uid;
      currentUserId = userIdToLoad;
      loadUserData(userIdToLoad, isViewingOther);
      toggleAuthUI(true);
      setupLogoutButton();
      setupDeleteAccountButton();
      setupNewProjectButtons();
      loadUserProjects(userIdToLoad);
      if (isViewingOther && urlUserId) {
        adjustUIForOtherUserProfile(urlUserId);
      }
      const requestsQuery = query(
        collection(db, "solicitudes"),
        where("professionalId", "==", urlUserId)
      );
    } else {
      console.log("Usuario no autenticado");
      const urlParams = new URLSearchParams(window.location.search);
      const professionalId = urlParams.get("user");
      const viewingParam = urlParams.get("viewing") || "own";
      window.location.href = `login.html?redirect=profile-professional.html&user=${professionalId}&viewing=${viewingParam}`;
    }
  });
});
async function loadUserData(userId, isViewingOther = false) {
  try {
    if (!userId) {
      console.error("No se proporcionó un ID de usuario");
      return;
    }
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userInfo = userData.userInfo;
      displayUserData(userInfo);
      if (!isViewingOther) {
        updateUserMenu(userInfo);
      }
    } else {
      console.error("No se encontró el documento del usuario");
    }
  } catch (error) {
    console.error("Error al cargar datos del usuario:", error);
  }
}
function adjustUIForOtherUserProfile(userId) {
  const editButtons = document.querySelectorAll(".edit-profile-button");
  editButtons.forEach((button) => (button.style.display = "none"));
  const deleteAccountBtn = document.querySelectorAll(".delete-profile-btn");
  deleteAccountBtn.forEach((button) => (button.style.display = "none"));
  const newProyectBtn = document.querySelectorAll(".primary-btn");
  newProyectBtn.forEach((button) => (button.style.display = "none"));
  const reviewsBtnTab = document.querySelectorAll(".reviewsBtnTab");
  reviewsBtnTab.forEach((button) => (button.style.display = "none"));
  const contractsBtnTab = document.querySelectorAll(".contractsBtnTab");
  contractsBtnTab.forEach((button) => (button.style.display = "none"));
  const noProjectsText = document.getElementById("noProjectsText");
  if (noProjectsText) {
    noProjectsText.textContent = "Este usuario aún no ha publicado proyectos.";
  }
  const projectsBtnTab = document.getElementById("projectsBtnTab");
  if (projectsBtnTab) {
    projectsBtnTab.textContent = "Proyectos publicados";
  }
  const projectsTitle = document.getElementById("projectsTitle");
  if (projectsTitle) {
    projectsTitle.textContent = "Proyectos publicados";
  }
  const noReviewsText = document.getElementById("noReviewsText");
  if (noReviewsText) {
    noReviewsText.textContent = "Este usuario aún no tiene reseñas.";
  }
  const noContractText = document.getElementById("noContractText");
  if (noContractText) {
    noContractText.textContent = "Este usuario aún no tiene contratos creados.";
  }
  const observer = new MutationObserver(function (mutations) {
    const editProjectButtons = document.querySelectorAll(".btn-edit");
    const deleteProjectButtons = document.querySelectorAll(".btn-delete");
    editProjectButtons.forEach((button) => (button.style.display = "none"));
    deleteProjectButtons.forEach((button) => (button.style.display = "none"));
  });
  const projectsList = document.getElementById("projects-list");
  if (projectsList) {
    observer.observe(projectsList, { childList: true, subtree: true });
  }
}
function toggleAuthUI(isAuthenticated) {
  const authButtons = document.getElementById("authButtons");
  const userMenu = document.getElementById("userMenu");
  if (isAuthenticated) {
    if (authButtons) authButtons.style.display = "none";
    if (userMenu) userMenu.style.display = "flex";
  } else {
    if (authButtons) authButtons.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
  }
}
function displayUserData(userInfo) {
  document.getElementById("profile-name").textContent =
    userInfo["2_Nombre y Apellido"] || "Nombre no disponible";
  document.getElementById("profile-location").textContent =
    userInfo["6_Ubicación"] || "Ubicación no disponible";
}
function updateUserMenu(userInfo) {
  const userName = document.getElementById("userName");
  const accountType = document.getElementById("accountTypeProfile");
  if (userName) {
    userName.textContent = userInfo["2_Nombre y Apellido"] || "Usuario";
  }
  if (accountType) {
    accountType.textContent =
      userInfo["5_Tipo de Cuenta"] === "professional"
        ? "Cuenta Profesional"
        : "Cuenta Cliente";
  }
}
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      tab.classList.add("active");
      const tabId = tab.getAttribute("data-tab");
      const selectedContent = document.getElementById(`${tabId}-panel`);
      if (selectedContent) {
        selectedContent.classList.add("active");
      }
    });
  });
}
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        localStorage.removeItem("logguedInUserId");
        localStorage.removeItem("userRole");
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    });
  }
}
function setupDeleteAccountButton() {
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const deleteAccountModal = document.getElementById("deleteAccountModal");
  const closeModalBtn = document.querySelector(".close-modal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (deleteAccountBtn && deleteAccountModal) {
    deleteAccountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      deleteAccountModal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => {
        deleteAccountModal.style.display = "none";
        document.body.style.overflow = "auto";
      });
    }
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener("click", () => {
        deleteAccountModal.style.display = "none";
        document.body.style.overflow = "auto";
      });
    }
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", () => {
        deleteAccountModal.style.display = "none";
        document.body.style.overflow = "auto";
        showMessage("Procesando eliminación de cuenta...", "successMessage");
        deleteUserAccount()
          .then(() => {
            showMessage("Cuenta eliminada con éxito", "successMessage");
            setTimeout(function () {
              window.location.href = "index.html";
            }, 1000);
          })
          .catch((error) => {
            console.error("Error al eliminar la cuenta:", error);
            showMessage(
              "Error al eliminar la cuenta: " + error.message,
              "errorMessage"
            );
          });
      });
    }
    window.addEventListener("click", (e) => {
      if (e.target === deleteAccountModal) {
        deleteAccountModal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  }
}
async function deleteUserAccount() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("No hay usuario autenticado");
      return;
    }
    const userId = user.uid;
    await deleteUserData(userId);
    await deleteUser(user);
    localStorage.removeItem("logguedInUserId");
    localStorage.removeItem("userRole");
    return true;
  } catch (error) {
    console.error("Error al eliminar la cuenta:", error);
    throw error; // Propagar el error para manejo superior
  }
}
async function deleteUserData(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);
    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", userId)
    );
    const projectsSnapshot = await getDocs(projectsQuery);
    const deleteProjectPromises = [];
    projectsSnapshot.forEach((projectDoc) => {
      deleteProjectPromises.push(deleteDoc(doc(db, "projects", projectDoc.id)));
    });
    const requestsQuery = query(
      collection(db, "solicitudes"),
      where("professionalId", "==", userId)
    );
    const requestsSnapshot = await getDocs(requestsQuery);
    const deleteRequestPromises = [];
    requestsSnapshot.forEach((requestDoc) => {
      deleteRequestPromises.push(
        deleteDoc(doc(db, "solicitudes", requestDoc.id))
      );
    });
    const requestsAsContractorQuery = query(
      collection(db, "solicitudes"),
      where("contractorId", "==", userId)
    );
    const requestsAsContractorSnapshot = await getDocs(
      requestsAsContractorQuery
    );
    requestsAsContractorSnapshot.forEach((requestDoc) => {
      deleteRequestPromises.push(
        deleteDoc(doc(db, "solicitudes", requestDoc.id))
      );
    });
    await Promise.all([...deleteProjectPromises, ...deleteRequestPromises]);
    console.log("Datos del usuario eliminados correctamente");
  } catch (error) {
    console.error("Error al eliminar datos del usuario:", error);
    throw error;
  }
}
function setupNewProjectButtons() {
  const newProjectBtn = document.getElementById("new-project-btn");
  const newProjectModal = document.getElementById("new-project-modal");
  const closeProjectModal = document.getElementById("close-project-modal");
  if (newProjectBtn && newProjectModal) {
    newProjectBtn.addEventListener("click", () => {
      newProjectModal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
  }
  const createFirstProjectBtn = document.getElementById(
    "create-first-project-btn"
  );
  if (createFirstProjectBtn && newProjectModal) {
    createFirstProjectBtn.addEventListener("click", () => {
      newProjectModal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
  }
  if (closeProjectModal && newProjectModal) {
    closeProjectModal.addEventListener("click", () => {
      newProjectModal.style.display = "none";
      document.body.style.overflow = "auto";
    });
  }
  const goToProjectFormBtn = document.getElementById("go-to-project-form");
  if (goToProjectFormBtn) {
    goToProjectFormBtn.addEventListener("click", () => {
      window.location.href = "project-form.html";
    });
  }
  const cancelProjectFormBtn = document.getElementById("cancel-project-form");
  if (cancelProjectFormBtn && newProjectModal) {
    cancelProjectFormBtn.addEventListener("click", () => {
      newProjectModal.style.display = "none";
      document.body.style.overflow = "auto";
    });
  }
  window.addEventListener("click", (event) => {
    if (event.target === newProjectModal) {
      newProjectModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });
}

function createProjectElement(project) {
  const projectElement = document.createElement("div");
  projectElement.className = "project-card";
  projectElement.dataset.id = project.id;

  const statusClass =
    project.status === "published" ? "status-published" : "status-draft";
  const statusText = project.status === "published" ? "Publicado" : "Borrador";

  const createdDate = project.createdAt
    ? new Date(project.createdAt.seconds * 1000)
    : new Date();
  const formattedDate = createdDate.toLocaleDateString("es-AR");

  let imageUrl = "https://placehold.co/600x400";
  if (
    project.images &&
    project.images.length > 0 &&
    project.images[0].secure_url
  ) {
    imageUrl = project.images[0].secure_url;
  }

  projectElement.innerHTML = `
      <div class="project-image">
        <img src="${imageUrl}" alt="${project.title || "Proyecto sin título"}">
        <div class="project-notification-badge" style="display: none;">
          <i class="fas fa-bell"></i>
          <span class="notification-count">0</span>
        </div>
        <span class="project-status ${statusClass}">${statusText}</span>
      </div>
      <div class="project-info">
        <h3 class="project-title">${project.title || "Proyecto sin título"}</h3>
        <p class="project-description">${
          project.description
            ? project.description.substring(0, 100) + "..."
            : "Sin descripción"
        }</p>
        <div class="project-meta">
          <span class="project-category">${
            project.category || "Sin categoría"
          }</span>
          <span class="project-date">Creado: ${formattedDate}</span>
        </div>
        <div class="project-actions">
          <button class="btn-view" data-id="${project.id}">
            <i class="fas fa-eye"></i> Ver
          </button>
          <button class="btn-edit" data-id="${project.id}">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn-delete" data-id="${project.id}">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;

  const viewBtn = projectElement.querySelector(".btn-view");
  const editBtn = projectElement.querySelector(".btn-edit");
  const deleteBtn = projectElement.querySelector(".btn-delete");

  if (project.status === "published" ? "" : "status-draft") {
    viewBtn.style.setProperty("display", "none", "important");
  } else {
    viewBtn.addEventListener("click", () => {
      window.location.href = `project-detail.html?id=${project.id}`;
    });
  }

  editBtn.addEventListener("click", () => {
    window.location.href = `edit-project.html?id=${project.id}`;
  });

  deleteBtn.addEventListener("click", () => {
    confirmDeleteProject(project.id, project.title);
  });

  // Verificar si hay mensajes no leídos para este proyecto
  if (auth.currentUser) {
    checkProjectMessages(project.id);
  }

  return projectElement;
}

// 3. Modificar la función loadUserProjects para inicializar las notificaciones después de cargar proyectos
async function loadUserProjects(userId) {
  if (!userId) {
    console.error(
      "Error: Se intentó cargar proyectos sin un ID de usuario válido"
    );
    return;
  }

  const projectsList = document.getElementById("projects-list");
  if (!projectsList) {
    console.error("Error: No se encontró el elemento projects-list");
    return;
  }

  let emptyState = projectsList.querySelector(".empty-state");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <p id="noProjectsText">Aún no tienes proyectos publicados.</p>
      <button id="create-first-project-btn" class="primary-btn">Publicar mi primer proyecto</button>
    `;
    projectsList.appendChild(emptyState);
  }

  try {
    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(projectsQuery);

    if (querySnapshot.empty) {
      emptyState.style.display = "flex";
      return;
    }

    emptyState.style.display = "none";

    const children = Array.from(projectsList.children);
    children.forEach((child) => {
      if (!child.classList.contains("empty-state")) {
        child.remove();
      }
    });

    querySnapshot.forEach((doc) => {
      const project = doc.data();
      project.id = doc.id; // Añadir ID del documento
      const projectElement = createProjectElement(project);
      projectsList.appendChild(projectElement);
    });

    const createFirstProjectBtn = document.getElementById(
      "create-first-project-btn"
    );
    if (createFirstProjectBtn) {
      createFirstProjectBtn.addEventListener("click", () => {
        const newProjectModal = document.getElementById("new-project-modal");
        if (newProjectModal) {
          newProjectModal.style.display = "block";
          document.body.style.overflow = "hidden";
        }
      });
    }

    // Inicializar notificaciones para todos los proyectos cargados
    if (auth.currentUser) {
      querySnapshot.forEach((doc) => {
        checkProjectMessages(doc.id);
      });
    }
  } catch (error) {
    console.error("Error al cargar proyectos:", error);
    showErrorMessage(
      "No se pudieron cargar los proyectos. Por favor, intenta nuevamente."
    );
  }
}
function confirmDeleteProject(projectId, projectTitle) {
  if (
    confirm(
      `¿Estás seguro de que deseas eliminar el proyecto "${
        projectTitle || "sin título"
      }"? Esta acción no se puede deshacer.`
    )
  ) {
    deleteProject(projectId);
  }
}
async function deleteProject(projectId) {
  try {
    await deleteDoc(doc(db, "projects", projectId));
    const projectElement = document.querySelector(
      `.project-card[data-id="${projectId}"]`
    );
    if (projectElement) {
      projectElement.remove();
    }
    const projectsList = document.getElementById("projects-list");
    let emptyState = projectsList.querySelector(".empty-state");
    const projectCount = Array.from(projectsList.children).filter(
      (child) => !child.classList.contains("empty-state")
    ).length;
    if (projectCount === 0 && emptyState) {
      emptyState.style.display = "flex";
    }
    showSuccessMessage("Proyecto eliminado correctamente.");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    showErrorMessage(
      "No se pudo eliminar el proyecto. Por favor, intenta nuevamente."
    );
  }
}
function showSuccessMessage(message) {
  const successMessage = document.getElementById("successMessage");
  if (successMessage) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 3000);
  }
}
function showErrorMessage(message) {
  const errorMessage = document.getElementById("errorMessage");
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 3000);
  }
}
document.addEventListener("DOMContentLoaded", setupNewProjectButtons);
function enforceViewingParameter() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  console.log("URL actual:", url.href);
  console.log("Pathname:", url.pathname);
  const isProfessionalProfile = url.pathname.includes(
    "profile-professional.html"
  );
  const isContractorProfile =
    url.pathname.includes("profile-contractor.html") ||
    url.pathname.includes("contractor-profile") ||
    (url.pathname.includes("contractor") && url.pathname.includes("profile"));
  console.log("¿Es perfil profesional?", isProfessionalProfile);
  console.log("¿Es perfil Cliente?", isContractorProfile);
  if (
    (isProfessionalProfile || isContractorProfile) &&
    params.has("user") &&
    !params.has("viewing")
  ) {
    const userId = params.get("user");
    const currentLoggedUserId = localStorage.getItem("logguedInUserId");
    console.log("ID en URL:", userId);
    console.log("ID logueado:", currentLoggedUserId);
    const isOwnProfile = userId === currentLoggedUserId;
    const viewingParam = isOwnProfile ? "own" : "other";
    console.log("¿Es perfil propio?", isOwnProfile);
    console.log("Parámetro viewing:", viewingParam);
    params.set("viewing", viewingParam);
    url.search = params.toString();
    console.log("Redirigiendo a:", url.toString());
    window.location.replace(url.toString());
  }
}
document.addEventListener("DOMContentLoaded", enforceViewingParameter);
const originalPushState = history.pushState;
history.pushState = function () {
  originalPushState.apply(this, arguments);
  enforceViewingParameter();
};
const originalReplaceState = history.replaceState;
history.replaceState = function () {
  originalReplaceState.apply(this, arguments);
  enforceViewingParameter();
};
window.addEventListener("popstate", enforceViewingParameter);
