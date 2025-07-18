import {
  auth,
  db,
  collection,
  getDocs,
  onAuthStateChanged,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "./firebase-config.js";
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
let itemsPerPage = 10;
let currentFilter = "all";
let currentSearch = "";
let allCalculations = [];
let calculationToDelete = null;
let proyectos = [];
async function obtenerTodosLosUsuarios() {
  try {
    const usersCollectionRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollectionRef);
    const usersList = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("Lista de usuarios:", usersList);
    return usersList;
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return [];
  }
}
async function obtenerTodosLosProyectos() {
  try {
    const projectsCollectionRef = collection(db, "projects");
    const projectsSnapshot = await getDocs(projectsCollectionRef);
    const projectsList = projectsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("Lista de proyectos:", projectsList);
    proyectos = projectsList;
    return projectsList;
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    return [];
  }
}
async function obtenerTodosLosComputos() {
  try {
    const calculationsCollectionRef = collection(db, "calculations");
    const calculationsSnapshot = await getDocs(calculationsCollectionRef);
    const calculationsList = calculationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("Lista de computos:", calculationsList);
    return calculationsList;
  } catch (error) {
    console.error("Error al obtener computos:", error);
    return [];
  }
}
async function mostrarComputos(calculations, usuarios, proyectos) {
  const taxsContainer = document.getElementById("taxsContainer");
  const nextPageBtn = document.getElementById("nextPage");
  nextPageBtn.disabled = true;
  taxsContainer.innerHTML = "";
  if (calculations.length === 0) {
    taxsContainer.innerHTML = `
          <div class="no-items-message">
            <i class="fas fa-calculator"></i>
            <p>No tienes cómputos disponibles</p>
          </div>
        `;
    return;
  }
  let filteredCalculations = calculations;
  if (currentFilter !== "all") {
    filteredCalculations = filteredCalculations.filter(
      (calc) => calc.status === currentFilter
    );
  }
  if (currentSearch) {
    const searchTerm = currentSearch.toLowerCase();
    filteredCalculations = filteredCalculations.filter((calc) => {
      const title = calc.title || "";
      let clientName = calc.client || "";
      if (!clientName && calc.projectId) {
        const relatedProject = proyectos.find((p) => p.id === calc.projectId);
        if (relatedProject) {
          clientName = relatedProject.clientName || "";
        }
      }
      return (
        title.toLowerCase().includes(searchTerm) ||
        clientName.toLowerCase().includes(searchTerm)
      );
    });
  }
  updatePaginationControls(filteredCalculations.length);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCalculations = filteredCalculations.slice(
    startIndex,
    startIndex + itemsPerPage
  );
  paginatedCalculations.forEach((calculation) => {
    let clientName = "Cliente no especificado";
    let clientId = "";
    if (calculation.clientId) {
      clientId = calculation.clientId;
    } else if (calculation.client && calculation.client.id) {
      clientId = calculation.client.id;
    } else if (typeof calculation.client === "string") {
      clientId = calculation.client;
    }
    if (calculation.client) {
      if (
        typeof calculation.client === "object" &&
        calculation.client !== null
      ) {
        clientName =
          calculation.client.name ||
          calculation.client.nombre ||
          calculation.client.fullName ||
          calculation.client.nombreCompleto ||
          JSON.stringify(calculation.client);
      } else {
        clientName = calculation.client;
      }
    }
    let projectId = "";
    let projectTitle = calculation.project?.title || "Proyecto no especificado";
    if (calculation.projectId) {
      projectId = calculation.projectId;
      const relatedProject = proyectos.find(
        (p) => p.id === calculation.projectId
      );
      if (relatedProject) {
        projectTitle =
          relatedProject.title ||
          relatedProject.nombre ||
          "Proyecto sin nombre";
        if (!clientId) {
          if (relatedProject.clientId) {
            clientId = relatedProject.clientId;
          } else if (relatedProject.client && relatedProject.client.id) {
            clientId = relatedProject.client.id;
          } else if (typeof relatedProject.client === "string") {
            clientId = relatedProject.client;
          }
        }
        if (
          clientName === "Cliente no especificado" &&
          relatedProject.clientName
        ) {
          if (typeof relatedProject.clientName === "object") {
            clientName =
              relatedProject.clientName.name ||
              relatedProject.clientName.nombre ||
              relatedProject.clientName.fullName ||
              JSON.stringify(relatedProject.clientName);
          } else {
            clientName = relatedProject.clientName;
          }
        }
      }
    } else if (calculation.project && calculation.project.id) {
      projectId = calculation.project.id;
      projectTitle =
        calculation.project.title ||
        calculation.project.nombre ||
        "Proyecto sin nombre";
    } else if (calculation.project) {
      projectId = calculation.project;
    }
    let professionalId = "";
    if (calculation.professionalId) {
      professionalId = calculation.professionalId;
    } else if (calculation.professional && calculation.professional.id) {
      professionalId = calculation.professional.id;
    } else if (calculation.professional) {
      professionalId = calculation.professional;
    } else if (calculation.userId) {
      professionalId = calculation.userId;
    }
    const date = calculation.createdAt
      ? new Date(calculation.createdAt.seconds * 1000)
      : new Date();
    const formattedDate = date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const status = calculation.status || "draft";
    const statusText = status === "completed" ? "Completo" : "Borrador";
    const statusClass =
      status === "completed" ? "status-completed" : "status-draft";
    const calculationElement = document.createElement("div");
    calculationElement.className = "taxs-item";
    calculationElement.innerHTML = `
          <div class="taxs-name">${clientName}</div>
          <div class="taxs-project">${projectTitle}</div>
          <div class="taxs-date">${formattedDate}</div>
          <div class="taxs-status">
            <span class="${statusClass}">${statusText}</span>
          </div>
          <div class="taxs-item-actions">
            <button class="view-btn ${status === "completed" ? "" : "hidden"}"
              data-id="${calculation.id}"
              title="Ver"
              id="viewBtn">
              <i class="fas fa-eye"></i>
            </button>
            <button class="edit-btn ${status === "draft" ? "" : "hidden"}"
              data-id="${calculation.id}"
              title="Editar"
              id="editBtn">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn"
              data-id="${calculation.id}"
              title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
    taxsContainer.appendChild(calculationElement);
  });
  addActionButtonListeners();
}
function updatePaginationControls(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;
}
function addActionButtonListeners() {
  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const calculationId = e.currentTarget.getAttribute("data-id");
      redirectToCalculator(calculationId, "completed");
    });
  });
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const calculationId = e.currentTarget.getAttribute("data-id");
      redirectToCalculator(calculationId, "edit");
    });
  });
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      calculationToDelete = e.currentTarget.getAttribute("data-id");
      showDeleteModal();
    });
  });
}
async function redirectToCalculator(calculationId, mode) {
  try {
    const calculation = allCalculations.find(
      (calc) => calc.id === calculationId
    );
    if (!calculation) {
      console.error("No se encontró el cálculo con ID:", calculationId);
      showNotification("Cálculo no encontrado", "error");
      return;
    }
    console.log(
      `${mode === "edit" ? "Editando" : "Viendo"} cálculo:`,
      calculationId
    );
    console.log("Datos del cálculo:", calculation);
    let clientId = "";
    let projectId = "";
    let professionalId = calculation.userId || calculation.professionalId || "";
    if (calculation.client && typeof calculation.client === "object") {
      console.log("Contenido de calculation.client:", calculation.client);
      if (calculation.client.email) {
        const usuarios = await obtenerTodosLosUsuarios();
        const clienteEncontrado = usuarios.find(
          (u) => u.email === calculation.client.email
        );
        if (clienteEncontrado) {
          clientId = clienteEncontrado.id;
          console.log("ID de cliente encontrado por email:", clientId);
        }
      }
      if (!clientId && calculation.client.name) {
        const usuarios = await obtenerTodosLosUsuarios();
        const clienteEncontrado = usuarios.find(
          (u) =>
            u.name === calculation.client.name ||
            u.fullName === calculation.client.name ||
            u["2_Nombre y Apellido"] === calculation.client.name
        );
        if (clienteEncontrado) {
          clientId = clienteEncontrado.id;
          console.log("ID de cliente encontrado por nombre:", clientId);
        }
      }
    }
    if (calculation.project && typeof calculation.project === "object") {
      console.log("Contenido de calculation.project:", calculation.project);
      if (calculation.project.title) {
        const proyectoEncontrado = proyectos.find(
          (p) => p.title === calculation.project.title
        );
        if (proyectoEncontrado) {
          projectId = proyectoEncontrado.id;
          console.log("ID de proyecto encontrado por título:", projectId);
          if (!clientId && proyectoEncontrado.userId) {
            clientId = proyectoEncontrado.userId;
            console.log("ID de cliente obtenido del proyecto:", clientId);
          }
        }
      }
    }
    if (!clientId && calculation.clientId) {
      clientId = calculation.clientId;
    }
    if (!projectId && calculation.projectId) {
      projectId = calculation.projectId;
    }
    projectId = String(projectId || "");
    clientId = String(clientId || "");
    professionalId = String(professionalId || "");
    console.log("IDs finales para la URL:", {
      calculationId,
      projectId,
      clientId,
      professionalId,
      mode,
    });
    const urlParams = new URLSearchParams();
    if (clientId) urlParams.append("id", clientId);
    if (projectId) urlParams.append("project", projectId);
    if (professionalId) urlParams.append("professional", professionalId);
    urlParams.append(mode, calculationId); // 'edit' o 'completed'
    const url = `tax-calculator.html?${urlParams.toString()}`;
    console.log("Redirigiendo a:", url);
    window.location.href = url;
  } catch (error) {
    console.error("Error al redirigir al calculador:", error);
    showNotification("Error al abrir el cómputo", "error");
  }
}
function showDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function hideDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}
async function deleteCalculation(calculationId) {
  try {
    await deleteDoc(doc(db, "calculations", calculationId));
    console.log("Cómputo eliminado con éxito");
    allCalculations = allCalculations.filter(
      (calc) => calc.id !== calculationId
    );
    const usuarios = await obtenerTodosLosUsuarios();
    const proyectos = await obtenerTodosLosProyectos();
    mostrarComputos(allCalculations, usuarios, proyectos);
    showNotification("Cómputo eliminado correctamente", "success");
  } catch (error) {
    console.error("Error al eliminar el cómputo:", error);
    showNotification("Error al eliminar el cómputo", "error");
  }
}
function showNotification(message, type = "info") {
  let notification = document.querySelector(".notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.className = "notification";
    document.body.appendChild(notification);
  }
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}
function initEventListeners() {
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadCalculationsWithFilters();
  });
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    currentPage = 1;
    loadCalculationsWithFilters();
  });
  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadCalculationsWithFilters();
    }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    currentPage++;
    loadCalculationsWithFilters();
  });
  document
    .querySelector(".close-modal-computo")
    .addEventListener("click", hideDeleteModal);
  document
    .getElementById("cancelDelete")
    .addEventListener("click", hideDeleteModal);
  document.getElementById("confirmDelete").addEventListener("click", () => {
    if (calculationToDelete) {
      deleteCalculation(calculationToDelete);
      hideDeleteModal();
      calculationToDelete = null;
    }
  });
}
async function loadCalculationsWithFilters() {
  const usuarios = await obtenerTodosLosUsuarios();
  const proyectos = await obtenerTodosLosProyectos();
  mostrarComputos(allCalculations, usuarios, proyectos);
}
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.email);
    document.getElementById("taxsContainer").innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Cargando cómputos...</p>
        </div>
      `;
    const usuarios = await obtenerTodosLosUsuarios();
    const proyectos = await obtenerTodosLosProyectos();
    allCalculations = await obtenerTodosLosComputos();
    mostrarComputos(allCalculations, usuarios, proyectos);
    initEventListeners();
  } else {
    console.log("No hay usuario autenticado");
    window.location.href = "login.html";
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("deleteModal");
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      hideDeleteModal();
    }
  });
});
