import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "./firebase-config.js";
document.addEventListener("DOMContentLoaded", () => {
  const auth = getAuth();
  const db = getFirestore();
  const projectTitle = document.getElementById("project-title");
  const projectTitleBreadcrumb = document.getElementById(
    "project-title-breadcrumb"
  );
  const projectCategory = document.getElementById("project-category");
  const projectLocation = document.getElementById("project-location");
  const projectDate = document.getElementById("project-date");
  const projectActions = document.getElementById("project-actions");
  const mainProjectImage = document.getElementById("main-project-image");
  const thumbnailsContainer = document.getElementById("thumbnails");
  const projectDescriptionContent = document.getElementById(
    "project-description-content"
  );
  const propertyType = document.getElementById("property-type");
  const area = document.getElementById("area");
  const timeframe = document.getElementById("timeframe");
  const budget = document.getElementById("budget");
  const paymentTerms = document.getElementById("payment-terms");
  const projectStatus = document.getElementById("project-status");
  const requirementsList = document.getElementById("requirements-list");
  const technicalDetailsContent = document.getElementById(
    "technical-details-content"
  );
  const referencesList = document.getElementById("references-list");
  const similarProjectsList = document.getElementById("similar-projects-list");
  const applicationSection = document.getElementById("application-section");
  const applicationForm = document.getElementById("application-form");
  const contactModal = document.getElementById("contact-modal");
  const modalContractorName = document.getElementById("modal-contractor-name");
  const contractorName = document.getElementById("contractor-name");
  const contractorPic = document.getElementById("contractor-pic");
  const contractorRating = document.getElementById("contractor-rating");
  const verifiedBadge = document.getElementById("verified-badge");
  const contactBtn = document.getElementById("btn-contact");
  const viewProfileBtn = document.getElementById("btn-view-profile");
  const closeContactModalBtn = document.getElementById("close-contact-modal");
  const cancelContactBtn = document.getElementById("cancel-contact");
  const startChatBtn = document.getElementById("start-chat");
  let projectId = null;
  let projectData = null;
  let currentUser = null;
  let contractorData = null;
  function getProjectIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  }
  function initPage() {
    projectId = getProjectIdFromUrl();
    if (!projectId) {
      showError("No se encontró el ID del proyecto en la URL");
      return;
    }
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      loadProjectData(projectId);
      updateAuthUI();
    });
    if (contactBtn) {
      contactBtn.addEventListener("click", openContactModal);
    }
    if (viewProfileBtn) {
      viewProfileBtn.addEventListener("click", viewContractorProfile);
    }
    if (closeContactModalBtn) {
      closeContactModalBtn.addEventListener("click", closeContactModal);
    }
    if (cancelContactBtn) {
      cancelContactBtn.addEventListener("click", closeContactModal);
    }
    if (startChatBtn) {
      startChatBtn.addEventListener("click", startChat);
    }
    if (applicationForm) {
      applicationForm.addEventListener("submit", handleApplicationSubmit);
    }
    if (thumbnailsContainer) {
      thumbnailsContainer.addEventListener("click", (e) => {
        if (e.target && e.target.tagName === "IMG") {
          mainProjectImage.src = e.target.src;
        }
      });
    }
  }
  async function loadProjectData(projectId) {
    try {
      showLoading();
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        showError("El proyecto no existe o ha sido eliminado");
        window.location.href = "index.html";
        return;
      }
      projectData = projectSnap.data();
      projectData.id = projectSnap.id;
      if (!projectData.userId) {
        console.error("El proyecto no tiene userId asociado");
        contractorData = { displayName: "Usuario Desconocido" };
        updateProjectUI();
        return;
      }
      await loadContractorData(projectData.userId);
      updateProjectUI();
      loadSimilarProjects(projectData.category);
      hideLoading();
    } catch (error) {
      console.error("Error al cargar datos del proyecto:", error);
      showError("Error al cargar datos del proyecto");
    }
  }
  async function loadContractorData(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        contractorData = userSnap.data();
        contractorData.id = userSnap.id;
      } else {
        console.error("No se encontró información del Cliente");
      }
    } catch (error) {
      console.error("Error al cargar datos del Cliente:", error);
    }
  }
  function updateProjectUI() {
    if (projectTitle) projectTitle.textContent = projectData.title;
    if (projectTitleBreadcrumb)
      projectTitleBreadcrumb.textContent = projectData.title;
    if (projectCategory)
      projectCategory.innerHTML = `<i class="fas fa-tag"></i> ${projectData.category}`;
    if (projectLocation)
      projectLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${projectData.location}`;
    if (projectDate && projectData.createdAt) {
      const date = projectData.createdAt.toDate
        ? projectData.createdAt.toDate()
        : new Date(projectData.createdAt);
      const formattedDate = new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
      projectDate.innerHTML = `<i class="far fa-calendar-alt"></i> ${formattedDate}`;
    }
    loadProjectImages();
    if (projectDescriptionContent) {
      projectDescriptionContent.innerHTML = `<p>${
        projectData.description || "No hay descripción disponible"
      }</p>`;
    }
    if (propertyType)
      propertyType.textContent = projectData.propertyType || "No especificado";
    if (area)
      area.textContent = projectData.area
        ? `${projectData.area} m²`
        : "No especificada";
    if (timeframe)
      timeframe.textContent = projectData.timeframe || "No especificado";
    if (budget) {
      const budgetValue =
        projectData.budget || projectData.budgetRange || "No especificado";
      budget.textContent = isNaN(budgetValue)
        ? budgetValue
        : new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(budgetValue);
    }
    if (paymentTerms)
      paymentTerms.textContent = projectData.paymentTerms || "No especificados";
    if (projectStatus) {
      let statusText = "Publicado";
      let statusClass = "status-published";
      if (projectData.status === "draft") {
        statusText = "Borrador";
        statusClass = "status-draft";
      } else if (projectData.status === "assigned") {
        statusText = "Asignado";
        statusClass = "status-assigned";
      } else if (projectData.status === "completed") {
        statusText = "Completado";
        statusClass = "status-completed";
      }
      projectStatus.textContent = statusText;
      projectStatus.className = statusClass;
    }
    if (requirementsList) {
      requirementsList.innerHTML = "";
      if (projectData.requirements && projectData.requirements.length > 0) {
        projectData.requirements.forEach((req) => {
          const li = document.createElement("li");
          li.innerHTML = `<i class="fas fa-check"></i> <span>${req}</span>`;
          requirementsList.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.className = "no-data";
        li.textContent = "No hay requerimientos especiales";
        requirementsList.appendChild(li);
      }
    }
    if (technicalDetailsContent) {
      if (projectData.technicalDetails) {
        technicalDetailsContent.innerHTML = `<p>${projectData.technicalDetails}</p>`;
      } else {
        technicalDetailsContent.innerHTML =
          '<p class="no-data">No hay detalles técnicos adicionales</p>';
      }
    }
    if (referencesList) {
      referencesList.innerHTML = "";
      if (projectData.referenceUrls && projectData.referenceUrls.length > 0) {
        projectData.referenceUrls.forEach((url) => {
          const li = document.createElement("li");
          li.innerHTML = `<a href="${url}" target="_blank"><i class="fas fa-link"></i> ${url}</a>`;
          referencesList.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.className = "no-data";
        li.textContent = "No hay URLs de referencia";
        referencesList.appendChild(li);
      }
    }
    updateContractorUI();
    updateActionButtons();
  }
  function loadProjectImages() {
    if (!mainProjectImage || !thumbnailsContainer) return;
    thumbnailsContainer.innerHTML = "";
    if (projectData.images && projectData.images.length > 0) {
      mainProjectImage.src =
        projectData.images[0].secure_url ||
        "https://placehold.co/600x400?text=No+imagen";
      mainProjectImage.alt = projectData.title;
      projectData.images.forEach((image, index) => {
        const thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        if (index === 0) {
          thumbnail.classList.add("active");
        }
        const img = document.createElement("img");
        img.src = image.secure_url;
        img.alt = `${projectData.title} - Imagen ${index + 1}`;
        thumbnail.addEventListener("click", () => {
          mainProjectImage.src = image.secure_url;
          document.querySelectorAll(".thumbnail").forEach((thumb) => {
            thumb.classList.remove("active");
          });
          thumbnail.classList.add("active");
        });
        thumbnail.appendChild(img);
        thumbnailsContainer.appendChild(thumbnail);
      });
    } else {
      mainProjectImage.src =
        "https://placehold.co/600x400?text=No+hay+imágenes";
      mainProjectImage.alt = "No hay imágenes disponibles";
      const noImagesContainer = document.createElement("div");
      noImagesContainer.style.cssText = `
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background-color: #f0f0f0;
        border-radius: 8px;
        text-align: center;
        grid-column: 1 / -1;
      `;
      noImagesContainer.innerHTML = `
        <div style="font-size: 3rem; color: #888; margin-bottom: 15px;">
          <i class="fas fa-image"></i>
        </div>
        <p style="color: #666; font-size: 1rem;">
          No hay imágenes disponibles para este proyecto
        </p>
      `;
      thumbnailsContainer.appendChild(noImagesContainer);
    }
  }
  let currentImageIndex = 0;
  function initImageModal() {
    if (!document.getElementById("image-modal")) {
      const imageModal = document.createElement("div");
      imageModal.id = "image-modal";
      imageModal.className = "image-modal";
      const modalContent = document.createElement("div");
      modalContent.className = "image-modal-content";
      const modalImg = document.createElement("img");
      modalImg.id = "modal-img";
      const closeBtn = document.createElement("span");
      closeBtn.className = "close-image-modal";
      closeBtn.innerHTML = "&times;";
      const navigationButtons = document.createElement("div");
      navigationButtons.className = "navigation-buttons";
      const prevButton = document.createElement("button");
      prevButton.className = "nav-button prev-button";
      prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevButton.id = "prev-image";
      const nextButton = document.createElement("button");
      nextButton.className = "nav-button next-button";
      nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextButton.id = "next-image";
      navigationButtons.appendChild(prevButton);
      navigationButtons.appendChild(nextButton);
      modalContent.appendChild(modalImg);
      modalContent.appendChild(closeBtn);
      modalContent.appendChild(navigationButtons);
      imageModal.appendChild(modalContent);
      document.body.appendChild(imageModal);
      closeBtn.addEventListener("click", closeImageModal);
      imageModal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeImageModal();
        }
      });
      prevButton.addEventListener("click", showPrevImage);
      nextButton.addEventListener("click", showNextImage);
      document.addEventListener("keydown", function (e) {
        if (!document.getElementById("image-modal").classList.contains("show"))
          return;
        if (e.key === "Escape") {
          closeImageModal();
        } else if (e.key === "ArrowLeft") {
          showPrevImage();
        } else if (e.key === "ArrowRight") {
          showNextImage();
        }
      });
    }
    const mainProjectImage = document.getElementById("main-project-image");
    if (mainProjectImage) {
      mainProjectImage.style.cursor = "pointer";
      mainProjectImage.addEventListener("click", openImageModal);
    }
  }
  function openImageModal() {
    const mainProjectImage = document.getElementById("main-project-image");
    const modalImg = document.getElementById("modal-img");
    if (
      !projectData ||
      !projectData.images ||
      projectData.images.length === 0
    ) {
      return; // No hay imágenes disponibles
    }
    const currentSrc = mainProjectImage.src;
    currentImageIndex = projectData.images.findIndex(
      (img) =>
        img.secure_url === currentSrc || currentSrc.includes(img.secure_url)
    );
    if (currentImageIndex === -1) currentImageIndex = 0;
    modalImg.src = mainProjectImage.src;
    modalImg.alt = mainProjectImage.alt;
    const imageModal = document.getElementById("image-modal");
    imageModal.classList.add("show");
    const prevButton = document.getElementById("prev-image");
    const nextButton = document.getElementById("next-image");
    if (projectData.images.length <= 1) {
      prevButton.style.display = "none";
      nextButton.style.display = "none";
    } else {
      prevButton.style.display = "flex";
      nextButton.style.display = "flex";
    }
    document.body.style.overflow = "hidden";
  }
  function closeImageModal() {
    const imageModal = document.getElementById("image-modal");
    imageModal.classList.remove("show");
    document.body.style.overflow = "";
  }
  function showPrevImage(e) {
    if (e) e.stopPropagation();
    if (!projectData || !projectData.images || projectData.images.length <= 1)
      return;
    currentImageIndex =
      (currentImageIndex - 1 + projectData.images.length) %
      projectData.images.length;
    document.getElementById("modal-img").src =
      projectData.images[currentImageIndex].secure_url;
  }
  function showNextImage(e) {
    if (e) e.stopPropagation();
    if (!projectData || !projectData.images || projectData.images.length <= 1)
      return;
    currentImageIndex = (currentImageIndex + 1) % projectData.images.length;
    document.getElementById("modal-img").src =
      projectData.images[currentImageIndex].secure_url;
  }
  function loadProjectImages() {
    if (!mainProjectImage || !thumbnailsContainer) return;
    thumbnailsContainer.innerHTML = "";
    if (projectData.images && projectData.images.length > 0) {
      mainProjectImage.src =
        projectData.images[0].secure_url ||
        "https://placehold.co/600x400?text=No+imagen";
      mainProjectImage.alt = projectData.title;
      mainProjectImage.style.cursor = "pointer";
      mainProjectImage.style.transition = "transform 0.2s ease";
      mainProjectImage.addEventListener("click", openImageModal);
      projectData.images.forEach((image, index) => {
        const thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        if (index === 0) {
          thumbnail.classList.add("active");
        }
        const img = document.createElement("img");
        img.src = image.secure_url;
        img.alt = `${projectData.title} - Imagen ${index + 1}`;
        thumbnail.addEventListener("click", () => {
          mainProjectImage.src = image.secure_url;
          document.querySelectorAll(".thumbnail").forEach((thumb) => {
            thumb.classList.remove("active");
          });
          thumbnail.classList.add("active");
        });
        thumbnail.appendChild(img);
        thumbnailsContainer.appendChild(thumbnail);
      });
    } else {
      mainProjectImage.src =
        "https://placehold.co/600x400?text=No+hay+imágenes";
      mainProjectImage.alt = "No hay imágenes disponibles";
      const noImagesContainer = document.createElement("div");
      noImagesContainer.style.cssText = `
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background-color: #f0f0f0;
      border-radius: 8px;
      text-align: center;
      grid-column: 1 / -1;
    `;
      noImagesContainer.innerHTML = `
      <div style="font-size: 3rem; color: #888; margin-bottom: 15px;">
        <i class="fas fa-image"></i>
      </div>
      <p style="color: #666; font-size: 1rem;">
        No hay imágenes disponibles para este proyecto
      </p>
    `;
      thumbnailsContainer.appendChild(noImagesContainer);
    }
    initImageModal();
  }
  async function loadStoredImages() {
    try {
      const imagesQuery = query(
        collection(db, "project_images"),
        where("projectId", "==", projectId)
      );
      const imagesSnapshot = await getDocs(imagesQuery);
      const images = [];
      imagesSnapshot.forEach((doc) => {
        images.push(doc.data());
      });
      images.sort((a, b) => a.index - b.index);
      if (images.length > 0) {
        mainProjectImage.src = images[0].dataUrl;
        mainProjectImage.alt = projectData.title;
        images.forEach((image, index) => {
          const thumbnail = document.createElement("div");
          thumbnail.className = "thumbnail";
          const img = document.createElement("img");
          img.src = image.dataUrl;
          img.alt = `${projectData.title} - Imagen ${index + 1}`;
          thumbnail.appendChild(img);
          thumbnailsContainer.appendChild(thumbnail);
        });
      } else {
        mainProjectImage.src =
          "https://placehold.co/600x400?text=No+hay+imágenes";
        mainProjectImage.alt = "No hay imágenes disponibles";
      }
    } catch (error) {
      console.error("Error al cargar imágenes:", error);
      mainProjectImage.src =
        "https://placehold.co/600x400?text=Error+al+cargar+imágenes";
    }
  }
  async function checkContractorProjectCount(userId) {
    if (!userId) {
      console.error("Invalid userId provided");
      return false;
    }
    try {
      const projectsQuery = query(
        collection(db, "projects"),
        where("userId", "==", userId),
        where("status", "==", "published")
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      const publishedProjectsCount = projectsSnapshot.size;
      console.log(
        `Published projects for user ${userId}: ${publishedProjectsCount}`
      );
      return publishedProjectsCount >= 3;
    } catch (error) {
      console.error("Error checking contractor project count:", error);
      console.error("Full error:", JSON.stringify(error, null, 2));
      return false;
    }
  }
  async function updateContractorUI() {
    if (!contractorData) return;
    const userId = contractorData.userId || contractorData.id;
    const userName =
      (contractorData.userInfo &&
        contractorData.userInfo["2_Nombre y Apellido"]) ||
      "[2_Nombre y Apellido]";
    console.log("Nombre a mostrar:", userName);
    console.log("Contractor User ID:", userId);
    const hasMultipleProjects = await checkContractorProjectCount(userId);
    const contractistBadge = document.querySelector(".contratist-badge");
    const verifiedBadge = document.getElementById("verified-badge");
    if (contractistBadge && verifiedBadge) {
      if (hasMultipleProjects) {
        contractistBadge.style.display = "none";
        verifiedBadge.style.display = "inline-flex";
        verifiedBadge.innerHTML = `
          <i class="fas fa-check-circle"></i> Cliente Verificado
        `;
      } else {
        contractistBadge.style.display = "inline-flex";
        verifiedBadge.style.display = "none";
      }
    }
    if (contractorName) contractorName.textContent = userName;
    if (modalContractorName) modalContractorName.textContent = userName;
    if (contractorPic && contractorData.photoURL) {
      contractorPic.src = contractorData.photoURL;
    } else if (contractorPic) {
      contractorPic.src = "https://placehold.co/600x400";
    }
  }
  async function loadContractorData(userId) {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        contractorData = userSnap.data();
        contractorData.id = userSnap.id;
        console.log("Datos del Cliente:", contractorData);
        console.log("Estructura userInfo:", contractorData.userInfo);
        if (contractorData.userInfo) {
          console.log(
            "Nombre encontrado:",
            contractorData.userInfo["2_Nombre y Apellido"]
          );
        } else {
          console.warn("No se encontró la estructura userInfo");
        }
      } else {
        console.error("No se encontró información del Cliente");
      }
    } catch (error) {
      console.error("Error al cargar datos del Cliente:", error);
    }
  }
  async function updateActionButtons() {
    if (!projectActions) return;
    projectActions.innerHTML = "";
    const isOwner = currentUser && currentUser.uid === projectData.userId;
    console.log("Is Owner:", isOwner);
    if (isOwner) {
      const chatAccessBtn = document.createElement("button");
      chatAccessBtn.className = "btn btn-primary";
      chatAccessBtn.innerHTML =
        '<i class="fas fa-comments"></i> Acceder a Chats';
      chatAccessBtn.addEventListener("click", () => {
        window.location.href = `chat.html?project=${projectId}`;
      });
      const shareBtn = document.createElement("button");
      shareBtn.className = "btn btn-outline";
      shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Compartir';
      shareBtn.addEventListener("click", shareProject);
      if (contactBtn) {
        contactBtn.style.display = "none";
      }
      projectActions.appendChild(chatAccessBtn);
      projectActions.appendChild(shareBtn);
    } else if (currentUser) {
      const saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-secondary";
      let isProjectSaved = false;
      if (currentUser) {
        const savedProjectRef = doc(
          db,
          "saved_projects",
          `${currentUser.uid}_${projectId}`
        );
        const savedDoc = await getDoc(savedProjectRef);
        isProjectSaved = savedDoc.exists();
      }
      if (isProjectSaved) {
        saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Guardado';
      } else {
        saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Guardar';
      }
      saveBtn.addEventListener("click", saveProject);
      const shareBtn = document.createElement("button");
      shareBtn.className = "btn btn-outline";
      shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Compartir';
      shareBtn.addEventListener("click", shareProject);
      projectActions.appendChild(saveBtn);
      projectActions.appendChild(shareBtn);
      if (applicationSection) {
        const userRole = localStorage.getItem("userRole");
        const isProfessional = userRole === "professional";
        console.log("Es profesional:", isProfessional);
        applicationSection.style.display = isProfessional ? "none" : "none";
      }
      if (contactBtn) {
        const userRole = localStorage.getItem("userRole");
        const isProfessional = userRole === "professional";
        console.log("Es profesional:", isProfessional);
        contactBtn.style.display = isProfessional ? "block" : "none";
      }
      if (saveBtn) {
        const userRole = localStorage.getItem("userRole");
        const isProfessional = userRole === "professional";
        console.log("Es profesional:", isProfessional);
        saveBtn.style.display = isProfessional ? "block" : "none";
      }
      if (shareBtn) {
        const userRole = localStorage.getItem("userRole");
        const isProfessional = userRole === "professional";
        console.log("Es profesional:", isProfessional);
        shareBtn.style.display = isProfessional ? "block" : "none";
      }
    } else {
      if (contactBtn) {
        contactBtn.style.display = "none";
      }
      if (applicationSection) {
        applicationSection.style.display = "none";
      }
    }
  }
  async function loadSimilarProjects(category) {
    if (!similarProjectsList) return;
    try {
      const similarQuery = query(
        collection(db, "projects"),
        where("category", "==", category),
        where("status", "==", "published"),
        limit(3)
      );
      const querySnapshot = await getDocs(similarQuery);
      const projects = [];
      querySnapshot.forEach((doc) => {
        if (doc.id !== projectId) {
          const data = doc.data();
          projects.push({
            id: doc.id,
            title: data.title,
            location: data.location,
            image:
              data.images && data.images.length > 0
                ? data.images[0].secure_url
                : "https://placehold.co/300x200",
          });
        }
      });
      similarProjectsList.innerHTML = "";
      if (projects.length > 0) {
        projects.forEach((project) => {
          const projectItem = document.createElement("div");
          projectItem.className = "similar-project-item";
          projectItem.innerHTML = `
              <div class="similar-project-image">
                <img src="${project.image}" alt="${project.title}">
              </div>
              <div class="similar-project-info">
                <h4>${project.title}</h4>
                <p><i class="fas fa-map-marker-alt"></i> ${project.location}</p>
                <a href="project-detail.html?id=${project.id}" class="btn-view">Ver Detalles</a>
              </div>
            `;
          similarProjectsList.appendChild(projectItem);
        });
      } else {
        similarProjectsList.innerHTML =
          '<p class="no-data">No hay proyectos similares disponibles</p>';
      }
    } catch (error) {
      console.error("Error al cargar proyectos similares:", error);
      similarProjectsList.innerHTML =
        '<p class="error">Error al cargar proyectos similares</p>';
    }
  }
  function updateAuthUI() {
    if (applicationSection && currentUser) {
      const isProfessional = currentUser.accountType === "professional";
      applicationSection.style.display = isProfessional ? "block" : "none";
    } else if (applicationSection) {
      applicationSection.style.display = "none";
    }
  }
  async function handleApplicationSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      alert("Debe iniciar sesión para aplicar a este proyecto");
      return;
    }
    const message = document.getElementById("application-message").value.trim();
    const proposedBudget = document.getElementById("application-budget").value;
    const proposedTimeframe = document.getElementById(
      "application-timeframe"
    ).value;
    if (!message || !proposedBudget || !proposedTimeframe) {
      alert("Por favor complete todos los campos del formulario");
      return;
    }
    const applyBtn = document.getElementById("btn-apply");
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    try {
      await addDoc(collection(db, "applications"), {
        projectId: projectId,
        projectTitle: projectData.title,
        contractorId: projectData.userId,
        professionalId: currentUser.uid,
        message: message,
        proposedBudget: parseFloat(proposedBudget),
        proposedTimeframe: proposedTimeframe,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      applicationForm.reset();
      alert("Su propuesta ha sido enviada exitosamente");
      applyBtn.disabled = false;
      applyBtn.innerHTML = "Enviar Propuesta";
    } catch (error) {
      console.error("Error al enviar propuesta:", error);
      alert("Error al enviar su propuesta. Por favor intente nuevamente.");
      applyBtn.disabled = false;
      applyBtn.innerHTML = "Enviar Propuesta";
    }
  }
  function confirmDeleteProject() {
    const confirmed = confirm(
      "¿Está seguro de que desea eliminar este proyecto? Esta acción no se puede deshacer."
    );
    if (confirmed) {
      alert("Funcionalidad de eliminación pendiente de implementar");
    }
  }
  function saveProject() {
    if (!currentUser) {
      alert("Debe iniciar sesión para guardar este proyecto");
      return;
    }
    const saveBtn = document.querySelector(".btn-secondary");
    const originalContent = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    const savedProjectRef = doc(
      db,
      "saved_projects",
      `${currentUser.uid}_${projectId}`
    );
    getDoc(savedProjectRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          return deleteDoc(savedProjectRef).then(() => {
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Guardar';
            saveBtn.disabled = false;
            alert("Proyecto eliminado de guardados");
          });
        } else {
          return setDoc(savedProjectRef, {
            userId: currentUser.uid,
            projectId: projectId,
            projectTitle: projectData.title,
            projectCategory: projectData.category,
            projectLocation: projectData.location,
            savedAt: serverTimestamp(),
            thumbnailUrl:
              projectData.images && projectData.images.length > 0
                ? projectData.images[0].secure_url
                : "https://placehold.co/300x200?text=Sin+imagen",
            contractorId: projectData.userId,
          }).then(() => {
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Guardado';
            saveBtn.disabled = false;
            alert("Proyecto guardado exitosamente");
          });
        }
      })
      .catch((error) => {
        console.error("Error al guardar/quitar proyecto:", error);
        saveBtn.innerHTML = originalContent;
        saveBtn.disabled = false;
        alert("Error al procesar su solicitud. Por favor intente nuevamente.");
      });
  }
  function shareProject() {
    const projectUrl = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(projectUrl)
        .then(() => {
          alert("Enlace copiado al portapapeles");
        })
        .catch((err) => {
          console.error("Error al copiar enlace:", err);
          prompt("Copie este enlace para compartir el proyecto:", projectUrl);
        });
    } else {
      prompt("Copie este enlace para compartir el proyecto:", projectUrl);
    }
  }
  function openContactModal() {
    if (contactModal) {
      contactModal.style.display = "flex";
    }
  }
  function closeContactModal() {
    if (contactModal) {
      contactModal.style.display = "none";
    }
  }
  function viewContractorProfile() {
    if (contractorData && contractorData.id) {
      const userRole = contractorData.userInfo["5_Tipo de Cuenta"];
      const currentLoggedUserId = localStorage.getItem("logguedInUserId"); // Obtenemos el ID del usuario logueado
      const isOwnProfile = contractorData.id === currentLoggedUserId;
      const viewingParam = isOwnProfile ? "own" : "other";
      if (userRole === "professional") {
        window.location.href = `profile-professional.html?user=${contractorData.id}&viewing=${viewingParam}`;
      } else {
        window.location.href = `profile-contractor.html?user=${contractorData.id}&viewing=${viewingParam}`;
      }
    } else {
      console.error("No se encontró información del Cliente");
    }
  }
  function startChat() {
    if (!currentUser) {
      alert("Debe iniciar sesión para contactar al Cliente");
      closeContactModal();
      return;
    }
    if (contractorData && contractorData.id) {
      window.location.href = `chat.html?project=${projectId}&with=${contractorData.id}`;
    } else {
      alert("No se pudo iniciar el chat");
      closeContactModal();
    }
  }
  function showLoading() {}
  function hideLoading() {}
  function showError(message) {
    console.error(message);
    alert(message);
  }
  initPage();
});
