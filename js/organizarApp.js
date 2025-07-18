import {
  auth,
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "./firebase-config.js";
let currentUser = null;
let currentTab = "notas";
let currentDate = new Date();
let today = new Date();
today.setHours(12, 0, 0, 0); // Fijar a mediodía
let selectedDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);
selectedDate.setHours(12, 0, 0, 0); // Fijar a mediodía
document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      initializeApp();
    } else {
      console.error("Usuario no autenticado");
    }
  });
  const tabs = document.querySelectorAll(".tabIntra");
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      setActiveTab(tab.getAttribute("data-tab"));
    });
  });
});
function initializeApp() {
  initNotasModule();
  initAgendaModule();
  initCalendarioModule();
  setActiveTab("notas");
}
function setActiveTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".tabIntra").forEach((tab) => {
    if (tab.getAttribute("data-tab") === tabName) {
      tab.classList.add("activeIntra");
    } else {
      tab.classList.remove("activeIntra");
    }
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    if (panel.id === `${tabName}-panel`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });
  if (tabName === "notas") {
    loadNotas();
  } else if (tabName === "agenda") {
    loadEventos();
  } else if (tabName === "calendario") {
    renderCalendario();
    loadEventosCalendario();
  }
}
function initNotasModule() {
  document.getElementById("nueva-nota").addEventListener("click", () => {
    openNotaModal();
  });
  document.getElementById("form-nota").addEventListener("submit", (e) => {
    e.preventDefault();
    saveNota();
  });
  const colorOptions = document.querySelectorAll(".color-option");
  colorOptions.forEach((option) => {
    option.addEventListener("click", function () {
      document
        .querySelectorAll(".color-option")
        .forEach((opt) => opt.classList.remove("selected"));
      this.classList.add("selected");
      document.getElementById("color-nota").value =
        this.getAttribute("data-color");
    });
  });
  document.getElementById("color-nota").addEventListener("change", function () {
    document.querySelectorAll(".color-option").forEach((opt) => {
      if (opt.getAttribute("data-color") === this.value) {
        opt.classList.add("selected");
      } else {
        opt.classList.remove("selected");
      }
    });
  });
  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const colorSelect = document.getElementById("color-nota");
      if (colorSelect) {
        const selectedColor = colorSelect.value;
        document.querySelectorAll(".color-option").forEach((opt) => {
          opt.classList.toggle(
            "selected",
            opt.getAttribute("data-color") === selectedColor
          );
        });
      }
      document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.display = "none";
        document.body.style.overflow = "auto"; // Desactivar scroll del body
      });
    });
  });
  loadNotas();
}
function loadNotas() {
  if (!currentUser) return;
  const notasRef = collection(db, `users/${currentUser.uid}/notas`);
  const q = query(notasRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    const notasContainer = document.getElementById("lista-notas");
    notasContainer.innerHTML = "";
    if (snapshot.empty) {
      notasContainer.innerHTML =
        '<p class="empty-message">No hay notas. ¡Crea una nueva nota!</p>';
      return;
    }
    snapshot.forEach((doc) => {
      const nota = doc.data();
      const notaEl = createNotaElement(doc.id, nota);
      notasContainer.appendChild(notaEl);
    });
  });
}
function createNotaElement(id, nota) {
  const notaEl = document.createElement("div");
  notaEl.className = `nota ${nota.color || "yellow"}`;
  let fechaCreacion = "";
  if (nota.createdAt && nota.createdAt.toDate) {
    const fecha = nota.createdAt.toDate();
    fechaCreacion = `${fecha.toLocaleDateString("es-ES")}`;
  }
  notaEl.innerHTML = `
    <div class="nota-header">
      <h3>${nota.titulo}</h3>
      <small class="nota-fecha">${fechaCreacion}</small>
    </div>
    <div class="nota-content">
      <p>${formatNotaContent(nota.contenido)}</p>
    </div>
    <div class="nota-footer">
      <small class="nota-tags">${nota.tags ? formatTags(nota.tags) : ""}</small>
      <div class="nota-actions">
        <div class="tooltip-container">
          <button class="btn btn-icon edit-nota" data-id="${id}">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
        <div class="tooltip-container">
          <button class="btn btn-icon delete-nota" data-id="${id}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  notaEl.querySelector(".edit-nota").addEventListener("click", () => {
    openNotaModal(id);
  });
  notaEl.querySelector(".delete-nota").addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas eliminar esta nota?")) {
      deleteNota(id);
    }
  });
  return notaEl;
}
function formatNotaContent(contenido) {
  if (!contenido) return "";
  return contenido.replace(/\n/g, "<br>");
}
function formatTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return "";
  return tags.map((tag) => `<span class="nota-tag">#${tag}</span>`).join(" ");
}
function openNotaModal(notaId = null) {
  const modal = document.getElementById("modal-nota");
  const form = document.getElementById("form-nota");
  const modalTitulo = document.getElementById("modal-titulo");
  form.reset();
  document.getElementById("id-nota").value = "";
  document.getElementById("color-nota").value = "yellow";
  document.querySelectorAll(".color-option").forEach((opt) => {
    opt.classList.toggle(
      "selected",
      opt.getAttribute("data-color") === "yellow"
    );
  });
  if (notaId) {
    modalTitulo.textContent = "Editar Nota";
    loadNotaData(notaId);
  } else {
    modalTitulo.textContent = "Nueva Nota";
  }
  modal.style.display = "block";
  document.body.style.overflow = "hidden"; // Desactivar scroll del body
}
async function loadNotaData(notaId) {
  if (!currentUser) return;
  try {
    const notaRef = doc(db, `users/${currentUser.uid}/notas/${notaId}`);
    const notaSnap = await getDoc(notaRef);
    if (notaSnap.exists()) {
      const nota = notaSnap.data();
      document.getElementById("id-nota").value = notaId;
      document.getElementById("titulo-nota").value = nota.titulo;
      document.getElementById("contenido-nota").value = nota.contenido || "";
      document.getElementById("color-nota").value = nota.color || "yellow";
      document.getElementById("tags-nota").value = nota.tags
        ? nota.tags.join(", ")
        : "";
      const selectedColor = nota.color || "yellow";
      document.querySelectorAll(".color-option").forEach((opt) => {
        opt.classList.toggle(
          "selected",
          opt.getAttribute("data-color") === selectedColor
        );
      });
    }
  } catch (error) {
    console.error("Error al cargar la nota:", error);
  }
}
async function saveNota() {
  if (!currentUser) return;
  const notaId = document.getElementById("id-nota").value;
  const titulo = document.getElementById("titulo-nota").value;
  const contenido = document.getElementById("contenido-nota").value;
  const color = document.getElementById("color-nota").value;
  const tagsInput = document.getElementById("tags-nota").value;
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];
  try {
    const notaData = {
      titulo,
      contenido,
      color,
      tags,
      updatedAt: serverTimestamp(),
    };
    if (notaId) {
      updateDoc(doc(db, `users/${currentUser.uid}/notas/${notaId}`), notaData);
    } else {
      notaData.createdAt = serverTimestamp();
      addDoc(collection(db, `users/${currentUser.uid}/notas`), notaData);
    }
    document.getElementById("modal-nota").style.display = "none";
    document.body.style.overflow = "auto"; // Desactivar scroll del body
  } catch (error) {
    console.error("Error al guardar la nota:", error);
  }
}
async function deleteNota(notaId) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/notas/${notaId}`));
  } catch (error) {
    console.error("Error al eliminar la nota:", error);
  }
}
function initAgendaModule() {
  document.getElementById("nuevo-evento").addEventListener("click", () => {
    openEventoModal();
  });
  document.getElementById("form-evento").addEventListener("submit", (e) => {
    e.preventDefault();
    saveEvento();
  });
  document
    .getElementById("btn-filtrar-agenda")
    .addEventListener("click", () => {
      loadEventos(document.getElementById("filtro-fecha-agenda").value);
    });
  document
    .getElementById("btn-limpiar-filtro-agenda")
    .addEventListener("click", () => {
      document.getElementById("filtro-fecha-agenda").value = "";
      loadEventos();
    });
  loadEventos();
}
function loadEventos(dateFilter = null) {
  if (!currentUser) return;
  const eventosRef = collection(db, `users/${currentUser.uid}/eventos`);
  let q;
  if (dateFilter) {
    q = query(
      eventosRef,
      where("fecha", "==", dateFilter),
      orderBy("hora", "asc")
    );
  } else {
    const today = new Date();
    const fechaHoy = today.toISOString().split("T")[0];
    q = query(
      eventosRef,
      where("fecha", ">=", fechaHoy),
      orderBy("fecha", "asc"),
      orderBy("hora", "asc")
    );
  }
  const eventosContainer = document.getElementById("lista-eventos");
  eventosContainer.innerHTML = '<div class="loading">Cargando eventos...</div>';
  onSnapshot(q, (snapshot) => {
    eventosContainer.innerHTML = "";
    if (snapshot.empty) {
      eventosContainer.innerHTML =
        '<p class="empty-message">No hay eventos programados.</p>';
      return;
    }
    let currentDate = "";
    snapshot.forEach((doc) => {
      const evento = doc.data();
      if (evento.fecha !== currentDate) {
        currentDate = evento.fecha;
        const dateHeader = document.createElement("h3");
        dateHeader.className = "date-header";
        dateHeader.textContent = formatDate(evento.fecha);
        eventosContainer.appendChild(dateHeader);
      }
      const eventoEl = createEventoElement(doc.id, evento);
      eventosContainer.appendChild(eventoEl);
    });
  });
}
function createEventoElement(id, evento) {
  const priorityLabels = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
  };
  const priorityClass = evento.prioridad || "baja";
  const priorityLabel = priorityLabels[priorityClass] || "Normal";
  const eventoEl = document.createElement("div");
  eventoEl.className = `evento-item ${priorityClass}`;
  eventoEl.innerHTML = `
    <div class="evento-content">
      <div class="evento-header">
        <div class="evento-hora">${formatTime(evento.hora)}</div>
        <div class="evento-priority-badge ${priorityClass}">${priorityLabel}</div>
      </div>
      <h3 class="evento-titulo">${evento.titulo}</h3>
      ${
        evento.descripcion
          ? `<p class="evento-descripcion">${evento.descripcion}</p>`
          : "Sin descripción"
      }
      <div class="evento-metadata">
        ${
          evento.ubicacion
            ? `<span class="evento-ubicacion"><i class="fa-solid fa-location-dot"></i> ${evento.ubicacion}</span>`
            : ""
        }
        ${
          evento.duracion
            ? `<span class="evento-duracion"><i class="fa-regular fa-clock"></i> ${evento.duracion} min</span>`
            : ""
        }
      </div>
    </div>
    <div class="evento-actions">
      <button class="btn btn-icon edit-evento" data-id="${id}" aria-label="Editar evento">
        <i class="fa-solid fa-pen"></i>
        <span class="tooltip-text">Editar</span>
      </button>
      <button class="btn btn-icon delete-evento" data-id="${id}" aria-label="Borrar evento">
        <i class="fa-solid fa-trash"></i>
        <span class="tooltip-text">Borrar</span>
      </button>
    </div>
  `;
  eventoEl.querySelector(".edit-evento").addEventListener("click", () => {
    openEventoModal(id);
  });
  eventoEl.querySelector(".delete-evento").addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas eliminar este evento?")) {
      deleteEvento(id);
    }
  });
  return eventoEl;
}
function openEventoModal(eventoId = null) {
  const modal = document.getElementById("modal-evento");
  const form = document.getElementById("form-evento");
  const modalTitulo = document.getElementById("modal-titulo-evento");
  form.reset();
  document.getElementById("id-evento").value = "";
  const now = new Date();
  document.getElementById("fecha-evento").value = now
    .toISOString()
    .split("T")[0];
  document.getElementById("hora-evento").value = `${String(
    now.getHours()
  ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (eventoId) {
    modalTitulo.textContent = "Editar Evento";
    loadEventoData(eventoId);
  } else {
    modalTitulo.textContent = "Nuevo Evento";
  }
  modal.style.display = "block";
  document.body.style.overflow = "hidden"; // Desactivar scroll del body
}
async function loadEventoData(eventoId) {
  if (!currentUser) return;
  try {
    const eventoRef = doc(db, `users/${currentUser.uid}/eventos/${eventoId}`);
    const eventoSnap = await getDoc(eventoRef);
    if (eventoSnap.exists()) {
      const evento = eventoSnap.data();
      document.getElementById("id-evento").value = eventoId;
      document.getElementById("titulo-evento").value = evento.titulo;
      document.getElementById("descripcion-evento").value =
        evento.descripcion || "";
      document.getElementById("fecha-evento").value = evento.fecha;
      document.getElementById("hora-evento").value = evento.hora;
      document.getElementById("prioridad-evento").value =
        evento.prioridad || "baja";
    }
  } catch (error) {
    console.error("Error al cargar el evento:", error);
  }
}
async function saveEvento() {
  if (!currentUser) return;
  const eventoId = document.getElementById("id-evento").value;
  const titulo = document.getElementById("titulo-evento").value;
  const descripcion = document.getElementById("descripcion-evento").value;
  const fecha = document.getElementById("fecha-evento").value;
  const hora = document.getElementById("hora-evento").value;
  const prioridad = document.getElementById("prioridad-evento").value;
  try {
    const eventoData = {
      titulo,
      descripcion,
      fecha,
      hora,
      prioridad,
      updatedAt: serverTimestamp(),
    };
    if (eventoId) {
      updateDoc(
        doc(db, `users/${currentUser.uid}/eventos/${eventoId}`),
        eventoData
      );
    } else {
      eventoData.createdAt = serverTimestamp();
      addDoc(collection(db, `users/${currentUser.uid}/eventos`), eventoData);
    }
    document.getElementById("modal-evento").style.display = "none";
    document.body.style.overflow = "auto"; // Desactivar scroll del body
    if (currentTab === "calendario") {
      loadEventosCalendario();
    }
  } catch (error) {
    console.error("Error al guardar el evento:", error);
  }
}
async function deleteEvento(eventoId) {
  if (!currentUser) return;
  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/eventos/${eventoId}`));
    if (currentTab === "calendario") {
      loadEventosCalendario();
    }
  } catch (error) {
    console.error("Error al eliminar el evento:", error);
  }
}
function initCalendarioModule() {
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendario();
    loadEventosCalendario();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendario();
    loadEventosCalendario();
  });
  renderCalendario();
  loadEventosCalendario();
}
function renderCalendario() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  document.getElementById("current-month-year").textContent = `${getMonthName(
    month
  )} ${year}`;
  const daysGrid = document.getElementById("calendario-dias");
  daysGrid.innerHTML = "";
  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "dia otro-mes";
    dayDiv.innerHTML = `<div class="dia-numero">${prevMonthLastDay - i}</div>`;
    daysGrid.appendChild(dayDiv);
  }
  for (let i = 1; i <= totalDays; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "dia";
    dayDiv.innerHTML = `<div class="dia-numero">${i}</div><div class="dia-eventos"></div>`;
    const currentDateStr = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(i).padStart(2, "0")}`;
    const selectedDateStr = formatDateForDB(selectedDate);
    if (currentDateStr === selectedDateStr) {
      dayDiv.classList.add("seleccionado");
    }
    const today = new Date();
    if (
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayDiv.classList.add("today");
    }
    dayDiv.setAttribute("data-date", currentDateStr);
    dayDiv.addEventListener("click", () => {
      document
        .querySelectorAll(".dia")
        .forEach((d) => d.classList.remove("seleccionado"));
      dayDiv.classList.add("seleccionado");
      const [year, month, day] = currentDateStr.split("-");
      selectedDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      selectedDate.setHours(12, 0, 0, 0); // Fijar a mediodía para evitar problemas de zona horaria
      document.getElementById("fecha-seleccionada").textContent =
        formatDate(currentDateStr);
      showEventosDelDia(currentDateStr);
    });
    daysGrid.appendChild(dayDiv);
  }
  const totalCells = 42; // 6 filas de 7 días
  const remainingCells = totalCells - (startingDay + totalDays);
  for (let i = 1; i <= remainingCells; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "dia otro-mes";
    dayDiv.innerHTML = `<div class="dia-numero">${i}</div>`;
    daysGrid.appendChild(dayDiv);
  }
}
function loadEventosCalendario() {
  if (!currentUser) return;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    new Date(year, month + 1, 0).getDate()
  ).padStart(2, "0")}`;
  const eventosRef = collection(db, `users/${currentUser.uid}/eventos`);
  const q = query(
    eventosRef,
    where("fecha", ">=", firstDay),
    where("fecha", "<=", lastDay)
  );
  onSnapshot(q, (snapshot) => {
    document.querySelectorAll(".dia-eventos").forEach((el) => {
      el.innerHTML = "";
    });
    const eventosPorFecha = {};
    snapshot.forEach((doc) => {
      const evento = doc.data();
      if (!eventosPorFecha[evento.fecha]) {
        eventosPorFecha[evento.fecha] = [];
      }
      eventosPorFecha[evento.fecha].push({
        id: doc.id,
        ...evento,
      });
    });
    for (const fecha in eventosPorFecha) {
      const dayDiv = document.querySelector(`.dia[data-date="${fecha}"]`);
      if (dayDiv) {
        const eventosDiv = dayDiv.querySelector(".dia-eventos");
        const conteo = {
          alta: 0,
          media: 0,
          baja: 0,
        };
        eventosPorFecha[fecha].forEach((evento) => {
          conteo[evento.prioridad]++;
        });
        for (const prioridad in conteo) {
          if (conteo[prioridad] > 0) {
            const indicador = document.createElement("span");
            indicador.className = `dia-evento-indicador ${prioridad}`;
            indicador.title = `${conteo[prioridad]} eventos de prioridad ${prioridad}`;
            eventosDiv.appendChild(indicador);
          }
        }
      }
    }
    const selectedDateStr = formatDateForDB(selectedDate);
    document.getElementById("fecha-seleccionada").textContent =
      formatDate(selectedDateStr);
    showEventosDelDia(selectedDateStr);
  });
}
function showEventosDelDia(fecha) {
  if (!currentUser) return;
  const eventosRef = collection(db, `users/${currentUser.uid}/eventos`);
  const q = query(
    eventosRef,
    where("fecha", "==", fecha),
    orderBy("hora", "asc")
  );
  const eventosContainer = document.getElementById("lista-eventos-dia");
  eventosContainer.innerHTML = '<div class="loading">Cargando eventos...</div>';
  onSnapshot(q, (snapshot) => {
    eventosContainer.innerHTML = "";
    if (snapshot.empty) {
      eventosContainer.innerHTML =
        '<p class="empty-message">No hay eventos para este día.</p>';
      return;
    }
    snapshot.forEach((doc) => {
      const evento = doc.data();
      const eventoEl = document.createElement("div");
      eventoEl.className = `evento-item ${evento.prioridad}`;
      eventoEl.innerHTML = `
    <div class="evento-content">
      <div class="evento-header">
        <div class="evento-hora">${formatTime(evento.hora)}</div>
      </div>
      <h3 class="evento-titulo">${evento.titulo}</h3>
      ${
        evento.descripcion
          ? `<p class="evento-descripcion">${evento.descripcion}</p>`
          : "Sin descripción"
      }
    </div>
            `;
      eventosContainer.appendChild(eventoEl);
    });
  });
}
function createLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  date.setHours(12, 0, 0, 0);
  return date;
}
function formatDateForDB(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  date.setHours(12, 0, 0, 0);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("es-AR", options);
}
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(":");
  return `${hours}:${minutes}`;
}
function getMonthName(month) {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return months[month];
}
