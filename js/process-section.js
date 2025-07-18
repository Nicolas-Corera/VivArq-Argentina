// Función para actualizar la sección del proceso según el rol del usuario
function updateProcessSection() {
  const userRole = localStorage.getItem("userRole");
  const userId = localStorage.getItem("logguedInUserId");

  // Elementos del proceso
  const step1Title = document.querySelector(".process-step:nth-child(1) h3");
  const step1Description = document.querySelector(
    ".process-step:nth-child(1) p"
  );
  const step1Icon = document.querySelector(
    ".process-step:nth-child(1) .process-icon i"
  );

  const searchTitle = document.getElementById("searchTitle");
  const searchDescription = document.getElementById("searchDescription");
  const step2Icon = document.querySelector(
    ".process-step:nth-child(2) .process-icon i"
  );

  const step3Title = document.querySelector(".process-step:nth-child(3) h3");
  const step3Description = document.querySelector(
    ".process-step:nth-child(3) p"
  );
  const step3Icon = document.querySelector(
    ".process-step:nth-child(3) .process-icon i"
  );

  const step4Title = document.querySelector(".process-step:nth-child(4) h3");
  const step4Description = document.querySelector(
    ".process-step:nth-child(4) p"
  );
  const step4Icon = document.querySelector(
    ".process-step:nth-child(4) .process-icon i"
  );

  // Botones
  const publishProjectBtn = document.getElementById("publishProyect");
  const viewProjectsBtn = document.getElementById("viewProyects");
  const accessChatBtn = document.getElementById("accessChat");
  const startNowBtn = document.getElementById("startNow");

  // Verificar si los elementos existen antes de intentar modificarlos
  if (!step1Title || !step1Description || !step1Icon) {
    console.log("Elementos del proceso no encontrados en el DOM");
    return;
  }

  if (userRole === "professional") {
    // Configuración para profesionales
    step1Title.textContent = "Registro profesional";
    step1Description.textContent =
      "Crea tu perfil profesional destacando tus habilidades, experiencia y portfolio para atraer a potenciales clientes.";
    step1Icon.className = "fas fa-briefcase";

    if (searchTitle) searchTitle.textContent = "Buscar proyectos";
    if (searchDescription)
      searchDescription.textContent =
        "Busca entre todos los proyectos publicados por los usuarios y elige el que más se adapte a tus habilidades.";
    step2Icon.className = "fas fa-project-diagram";

    step3Title.textContent = "Comunicación directa con clientes";
    step3Description.textContent =
      "Utiliza nuestro chat integrado para hablar directamente con los clientes, hacer preguntas y negociar presupuestos.";
    step3Icon.className = "fas fa-comments";

    step4Title.textContent = "Ejecución del proyecto";
    step4Description.textContent =
      "Trabaja en el proyecto contratado, manteniendo comunicación constante y entregando resultados de calidad.";
    step4Icon.className = "fas fa-tasks";

    if (publishProjectBtn) publishProjectBtn.style.display = "none";
    if (viewProjectsBtn) viewProjectsBtn.style.display = "block";
    if (accessChatBtn) {
      accessChatBtn.style.display = "none";
    }
    if (startNowBtn) {
      startNowBtn.style.display = "none";
    }
  } else if (userRole === "contractor") {
    // Configuración para clientes/contractors
    step1Title.textContent = "Registro como cliente";
    step1Description.textContent =
      "Crea tu cuenta como cliente y define tu perfil para conectar con los mejores profesionales del sector.";
    step1Icon.className = "fas fa-user-tie";

    if (searchTitle) searchTitle.textContent = "Publicar proyecto";
    if (searchDescription)
      searchDescription.textContent =
        "Describe tu proyecto en detalle para recibir propuestas de los profesionales más cualificados.";
    step2Icon.className = "fas fa-bullhorn";

    step3Title.textContent = "Comunicación directa con profesionales";
    step3Description.textContent =
      "Revisa las propuestas recibidas, comunícate con los profesionales y elige al profesional ideal para tu proyecto.";
    step3Icon.className = "fas fa-comments";

    step4Title.textContent = "Gestión y seguimiento";
    step4Description.textContent =
      "Supervisa el avance del proyecto, proporciona feedback y confirma la finalización satisfactoria del trabajo.";
    step4Icon.className = "fas fa-chart-line";

    if (publishProjectBtn) {
      publishProjectBtn.style.display = "block";
      publishProjectBtn.onclick = function () {
        window.location.href = `profile-contractor.html?id=${userId}`;
      };
    }
    if (viewProjectsBtn) viewProjectsBtn.style.display = "none";
    if (accessChatBtn) {
      accessChatBtn.style.display = "block";
      accessChatBtn.onclick = function () {
        window.location.href = `chat.html`;
      };
    }
    if (startNowBtn) {
      startNowBtn.style.display = "none";
    }
  } else {
    // Configuración para usuarios no registrados o sin iniciar sesión
    step1Title.textContent = "Registro y perfil";
    step1Description.textContent =
      "Crea tu cuenta como profesional o cliente y completa tu perfil con tus especialidades, experiencia y portfolio.";
    step1Icon.className = "fas fa-user-plus";

    if (searchTitle) searchTitle.textContent = "Búsqueda o publicación";
    if (searchDescription)
      searchDescription.textContent =
        "Busca profesionales cualificados o publica tu proyecto para recibir propuestas de los mejores especialistas.";
    step2Icon.className = "fas fa-search";

    step3Title.textContent = "Comunicación directa";
    step3Description.textContent =
      "Utiliza nuestro chat integrado para hablar directamente con los profesionales, hacer preguntas y negociar presupuestos.";
    step3Icon.className = "fas fa-comments";

    step4Title.textContent = "Aún hay más...";
    step4Description.innerHTML = `Explora todas las características que <strong style="color: black">VivArq</strong> tiene para vos. <br />Si tienes alguna duda o sugerencia no dudes en contactarnos:
    <li class="openModalBtnEmail" style="cursor: pointer; list-style: none">
      <i class="fas fa-envelope" style="color: var(--primary-color)"></i>
      <a class="mailContact"> contacto@vivarq.com.ar</a>
      <style>
        .mailContact {
          color: #333;
          text-decoration: none;
          font-weight: 600;
          transition: var(--transition-speed);
        }
        .mailContact:hover {
          color: black;
          margin-left: 5px;
        }
      </style>
    </li>`;
    step4Icon.className = "fas fa-plus";

    if (accessChatBtn) {
      accessChatBtn.style.display = "none";
    }

    // Redirigir a login si se intenta acceder a funcionalidades para usuarios registrados
    if (publishProjectBtn) {
      publishProjectBtn.style.display = "none";
    }
    if (viewProjectsBtn) {
      viewProjectsBtn.style.display = "none";
    }
    if (startNowBtn) {
      startNowBtn.style.display = "block";
      startNowBtn.onclick = function () {
        window.location.href = `login.html`;
      };
    }
  }
}

// Exportar la función para usarla en otros archivos
export { updateProcessSection };
