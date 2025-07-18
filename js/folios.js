document.addEventListener("DOMContentLoaded", function () {
  const CONFIG = {
    DOCUMENTS_PATH: "data/documentos/", // Ruta base para los archivos
    BATCH_SIZE: 12, // Cantidad de documentos a cargar por lote
    MAX_PAGE_BUTTONS: 5, // Máximo de botones de página a mostrar
    PARTIDO_OPTIONS: [
      { id: "la_plata", nombre: "La Plata" },
      { id: "almirante_brown", nombre: "Almirante Brown" },
      { id: "avellaneda", nombre: "Avellaneda" },
      { id: "bahia_blanca", nombre: "Bahía Blanca" },
      { id: "berazategui", nombre: "Berazategui" },
      { id: "escobar", nombre: "Escobar" },
      { id: "esteban_echeverria", nombre: "Esteban Echeverría" },
      { id: "ezeiza", nombre: "Ezeiza" },
      { id: "florencio_varela", nombre: "Florencio Varela" },
      {
        id: "general_pueyrredon",
        nombre: "General Pueyrredón (Mar del Plata)",
      },
      { id: "general_san_martin", nombre: "General San Martín" },
      { id: "caba", nombre: "CABA" },
      { id: "hurlingham", nombre: "Hurlingham" },
      { id: "ituzaingo", nombre: "Ituzaingó" },
      { id: "jose_c_paz", nombre: "José C. Paz" },
      { id: "junin", nombre: "Junín" },
      { id: "lanus", nombre: "Lanús" },
      { id: "la_matanza", nombre: "La Matanza" },
      { id: "lomas_de_zamora", nombre: "Lomas de Zamora" },
      { id: "lujan", nombre: "Luján" },
      { id: "malvinas_argentinas", nombre: "Malvinas Argentinas" },
      { id: "merlo", nombre: "Merlo" },
      { id: "moreno", nombre: "Moreno" },
      { id: "moron", nombre: "Morón" },
      { id: "necochea", nombre: "Necochea" },
      { id: "nueve_de_julio", nombre: "Nueve de Julio" },
      { id: "olavarria", nombre: "Olavarría" },
      { id: "pehuajo", nombre: "Pehuajó" },
      { id: "pergamino", nombre: "Pergamino" },
      { id: "quilmes", nombre: "Quilmes" },
      { id: "ramallo", nombre: "Ramallo" },
      { id: "san_fernando", nombre: "San Fernando" },
      { id: "san_isidro", nombre: "San Isidro" },
      { id: "san_justo", nombre: "San Justo" },
      { id: "san_miguel", nombre: "San Miguel" },
      { id: "san_nicolas", nombre: "San Nicolás de los Arroyos" },
      { id: "san_pedro", nombre: "San Pedro" },
      { id: "san_vicente", nombre: "San Vicente" },
      { id: "suipacha", nombre: "Suipacha" },
      { id: "tandil", nombre: "Tandil" },
      { id: "tigre", nombre: "Tigre" },
      { id: "tres_arroyos", nombre: "Tres Arroyos" },
      { id: "tres_de_febrero", nombre: "Tres de Febrero" },
      { id: "vicente_lopez", nombre: "Vicente López" },
      { id: "zarate", nombre: "Zárate" },
      { id: "otros", nombre: "Otros municipios" },
    ],
  };
  const DOM = {
    documentGrid: document.getElementById("documents-grid"),
    documentTemplate: document.getElementById("document-template"),
    loadingIndicator: document.getElementById("loading-indicator"),
    noResults: document.getElementById("no-results"),
    docCount: document.getElementById("doc-count"),
    loadMoreBtn: document.getElementById("load-more"),
    pdfModal: document.getElementById("pdf-modal"),
    modalTitle: document.getElementById("modal-title"),
    pdfContainer: document.getElementById("pdf-container"),
    modalDownloadBtn: document.getElementById("modal-download"),
    closeModalBtn: document.getElementById("close-modal-folios"),
    searchBtn: document.getElementById("search-btn"),
    resetBtn: document.getElementById("reset-btn"),
    clearFiltersBtn: document.getElementById("clear-filters"),
    viewGridBtn: document.getElementById("view-grid"),
    viewListBtn: document.getElementById("view-list"),
    searchInput: document.getElementById("search-input"),
    partidoSelect: document.getElementById("partido"),
    tipoSelect: document.getElementById("tipo"),
    fechaDesdeInput: document.getElementById("fecha-desde"),
    fechaHastaInput: document.getElementById("fecha-hasta"),
    pagination: document.getElementById("pagination-container"),
  };
  const state = {
    documentos: [], // Todos los documentos
    documentosFiltrados: [], // Documentos después de aplicar filtros
    filtros: {
      busqueda: "",
      partido: "",
      tipo: "",
      fechaDesde: null,
      fechaHasta: null,
    },
    paginacion: {
      actual: 0,
      total: 0,
    },
    documentoSeleccionado: null,
    vistaActual: "grid", // 'grid' o 'list'
  };
  function init() {
    modificarPaginacionHTML();
    cargarOpcionesPartidos();
    transformarPaginacion();
    cargarDocumentos();
    configurarEventListeners();
  }
  function transformarPaginacion() {
    const oldPagination = document.querySelector(".pagination");
    if (oldPagination) {
      oldPagination.innerHTML = "";
      oldPagination.id = "pagination-container";
      DOM.pagination = oldPagination;
    } else {
      console.error("No se encontró el elemento de paginación");
    }
  }
  function cargarOpcionesPartidos() {
    CONFIG.PARTIDO_OPTIONS.forEach((partido) => {
      const option = document.createElement("option");
      option.value = partido.id;
      option.textContent = partido.nombre;
      DOM.partidoSelect.appendChild(option);
    });
  }
  async function cargarDocumentos() {
    try {
      DOM.loadingIndicator.classList.remove("hidden");
      const documentos = await simularCargaDocumentos();
      state.documentos = documentos;
      filtrarDocumentos();
      DOM.loadingIndicator.classList.add("hidden");
    } catch (error) {
      console.error("Error al cargar documentos:", error);
      DOM.loadingIndicator.classList.add("hidden");
    }
  }
  async function simularCargaDocumentos() {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      {
        id: "doc1",
        titulo: "Códigos de Edificación Gral. San Martín TOMO I",
        partido: "general_san_martin",
        tipo: "codigos",
        descripcion: "Código de edificación del Partido de General San Martín.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Edificacion Gral. San Martin - TOMO 1.pdf`,
      },
      {
        id: "doc2",
        titulo: "Códigos de Edificación Gral. San Martín TOMO II",
        partido: "general_san_martin",
        tipo: "codigos",
        descripcion: "Código de edificación del Partido de General San Martín.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Edificacion Gral. San Martin - TOMO 2.pdf`,
      },
      {
        id: "doc3",
        titulo: "Codigo Ordenamiento Gral. San Martin TOMO I",
        partido: "general_san_martin",
        tipo: "zonificacion",
        descripcion:
          "Código de ordenamiento urbanístico del Partido de General San Martín.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Ordenamiento Gral. San Martin - TOMO 1.pdf`,
      },
      {
        id: "doc4",
        titulo: "Codigo Ordenamiento Gral. San Martin TOMO II",
        partido: "general_san_martin",
        tipo: "zonificacion",
        descripcion:
          "Código de ordenamiento urbanístico del Partido de General San Martín.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Ordenamiento Gral. San Martin - TOMO 2.pdf`,
      },
      {
        id: "doc5",
        titulo:
          "Código de Ordenamiento Urbano resumen de indicadores y normas de tejido - Gral. San Martin",
        partido: "general_san_martin",
        tipo: "codigos",
        descripcion:
          "Resumen de indicadores y normas de tejido del Código de Ordenamiento Urbano del Partido de General San Martín.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Código de Ordenamiento Urbano - resumen de indicadores y normas de tejido - Gral. San Martin.pdf`,
      },
      {
        id: "doc6",
        titulo: "Codigo de Edificación - CABA",
        partido: "caba",
        tipo: "codigos",
        descripcion:
          "Código de edificación de la Ciudad Autónoma de Buenos Aires.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Edificacion - CABA.pdf`,
      },
      {
        id: "doc7",
        titulo: "Codigo de Ordenamiento - CABA",
        partido: "caba",
        tipo: "zonificacion",
        descripcion:
          "Código de ordenamiento urbano de la Ciudad Autónoma de Buenos Aires.",
        ruta: `${CONFIG.DOCUMENTS_PATH}Codigo Ordenamiento - CABA.pdf`,
      },
    ];
  }
  function configurarEventListeners() {
    DOM.searchBtn.addEventListener("click", aplicarFiltros);
    DOM.resetBtn.addEventListener("click", resetearFiltros);
    DOM.clearFiltersBtn.addEventListener("click", resetearFiltros);
    DOM.viewGridBtn.addEventListener("click", () => cambiarVista("grid"));
    DOM.viewListBtn.addEventListener("click", () => cambiarVista("list"));
    DOM.loadMoreBtn.addEventListener("click", cargarMasDocumentos);
    DOM.closeModalBtn.addEventListener("click", cerrarModalPdf);
    DOM.pdfModal.addEventListener("click", function (e) {
      if (e.target === DOM.pdfModal) {
        cerrarModalPdf();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !DOM.pdfModal.classList.contains("hidden")) {
        cerrarModalPdf();
      }
      if (e.key === "Enter" && document.activeElement === DOM.searchInput) {
        aplicarFiltros();
      }
    });
  }
  function aplicarFiltros() {
    state.filtros.busqueda = DOM.searchInput.value.trim().toLowerCase();
    state.filtros.partido = DOM.partidoSelect.value;
    state.filtros.tipo = DOM.tipoSelect.value;
    state.paginacion.actual = 0;
    filtrarDocumentos();
  }
  function resetearFiltros() {
    DOM.searchInput.value = "";
    DOM.partidoSelect.value = "";
    DOM.tipoSelect.value = "";
    state.filtros = {
      busqueda: "",
      partido: "",
      tipo: "",
    };
    state.paginacion.actual = 0;
    filtrarDocumentos();
  }
  function filtrarDocumentos() {
    const { busqueda, partido, tipo, fechaDesde, fechaHasta } = state.filtros;
    state.documentosFiltrados = state.documentos.filter((doc) => {
      const coincideTexto =
        busqueda === "" ||
        doc.titulo.toLowerCase().includes(busqueda) ||
        doc.descripcion.toLowerCase().includes(busqueda);
      const coincidePartido = partido === "" || doc.partido === partido;
      const coincideTipo = tipo === "" || doc.tipo === tipo;
      const coincideFechaDesde =
        !fechaDesde || new Date(doc.fecha) >= fechaDesde;
      const coincideFechaHasta =
        !fechaHasta || new Date(doc.fecha) <= fechaHasta;
      return (
        coincideTexto &&
        coincidePartido &&
        coincideTipo &&
        coincideFechaDesde &&
        coincideFechaHasta
      );
    });
    state.paginacion.total = Math.ceil(
      state.documentosFiltrados.length / CONFIG.BATCH_SIZE
    );
    renderizarDocumentos();
  }
  function renderizarDocumentos() {
    DOM.documentGrid.innerHTML = "";
    DOM.docCount.textContent = state.documentosFiltrados.length;
    if (state.documentosFiltrados.length === 0) {
      DOM.noResults.classList.remove("hidden");
      DOM.pagination.classList.add("hidden");
      return;
    } else {
      DOM.noResults.classList.add("hidden");
      DOM.pagination.classList.remove("hidden");
    }
    const inicio = state.paginacion.actual * CONFIG.BATCH_SIZE;
    const fin = Math.min(
      inicio + CONFIG.BATCH_SIZE,
      state.documentosFiltrados.length
    );
    const documentosPagina = state.documentosFiltrados.slice(inicio, fin);
    if (state.vistaActual === "list") {
      DOM.documentGrid.classList.remove("documents-grid");
      DOM.documentGrid.classList.add("documents-list");
    } else {
      DOM.documentGrid.classList.add("documents-grid");
      DOM.documentGrid.classList.remove("documents-list");
    }
    documentosPagina.forEach((doc) => {
      const docElement = crearElementoDocumento(doc);
      DOM.documentGrid.appendChild(docElement);
    });
    renderizarPaginacion();
  }
  function renderizarPaginacion() {
    DOM.pagination.innerHTML = "";
    if (state.paginacion.total <= 1) {
      DOM.pagination.classList.add("hidden");
      return;
    }
    const paginationBtns = document.createElement("div");
    paginationBtns.className = "pagination-buttons";
    const prevButton = document.createElement("button");
    prevButton.className = `pagination-btn ${
      state.paginacion.actual === 0 ? "disabled" : ""
    }`;
    prevButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    `;
    prevButton.disabled = state.paginacion.actual === 0;
    prevButton.addEventListener("click", () => {
      if (state.paginacion.actual > 0) {
        state.paginacion.actual--;
        renderizarDocumentos();
        scrollToTop();
      }
    });
    paginationBtns.appendChild(prevButton);
    const totalPages = state.paginacion.total;
    const currentPage = state.paginacion.actual;
    const maxButtons = CONFIG.MAX_PAGE_BUTTONS;
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(0, endPage - maxButtons + 1);
    }
    if (startPage > 0) {
      const firstPageBtn = document.createElement("button");
      firstPageBtn.className = "pagination-btn";
      firstPageBtn.textContent = "1";
      firstPageBtn.addEventListener("click", () => {
        state.paginacion.actual = 0;
        renderizarDocumentos();
        scrollToTop();
      });
      paginationBtns.appendChild(firstPageBtn);
      if (startPage > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        paginationBtns.appendChild(ellipsis);
      }
    }
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn ${i === currentPage ? "active" : ""}`;
      pageBtn.textContent = (i + 1).toString();
      pageBtn.addEventListener("click", () => {
        state.paginacion.actual = i;
        renderizarDocumentos();
        scrollToTop();
      });
      paginationBtns.appendChild(pageBtn);
    }
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "pagination-ellipsis";
        ellipsis.textContent = "...";
        paginationBtns.appendChild(ellipsis);
      }
      const lastPageBtn = document.createElement("button");
      lastPageBtn.className = "pagination-btn";
      lastPageBtn.textContent = totalPages.toString();
      lastPageBtn.addEventListener("click", () => {
        state.paginacion.actual = totalPages - 1;
        renderizarDocumentos();
        scrollToTop();
      });
      paginationBtns.appendChild(lastPageBtn);
    }
    const nextButton = document.createElement("button");
    nextButton.className = `pagination-btn ${
      state.paginacion.actual === state.paginacion.total - 1 ? "disabled" : ""
    }`;
    nextButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    nextButton.disabled =
      state.paginacion.actual === state.paginacion.total - 1;
    nextButton.addEventListener("click", () => {
      if (state.paginacion.actual < state.paginacion.total - 1) {
        state.paginacion.actual++;
        renderizarDocumentos();
        scrollToTop();
      }
    });
    paginationBtns.appendChild(nextButton);
    DOM.pagination.appendChild(paginationBtns);
  }
  function scrollToTop() {
    DOM.documentGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function modificarPaginacionHTML() {
    const oldPagination = document.querySelector(".pagination");
    const newPagination = document.createElement("div");
    newPagination.className = "pagination";
    newPagination.id = "pagination-container";
    if (oldPagination && oldPagination.parentNode) {
      oldPagination.parentNode.replaceChild(newPagination, oldPagination);
    }
  }
  function crearElementoDocumento(doc) {
    const template = DOM.documentTemplate.content.cloneNode(true);
    template.querySelector(".document-title").textContent = doc.titulo;
    const partidoObj = CONFIG.PARTIDO_OPTIONS.find((p) => p.id === doc.partido);
    template.querySelector(".document-partido").textContent = partidoObj
      ? partidoObj.nombre
      : "Desconocido";
    let tipoTexto = "";
    switch (doc.tipo) {
      case "codigos":
        tipoTexto = "Códigos de Edificación";
        break;
      case "zonificacion":
        tipoTexto = "Reglamentos de Zonificación";
        break;
      case "especificos":
        tipoTexto = "Reglamentos Técnicos Específicos";
        break;
      case "iram":
        tipoTexto = "Normas IRAM";
        break;
      case "s&h":
        tipoTexto = "Planes de Seguridad e Higiene";
        break;
      case "trabajoObra":
        tipoTexto = "Protocolos de trabajo en obra";
        break;
      case "buenasPracticas":
        tipoTexto = "Manual de buenas prácticas";
        break;
      default:
        tipoTexto = "Otro";
    }
    template.querySelector(".document-type").textContent = tipoTexto;
    const fecha = new Date(doc.fecha);
    const fechaFormateada = fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    template.querySelector(".document-description").textContent =
      doc.descripcion;
    const btnVer = template.querySelector(".btn-view-folios");
    btnVer.addEventListener("click", () => abrirDocumento(doc));
    const btnDescargar = template.querySelector(".btn-download-folios");
    btnDescargar.addEventListener("click", () => descargarDocumento(doc));
    return template;
  }
  function cambiarVista(tipo) {
    state.vistaActual = tipo;
    if (tipo === "grid") {
      DOM.viewGridBtn.classList.add("active");
      DOM.viewListBtn.classList.remove("active");
    } else {
      DOM.viewGridBtn.classList.remove("active");
      DOM.viewListBtn.classList.add("active");
    }
    renderizarDocumentos();
  }
  function cargarMasDocumentos() {
    if (state.paginacion.actual < state.paginacion.total - 1) {
      state.paginacion.actual++;
      renderizarDocumentos();
    }
  }
  function abrirDocumento(doc) {
    state.documentoSeleccionado = doc;
    DOM.modalTitle.textContent = doc.titulo;
    const iframeHtml = `<iframe src="${doc.ruta}" width="100%" height="100%" frameborder="0"></iframe>`;
    DOM.pdfContainer.innerHTML = iframeHtml;
    DOM.modalDownloadBtn.onclick = () => descargarDocumento(doc);
    DOM.pdfModal.style.display = "block";
    document.body.style.overflow = "hidden";
  }
  function cerrarModalPdf() {
    DOM.pdfModal.style.display = "none";
    DOM.pdfContainer.innerHTML = "";
    state.documentoSeleccionado = null;
    document.body.style.overflow = "";
  }
  function descargarDocumento(doc) {
    console.log(`Descargando documento: ${doc.titulo}`);
    const link = document.createElement("a");
    link.href = doc.ruta;
    link.download = `${doc.titulo}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  init();
});
