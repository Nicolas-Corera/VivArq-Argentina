import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "./firebase-config.js";

const db = getFirestore();

// Constantes para paginación
const PROFESSIONALS_PER_PAGE = 12;
const PROJECTS_PER_PAGE = 12;

// Variables para tracking de elementos visibles para paginación
let lastVisibleProfessional = null;
let lastVisibleProject = null;

// Filtros actuales
let currentProfessionalFilters = {
  specialty: "",
};

let currentProjectFilters = {
  category: "",
  location: "",
  budget: "",
};

// Lista de especialidades predefinidas para profesionales
const PREDEFINED_SPECIALTIES = [
  "Arquitecto",
  "Ingeniero",
  "Constructor",
  "Electricista",
  "Plomero",
  "Gasista",
];

document.addEventListener("DOMContentLoaded", () => {
  // ----------------------
  // SECCIÓN PROFESIONALES
  // ----------------------
  const professionalsGrid = document.getElementById("professionalsGrid");
  const specialtyFilter = document.getElementById("specialtyFilter");
  const applyProfessionalFiltersBtn = document.getElementById("applyFilters");
  const resetProfessionalFiltersBtn = document.getElementById("resetFilters");
  const loadMoreProfessionalsBtn = document.getElementById("loadMoreBtn");
  const loadMoreProfessionalsContainer =
    document.getElementById("loadMoreContainer");
  const professionalLoadingContainer = document.getElementById(
    "professionalsLoading"
  );
  const noProfessionalsMessage = document.getElementById(
    "noProfessionalsMessage"
  );

  // Verificar si estamos en la página de profesionales
  if (professionalsGrid) {
    // Iniciar carga de profesionales
    loadProfessionals(true);

    // Event listeners para filtros de profesionales
    if (applyProfessionalFiltersBtn) {
      applyProfessionalFiltersBtn.addEventListener("click", () => {
        currentProfessionalFilters.specialty = specialtyFilter.value;
        loadProfessionals(true);
      });
    }

    if (resetProfessionalFiltersBtn) {
      resetProfessionalFiltersBtn.addEventListener("click", () => {
        if (specialtyFilter) specialtyFilter.value = "";
        currentProfessionalFilters.specialty = "";
        loadProfessionals(true);
      });
    }

    // Event listener para cargar más profesionales
    if (loadMoreProfessionalsBtn) {
      loadMoreProfessionalsBtn.addEventListener("click", () => {
        loadProfessionals(false);
      });
    }
  }

  // ----------------------
  // SECCIÓN PROYECTOS
  // ----------------------
  const projectsGrid = document.getElementById("projectsGrid");
  const categoryFilter = document.getElementById("categoryFilter");
  const applyProjectFiltersBtn = document.getElementById("applyFilters");
  const resetProjectFiltersBtn = document.getElementById("resetFilters");
  const loadMoreProjectsBtn = document.getElementById("loadMoreBtn");
  const loadMoreProjectsContainer =
    document.getElementById("loadMoreContainer");
  const projectLoadingContainer = document.getElementById("projectsLoading");
  const noProjectsMessage = document.getElementById("noProjectsMessage");

  // Verificar si estamos en la página de proyectos
  if (projectsGrid) {
    // Iniciar carga de proyectos
    loadProjects(true);

    // Event listeners para filtros de proyectos
    if (applyProjectFiltersBtn) {
      applyProjectFiltersBtn.addEventListener("click", () => {
        applyProjectFilters();
      });
    }

    if (resetProjectFiltersBtn) {
      resetProjectFiltersBtn.addEventListener("click", () => {
        resetProjectFilters();
      });
    }

    // Event listener para cargar más proyectos
    if (loadMoreProjectsBtn) {
      loadMoreProjectsBtn.addEventListener("click", () => {
        loadProjects(false);
      });
    }
  }
});

// -------------------------------
// FUNCIONES PARA PROFESIONALES
// -------------------------------

async function loadProfessionals(resetPagination = false) {
  const professionalsGrid = document.getElementById("professionalsGrid");
  const noProfessionalsMessage = document.getElementById(
    "noProfessionalsMessage"
  );
  const professionalsLoading = document.getElementById("professionalsLoading");
  const loadMoreContainer = document.getElementById("loadMoreContainer");

  if (!professionalsGrid) return; // No estamos en la página de profesionales

  // Mostrar indicador de carga
  if (professionalsLoading) professionalsLoading.classList.remove("hidden");
  if (loadMoreContainer) loadMoreContainer.classList.add("hidden");

  // Si estamos reiniciando la paginación, limpiar la cuadrícula y resetear lastVisible
  if (resetPagination) {
    professionalsGrid.innerHTML = "";
    lastVisibleProfessional = null;
  }

  try {
    // Crear la consulta base
    let professionalQuery = collection(db, "users");
    let conditions = [where("userInfo.5_Tipo de Cuenta", "==", "professional")];

    // Aplicar filtros adicionales si existen
    if (currentProfessionalFilters.specialty) {
      if (currentProfessionalFilters.specialty === "Otro") {
        // Para el caso "Otro", necesitamos manejar esto después de la consulta
        // No agregamos condición de filtro aquí
      } else {
        conditions.push(
          where(
            "userInfo.7_Profesión",
            "==",
            currentProfessionalFilters.specialty
          )
        );
      }
    }

    // Construir la consulta
    let baseQuery = query(professionalQuery);

    // Aplicar condiciones
    for (const condition of conditions) {
      baseQuery = query(baseQuery, condition);
    }

    // Ordenar por nombre (o cualquier otro campo que prefieras)
    baseQuery = query(baseQuery, orderBy("userInfo.2_Nombre y Apellido"));

    // Ejecutar la consulta
    const allDocsSnapshot = await getDocs(baseQuery);

    // Filtrar manualmente para el caso "Otro"
    let filteredDocs = allDocsSnapshot.docs;

    if (currentProfessionalFilters.specialty === "Otro") {
      filteredDocs = filteredDocs.filter((doc) => {
        const profession = doc.data().userInfo["7_Profesión"];
        return !PREDEFINED_SPECIALTIES.includes(profession);
      });
    }

    // Gestionar la paginación manualmente
    let pagedDocs;
    if (resetPagination) {
      // Primera página
      pagedDocs = filteredDocs.slice(0, PROFESSIONALS_PER_PAGE);
      lastVisibleProfessional =
        pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1] : null;
    } else {
      // Encontrar el índice del último documento visible
      const lastVisibleIndex = lastVisibleProfessional
        ? filteredDocs.findIndex((doc) => doc.id === lastVisibleProfessional.id)
        : -1;

      // Obtener los siguientes documentos
      pagedDocs = filteredDocs.slice(
        lastVisibleIndex + 1,
        lastVisibleIndex + 1 + PROFESSIONALS_PER_PAGE
      );
      lastVisibleProfessional =
        pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1] : null;
    }

    // Ocultar indicador de carga
    if (professionalsLoading) professionalsLoading.classList.add("hidden");

    // Verificar si hay resultados
    if (pagedDocs.length === 0 && professionalsGrid.innerHTML === "") {
      if (noProfessionalsMessage)
        noProfessionalsMessage.classList.remove("hidden");
      return;
    } else {
      if (noProfessionalsMessage)
        noProfessionalsMessage.classList.add("hidden");
    }

    // Mostrar u ocultar el botón de cargar más
    if (
      pagedDocs.length < PROFESSIONALS_PER_PAGE ||
      (lastVisibleProfessional &&
        filteredDocs.indexOf(lastVisibleProfessional) + 1 >=
          filteredDocs.length)
    ) {
      if (loadMoreContainer) loadMoreContainer.classList.add("hidden");
    } else {
      if (loadMoreContainer) loadMoreContainer.classList.remove("hidden");
    }

    // Renderizar profesionales
    pagedDocs.forEach((doc) => {
      const professional = doc.data();
      const userInfo = professional.userInfo;
      const professionalId = doc.id;

      if (!userInfo) return; // Skip si no hay información de usuario

      const professionalCard = createProfessionalCard(
        professionalId,
        professional
      );
      professionalsGrid.appendChild(professionalCard);
    });
  } catch (error) {
    console.error("Error al cargar profesionales:", error);
    if (professionalsLoading) professionalsLoading.classList.add("hidden");
    professionalsGrid.innerHTML += `
      <div class="error-message">
        <p>Error al cargar profesionales. Por favor, intente nuevamente.</p>
      </div>
    `;
  }
}

function createProfessionalCard(id, professional) {
  const userInfo = professional.userInfo;
  const profession = userInfo["7_Profesión"] || "Profesional";
  const profileImage =
    professional.profilePicture ||
    userInfo.profileImageUrl ||
    getProfileImageByRole(profession);
  const location = userInfo["6_Ubicación"] || "No especificado";
  const experience = userInfo["8_Años de Experiencia"] || "No especificado";

  const card = document.createElement("div");
  card.className = "professional-card";
  card.innerHTML = `
    <div class="professional-image">
      <img src="${profileImage}" alt="${userInfo["2_Nombre y Apellido"]}"
           onerror="this.src='${getProfileImageByRole(profession)}'">
    </div>
    <div class="professional-info">
      <h3>${userInfo["2_Nombre y Apellido"]}</h3>
      <p class="profession">${profession}</p>
      <p class="location"><i class="fas fa-map-marker-alt"></i> ${location}</p>
      <p class="experience"><i class="fas fa-briefcase"></i> ${experience} años de experiencia</p>
      <button class="btn-login" data-id="${id}">Ver Perfil</button>
    </div>
  `;

  // Añadir event listener para ver perfil
  card.querySelector(".btn-login").addEventListener("click", () => {
    viewProfessionalProfile(id);
  });

  return card;
}

function viewProfessionalProfile(professionalId) {
  if (!professionalId) {
    console.error("ID de profesional no proporcionado");
    return;
  }

  const currentLoggedUserId = localStorage.getItem("logguedInUserId");
  const isOwnProfile = professionalId === currentLoggedUserId;
  const viewingParam = isOwnProfile ? "own" : "other";

  window.location.href = `profile-professional.html?user=${professionalId}&viewing=${viewingParam}`;
}

function getProfileImageByRole(profession) {
  const professionImages = {
    Arquitecto:
      "/vivarq/images/ARQUITECTO.jpeg" ||
      "https://placehold.co/600x400?text=Arquitecto",
    Ingeniero:
      "/vivarq/images/ingeniero.jpeg" ||
      "https://placehold.co/600x400?text=Ingeniero",
    Constructor:
      "/vivarq/images/constructor.jpeg" ||
      "https://placehold.co/600x400?text=Constructor",
    Electricista:
      "/vivarq/images/electricista.jpeg" ||
      "https://placehold.co/600x400?text=Electricista",
    Plomero:
      "/vivarq/images/plomero.jpeg" ||
      "https://placehold.co/600x400?text=Plomero",
    Gasista:
      "/vivarq/images/gasista.jpeg" ||
      "https://placehold.co/600x400?text=Gasista",
    default:
      "/vivarq/images/predeterminado.jpeg" ||
      "https://placehold.co/600x400?text=Profesional",
  };

  return professionImages[profession] || professionImages["default"];
}

// -------------------------------
// FUNCIONES PARA PROYECTOS
// -------------------------------

async function loadProjects(isFirstLoad = true) {
  const projectsGrid = document.getElementById("projectsGrid");
  const loadingContainer = document.getElementById("projectsLoading");
  const noProjectsMessage = document.getElementById("noProjectsMessage");
  const loadMoreContainer = document.getElementById("loadMoreContainer");

  if (!projectsGrid) return; // No estamos en la página de proyectos

  if (isFirstLoad) {
    showProjectLoading();
    lastVisibleProject = null;
  }

  try {
    let projectsRef = collection(db, "projects");
    let baseQuery = query(
      projectsRef,
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );

    if (currentProjectFilters.category) {
      baseQuery = query(
        baseQuery,
        where("category", "==", currentProjectFilters.category)
      );
    }

    let finalQuery;
    if (lastVisibleProject && !isFirstLoad) {
      finalQuery = query(
        baseQuery,
        startAfter(lastVisibleProject),
        limit(PROJECTS_PER_PAGE)
      );
    } else {
      finalQuery = query(baseQuery, limit(PROJECTS_PER_PAGE));
    }

    const querySnapshot = await getDocs(finalQuery);

    if (isFirstLoad) {
      projectsGrid.innerHTML = "";
    }

    if (querySnapshot.empty && isFirstLoad) {
      showNoProjectsMessage();
      hideProjectLoading();
      return;
    }

    const docs = querySnapshot.docs;
    if (docs.length > 0) {
      lastVisibleProject = docs[docs.length - 1];
      let filteredDocs = docs;

      if (filteredDocs.length === 0 && isFirstLoad) {
        showNoProjectsMessage();
        return;
      }

      filteredDocs.forEach((doc) => {
        const projectData = doc.data();
        addProjectToGrid(doc.id, projectData);
      });

      if (docs.length < PROJECTS_PER_PAGE) {
        hideLoadMoreProjectsButton();
      } else {
        showLoadMoreProjectsButton();
      }
    } else {
      hideLoadMoreProjectsButton();
    }

    hideProjectLoading();
  } catch (error) {
    console.error("Error al cargar proyectos:", error);
    showProjectErrorMessage();
    hideProjectLoading();
  }
}

function addProjectToGrid(projectId, projectData) {
  const projectsGrid = document.getElementById("projectsGrid");
  if (!projectsGrid) return;

  let projectImage = "https://placehold.co/600x400?text=Sin+Imágen";
  if (
    projectData.images &&
    projectData.images.length > 0 &&
    projectData.images[0].secure_url
  ) {
    projectImage = projectData.images[0].secure_url;
  }

  const projectCard = document.createElement("div");
  projectCard.className = "project-card";
  projectCard.innerHTML = `
      <div class="project-image">
        <img src="${projectImage}" alt="${projectData.title}"
             onerror="this.src='https://placehold.co/600x400?text=Sin+imagen'">
      </div>
      <div class="project-info">
        <h3>${projectData.title}</h3>
        <p class="project-type">${projectData.category || "Sin categoría"}</p>
        <p class="location">
          <i class="fas fa-map-marker-alt"></i> ${
            projectData.location || "Sin ubicación"
          }
        </p>
        <p class="budget">
          <i class="fas fa-dollar-sign"></i> ${
            projectData.budgetRange ||
            projectData.budget ||
            "Presupuesto no especificado"
          }
        </p>
        <button class="btn-login" data-id="${projectId}">
          Ver Detalles
        </button>
      </div>
    `;

  projectCard.querySelector(".btn-login").addEventListener("click", () => {
    window.location.href = `project-detail.html?id=${projectId}`;
  });

  projectsGrid.appendChild(projectCard);
}

function applyProjectFilters() {
  const categoryFilter = document.getElementById("categoryFilter");

  currentProjectFilters = {
    category: categoryFilter ? categoryFilter.value : "",
  };

  loadProjects(true);
}

function resetProjectFilters() {
  const categoryFilter = document.getElementById("categoryFilter");

  if (categoryFilter) categoryFilter.value = "";

  currentProjectFilters = {
    category: "",
  };

  loadProjects(true);
}

function showProjectLoading() {
  const loadingContainer = document.getElementById("projectsLoading");
  const projectsGrid = document.getElementById("projectsGrid");
  const noProjectsMessage = document.getElementById("noProjectsMessage");

  if (loadingContainer) loadingContainer.classList.remove("hidden");
  if (projectsGrid) projectsGrid.classList.add("hidden");
  if (noProjectsMessage) noProjectsMessage.classList.add("hidden");
}

function hideProjectLoading() {
  const loadingContainer = document.getElementById("projectsLoading");
  const projectsGrid = document.getElementById("projectsGrid");

  if (loadingContainer) loadingContainer.classList.add("hidden");
  if (projectsGrid) projectsGrid.classList.remove("hidden");
}

function showNoProjectsMessage() {
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const noProjectsMessage = document.getElementById("noProjectsMessage");
  const projectsGrid = document.getElementById("projectsGrid");

  if (loadMoreContainer) loadMoreContainer.classList.add("hidden");
  if (noProjectsMessage) noProjectsMessage.classList.remove("hidden");
  if (projectsGrid) projectsGrid.classList.add("hidden");
}

function showLoadMoreProjectsButton() {
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  if (loadMoreContainer) loadMoreContainer.classList.remove("hidden");
}

function hideLoadMoreProjectsButton() {
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  if (loadMoreContainer) loadMoreContainer.classList.add("hidden");
}

function showProjectErrorMessage() {
  const projectsGrid = document.getElementById("projectsGrid");
  if (projectsGrid) {
    projectsGrid.innerHTML = `
      <div class="error-message">
        <p>Error al cargar proyectos. Intente nuevamente más tarde.</p>
      </div>
    `;
  }
}

// Exportamos las funciones que podrían ser utilizadas desde otros archivos
export {
  loadProfessionals,
  loadProjects,
  applyProjectFilters as applyFilters,
  resetProjectFilters as resetFilters,
};
