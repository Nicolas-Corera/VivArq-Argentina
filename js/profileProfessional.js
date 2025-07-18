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
  deleteField,
  orderBy,
} from "./firebase-config.js";
import { displayMessage } from "./displayMessage.js";
const auth = getAuth();
const db = getFirestore();
let isEditMode = false;
let currentUserId = null;
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("showCancelChanges") === "true") {
    setTimeout(() => {
      displayMessage("Cambios no guardados", "error");
      localStorage.removeItem("showCancelChanges");
    }, 1600);
  }
  document.getElementById("cancel-profile-btn").style.display = "none";
  initTabs();
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Usuario autenticado:", user.uid);
      const userId = user.uid || getUserIdFromUrl();
      const professionalId = userId;
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get("user");
      const isViewingOther = urlParams.get("viewing") === "other";
      const currentLoggedUserId = localStorage.getItem("logguedInUserId");
      const isOwnProfile = userId === currentLoggedUserId;
      const userIdToLoad = urlUserId || userId;
      const currentUserId = userIdToLoad;
      loadUserData(userIdToLoad, isViewingOther);
      toggleAuthUI(true);
      setupLogoutButton();
      setupDeleteAccountButton();
      setupEditProfileButton();
      if (isOwnProfile) {
        loadSavedProjects(userId);
      }
      if (isViewingOther && urlUserId) {
        adjustUIForOtherUserProfile(urlUserId);
      }
      const requestsQuery = query(
        collection(db, "solicitudes"),
        where("professionalId", "==", userId)
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
      updateProfileImageInUI(userInfo.profileImageUrl || null);
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
  const editButtons = document.querySelectorAll(".edit-profile-btn");
  editButtons.forEach((button) => (button.style.display = "none"));
  const uploadImgPlaceholder = document.getElementById("uploadImgPlaceholder");
  if (uploadImgPlaceholder) {
    uploadImgPlaceholder.textContent = "Este usuario no tiene foto de perfil";
  }
  const professionalAbout = document.getElementById("professional-about");
  if (professionalAbout) {
    professionalAbout.textContent =
      "Aún no hay información adicional del profesional.";
  }
  const urlParams = new URLSearchParams(window.location.search);
  const professionalId = urlParams.get("user");
  const contactBtn = document.getElementById("contact-btn");
  if (contactBtn) {
    contactBtn.addEventListener("click", () => {
      window.location.href = `chat.html?with=${professionalId}`;
    });
  } else {
    console.error("El botón de contacto no se encontró en el DOM.");
  }
  if ((contactBtn.style.display = "none")) {
    contactBtn.style.display = "block";
  } else {
    contactBtn.style.display = "none";
  }
  const deleteProfileBtn = document.querySelectorAll(".delete-profile-btn");
  deleteProfileBtn.forEach((button) => (button.style.display = "none"));
  const deleteAccountBtn = document.querySelectorAll(".delete-account-btn");
  deleteAccountBtn.forEach((button) => (button.style.display = "none"));
  const newProyectBtn = document.querySelectorAll(".primary-btn");
  newProyectBtn.forEach((button) => (button.style.display = "none"));
  const tasksBtn = document.getElementById("tasks");
  tasksBtn.style.display = "none";
  const foliosBtn = document.getElementById("folios");
  foliosBtn.style.display = "none";
  const computosBtn = document.getElementById("computos");
  computosBtn.style.display = "none";
  const projectSaveBtnTab = document.getElementById("projectSaveBtnTab");
  projectSaveBtnTab.style.display = "none";
  const noProjectsText = document.getElementById("noProjectsText");
  if (noProjectsText) {
    noProjectsText.textContent = "Este usuario aún no ha publicado proyectos.";
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
  const portfolio = document.getElementById("portfolio-content");
  if (portfolio) {
    portfolio.innerHTML = `
                <div class="empty-state">
              <img src="images/folder.png" alt="Sin contenido" />
              <h2>No hay contenido aún</h2>
              <p>Cuando el profesional publique sus proyectos los verás aquí.</p>
            </div>
    `;
  }
}
function displayUserData(userInfo) {
  document.getElementById("professional-name").textContent =
    userInfo["2_Nombre y Apellido"] || "Nombre no disponible";
  document.getElementById("professional-profession").textContent =
    userInfo["7_Profesión"] || "Profesión no disponible";
  const phoneContainer = document.getElementById("professional-phone-number");
  const phoneNumber = userInfo["12_Número de Teléfono"];
  if (phoneNumber) {
    phoneContainer.innerHTML = `<a class="professionalPhone" href="tel:${phoneNumber.replace(
      /[^\d+]/g,
      ""
    )}">${phoneNumber}</a>`;
  } else {
    phoneContainer.textContent = "Teléfono no disponible";
  }
  document.getElementById("professional-location").textContent =
    userInfo["6_Ubicación"] || "Ubicación no disponible";
  document.getElementById("professional-experience").textContent = userInfo[
    "8_Años de Experiencia"
  ]
    ? `${userInfo["8_Años de Experiencia"]}`
    : "Experiencia no disponible";
  if (userInfo["Sobre_Mi"]) {
    document.getElementById("professional-about").textContent =
      userInfo["Sobre_Mi"];
  }
  const specialtiesContainer = document.getElementById(
    "professional-specialties"
  );
  specialtiesContainer.innerHTML = ""; // Limpiar contenedor
  if (userInfo["Especialidades"] && userInfo["Especialidades"].trim()) {
    const specialties = userInfo["Especialidades"].split(",");
    specialties.forEach((specialty) => {
      if (specialty.trim()) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = specialty.trim();
        specialtiesContainer.appendChild(tag);
      }
    });
  } else {
    const message = document.createElement("p");
    message.textContent = "Aún no se han especificado especialidades.";
    specialtiesContainer.appendChild(message);
  }
  const educationContainer = document.getElementById("professional-education");
  educationContainer.innerHTML = ""; // Limpiar contenedor
  try {
    if (userInfo["Educacion"] && typeof userInfo["Educacion"] === "string") {
      const education = JSON.parse(userInfo["Educacion"]);
      if (education && Array.isArray(education) && education.length > 0) {
        education.forEach((edu) => {
          const eduItem = document.createElement("div");
          eduItem.className = "education-item";
          const title = document.createElement("h4");
          title.textContent = edu.institution || "";
          const details = document.createElement("p");
          details.textContent = `${edu.degree || ""}, ${edu.period || ""}`;
          eduItem.appendChild(title);
          eduItem.appendChild(details);
          educationContainer.appendChild(eduItem);
        });
      } else {
        const message = document.createElement("p");
        message.textContent =
          "Cuéntanos más sobre tu formación. Edita tu perfil y agrégala.";
        educationContainer.appendChild(message);
      }
    } else {
      const message = document.createElement("p");
      message.textContent = "Aún no se ha especificado su formación académica.";
      educationContainer.appendChild(message);
    }
  } catch (error) {
    console.error("Error al procesar datos de educación:", error);
    const message = document.createElement("p");
    message.textContent =
      "Cuéntanos más sobre tu formación. Edita tu perfil y agrégala.";
    educationContainer.appendChild(message);
  }
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
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      tab.classList.add("active");
      const tabId = tab.getAttribute("data-tab");
      const selectedContent = document.getElementById(`${tabId}-content`);
      if (selectedContent) {
        selectedContent.classList.add("active");
      }
    });
  });
}
async function loadSavedProjects(userId) {
  const savedProjectsGrid = document.getElementById("saved-projects-grid");
  if (!savedProjectsGrid) {
    console.error("No se encontró el contenedor de proyectos guardados");
    return;
  }
  try {
    savedProjectsGrid.innerHTML =
      '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando proyectos guardados...</div>';
    const savedProjectsQuery = query(
      collection(db, "saved_projects"),
      where("userId", "==", userId),
      orderBy("savedAt", "desc")
    );
    const querySnapshot = await getDocs(savedProjectsQuery);
    savedProjectsGrid.innerHTML = "";
    if (querySnapshot.empty) {
      savedProjectsGrid.innerHTML = `
            <div class="empty-state">
              <img src="images/folder.png" alt="Sin contenido" />
              <h2>No hay contenido aún</h2>
              <p>Cuando guardes un proyecto, se mostrará aquí.</p>
            </div>
        `;
      return;
    }
    querySnapshot.forEach((doc) => {
      const savedProject = doc.data();
      const projectCard = document.createElement("div");
      projectCard.className = "saved-project-card";
      projectCard.innerHTML = `
        <div class="saved-project-image">
          <img src="${savedProject.thumbnailUrl}" alt="${savedProject.projectTitle}">
        </div>
        <div class="saved-project-info">
          <h4>${savedProject.projectTitle}</h4>
          <p class="project-category"><i class="fas fa-tag"></i> ${savedProject.projectCategory}</p>
          <p class="project-location"><i class="fas fa-map-marker-alt"></i> ${savedProject.projectLocation}</p>
          <div class="saved-project-actions">
            <a href="project-detail.html?id=${savedProject.projectId}" style="text-decoration: none; color: white;" class="btn btn-primary">Ver Proyecto</a>
            <button class="btn btn-danger remove-saved" data-id="${doc.id}">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
      savedProjectsGrid.appendChild(projectCard);
      const removeBtn = projectCard.querySelector(".remove-saved");
      removeBtn.addEventListener("click", () =>
        removeSavedProject(doc.id, projectCard)
      );
    });
  } catch (error) {
    console.error("Error al cargar proyectos guardados:", error);
    savedProjectsGrid.innerHTML =
      '<p class="error">Error al cargar proyectos guardados</p>';
  }
}
async function removeSavedProject(docId, cardElement) {
  const confirmed = confirm(
    "¿Está seguro de que desea eliminar este proyecto de sus guardados?"
  );
  if (!confirmed) return;
  try {
    const removeBtn = cardElement.querySelector(".remove-saved");
    removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    removeBtn.disabled = true;
    await deleteDoc(doc(db, "saved_projects", docId));
    cardElement.style.transition = "opacity 0.5s, transform 0.5s";
    cardElement.style.opacity = "0";
    cardElement.style.transform = "scale(0.8)";
    setTimeout(() => {
      cardElement.remove();
      const savedProjectsGrid = document.getElementById("saved-projects-grid");
      if (savedProjectsGrid && savedProjectsGrid.children.length === 0) {
        savedProjectsGrid.innerHTML =
          '<p class="no-data">No hay proyectos guardados</p>';
      }
    }, 500);
  } catch (error) {
    console.error("Error al eliminar proyecto guardado:", error);
    alert(
      "Error al eliminar proyecto de guardados. Por favor intente nuevamente."
    );
    const removeBtn = cardElement.querySelector(".remove-saved");
    removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    removeBtn.disabled = false;
  }
}
function setupEditProfileButton() {
  const editProfileBtn = document.getElementById("edit-profile-btn");
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", toggleEditMode);
  }
}
function toggleEditMode() {
  isEditMode = !isEditMode;
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const cancelProfileBtn = document.getElementById("cancel-profile-btn");
  const imageUploadSection = document.getElementById(
    "profile-image-upload-section"
  );
  const profileImageInput = document.getElementById("profile-image-input");
  const deleteProfileImageBtn = document.getElementById(
    "delete-profile-image-btn"
  );
  const editProfileImageBtn = document.getElementById("edit-profile-image-btn");

  if (isEditMode) {
    editProfileBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    cancelProfileBtn.style.display = "inline-block"; // Mostrar botón cancelar

    if (imageUploadSection) imageUploadSection.style.display = "block";
    if (profileImageInput) profileImageInput.disabled = false;

    makeFieldsEditable();
  } else {
    editProfileBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Perfil';
    cancelProfileBtn.style.display = "none"; // Ocultar botón cancelar

    if (imageUploadSection) imageUploadSection.style.display = "none";
    if (profileImageInput) profileImageInput.disabled = true;
    if (deleteProfileImageBtn) deleteProfileImageBtn.style.display = "none";
    if (editProfileImageBtn) editProfileImageBtn.style.display = "none";

    const updatedData = collectEditedData();
    makeFieldsNonEditable();
    saveChangesWithData(updatedData);
  }
}
document
  .getElementById("cancel-profile-btn")
  .addEventListener("click", function () {
    localStorage.setItem("showCancelChanges", "true");
    window.location.reload(); // recarga la página
    isEditMode = false;
    const editProfileBtn = document.getElementById("edit-profile-btn");
    const cancelProfileBtn = document.getElementById("cancel-profile-btn");
    editProfileBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Perfil';
    cancelProfileBtn.style.display = "none";

    // Cancelar edición de campos
    makeFieldsNonEditable();
    restoreOriginalData(); // ← Asegurate de tener esta función
  });

function showLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}
function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "none";
    document.body.style.overflow = "auto";
  }
}
async function saveChangesWithData(updatedData) {
  showLoadingOverlay();
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("No hay usuario autenticado");
      return;
    }
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const mergedData = {
        ...userData,
        userInfo: {
          ...userData.userInfo,
          ...updatedData,
        },
      };
      await updateDoc(userDocRef, mergedData);
      console.log("Perfil actualizado correctamente");
      displayMessage("Perfil actualizado correctamente", "success");
      displayUserData(mergedData.userInfo);
      updateUserMenu(mergedData.userInfo);
    }
  } catch (error) {
    console.error("Error al guardar los cambios:", error);
    displayMessage(
      "Error al guardar los cambios: " + error.message,
      "errorMessage"
    );
  } finally {
    hideLoadingOverlay();
  }
}
function makeFieldsEditable() {
  const aboutElement = document.getElementById("professional-about");
  makeEditableTextarea(aboutElement, "Cuéntanos sobre ti");
  convertSpecialtiesToEditable();
  const experienceElement = document.getElementById("professional-experience");
  makeEditable(experienceElement, "8");
  convertEducationToEditable();
}
function makeEditable(element, placeholder) {
  if (!element) return;
  const currentValue = element.textContent;
  element.setAttribute("data-original", currentValue);
  element.contentEditable = true;
  element.classList.add("editable");
  element.setAttribute("placeholder", placeholder);
}
function makeEditableTextarea(element, placeholder) {
  if (!element) return;
  const currentValue = element.textContent;
  const parent = element.parentNode;
  element.setAttribute("data-original", currentValue);
  const textarea = document.createElement("textarea");
  textarea.className = "editable-textarea";
  textarea.value = currentValue;
  textarea.placeholder = placeholder;
  textarea.rows = 5;
  parent.replaceChild(textarea, element);
  parent.setAttribute("data-has-textarea", "true");
}

function convertSpecialtiesToEditable() {
  const specialtiesContainer = document.getElementById(
    "professional-specialties"
  );
  if (!specialtiesContainer) return;
  const originalValues = [];
  const tags = specialtiesContainer.querySelectorAll(".tag");
  if (tags.length > 0) {
    tags.forEach((tag) => {
      originalValues.push(tag.textContent);
    });
  }
  specialtiesContainer.setAttribute(
    "data-original",
    JSON.stringify(originalValues)
  );

  // Lista predefinida de especialidades
  const predefinedSpecialties = [
    "Arquitectura",
    "Ingeniería Civil",
    "Ingeniería Eléctrica",
    "Maestro Mayor de Obras",
    "Dirección de Obra",
    "Topografía",
    "Construcción en Seco",
    "Albañilería",
    "Plomería",
    "Electricidad",
    "Carpintería",
    "Herrería",
    "Pintura",
    "Climatización",
    "Placas de roca de yeso",
    "Impermeabilización",
    "Diseño de Interiores",
    "Renderizado 3D",
    "AutoCAD",
    "Revit",
    "Sketchup",
    "Paquete Office 365",
    "Adobe Creative Cloud",
    "Modelado BIM",
    "Dibujo Técnico",
    "Relevamientos",
    "Administración de Obras",
    "Presupuestación",
    "Gestión de Proyectos",
    "Consultoría Técnica",
    "Asesoría Legal",
    "Permisos y Habilitaciones",
    "Seguridad e Higiene",
    "Recursos Humanos",
    "Paisajismo",
    "Fotografía de Obras",
    "Drones y Fotogrametría",
    "Marketing para Profesionales",
    "Enseñanza Técnica",
    "Capacitación en Obra",
    "Coaching Profesional",
  ];

  specialtiesContainer.innerHTML = `
    <div class="specialties-editor">
      <div class="specialties-form">
        <div class="autocomplete-container">
          <input type="text" class="editable" id="specialty-input" placeholder="Ingresa una especialidad" autocomplete=off>
          <div id="autocomplete-list" class="autocomplete-list"></div>
        </div>
        <button type="button" id="add-specialty" class="btn btn-primary">
          <i class="fas fa-plus"></i> Añadir
        </button>
      </div>
      <div id="specialties-list" class="specialties-list"></div>
    </div>
  `;

  // Agregar estilos CSS para los elementos seleccionados
  const style = document.createElement("style");
  style.textContent = `
    .autocomplete-item.already-selected {
      background-color: #e9ecef;
      color: #6c757d;
      text-decoration: line-through;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);

  const specialtiesList = document.getElementById("specialties-list");

  originalValues.forEach((specialty, index) => {
    if (specialty.trim()) {
      addSpecialtyToList(specialty.trim());
    }
  });

  const specialtyInput = document.getElementById("specialty-input");
  const autocompleteList = document.getElementById("autocomplete-list");

  // Función para comprobar si una especialidad ya está seleccionada
  function isSpecialtySelected(specialty) {
    const specialtiesList = document.getElementById("specialties-list");
    const existingSpecialties =
      specialtiesList.querySelectorAll(".specialty-data");
    for (let i = 0; i < existingSpecialties.length; i++) {
      if (
        existingSpecialties[i].getAttribute("data-specialty").toLowerCase() ===
        specialty.toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  }

  // Función para mostrar todas las especialidades disponibles
  function showAllSpecialties() {
    // Limpiar lista de autocompletado
    autocompleteList.innerHTML = "";

    // Mostrar todas las especialidades disponibles
    predefinedSpecialties.forEach((specialty) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.textContent = specialty;

      // Comprobar si esta especialidad ya está seleccionada
      if (isSpecialtySelected(specialty)) {
        item.classList.add("already-selected");
      } else {
        item.addEventListener("click", function () {
          specialtyInput.value = specialty;
          autocompleteList.style.display = "none";
          addSpecialty();
        });
      }

      autocompleteList.appendChild(item);
    });

    autocompleteList.style.display = "block";
  }

  // Mostrar todas las especialidades al hacer clic en el input
  specialtyInput.addEventListener("click", function (e) {
    showAllSpecialties();
    e.stopPropagation(); // Evitar que el evento de clic se propague
  });

  // Configurar autocompletado al escribir
  specialtyInput.addEventListener("input", function () {
    const inputValue = this.value.trim().toLowerCase();

    // Limpiar lista de autocompletado
    autocompleteList.innerHTML = "";

    if (inputValue.length === 0) {
      // Si no hay texto, mostrar todas las especialidades
      showAllSpecialties();
      return;
    }

    // Filtrar especialidades que coincidan con lo que el usuario está escribiendo
    const matchingSpecialties = predefinedSpecialties.filter((specialty) =>
      specialty.toLowerCase().includes(inputValue)
    );

    if (matchingSpecialties.length > 0) {
      autocompleteList.style.display = "block";

      matchingSpecialties.forEach((specialty) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";
        item.textContent = specialty;

        // Comprobar si esta especialidad ya está seleccionada
        if (isSpecialtySelected(specialty)) {
          item.classList.add("already-selected");
        } else {
          item.addEventListener("click", function () {
            specialtyInput.value = specialty;
            autocompleteList.style.display = "none";
            addSpecialty();
          });
        }

        autocompleteList.appendChild(item);
      });
    } else {
      autocompleteList.style.display = "none";
    }
  });

  // Ocultar la lista de autocompletado cuando se hace clic fuera de ella
  document.addEventListener("click", function (e) {
    if (e.target !== specialtyInput && e.target !== autocompleteList) {
      autocompleteList.style.display = "none";
    }
  });

  document.getElementById("add-specialty").addEventListener("click", () => {
    addSpecialty();
  });

  specialtyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSpecialty();
    }
  });
}

function addSpecialty() {
  const specialtyInput = document.getElementById("specialty-input");
  const specialty = specialtyInput.value.trim();

  if (specialty) {
    addSpecialtyToList(specialty);
    specialtyInput.value = "";
    document.getElementById("autocomplete-list").style.display = "none";
  }
}

function addSpecialtyToList(specialty) {
  const specialtiesList = document.getElementById("specialties-list");
  const existingSpecialties =
    specialtiesList.querySelectorAll(".specialty-data");
  for (let i = 0; i < existingSpecialties.length; i++) {
    if (
      existingSpecialties[i].getAttribute("data-specialty").toLowerCase() ===
      specialty.toLowerCase()
    ) {
      return; // No agregar duplicados
    }
  }
  const specialtyItem = document.createElement("div");
  specialtyItem.className = "specialty-item-edit";
  specialtyItem.innerHTML = `
    <div class="specialty-info">
      <span>${specialty}</span>
    </div>
    <div class="specialty-actions">
      <button type="button" class="btn-icon remove-specialty" data-index="new">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <input type="hidden" class="specialty-data" data-specialty="${specialty}">
  `;
  specialtiesList.appendChild(specialtyItem);
  setupRemoveSpecialtyButtons();
}
function setupRemoveSpecialtyButtons() {
  document.querySelectorAll(".remove-specialty").forEach((button) => {
    button.removeEventListener("click", handleRemoveSpecialty);
    button.addEventListener("click", handleRemoveSpecialty);
  });
}
function convertEducationToEditable() {
  const educationContainer = document.getElementById("professional-education");
  if (!educationContainer) return;
  const originalValues = [];
  const items = educationContainer.querySelectorAll(".education-item");
  items.forEach((item) => {
    const institution = item.querySelector("h4").textContent;
    const details = item.querySelector("p").textContent;
    originalValues.push({ institution, details });
  });
  educationContainer.setAttribute(
    "data-original",
    JSON.stringify(originalValues)
  );

  // Crear selectores de año
  const currentYear = new Date().getFullYear();
  let yearOptions = "";
  for (let year = currentYear; year >= currentYear - 70; year--) {
    yearOptions += `<option value="${year}">${year}</option>`;
  }

  educationContainer.innerHTML = `
    <div class="education-editor">
      <div class="education-form">
      <label for="edu-institution">Institución</label>
        <input type="text" class="editable educationInput" id="edu-institution" name="edu-institution" placeholder="Institución">
        <label for="edu-degree">Título</label>
        <input type="text" class="editable educationInput" id="edu-degree" name="edu-degree" placeholder="Título">

        <div class="period-selector">
          <div class="year-selector">
            <label for="edu-start-year">Desde:</label>
            <select id="edu-start-year" class="editable year-select">
              <option value="">Año</option>
              ${yearOptions}
            </select>
          </div>
          <div class="year-separator">-</div>
          <div class="year-selector">
            <label for="edu-end-year">Hasta:</label>
            <select id="edu-end-year" class="editable year-select">
              <option value="">Año</option>
              ${yearOptions}
              <option value="Presente">Presente</option>
            </select>
          </div>
        </div>

        <button type="button" id="add-education" class="btn btn-primary">
          <i class="fas fa-plus"></i> Añadir
        </button>
      </div>
      <div id="education-list" class="education-list"></div>
    </div>
  `;

  // Agregar estilos personalizados
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .period-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }

    .year-selector {
      display: flex;
      flex-direction: column;
      min-width: 100px;
    }

    .year-select {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      background-color: white;
    }

    .year-separator {
      margin-top: 24px;
      font-weight: bold;
    }
  `;
  document.head.appendChild(styleElement);

  const educationList = document.getElementById("education-list");
  originalValues.forEach((edu, index) => {
    const details = edu.details;
    let degree = "",
      period = "";

    if (details.includes(",")) {
      const parts = details.split(",");
      degree = parts[0].trim();
      period = parts[1].trim();
    }

    const eduItem = document.createElement("div");
    eduItem.className = "education-item-edit";
    eduItem.innerHTML = `
      <div class="education-info">
        <strong>${edu.institution}</strong>
        <span>${degree}, ${period}</span>
      </div>
      <div class="education-actions">
        <button type="button" class="btn-icon remove-education" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <input type="hidden" class="edu-data" data-institution="${edu.institution}" data-degree="${degree}" data-period="${period}">
    `;
    educationList.appendChild(eduItem);
  });

  document.getElementById("add-education").addEventListener("click", () => {
    const institution = document.getElementById("edu-institution").value.trim();
    const degree = document.getElementById("edu-degree").value.trim();
    const startYear = document.getElementById("edu-start-year").value;
    const endYear = document.getElementById("edu-end-year").value;

    // Validación básica
    if (!institution || !degree || !startYear || !endYear) {
      alert("Por favor completa todos los campos");
      return;
    }

    // Formato del período
    const period = `${startYear} - ${endYear}`;

    const eduItem = document.createElement("div");
    eduItem.className = "education-item-edit";
    eduItem.innerHTML = `
      <div class="education-info">
        <strong>${institution}</strong>
        <span>${degree}, ${period}</span>
      </div>
      <div class="education-actions">
        <button type="button" class="btn-icon remove-education" data-index="new">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <input type="hidden" class="edu-data" data-institution="${institution}" data-degree="${degree}" data-period="${period}">
    `;
    educationList.appendChild(eduItem);

    // Limpiar formulario
    document.getElementById("edu-institution").value = "";
    document.getElementById("edu-degree").value = "";
    document.getElementById("edu-start-year").selectedIndex = 0;
    document.getElementById("edu-end-year").selectedIndex = 0;

    setupRemoveEducationButtons();
  });

  setupRemoveEducationButtons();

  // Validación para que el año final no sea menor que el inicial
  document
    .getElementById("edu-start-year")
    .addEventListener("change", function () {
      const startYear = parseInt(this.value);
      const endYearSelect = document.getElementById("edu-end-year");

      if (!isNaN(startYear)) {
        // Reiniciar las opciones del año final
        const endYearOptions = endYearSelect.options;
        let selectedEndYear = endYearSelect.value;

        // Limpiar opciones actuales
        endYearSelect.innerHTML = '<option value="">Año</option>';

        // Agregar solo años válidos (iguales o posteriores al año inicial)
        for (let year = currentYear; year >= startYear; year--) {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = year;
          endYearSelect.appendChild(option);
        }

        // Agregar opción de "Presente"
        const presenteOption = document.createElement("option");
        presenteOption.value = "Presente";
        presenteOption.textContent = "Presente";
        endYearSelect.appendChild(presenteOption);

        // Intentar restablecer la selección anterior si es válida
        if (
          selectedEndYear &&
          (selectedEndYear === "Presente" ||
            parseInt(selectedEndYear) >= startYear)
        ) {
          endYearSelect.value = selectedEndYear;
        }
      }
    });
}
function handleRemoveSpecialty(e) {
  const specialtyItem = e.currentTarget.closest(".specialty-item-edit");
  if (specialtyItem) {
    specialtyItem.remove();
  }
}
function setupRemoveEducationButtons() {
  const removeButtons = document.querySelectorAll(".remove-education");
  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const educationItem = e.target.closest(".education-item-edit");
      if (educationItem) {
        educationItem.remove();
      }
    });
  });
}
function makeFieldsNonEditable() {
  const editableElements = document.querySelectorAll(
    "[contenteditable='true']"
  );
  editableElements.forEach((element) => {
    element.contentEditable = false;
    element.classList.remove("editable");
  });
  const sections = document.querySelectorAll("[data-has-textarea='true']");
  sections.forEach((section) => {
    const textarea = section.querySelector(".editable-textarea");
    const originalElement = document.createElement("p");
    originalElement.id =
      section.querySelector(".editable-textarea").previousElementSibling?.id ||
      "professional-about";
    originalElement.textContent = textarea.value;
    section.replaceChild(originalElement, textarea);
    section.removeAttribute("data-has-textarea");
  });
  restoreSpecialties();
  restoreEducation();
}
function restoreSpecialties() {
  const specialtiesContainer = document.getElementById(
    "professional-specialties"
  );
  if (!specialtiesContainer) return;
  const specialtiesList = document.getElementById("specialties-list");
  if (!specialtiesList) return;
  const specialtyItems = specialtiesList.querySelectorAll(
    ".specialty-item-edit"
  );
  const specialtiesData = [];
  specialtyItems.forEach((item) => {
    const specialtyData = item.querySelector(".specialty-data");
    const specialty = specialtyData.getAttribute("data-specialty");
    specialtiesData.push(specialty);
  });
  specialtiesContainer.innerHTML = "";
  if (specialtiesData.length === 0) {
    const message = document.createElement("p");
    message.textContent =
      "¿En qué eres bueno? ¡Edita tu perfil y cuéntanos tus talentos!";
    specialtiesContainer.appendChild(message);
    return;
  }
  specialtiesData.forEach((specialty) => {
    if (specialty.trim()) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = specialty.trim();
      specialtiesContainer.appendChild(tag);
    }
  });
}
function restoreEducation() {
  const educationContainer = document.getElementById("professional-education");
  if (!educationContainer) return;
  const educationList = document.getElementById("education-list");
  if (!educationList) return;
  const educationItems = educationList.querySelectorAll(".education-item-edit");
  const educationData = [];
  educationItems.forEach((item) => {
    const eduData = item.querySelector(".edu-data");
    const institution = eduData.getAttribute("data-institution");
    const degree = eduData.getAttribute("data-degree");
    const period = eduData.getAttribute("data-period");
    educationData.push({
      institution,
      degree,
      period,
    });
  });
  educationContainer.innerHTML = "";
  educationData.forEach((edu) => {
    const eduItem = document.createElement("div");
    eduItem.className = "education-item";
    const title = document.createElement("h4");
    title.textContent = edu.institution;
    const details = document.createElement("p");
    details.textContent = `${edu.degree}, ${edu.period}`;
    eduItem.appendChild(title);
    eduItem.appendChild(details);
    educationContainer.appendChild(eduItem);
  });
}
async function saveChanges() {
  const updatedData = collectEditedData();
  await saveChangesWithData(updatedData);
}
function collectEditedData() {
  const updatedData = {};
  const locationElement = document.getElementById("professional-location");
  if (locationElement) {
    updatedData["6_Ubicación"] = locationElement.textContent.trim();
  }
  const experienceElement = document.getElementById("professional-experience");
  if (experienceElement) {
    const experienceText = experienceElement.textContent.trim();
    const years = experienceText.match(/^\d+$/);
    if (years) {
      updatedData["8_Años de Experiencia"] = parseInt(years[0], 10);
    }
  }
  const aboutSection = document.querySelector("[data-has-textarea='true']");
  if (aboutSection) {
    const textarea = aboutSection.querySelector(".editable-textarea");
    if (textarea) {
      updatedData["Sobre_Mi"] = textarea.value.trim();
    }
  } else {
    const aboutElement = document.getElementById("professional-about");
    if (aboutElement) {
      updatedData["Sobre_Mi"] = aboutElement.textContent.trim();
    }
  }
  const specialtiesList = document.getElementById("specialties-list");
  if (specialtiesList) {
    const specialtyItems = specialtiesList.querySelectorAll(
      ".specialty-item-edit"
    );
    const specialties = [];
    specialtyItems.forEach((item) => {
      const specialtyData = item.querySelector(".specialty-data");
      if (specialtyData) {
        const specialty = specialtyData.getAttribute("data-specialty");
        if (specialty && specialty.trim()) {
          specialties.push(specialty.trim());
        }
      }
    });
    updatedData["Especialidades"] = specialties.join(", ");
  }
  const educationList = document.getElementById("education-list");
  if (educationList) {
    const educationItems = educationList.querySelectorAll(
      ".education-item-edit"
    );
    const education = [];
    educationItems.forEach((item) => {
      const eduData = item.querySelector(".edu-data");
      if (eduData) {
        const institution = eduData.getAttribute("data-institution") || "";
        const degree = eduData.getAttribute("data-degree") || "";
        const period = eduData.getAttribute("data-period") || "";
        education.push({
          institution,
          degree,
          period,
        });
      }
    });
    updatedData["Educacion"] = JSON.stringify(education);
  }
  return updatedData;
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
        displayMessage("Procesando eliminación de cuenta...", "success");
        deleteUserAccount()
          .then(() => {
            displayMessage("Cuenta eliminada con éxito", "success");
            setTimeout(function () {
              window.location.href = "index.html";
            }, 1000);
          })
          .catch((error) => {
            console.error("Error al eliminar la cuenta:", error);
            displayMessage(
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
const CLOUDINARY_UPLOAD_PRESET = "VivArq"; // Debes crear esto en tu dashboard de Cloudinary
const CLOUDINARY_CLOUD_NAME = "dtrq4auxm"; // Tu cloud name de Cloudinary
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
document.addEventListener("DOMContentLoaded", () => {
  const profileImageInput = document.getElementById("profile-image-input");
  const profileImagePreview = document.getElementById("profile-image-preview");
  const uploadProfileImageBtn = document.getElementById(
    "upload-profile-image-btn"
  );
  const deleteProfileImageBtn = document.getElementById(
    "delete-profile-image-btn"
  );
  const imageUploadSection = document.getElementById(
    "profile-image-upload-section"
  );
  const editProfileImageBtn = document.getElementById("edit-profile-image-btn");
  if (profileImageInput) {
    profileImageInput.disabled = true;
  }
  if (uploadProfileImageBtn) {
    uploadProfileImageBtn.style.display = "block";
  }
  if (deleteProfileImageBtn) {
    deleteProfileImageBtn.style.display = "block";
  }
  if (editProfileImageBtn) {
    editProfileImageBtn.style.display = "block";
  }
  if (imageUploadSection) {
    imageUploadSection.style.display = "none";
  }
  let currentImage = null;
  let imageElement = null;
  let isDragging = false;
  let startPosX = 0;
  let startPosY = 0;
  let imageX = 0;
  let imageY = 0;
  let imageScale = 1;
  let originalImageWidth = 0;
  let originalImageHeight = 0;
  let croppedImageUrl = null;
  let isExistingImageFromCloud = false;
  if (profileImagePreview && profileImagePreview.querySelector("img")) {
    editProfileImageBtn.style.display = "none";
    const existingImage = profileImagePreview.querySelector("img");
    if (existingImage) {
      currentImage = existingImage.src;
      isExistingImageFromCloud =
        !currentImage.startsWith("data:") && !currentImage.startsWith("blob:");
    }
  }
  profileImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!validateFileInput(file)) {
      profileImageInput.value = ""; // Clear the input
      return;
    }
    uploadProfileImageBtn.disabled = false;
    const reader = new FileReader();
    reader.onload = (event) => {
      profileImagePreview.innerHTML = "";
      const previewImg = document.createElement("img");
      previewImg.src = event.target.result;
      previewImg.classList.add("profile-image-preview");
      profileImagePreview.appendChild(previewImg);
      currentImage = event.target.result;
      isExistingImageFromCloud = false;
      editProfileImageBtn.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
  uploadProfileImageBtn.addEventListener("click", async () => {
    event.preventDefault();
    event.stopPropagation();
    const userId = auth.currentUser ? auth.currentUser.uid : "defaultUser";
    let file = profileImageInput.files[0];
    if (!file && !croppedImageUrl && !currentImage) {
      displayMessage("Por favor, seleccione una imagen", "errorMessage");
      return;
    }
    const fileExtension = file ? file.name.split(".").pop() : "png"; // Si no hay archivo, usa PNG por defecto
    let imageToUpload;
    try {
      uploadProfileImageBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
      uploadProfileImageBtn.disabled = true;
      if (croppedImageUrl) {
        const response = await fetch(croppedImageUrl);
        const blob = await response.blob();
        imageToUpload = new File(
          [blob],
          `profileImg-${userId}.${fileExtension}`,
          {
            type: "image/png",
          }
        );
      } else {
        imageToUpload = new File(
          [file],
          `profileImg-${userId}.${fileExtension}`,
          {
            type: file.type,
          }
        );
      }
      const formData = new FormData();
      formData.append("file", imageToUpload);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Error en la subida de imagen");
      }
      const cloudinaryData = await response.json();
      const imageUrl = cloudinaryData.secure_url;
      await saveProfileImageToFirestore(imageUrl);
      displayMessage("Imagen de perfil actualizada con éxito", "success");
      deleteProfileImageBtn.style.display = "inline-block";
      uploadProfileImageBtn.innerHTML =
        '<i class="fas fa-cloud-upload-alt"></i> Subir imagen';
      uploadProfileImageBtn.disabled = false;
      editProfileImageBtn.disabled = false;
      profileImagePreview.innerHTML = "";
      const previewImg = document.createElement("img");
      previewImg.src = imageUrl;
      previewImg.classList.add("profile-image-preview");
      profileImagePreview.appendChild(previewImg);
      currentImage = imageUrl;
      isExistingImageFromCloud = true;
    } catch (error) {
      console.error("Error uploading image:", error);
      displayMessage(
        `Error al subir la imagen: ${error.message}`,
        "errorMessage"
      );
      uploadProfileImageBtn.innerHTML =
        '<i class="fas fa-cloud-upload-alt"></i> Subir imagen';
      uploadProfileImageBtn.disabled = false;
      editProfileImageBtn.disabled = false;
    }
  });
  deleteProfileImageBtn.addEventListener("click", async () => {
    try {
      await removeProfileImageFromFirestore();
      profileImagePreview.innerHTML = `
        <div class="upload-placeholder">Seleccione una imagen de perfil</div>
      `;
      profileImageInput.value = "";
      deleteProfileImageBtn.style.display = "none";
      uploadProfileImageBtn.disabled = true;
      currentImage = null;
      croppedImageUrl = null;
      isExistingImageFromCloud = false;
      displayMessage("Imagen de perfil eliminada con éxito", "success");
    } catch (error) {
      console.error("Error deleting image:", error);
      displayMessage(
        `Error al eliminar la imagen: ${error.message}`,
        "errorMessage"
      );
    }
  });
  function validateFileInput(file) {
    if (!file) {
      displayMessage("Por favor, seleccione una imagen", "errorMessage");
      return false;
    }
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      displayMessage(
        "Por favor, seleccione un archivo de imagen válido (JPG, PNG, GIF)",
        "errorMessage"
      );
      return false;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      displayMessage("La imagen no debe superar los 5MB", "errorMessage");
      return false;
    }
    return true;
  }
  const imageEditorModal = document.getElementById("image-editor-modal");
  const closeModal = document.getElementById("close-modal");
  const cropperArea = document.getElementById("cropper-area");
  const zoomSlider = document.getElementById("zoom-slider");
  const applyBtn = document.getElementById("apply-crop");
  const cancelBtn = document.getElementById("cancel-crop");
  async function getImageFromUrlSafely(url) {
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    try {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
      try {
        const response = await fetch(proxyUrl, {
          method: "GET",
          mode: "cors",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        if (response.ok) {
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        }
      } catch (error) {
        console.log("Error con proxy CORS, usando método alternativo");
      }
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Intentamos usar CORS
        img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL("image/png");
            resolve(dataUrl);
          } catch (e) {
            console.error("CORS issue: ", e);
            displayMessage(
              "La imagen no se puede editar directamente. Por favor, sube una nueva imagen.",
              "errorMessage"
            );
            reject(new Error("Cannot edit remote image due to CORS policy"));
          }
        };
        img.onerror = function () {
          reject(new Error("Failed to load image"));
        };
        img.src =
          url +
          (url.indexOf("?") > -1 ? "&" : "?") +
          "timestamp=" +
          new Date().getTime();
      });
    } catch (error) {
      console.error("Error getting image safely:", error);
      displayMessage(
        "No se puede editar esta imagen debido a restricciones de seguridad. Por favor, sube una nueva imagen.",
        "errorMessage"
      );
      throw error;
    }
  }
  editProfileImageBtn.addEventListener("click", async () => {
    if (!currentImage && profileImagePreview.querySelector("img")) {
      currentImage = profileImagePreview.querySelector("img").src;
      isExistingImageFromCloud =
        !currentImage.startsWith("data:") && !currentImage.startsWith("blob:");
    }
    try {
      if (isExistingImageFromCloud) {
        try {
          const safeImageUrl = await getImageFromUrlSafely(currentImage);
          currentImage = safeImageUrl;
          isExistingImageFromCloud = false;
          openImageEditor();
        } catch (error) {
          console.error("Error preparing image for editing:", error);
          displayMessage(
            "Para editar esta imagen, por favor selecciona un nuevo archivo primero.",
            "errorMessage"
          );
          if (profileImageInput) {
            profileImageInput.disabled = false;
            profileImageInput.click();
          }
          return;
        }
      } else {
        openImageEditor();
      }
    } catch (error) {
      console.error("Error al preparar la edición de imagen:", error);
      displayMessage(
        "Error al preparar la imagen para edición. Intenta subir una nueva imagen.",
        "errorMessage"
      );
    }
  });
  closeModal.addEventListener("click", () => {
    closeImageEditor();
  });
  window.addEventListener("click", (e) => {
    if (e.target === imageEditorModal) {
      closeImageEditor();
    }
  });
  cancelBtn.addEventListener("click", () => {
    closeImageEditor();
  });
  applyBtn.addEventListener("click", () => {
    applyImageChanges();
  });
  function openImageEditor() {
    if (!currentImage) {
      displayMessage("No hay imagen para editar", "errorMessage");
      return;
    }
    cropperArea.innerHTML = "";
    let cropGuide = cropperArea.querySelector(".crop-guide");
    if (!cropGuide) {
      cropGuide = document.createElement("div");
      cropGuide.classList.add("crop-guide");
      cropperArea.appendChild(cropGuide);
    }
    imageElement = document.createElement("img");
    imageElement.src = currentImage;
    imageElement.classList.add("draggable-image");
    imageElement.style.transformOrigin = "0 0"; // Fijar el origen de transformación
    if (isExistingImageFromCloud) {
      imageElement.crossOrigin = "anonymous";
    }
    cropperArea.appendChild(imageElement);
    imageElement.onload = () => {
      originalImageWidth = imageElement.naturalWidth;
      originalImageHeight = imageElement.naturalHeight;
      const containerRect = cropperArea.getBoundingClientRect();
      const guideElement = cropperArea.querySelector(".crop-guide");
      const guideRect = guideElement.getBoundingClientRect();
      const guideSize = guideRect.width;
      const scaleX = guideSize / originalImageWidth;
      const scaleY = guideSize / originalImageHeight;
      const initialScale = Math.max(scaleX, scaleY) * 2; // Factor adicional para asegurar cobertura
      imageScale = initialScale;
      zoomSlider.value = Math.min(Math.round(initialScale * 100), 300);
      imageX = (containerRect.width - originalImageWidth * imageScale) / 2;
      imageY = (containerRect.height - originalImageHeight * imageScale) / 2;
      imageElement.style.transition = "none";
      updateImageTransform();
      setTimeout(() => {
        imageElement.style.transition = "transform 0.2s ease-out";
      }, 50);
    };
    imageElement.onerror = () => {
      displayMessage("Error al cargar la imagen para edición", "errorMessage");
      closeImageEditor();
    };
    imageEditorModal.style.display = "block";
  }
  function updateImageTransform() {
    if (!imageElement) return;
    imageElement.style.transform = `translate3d(${imageX}px, ${imageY}px, 0) scale(${imageScale})`;
  }
  function closeImageEditor() {
    imageEditorModal.style.display = "none";
  }
  function applyImageChanges() {
    try {
      if (isExistingImageFromCloud && !imageElement.complete) {
        displayMessage(
          "La imagen no se ha cargado completamente. Intenta de nuevo.",
          "errorMessage"
        );
        return;
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const canvasSize = 500;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const containerRect = cropperArea.getBoundingClientRect();
      const guideElement = cropperArea.querySelector(".crop-guide");
      const guideRect = guideElement.getBoundingClientRect();
      const guideSize = guideRect.width;
      const guideX = (containerRect.width - guideSize) / 2;
      const guideY = (containerRect.height - guideSize) / 2;
      const cropX = (containerRect.width / 2 - imageX) / imageScale;
      const cropY = (containerRect.height / 2 - imageY) / imageScale;
      const cropSize = guideSize / imageScale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height); // Usar un rectángulo en lugar de círculo
      ctx.clip();
      ctx.drawImage(
        imageElement,
        cropX - cropSize / 2,
        cropY - cropSize / 2,
        cropSize,
        cropSize,
        0,
        0,
        canvasSize,
        canvasSize
      );
      ctx.restore();
      try {
        croppedImageUrl = canvas.toDataURL("image/png");
        profileImagePreview.innerHTML = "";
        const previewImg = document.createElement("img");
        previewImg.src = croppedImageUrl;
        previewImg.classList.add("profile-image-preview");
        profileImagePreview.appendChild(previewImg);
        uploadProfileImageBtn.disabled = false;
        const userId = auth.currentUser ? auth.currentUser.uid : "defaultUser";
        fetch(croppedImageUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const fileName =
              profileImageInput.files && profileImageInput.files[0]
                ? profileImageInput.files[0].name
                : `profile-image-${userId}.png`;
            const fileType = "image/png";
            const croppedFile = new File([blob], fileName, {
              type: fileType,
            });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            profileImageInput.files = dataTransfer.files;
            isExistingImageFromCloud = false;
          });
        closeImageEditor();
      } catch (canvasError) {
        console.error("Error al procesar la imagen (CORS):", canvasError);
        displayMessage(
          "No es posible editar esta imagen debido a restricciones de seguridad. Por favor, sube una nueva imagen desde tu dispositivo.",
          "errorMessage"
        );
        if (profileImageInput) {
          profileImageInput.disabled = false;
          profileImageInput.click();
        }
        closeImageEditor();
      }
    } catch (error) {
      console.error("Error al aplicar cambios:", error);
      displayMessage(
        "Error al procesar la imagen. Por favor, intenta subir una nueva imagen.",
        "errorMessage"
      );
      closeImageEditor();
    }
  }
  zoomSlider.addEventListener("input", (e) => {
    if (!imageElement) return;
    const newScale = e.target.value / 100;
    const containerRect = cropperArea.getBoundingClientRect();
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    const scaleChange = newScale / imageScale;
    const imageCenterX = imageX + (originalImageWidth * imageScale) / 2;
    const imageCenterY = imageY + (originalImageHeight * imageScale) / 2;
    const dx = containerCenterX - imageCenterX;
    const dy = containerCenterY - imageCenterY;
    imageX = imageX + dx - dx * scaleChange;
    imageY = imageY + dy - dy * scaleChange;
    imageScale = newScale;
    updateImageTransform();
  });
  cropperArea.addEventListener("mousedown", startDrag);
  cropperArea.addEventListener("touchstart", startDrag, {
    passive: false,
  });
  function startDrag(e) {
    if (!imageElement) return;
    e.preventDefault(); // Prevenir comportamiento predeterminado
    if (e.type === "touchstart") {
      startPosX = e.touches[0].clientX;
      startPosY = e.touches[0].clientY;
    } else {
      startPosX = e.clientX;
      startPosY = e.clientY;
    }
    isDragging = true;
    imageElement.style.transition = "none";
    document.addEventListener("mousemove", drag);
    document.addEventListener("touchmove", drag, { passive: false });
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
  }
  function drag(e) {
    if (!isDragging || !imageElement) return;
    e.preventDefault(); // Prevenir comportamiento predeterminado
    let currentX, currentY;
    if (e.type === "touchmove") {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }
    const deltaX = currentX - startPosX;
    const deltaY = currentY - startPosY;
    imageX += deltaX;
    imageY += deltaY;
    startPosX = currentX;
    startPosY = currentY;
    updateImageTransform();
  }
  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (imageElement) {
      imageElement.style.transition = "transform 0.1s ease-out";
    }
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("touchmove", drag);
    document.removeEventListener("mouseup", endDrag);
    document.removeEventListener("touchend", endDrag);
  }
  function updateImageTransform() {
    if (!imageElement) return;
    imageElement.style.transform = `translate(${imageX}px, ${imageY}px) scale(${imageScale})`;
  }
});
async function saveProfileImageToFirestore(imageUrl) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("No hay usuario autenticado");
      throw new Error("Usuario no autenticado");
    }
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      "userInfo.profileImageUrl": imageUrl,
    });
    updateProfileImageInUI(imageUrl);
  } catch (error) {
    console.error("Error al guardar la imagen de perfil:", error);
    throw error;
  }
}
async function removeProfileImageFromFirestore() {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("No hay usuario autenticado");
      throw new Error("Usuario no autenticado");
    }
    
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      "userInfo.profileImageUrl": deleteField(), // Usar deleteField() para eliminar el campo
    });
    
    // Actualizar la UI para mostrar el icono por defecto
    if (typeof updateProfileImageInUI === 'function') {
      updateProfileImageInUI(null);
    }
    
  } catch (error) {
    console.error("Error al eliminar la imagen de perfil:", error);
    throw error;
  }
}
function updateProfileImageInUI(imageUrl) {
  const profileImagePreview = document.getElementById("profile-image-preview");
  const deleteProfileImageBtn = document.getElementById(
    "delete-profile-image-btn"
  );
  if (imageUrl) {
    profileImagePreview.innerHTML = "";
    const img = document.createElement("img");
    img.src = imageUrl;
    img.classList.add("profile-image-preview");
    profileImagePreview.appendChild(img);
    deleteProfileImageBtn.style.display = "inline-block";
  } else {
    deleteProfileImageBtn.style.display = "none";
  }
}
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
