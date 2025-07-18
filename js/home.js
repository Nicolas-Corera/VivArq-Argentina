import { getAuth, onAuthStateChanged, signOut } from "./firebase-config.js";
import {
  getFirestore,
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "./firebase-config.js";
import { updateProcessSection } from "./process-section.js";
import { countAllUnreadMessages } from "./unread-messages-tracker.js";
const authButtons = document.getElementById("authButtons");
const userMenu = document.getElementById("userMenu");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const accountTypeProfile = document.getElementById("accountTypeProfile");
const profileLink = document.getElementById("accountLink");
const messagesLink = document.getElementById("messagesLink");
const logoutBtn = document.getElementById("logoutBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const defaultProfileImageURL = "https://placehold.co/600x400?text=Sin+Imágen"; //placehold.co/600x400?text=Sin+Imágen"
const auth = getAuth();
const db = getFirestore();
if (userMenu) {
  userMenu.classList.add("hidden");
}
if (authButtons) {
  authButtons.innerHTML = '<div class="loading">Cargando...</div>';
}
function redirectToProfile() {
  const userId = localStorage.getItem("logguedInUserId");
  const userRole = localStorage.getItem("userRole");
  const timestamp = Date.now();
  console.log("Función redirectToProfile llamada.");
  console.log("ID de usuario:", userId);
  console.log("Rol del usuario:", userRole);
  if (!userId || !userRole) {
    console.error("Datos de usuario incompletos en localStorage");
    window.location.href = "login.html";
    return;
  }
  if (userRole === "professional") {
    console.log("Redirigiendo a profile-professional.html");
    window.location.href = `profile-professional.html?id=${userId}`;
  } else {
    console.log("Redirigiendo a profile-contractor.html");
    window.location.href = `profile-contractor.html?id=${userId}`;
  }
}
window.redirectToProfile = redirectToProfile;
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const logguedInUserId = user.uid;
    localStorage.setItem("logguedInUserId", logguedInUserId);
    if (logguedInUserId) {
      const docRef = doc(db, "users", logguedInUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const userInfo = userData.userInfo;
        const profilePictureURL =
          userInfo?.profileImageUrl || userData.profilePicture || null;
        const accountType = userInfo
          ? userInfo["5_Tipo de Cuenta"]
          : "contractor";
        localStorage.setItem("userRole", accountType);
        console.log("Tipo de cuenta detectado:", accountType);
        if (authButtons) {
          authButtons.innerHTML = "";
          authButtons.classList.add("hidden");
        }
        if (userMenu) {
          userMenu.classList.remove("hidden");
        }
        if (userAvatar) {
          userAvatar.src = profilePictureURL;
          userAvatar.onerror = () => {
            userAvatar.src = defaultProfileImageURL;
          };
        }
        if (userName && userInfo) {
          userName.textContent = userInfo["2_Nombre y Apellido"] || "Usuario";
        }
        if (accountTypeProfile) {
          const userId = localStorage.getItem("logguedInUserId");
          const userRole = localStorage.getItem("userRole");
          if (userId) {
            const docRef = doc(db, "users", userId);
            getDoc(docRef)
              .then((docSnap) => {
                if (docSnap.exists()) {
                  const userData = docSnap.data();
                  const userInfo = userData.userInfo;
                  if (userInfo) {
                    if (
                      userRole === "professional" &&
                      userInfo["7_Profesión"]
                    ) {
                      accountTypeProfile.textContent = userInfo["7_Profesión"];
                    } else if (userRole === "contractor") {
                      accountTypeProfile.textContent = "Cliente";
                    } else {
                      accountTypeProfile.textContent =
                        userInfo["5_Tipo de Cuenta"] === "professional"
                          ? userInfo["7_Profesión"] || "Profesional"
                          : "Cliente";
                    }
                  }
                }
              })
              .catch((error) => {
                console.error("Error al obtener datos del usuario:", error);
                accountTypeProfile.textContent =
                  userRole === "professional" ? "Profesional" : "Cliente";
              });
          } else {
            accountTypeProfile.textContent = "Usuario";
          }
        }
        updateHeaderAvatar(profilePictureURL);
        if (profileLink) {
          profileLink.onclick = null;
          profileLink.addEventListener("click", function (e) {
            e.preventDefault();
            redirectToProfile();
          });
        }
      } else {
        console.log("No se encontraron los documentos del usuario.");
        if (authButtons) {
          authButtons.innerHTML = `
            <a href="login.html" class="btn btn-login">Acceder</a>
          `;
          authButtons.classList.remove("hidden");
        }
        if (userMenu) {
          userMenu.classList.add("hidden");
        }
      }
    } else {
      console.log("ID del usuario no encontrado en localStorage");
      if (authButtons) {
        authButtons.innerHTML = `
          <a href="login.html" class="btn btn-login">Acceder</a>
        `;
        authButtons.classList.remove("hidden");
      }
      if (userMenu) {
        userMenu.classList.add("hidden");
      }
    }
  } else {
    if (authButtons) {
      authButtons.innerHTML = `
        <a href="login.html" class="btn btn-login">Acceder</a>
      `;
      authButtons.classList.remove("hidden");
    }
    if (userMenu) {
      userMenu.classList.add("hidden");
    }
    updateHeaderAvatar(null);
  }
});
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => {
        localStorage.removeItem("userRole");
        localStorage.removeItem("logguedInUserId");
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error.message);
      });
  });
}
function updateHeaderAvatar(imageUrl) {
  const userAvatar = document.getElementById("userAvatar");
  const defaultIcon = document.getElementById("defaultIcon");
  if (userAvatar && defaultIcon) {
    if (imageUrl) {
      userAvatar.src = imageUrl;
      userAvatar.style.display = "block";
      defaultIcon.style.display = "none";
      userAvatar.onerror = () => {
        userAvatar.style.display = "none";
        defaultIcon.style.display = "block";
      };
    } else {
      userAvatar.style.display = "none";
      defaultIcon.style.display = "block";
    }
  }
}
function updateProfileImageInUI(imageUrl) {
  updateHeaderAvatar(imageUrl);
  console.log("Imagen de perfil actualizada en la UI:", imageUrl);
}
window.updateProfileImageInUI = updateProfileImageInUI;
window.updateHeaderAvatar = updateHeaderAvatar;
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
const loadFeaturedProfessionals = async () => {
  const featuredProfessionalsContainer = document.getElementById(
    "featuredProfessionals"
  );
  if (featuredProfessionalsContainer) {
    featuredProfessionalsContainer.innerHTML =
      '<div class="loading">Cargando profesionales...</div>';
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("userInfo.5_Tipo de Cuenta", "==", "professional")
      );
      const querySnapshot = await getDocs(q);
      featuredProfessionalsContainer.innerHTML = "";
      if (querySnapshot.empty) {
        featuredProfessionalsContainer.innerHTML = `
       <div class="empty-results">
        <div class="empty-results-icon-x">
          <i class="fas fa-x"></i>
        </div>
          <h3>NO HAY PROFESIONALES REGISTRADOS EN ESTE MOMENTO.</h3>
      </div>
      `;
        featuredProfessionalsContainer.style.gridTemplateColumns = "auto";
        return;
      }
      querySnapshot.forEach((doc) => {
        const professionalData = doc.data();
        const userInfo = professionalData.userInfo;
        const profession = userInfo["7_Profesión"] || "default";
        let profileImage =
          professionalData.profilePicture ||
          userInfo.profileImageUrl ||
          getProfileImageByRole(profession);
        const professionalCard = document.createElement("div");
        professionalCard.className = "professional-card";
        professionalCard.innerHTML = `
          <div class="professional-image">
            <img src="${profileImage}" alt="${
          userInfo["2_Nombre y Apellido"]
        }" onerror="this.src='${getProfileImageByRole(profession)}'">
          </div>
          <div class="professional-info">
            <h3>${userInfo["2_Nombre y Apellido"]}</h3>
            <p class="profession">${
              userInfo["7_Profesión"] || "Profesional"
            }</p>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${
              userInfo["6_Ubicación"]
            }</p>
          </div>
        `;
        professionalCard.addEventListener("click", () => {
          viewProfessionalProfile(doc.id);
        });
        featuredProfessionalsContainer.appendChild(professionalCard);
      });
    } catch (error) {
      console.error("Error al cargar profesionales:", error);
      featuredProfessionalsContainer.innerHTML = `
        <div class="error-message">
          <p>Error al cargar profesionales. Intente nuevamente más tarde.</p>
        </div>
      `;
    }
  }
};
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
const loadFeaturedProjects = async () => {
  const featuredProjectsContainer = document.getElementById("featuredProjects");
  if (featuredProjectsContainer) {
    featuredProjectsContainer.innerHTML =
      '<div class="loading">Cargando proyectos...</div>';
    try {
      const projectsRef = collection(db, "projects");
      const q = query(
        projectsRef,
        where("status", "==", "published"),
        orderBy("createdAt", "desc"),
        limit(3)
      );
      const querySnapshot = await getDocs(q);
      featuredProjectsContainer.innerHTML = "";
      if (querySnapshot.empty) {
        featuredProjectsContainer.innerHTML = `
       <div class="empty-results">
        <div class="empty-results-icon-x">
          <i class="fas fa-x"></i>
        </div>
        <h3>NO HAY PROYECTOS PUBLICADOS EN ESTE MOMENTO.</h3>
      </div>
        `;
        featuredProjectsContainer.style.gridTemplateColumns = "auto";
        return;
      }
      querySnapshot.forEach((doc) => {
        const projectData = doc.data();
        let projectImage = "https://placehold.co/600x400?text=Sin+Imágen";
        if (projectData.images && projectData.images.length > 0) {
          if (projectData.images[0].secure_url) {
            projectImage = projectData.images[0].secure_url;
          }
        }
        const projectCard = document.createElement("div");
        projectCard.className = "project-card";
        projectCard.innerHTML = `
          <div class="project-image">
            <img src="${projectImage}" alt="${projectData.title}">
          </div>
          <div class="project-info">
            <h3>${projectData.title}</h3>
            <p class="project-type">${
              projectData.category || "Sin categoría"
            }</p>
            <p class="location"><i class="fas fa-map-marker-alt"></i> ${
              projectData.location || "Sin ubicación"
            }</p>
            <p class="budget"><i class="fas fa-dollar-sign"></i> ${
              projectData.budgetRange ||
              projectData.budget ||
              "Presupuesto no especificado"
            }</p>
          <button class="view-project-btn" data-id="${doc.id}">
            Ver Detalles
          </button>
          </div>
        `;
        projectCard.addEventListener("click", () => {
          window.location.href = `project-detail.html?id=${doc.id}`;
        });
        featuredProjectsContainer.appendChild(projectCard);
      });
    } catch (error) {
      console.error("Error al cargar proyectos:", error);
      featuredProjectsContainer.innerHTML = `
        <div class="error-message">
          <p>Error al cargar proyectos. Intente nuevamente más tarde.</p>
        </div>
      `;
    }
  }
};
const loadTestimonials = () => {
  const testimonialsContainer = document.getElementById("testimonials");
  if (testimonialsContainer) {
    const testimonials = [
      {
        name: "Laura Martínez",
        role: "Propietaria",
        text: "Encontré al arquitecto perfecto para mi proyecto de reforma. El proceso fue rápido y sencillo, ¡y el resultado excepcional!",
        image: "https://placehold.co/600x400?text=Sin+Imágen",
      },
      {
        name: "Roberto Sánchez",
        role: "Arquitecto",
        text: "Gracias a VivArq he podido conectar con clientes que realmente valoran mi trabajo y me han permitido crecer profesionalmente.",
        image: "https://placehold.co/600x400?text=Sin+Imágen",
      },
      {
        name: "Claudia Torres",
        role: "Constructora",
        text: "La plataforma me ha permitido expandir mi negocio y encontrar proyectos interesantes en diferentes localidades.",
        image: "https://placehold.co/600x400?text=Sin+Imágen",
      },
    ];
    testimonials.forEach((testimonial) => {
      const testimonialCard = document.createElement("div");
      testimonialCard.className = "testimonial-card";
      testimonialCard.innerHTML = `
        <div class="testimonial-content">
          <p>${testimonial.text}</p>
        </div>
        <div class="testimonial-author">
          <img src="${testimonial.image}" alt="${testimonial.name}">
          <div>
            <h4>${testimonial.name}</h4>
            <p>${testimonial.role}</p>
          </div>
        </div>
      `;
      testimonialsContainer.appendChild(testimonialCard);
    });
  }
};
function setupSearchTabs() {
  console.log("Setting up search tabs");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const searchForms = document.querySelectorAll(".search-form");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      console.log(`Tab clicked: ${button.getAttribute("data-tab")}`);
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      searchForms.forEach((form) => form.classList.add("hidden"));
      const tabId = button.getAttribute("data-tab");
      const formToShow = document.getElementById(`${tabId}Search`);
      if (formToShow) {
        formToShow.classList.remove("hidden");
      } else {
        console.warn(`Form not found for tab: ${tabId}`);
      }
    });
  });
}
function resetProfessionalsFilter() {
  const professionFilter = document.getElementById("professionFilter");
  if (professionFilter) {
    professionFilter.selectedIndex = 0;
  }
  const resultsContainer = document.getElementById("searchResults");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="empty-results">
        <div class="empty-results-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>AQUÍ APARECERÁN LOS RESULTADOS DE LAS BÚSQUEDAS</h3>
        <p>
          Utiliza los filtros de arriba para encontrar profesionales o proyectos
        </p>
      </div>`;
    resultsContainer.style.gridTemplateColumns = "auto";
  }
}
function resetProjectsFilter() {
  const projectTypeFilter = document.getElementById("projectTypeFilter");
  if (projectTypeFilter) {
    projectTypeFilter.selectedIndex = 0;
  }
  const resultsContainer = document.getElementById("searchResults");
  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div class="empty-results">
        <div class="empty-results-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>AQUÍ APARECERÁN LOS RESULTADOS DE LAS BÚSQUEDAS</h3>
        <p>
          Utiliza los filtros de arriba para encontrar profesionales o proyectos
        </p>
      </div>`;
    resultsContainer.style.gridTemplateColumns = "auto";
  }
}
document.addEventListener("DOMContentLoaded", () => {
  loadFeaturedProfessionals();
  loadFeaturedProjects();
  loadTestimonials();
  setupSearchTabs();
  countAllUnreadMessages();
  setupSearchButtonsControl();
  const processContainer = document.querySelector(".process-container");
  if (processContainer) {
    updateProcessSection();
  }
  const professionalSearchBtn = document.querySelector(
    "#professionalsSearch .search-btn"
  );
  const projectSearchBtn = document.querySelector(
    "#projectsSearch .search-btn"
  );
  if (professionalSearchBtn) {
    professionalSearchBtn.addEventListener("click", searchProfessionals);
  }
  if (projectSearchBtn) {
    projectSearchBtn.addEventListener("click", searchProjects);
  }
  const resetProfessionalsBtn = document.getElementById(
    "resetProfessionalsFilter"
  );
  const resetProjectsBtn = document.getElementById("resetProjectsFilter");
  if (resetProfessionalsBtn) {
    resetProfessionalsBtn.addEventListener("click", resetProfessionalsFilter);
  }
  if (resetProjectsBtn) {
    resetProjectsBtn.addEventListener("click", resetProjectsFilter);
  }
});
async function searchProfessionals() {
  const professionalSearchBtn = document.querySelector(
    "#professionalsSearch .search-btn"
  );
  const profession = document.getElementById("professionFilter").value;
  const otherInput = document.getElementById("otherProfessionInput");
  const selectedProfessionText =
    profession === "Otro" && otherInput && otherInput.value.trim() !== ""
      ? otherInput.value.trim()
      : profession;
  const usersRef = collection(db, "users");
  const standardProfessions = [
    "Arquitecto",
    "Ingeniero",
    "Constructor",
    "Electricista",
    "Plomero",
    "Gasista",
  ];
  professionalSearchBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>Buscando`;
  professionalSearchBtn.disabled = true;
  try {
    let q = query(
      usersRef,
      where("userInfo.5_Tipo de Cuenta", "==", "professional")
    );
    if (profession && profession !== "") {
      if (profession === "Otro") {
        q = query(
          q,
          where("userInfo.7_Profesión", "not-in", standardProfessions)
        );
      } else {
        q = query(q, where("userInfo.7_Profesión", "==", profession));
      }
    }
    const querySnapshot = await getDocs(q);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = "";
    professionalSearchBtn.innerHTML = `<i class="fas fa-search"></i>Buscar`;
    professionalSearchBtn.disabled = false;
    const userInfo = querySnapshot.docs[0]?.data()?.userInfo || {};
    if (querySnapshot.empty) {
      resultsContainer.innerHTML = `
       <div class="empty-results">
        <div class="empty-results-icon-x">
          <i class="fas fa-x"></i>
        </div>
        <h3>NO SE ENCONTRARON PROFESIONALES QUE COINCIDAN CON LOS FILTROS.</h3>
        <p style="color: black;">
        <strong>"${selectedProfessionText}"</strong>
        </p>
      </div>
      `;
      resultsContainer.style.gridTemplateColumns = "auto";
      return;
    }
    querySnapshot.forEach((doc) => {
      const professionalData = doc.data();
      const userInfo = professionalData.userInfo;
      const profession = userInfo["7_Profesión"] || "default";
      const profileImage =
        professionalData.profilePicture ||
        userInfo.profileImageUrl ||
        getProfileImageByRole(profession);
      const resultCard = document.createElement("div");
      resultCard.className = "professional-card";
      resultCard.innerHTML = `
        <div class="professional-image">
          <img src="${profileImage}" alt="${userInfo["2_Nombre y Apellido"]}"
               onerror="this.src='${getProfileImageByRole(profession)}">
        </div>
        <div class="professional-info">
          <h3>${userInfo["2_Nombre y Apellido"]}</h3>
          <p class="profession">
            ${userInfo["7_Profesión"] || "Otra Profesión"}
          </p>
          <p class="location">
            <i class="fas fa-map-marker-alt"></i> ${userInfo["6_Ubicación"]}
          </p>
          <p class="experience">
            <i class="fas fa-briefcase"></i>
            ${
              userInfo["8_Años de Experiencia"] || "No especificado"
            } años de experiencia
          </p>
          <button class="view-profile-btn" data-id="${doc.id}">
            Ver Perfil
          </button>
        </div>
      `;
      resultCard
        .querySelector(".view-profile-btn")
        .addEventListener("click", () => {
          viewProfessionalProfile(doc.id);
        });
      resultsContainer.appendChild(resultCard);
      resultsContainer.style.gridTemplateColumns =
        "repeat(auto-fill, minmax(250px, 1fr))";
    });
  } catch (error) {
    console.error("Error al buscar profesionales:", error);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = `
      <div class="error-message">
        <p>Error al realizar la búsqueda. Intente nuevamente.</p>
      </div>
    `;
    resultsContainer.style.gridTemplateColumns = "auto";
  }
}
async function searchProjects() {
  const projectSearchBtn = document.querySelector(
    "#projectsSearch .search-btn"
  );
  const projectType = document.getElementById("projectTypeFilter").value.trim();
  const otherProjectInput = document.getElementById("otherProjectInput");
  const selectedProjectsText =
    projectType === "Otro" &&
    otherProjectInput &&
    otherProjectInput.value.trim() !== ""
      ? otherProjectInput.value.trim()
      : projectType || "todos los tipos";
  const projectsRef = collection(db, "projects");
  let q = query(projectsRef, where("status", "==", "published"));
  const conditions = [];
  if (projectType && projectType !== "") {
    conditions.push(where("category", "==", projectType));
  }
  conditions.forEach((condition) => {
    q = query(q, condition);
  });
  projectSearchBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>Buscando`;
  projectSearchBtn.disabled = true;
  try {
    const querySnapshot = await getDocs(q);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = "";
    projectSearchBtn.innerHTML = `<i class="fas fa-search"></i>Buscar`;
    projectSearchBtn.disabled = false;
    if (querySnapshot.empty) {
      resultsContainer.innerHTML = `
      <div class="empty-results">
        <div class="empty-results-icon-x">
          <i class="fas fa-x"></i>
        </div>
        <h3>NO SE ENCONTRARON PROYECTOS QUE COINCIDAN CON LOS FILTROS.</h3>
        <p style="color: black;">
        <strong>"${selectedProjectsText}"</strong>
        </p>
      </div>
      `;
      resultsContainer.style.gridTemplateColumns = "auto";
      return;
    }
    querySnapshot.forEach((doc) => {
      const projectData = doc.data();
      const projectImage =
        projectData.images &&
        projectData.images.length > 0 &&
        projectData.images[0].secure_url
          ? projectData.images[0].secure_url
          : "https://placehold.co/600x400?text=Sin+Imágen";
      const resultCard = document.createElement("div");
      resultCard.className = "project-card";
      resultCard.innerHTML = `
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
              projectData.budgetRange || "Presupuesto no especificado"
            }
          </p>
          <button class="view-project-btn" data-id="${doc.id}">
            Ver Detalles
          </button>
        </div>
      `;
      resultCard
        .querySelector(".view-project-btn")
        .addEventListener("click", () => {
          window.location.href = `project-detail.html?id=${doc.id}`;
        });
      resultsContainer.appendChild(resultCard);
      resultsContainer.style.gridTemplateColumns =
        "repeat(auto-fill, minmax(300px, 1fr))";
    });
  } catch (error) {
    console.error("Error al buscar proyectos:", error);
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = `
      <div class="error-message">
        <p>Error al realizar la búsqueda. Intente nuevamente.</p>
      </div>
    `;
    resultsContainer.style.gridTemplateColumns = "auto";
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const professionalSearchBtn = document.querySelector(
    "#professionalsSearch .search-btn"
  );
  const projectSearchBtn = document.querySelector(
    "#projectsSearch .search-btn"
  );
  if (professionalSearchBtn) {
    professionalSearchBtn.addEventListener("click", searchProfessionals);
  }
  if (projectSearchBtn) {
    projectSearchBtn.addEventListener("click", searchProjects);
  }
});
export { searchProfessionals, searchProjects, setupSearchTabs };
document
  .getElementById("settingsLink")
  .addEventListener("click", function (event) {
    const userId = localStorage.getItem("logguedInUserId");
    event.preventDefault();
    window.location.href = `config.html?id=${userId}`;
  });
document.getElementById("faqLink").addEventListener("click", function (event) {
  event.preventDefault();
  window.location.href = `faq.html`;
});
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".homeBtn").forEach((btn) => {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "index.html";
    });
  });
});
function setupSearchButtonsControl() {
  const professionFilter = document.getElementById("professionFilter");
  const projectTypeFilter = document.getElementById("projectTypeFilter");
  const searchProfessionalsBtn = document.getElementById("searchProfessionals");
  const searchProjectsBtn = document.getElementById("searchProjects");
  function updateProfessionalsButtonState() {
    if (professionFilter && searchProfessionalsBtn) {
      searchProfessionalsBtn.disabled =
        professionFilter.value === "" || professionFilter.selectedIndex === 0;
      if (searchProfessionalsBtn.disabled) {
        searchProfessionalsBtn.classList.add("btn-disabled");
      } else {
        searchProfessionalsBtn.classList.remove("btn-disabled");
      }
    }
  }
  function updateProjectsButtonState() {
    if (projectTypeFilter && searchProjectsBtn) {
      searchProjectsBtn.disabled =
        projectTypeFilter.value === "" || projectTypeFilter.selectedIndex === 0;
      if (searchProjectsBtn.disabled) {
        searchProjectsBtn.classList.add("btn-disabled");
      } else {
        searchProjectsBtn.classList.remove("btn-disabled");
      }
    }
  }
  updateProfessionalsButtonState();
  updateProjectsButtonState();
  if (professionFilter) {
    professionFilter.addEventListener("change", updateProfessionalsButtonState);
  }
  if (projectTypeFilter) {
    projectTypeFilter.addEventListener("change", updateProjectsButtonState);
  }
  const resetProfessionalsBtn = document.getElementById(
    "resetProfessionalsFilter"
  );
  const resetProjectsBtn = document.getElementById("resetProjectsFilter");
  if (resetProfessionalsBtn) {
    resetProfessionalsBtn.addEventListener("click", function () {
      setTimeout(updateProfessionalsButtonState, 0);
    });
  }
  if (resetProjectsBtn) {
    resetProjectsBtn.addEventListener("click", function () {
      setTimeout(updateProjectsButtonState, 0);
    });
  }
}
document.addEventListener("DOMContentLoaded", function () {
  setupSearchButtonsControl();
});
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("emailModal");
  const mailContact = document.querySelector(".mailContact");
  const openModalBtns = document.querySelectorAll(".openModalBtnEmail");
  const closeBtn = document.getElementsByClassName("close-btnEmail")[0];
  if (mailContact) {
    mailContact.addEventListener("click", function (e) {
      e.preventDefault();
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    });
  }
  openModalBtns.forEach(function (btn) {
    btn.onclick = function () {
      modal.style.display = "block";
      document.body.style.overflow = "hidden";
    };
  });
  if (closeBtn) {
    closeBtn.onclick = function () {
      const modalContent = document.querySelector(".modal-contentEmail");
      const closeAnimation = modalContent.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(0.9)", opacity: 0 },
        ],
        {
          duration: 400,
          easing: "ease-out",
        }
      );
      closeAnimation.onfinish = function () {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      };
    };
  }
  window.onclick = function (event) {
    if (event.target == modal) {
      const modalContent = document.querySelector(".modal-contentEmail");
      const closeAnimation = modalContent.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(0.9)", opacity: 0 },
        ],
        {
          duration: 400,
          easing: "ease-out",
        }
      );
      closeAnimation.onfinish = function () {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      };
    }
  };
  const emailForm = document.getElementById("emailForm");
  const subjectSelect = document.getElementById("subject");
  const messageTextarea = document.getElementById("message");
  const mensajes = {
    "Consulta General":
      "Hola, me gustaría hacer una consulta general sobre el funcionamiento de la plataforma VivArq.",
    "Soporte Técnico":
      "Hola, estoy teniendo un inconveniente técnico con la plataforma y necesito ayuda. A continuación detallo el problema:",
    Sugerencias:
      "Hola, quería compartir una sugerencia para mejorar la plataforma VivArq:",
  };
  function actualizarMensaje() {
    const asunto = subjectSelect.value;
    if (mensajes[asunto]) {
      messageTextarea.value = mensajes[asunto];
    } else {
      messageTextarea.value = ""; // si no hay asunto, dejar vacío
    }
  }
  if (messageTextarea && subjectSelect) {
    actualizarMensaje(); // inicial
    subjectSelect.addEventListener("change", actualizarMensaje);
  }
  if (emailForm) {
    emailForm.onsubmit = function (event) {
      event.preventDefault();
      const subject = subjectSelect.value;
      const message = messageTextarea.value;
      if (!subject) {
        alert("Por favor selecciona un asunto antes de enviar.");
        return;
      }
      window.location.href = `mailto:info@vivarq.com.ar?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(message)}`;
      const modalContent = document.querySelector(".modal-contentEmail");
      const closeAnimation = modalContent.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(0.9)", opacity: 0 },
        ],
        {
          duration: 400,
          easing: "ease-out",
        }
      );
      closeAnimation.onfinish = function () {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      };
    };
  }
});
