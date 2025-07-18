import {
  auth,
  db,
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onAuthStateChanged,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
} from "./firebase-config.js";
let currentUser = null;
let currentUserId = null;
let calculationHistory = [];
let activeCalculation = null;
let selectedTemplate = "comp&presu";
function showMessage(message, type = "info", duration = 5000) {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.warn("No se encontró #toast-container");
    return;
  }
  const toast = document.createElement("div");
  toast.classList.add("toast", `toast-${type}`);
  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  toast.append(msgSpan);
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.classList.remove("show");
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true }
    );
  }, duration);
}
function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      currentUserId = user.uid;
    } else {
      currentUser = null;
      currentUserId = null;
    }
  });
}
function initializePage() {
  updateTableRowNumbers();
  updateBudgetTotals();
  document.getElementById("laborPercentage").value = "30";
  document.getElementById("honorariosPercentage").value = "100.00";
  document.getElementById("taxIVA").checked = true;
  document.getElementById("taxIIBB").checked = true;
  document.getElementById("taxIIBBPercentage").value = "3.50";
  checkUrlForCalculationId();
}
function handleSaveAsDraftDisplay() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCompleted = urlParams.has("completed");
  const isEdit = urlParams.has("edit");
  const saveAsDraftBtn = document.getElementById("saveAsDraftBtn");
  if (isCompleted && !isEdit) {
    saveAsDraftBtn.style.display = "none";
  } else {
    saveAsDraftBtn.style.display = "block";
    if (isEdit) {
      saveAsDraftBtn.innerHTML = `<i class="fas fa-save"></i> Actualizar Cálculo`;
    } else {
      saveAsDraftBtn.innerHTML = `<i class="fas fa-save"></i> Guardar Cálculo`;
    }
  }
}
function setupEventListeners() {
  document.querySelectorAll(".homeBtn").forEach((btn) => {
    btn.addEventListener("click", () => (window.location.href = "index.html"));
  });
  document
    .getElementById("addItemBtn")
    ?.addEventListener("click", addBudgetRow);
  document
    .getElementById("importExcelBtn")
    ?.addEventListener("click", importFromExcel);
  setupInputListeners();
  document
    .getElementById("calculateBtn")
    ?.addEventListener("click", calculateAll);
  document.getElementById("resetFormBtn")?.addEventListener("click", resetForm);
  document
    .getElementById("saveCalculationBtn")
    ?.addEventListener("click", saveCalculation);
  document
    .getElementById("saveAsDraftBtn")
    ?.addEventListener("click", saveAsDraft);
  document
    .getElementById("generatePdfBtn")
    ?.addEventListener("click", generatePDF);
  document
    .getElementById("sendCalculationBtn")
    ?.addEventListener("click", sendCalculationToClient);
  document
    .getElementById("downloadPreviewBtn")
    ?.addEventListener("click", downloadPDF);
  document
    .getElementById("budgetTableBody")
    ?.addEventListener("click", handleBudgetTableClick);
  document
    .getElementById("budgetTableBody")
    ?.addEventListener("input", handleBudgetTableInput);
}
function setupInputListeners() {
  document
    .getElementById("totalSurface")
    ?.addEventListener("input", updateConstructionEstimate);
  document
    .getElementById("constructionValue")
    ?.addEventListener("input", updateConstructionEstimate);
  document
    .getElementById("laborPercentage")
    ?.addEventListener("input", updateBudgetTotals);
  document
    .getElementById("honorariosType")
    ?.addEventListener("change", updateHonorariosPercentage);
  document
    .getElementById("honorariosPercentage")
    ?.addEventListener("input", calculateHonorarios);
  document.getElementById("taxIVA")?.addEventListener("change", calculateTaxes);
  document
    .getElementById("taxIIBB")
    ?.addEventListener("change", calculateTaxes);
  document
    .getElementById("taxIIBBPercentage")
    ?.addEventListener("input", calculateTaxes);
  document
    .getElementById("taxGanancias")
    ?.addEventListener("change", calculateTaxes);
  document
    .getElementById("taxGananciasPercentage")
    ?.addEventListener("input", calculateTaxes);
  document
    .getElementById("taxMunicipal")
    ?.addEventListener("change", calculateTaxes);
  document
    .getElementById("taxMunicipalPercentage")
    ?.addEventListener("input", calculateTaxes);
}
function addBudgetRow() {
  const tableBody = document.getElementById("budgetTableBody");
  if (!tableBody) return;
  const rowCount = tableBody.querySelectorAll("tr").length + 1;
  const newRow = document.createElement("tr");
  newRow.className = "table-row";
  newRow.innerHTML = `
      <td>${rowCount}</td>
      <td><input type="text" name="itemDesc[]" placeholder="Descripción" required /></td>
      <td>
        <select name="itemUnit[]" required>
          <option value="m2">m²</option>
          <option value="m3">m³</option>
          <option value="ml">ml</option>
          <option value="u">u</option>
          <option value="gl">gl</option>
        </select>
      </td>
      <td><input type="number" name="itemQty[]" min="0.01" step="0.01" placeholder="0.00" required class="qty-input" /></td>
      <td><input type="number" name="itemPrice[]" min="0.01" step="0.01" placeholder="0.00" required class="price-input" /></td>
      <td class="subtotal">0.00</td>
      <td><button type="button" class="btn-icon delete-row" id="deleteRowId${rowCount}"><i class="fas fa-trash"></i></button></td>
    `;
  tableBody.appendChild(newRow);
  updateTableRowNumbers();
}
function updateTableRowNumbers() {
  const tableBody = document.getElementById("budgetTableBody");
  if (!tableBody) return;
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row, index) => {
    const firstCell = row.querySelector("td:first-child");
    if (firstCell) {
      firstCell.textContent = index + 1;
    }
  });
}
function handleBudgetTableClick(event) {
  if (
    event.target.classList.contains("delete-row") ||
    event.target.closest(".delete-row")
  ) {
    const row = event.target.closest("tr");
    if (row && row.parentNode) {
      row.parentNode.removeChild(row);
      updateTableRowNumbers();
      updateBudgetTotals();
    }
  }
}
function handleBudgetTableInput(event) {
  const input = event.target;
  if (
    input.classList.contains("qty-input") ||
    input.classList.contains("price-input")
  ) {
    const row = input.closest("tr");
    if (row) {
      updateRowSubtotal(row);
      updateBudgetTotals();
    }
  }
}
const totalSurfaceInput = document.getElementById("totalSurface");
if (totalSurfaceInput) {
  totalSurfaceInput.addEventListener("focus", () => {
    totalSurfaceInput.value = totalSurfaceInput.value.replace(" m²", "").trim();
  });
  totalSurfaceInput.addEventListener("blur", () => {
    if (totalSurfaceInput.value !== "") {
      totalSurfaceInput.value = `${totalSurfaceInput.value.trim()} m²`;
    }
  });
}
function updateRowSubtotal(row) {
  const qtyInput = row.querySelector(".qty-input");
  const priceInput = row.querySelector(".price-input");
  const subtotalCell = row.querySelector(".subtotal");
  if (qtyInput && priceInput && subtotalCell) {
    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const subtotal = qty * price;
    subtotalCell.textContent = formatCurrency(subtotal);
    subtotalCell.setAttribute("data-value", subtotal); // Guardar el valor original para cálculos
  }
}
function updateBudgetTotals() {
  const tableBody = document.getElementById("budgetTableBody");
  if (!tableBody) return;
  let materialsTotal = 0;
  const rows = tableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    const subtotalCell = row.querySelector(".subtotal");
    if (subtotalCell) {
      const value = subtotalCell.hasAttribute("data-value")
        ? parseFloat(subtotalCell.getAttribute("data-value"))
        : parseFloat(
            subtotalCell.textContent.replace(/[^\d,-]/g, "").replace(",", ".")
          ) || 0;
      materialsTotal += value;
    }
  });
  const subtotalMaterialsElement = document.getElementById("subtotalMaterials");
  if (subtotalMaterialsElement) {
    subtotalMaterialsElement.textContent = formatCurrency(materialsTotal);
    subtotalMaterialsElement.setAttribute("data-value", materialsTotal);
  }
  const laborPercentageInput = document.getElementById("laborPercentage");
  const subtotalLaborElement = document.getElementById("subtotalLabor");
  const totalCostElement = document.getElementById("totalCost");
  if (laborPercentageInput && subtotalLaborElement && totalCostElement) {
    const laborPercentage = parseFloat(laborPercentageInput.value) || 0;
    const laborCost = (materialsTotal * laborPercentage) / 100;
    const totalCost = materialsTotal + laborCost;
    subtotalLaborElement.textContent = formatCurrency(laborCost);
    subtotalLaborElement.setAttribute("data-value", laborCost);
    totalCostElement.textContent = formatCurrency(totalCost);
    totalCostElement.setAttribute("data-value", totalCost);
    calculateHonorarios();
  }
}
function updateConstructionEstimate() {
  const totalSurfaceInput = document.getElementById("totalSurface");
  const constructionValueInput = document.getElementById("constructionValue");
  const totalCostElement = document.getElementById("totalCost");
  if (totalSurfaceInput && constructionValueInput && totalCostElement) {
    const totalSurface = parseFloat(totalSurfaceInput.value) || 0;
    const constructionValue = parseFloat(constructionValueInput.value) || 0;
    const totalCost = totalSurface * constructionValue;
    totalCostElement.textContent = totalCost.toFixed(2);
    calculateHonorarios();
  }
}
function updateHonorariosPercentage() {
  const honorariosTypeSelect = document.getElementById("honorariosType");
  const honorariosPercentageInput = document.getElementById(
    "honorariosPercentage"
  );
  if (honorariosTypeSelect && honorariosPercentageInput) {
    const totalCostElement = document.getElementById("totalCost");
    const totalCost = parseFloat(totalCostElement.textContent) || 0;
    let basePercentage = 100.0; // Valor por defecto
    if (totalCost > 100000000) {
      basePercentage = 5.5;
    } else if (totalCost > 50000000) {
      basePercentage = 6.0;
    } else if (totalCost > 10000000) {
      basePercentage = 6.5;
    }
    const type = honorariosTypeSelect.value;
    let adjustedPercentage = basePercentage;
    if (type === "proyecto") {
      adjustedPercentage = basePercentage * 0.6;
    } else if (type === "direccion") {
      adjustedPercentage = basePercentage * 0.4;
    }
    honorariosPercentageInput.value = adjustedPercentage.toFixed(2);
    calculateHonorarios();
  }
}
function calculateHonorarios() {
  const totalCostElement = document.getElementById("totalCost");
  const honorariosPercentageInput = document.getElementById(
    "honorariosPercentage"
  );
  if (totalCostElement && honorariosPercentageInput) {
    const totalCost = totalCostElement.hasAttribute("data-value")
      ? parseFloat(totalCostElement.getAttribute("data-value"))
      : parseFloat(
          totalCostElement.textContent.replace(/[^\d,-]/g, "").replace(",", ".")
        ) || 0;
    const honorariosPercentage =
      parseFloat(honorariosPercentageInput.value) || 0;
    const honorariosProfesionales = (totalCost * honorariosPercentage) / 100;
    const aportesPrevisionales = honorariosProfesionales * 0.16;
    const aportesColegiales = honorariosProfesionales * 0.05;
    const honorariosProfesionalesElement = document.getElementById(
      "honorariosProfesionales"
    );
    const aportesProvisionalesElement = document.getElementById(
      "aportesPrevisionales"
    );
    const aportesColegialesElement =
      document.getElementById("aportesColegiales");
    const honorariosBaseElement = document.getElementById("honorariosBase");
    if (honorariosProfesionalesElement) {
      honorariosProfesionalesElement.textContent = formatCurrency(
        honorariosProfesionales
      );
      honorariosProfesionalesElement.setAttribute(
        "data-value",
        honorariosProfesionales
      );
    }
    if (aportesProvisionalesElement) {
      aportesProvisionalesElement.textContent =
        formatCurrency(aportesPrevisionales);
      aportesProvisionalesElement.setAttribute(
        "data-value",
        aportesPrevisionales
      );
    }
    if (aportesColegialesElement) {
      aportesColegialesElement.textContent = formatCurrency(aportesColegiales);
      aportesColegialesElement.setAttribute("data-value", aportesColegiales);
    }
    if (honorariosBaseElement) {
      honorariosBaseElement.textContent = formatCurrency(
        honorariosProfesionales
      );
      honorariosBaseElement.setAttribute("data-value", honorariosProfesionales);
    }
    calculateTaxes();
  }
}
function calculateTaxes() {
  const honorariosBaseElement = document.getElementById("honorariosBase");
  if (!honorariosBaseElement) return;
  const honorariosBase = honorariosBaseElement.hasAttribute("data-value")
    ? parseFloat(honorariosBaseElement.getAttribute("data-value"))
    : parseFloat(
        honorariosBaseElement.textContent
          .replace(/[^\d,-]/g, "")
          .replace(",", ".")
      ) || 0;
  const ivaCheckbox = document.getElementById("taxIVA");
  const ivaAmountElement = document.getElementById("ivaAmount");
  let ivaAmount = 0;
  if (ivaCheckbox && ivaCheckbox.checked) {
    ivaAmount = honorariosBase * 0.21;
  }
  if (ivaAmountElement) {
    ivaAmountElement.textContent = formatCurrency(ivaAmount);
    ivaAmountElement.setAttribute("data-value", ivaAmount);
  }
  const iibbCheckbox = document.getElementById("taxIIBB");
  const iibbPercentageInput = document.getElementById("taxIIBBPercentage");
  const iibbAmountElement = document.getElementById("iibbAmount");
  let iibbAmount = 0;
  if (iibbCheckbox && iibbCheckbox.checked && iibbPercentageInput) {
    const iibbPercentage = parseFloat(iibbPercentageInput.value) || 0;
    iibbAmount = honorariosBase * (iibbPercentage / 100);
  }
  if (iibbAmountElement) {
    iibbAmountElement.textContent = formatCurrency(iibbAmount);
    iibbAmountElement.setAttribute("data-value", iibbAmount);
  }
  const gananciasCheckbox = document.getElementById("taxGanancias");
  const gananciasPercentageInput = document.getElementById(
    "taxGananciasPercentage"
  );
  const gananciasAmountElement = document.getElementById("gananciasAmount");
  let gananciasAmount = 0;
  if (
    gananciasCheckbox &&
    gananciasCheckbox.checked &&
    gananciasPercentageInput
  ) {
    const gananciasPercentage = parseFloat(gananciasPercentageInput.value) || 0;
    gananciasAmount = honorariosBase * (gananciasPercentage / 100);
  }
  if (gananciasAmountElement) {
    gananciasAmountElement.textContent = formatCurrency(gananciasAmount);
    gananciasAmountElement.setAttribute("data-value", gananciasAmount);
  }
  const municipalCheckbox = document.getElementById("taxMunicipal");
  const municipalPercentageInput = document.getElementById(
    "taxMunicipalPercentage"
  );
  const municipalAmountElement = document.getElementById("municipalAmount");
  let municipalAmount = 0;
  if (
    municipalCheckbox &&
    municipalCheckbox.checked &&
    municipalPercentageInput
  ) {
    const municipalPercentage = parseFloat(municipalPercentageInput.value) || 0;
    municipalAmount = honorariosBase * (municipalPercentage / 100);
  }
  if (municipalAmountElement) {
    municipalAmountElement.textContent = formatCurrency(municipalAmount);
    municipalAmountElement.setAttribute("data-value", municipalAmount);
  }
  const totalHonorariosElement = document.getElementById("totalHonorarios");
  const totalAportesElement = document.getElementById("totalAportes");
  const totalFacturarElement = document.getElementById("totalFacturar");
  if (totalHonorariosElement && totalAportesElement && totalFacturarElement) {
    const totalHonorarios =
      honorariosBase +
      ivaAmount +
      iibbAmount +
      gananciasAmount +
      municipalAmount;
    const aportesPrevisionales = document
      .getElementById("aportesPrevisionales")
      .hasAttribute("data-value")
      ? parseFloat(
          document
            .getElementById("aportesPrevisionales")
            .getAttribute("data-value")
        )
      : parseFloat(
          document
            .getElementById("aportesPrevisionales")
            .textContent.replace(/[^\d,-]/g, "")
            .replace(",", ".")
        ) || 0;
    const aportesColegiales = document
      .getElementById("aportesColegiales")
      .hasAttribute("data-value")
      ? parseFloat(
          document
            .getElementById("aportesColegiales")
            .getAttribute("data-value")
        )
      : parseFloat(
          document
            .getElementById("aportesColegiales")
            .textContent.replace(/[^\d,-]/g, "")
            .replace(",", ".")
        ) || 0;
    const totalAportes = aportesPrevisionales + aportesColegiales;
    const totalFacturar = totalHonorarios + totalAportes;
    totalHonorariosElement.textContent = formatCurrency(totalHonorarios);
    totalHonorariosElement.setAttribute("data-value", totalHonorarios);
    totalAportesElement.textContent = formatCurrency(totalAportes);
    totalAportesElement.setAttribute("data-value", totalAportes);
    totalFacturarElement.textContent = formatCurrency(totalFacturar);
    totalFacturarElement.setAttribute("data-value", totalFacturar);
    updateSummarySection();
  }
}
function calculateAll() {
  updateBudgetTotals();
  calculateHonorarios();
  calculateTaxes();
  updateSummarySection();
}
function resetForm() {
  document.getElementById("taxCalculatorForm").reset();
  const tableBody = document.getElementById("budgetTableBody");
  if (tableBody) {
    tableBody.innerHTML = `
            <tr class="table-row">
              <td>1</td>
              <td><input type="text" name="itemDesc[]" placeholder="Descripción" required /></td>
              <td>
                <select name="itemUnit[]" required>
                  <option value="m2">m²</option>
                  <option value="m3">m³</option>
                  <option value="ml">ml</option>
                  <option value="u">u</option>
                  <option value="gl">gl</option>
                </select>
              </td>
              <td><input type="number" name="itemQty[]" min="0.01" step="0.01" placeholder="0.00" required class="qty-input" /></td>
              <td><input type="number" name="itemPrice[]" min="0.01" step="0.01" placeholder="0.00" required class="price-input" /></td>
              <td class="subtotal">0.00</td>
              <td><button type="button" class="btn-icon delete-row"><i class="fas fa-trash"></i></button></td>
            </tr>
          `;
  }
  document.getElementById("laborPercentage").value = "30";
  document.getElementById("honorariosPercentage").value = "100.00";
  document.getElementById("taxIVA").checked = true;
  document.getElementById("taxIIBB").checked = true;
  document.getElementById("taxIIBBPercentage").value = "3.50";
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete("edit");
  urlParams.delete("completed");
  const newUrl = urlParams.toString()
    ? `${window.location.pathname}?${urlParams.toString()}`
    : window.location.pathname;
  window.history.pushState({}, "", newUrl);
  activeCalculation = null;
  updateBudgetTotals();
  calculateAll();
  window.location.reload();
  const saveAsDraftBtn = document.getElementById("saveAsDraftBtn");
  saveAsDraftBtn.innerHTML = `<i class="fas fa-save"></i> Guardar Cálculo`;
}
function saveAsDraft() {
  if (!currentUser) {
    alert("Debe iniciar sesión para guardar cálculos.");
    return;
  }
  const calculationData = collectFormData();
  calculationData.status = "draft";
  saveCalculationToFirebase(calculationData);
  showMessage("Cómputo guardado exitosamente", "success");
}
async function saveCalculation(event) {
  if (event) event.preventDefault();
  if (!currentUser) {
    alert("Debe iniciar sesión para guardar cálculos.");
    return;
  }
  const form = document.getElementById("taxCalculatorForm");
  if (form && !form.checkValidity()) {
    alert("Por favor complete todos los campos requeridos antes de guardar.");
    return;
  }
  const calculationData = collectFormData();
  calculationData.status = "completed";
  const saveAsDraftBtn = document.getElementById("saveAsDraftBtn");
  if (saveAsDraftBtn) {
    saveAsDraftBtn.style.display = "none";
  }
  const calculationId = await saveCalculationToFirebase(calculationData);
  if (calculationId) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const project = urlParams.get("project");
    const professional = urlParams.get("professional");
    if (id && project && professional) {
      const newParams = new URLSearchParams();
      newParams.set("id", id);
      newParams.set("project", project);
      newParams.set("professional", professional);
      newParams.set("completed", calculationId); // usar el ID que se acaba de guardar
      const newUrl = `${window.location.origin}${
        window.location.pathname
      }?${newParams.toString()}`;
      window.history.pushState({}, "", newUrl);
    }
  }
  setTimeout(() => {
    window.location.reload;
  }, 2000);
}
function collectFormData() {
  const form = document.getElementById("taxCalculatorForm");
  const formData = new FormData(form);
  const projectData = {
    title: formData.get("projectTitle"),
    type: formData.get("projectType"),
    location: formData.get("projectLocation"),
    description: formData.get("projectDescription"),
  };
  const clientData = {
    name: formData.get("clientName"),
    document: formData.get("clientDocument"),
    address: formData.get("clientAddress"),
    phone: formData.get("clientNumber"),
    email: formData.get("clientContact"),
  };
  const professionalData = {
    name: formData.get("professionalName"),
    document: formData.get("professionalDocument"),
    matricula: formData.get("professionalMatricula"),
    taxCategory: formData.get("professionalCategory"),
  };
  const calculationParams = {
    surfaceType: formData.get("surfaceType"),
    constructionQuality: formData.get("constructionQuality"),
    totalSurface: parseFloat(formData.get("totalSurface")) || 0,
    constructionValue: parseFloat(formData.get("constructionValue")) || 0,
  };
  const budgetItems = [];
  const itemDescriptions = formData.getAll("itemDesc[]");
  const itemUnits = formData.getAll("itemUnit[]");
  const itemQuantities = formData.getAll("itemQty[]");
  const itemPrices = formData.getAll("itemPrice[]");
  for (let i = 0; i < itemDescriptions.length; i++) {
    if (itemDescriptions[i]) {
      budgetItems.push({
        description: itemDescriptions[i],
        unit: itemUnits[i],
        quantity: parseFloat(itemQuantities[i]) || 0,
        price: parseFloat(itemPrices[i]) || 0,
        subtotal:
          (parseFloat(itemQuantities[i]) || 0) *
          (parseFloat(itemPrices[i]) || 0),
      });
    }
  }
  const honorariosData = {
    type: formData.get("honorariosType"),
    percentage: parseFloat(formData.get("honorariosPercentage")) || 0,
    laborPercentage: parseFloat(formData.get("laborPercentage")) || 0,
    materials:
      parseFloat(document.getElementById("subtotalMaterials").textContent) || 0,
    labor:
      parseFloat(document.getElementById("subtotalLabor").textContent) || 0,
    totalCost:
      parseFloat(document.getElementById("totalCost").textContent) || 0,
    honorariosProfesionales:
      parseFloat(
        document.getElementById("honorariosProfesionales").textContent
      ) || 0,
    aportesPrevisionales:
      parseFloat(document.getElementById("aportesPrevisionales").textContent) ||
      0,
    aportesColegiales:
      parseFloat(document.getElementById("aportesColegiales").textContent) || 0,
  };
  const taxData = {
    ivaApplied: document.getElementById("taxIVA").checked,
    ivaAmount:
      parseFloat(document.getElementById("ivaAmount").textContent) || 0,
    iibbApplied: document.getElementById("taxIIBB").checked,
    iibbPercentage: parseFloat(formData.get("taxIIBBPercentage")) || 0,
    iibbAmount:
      parseFloat(document.getElementById("iibbAmount").textContent) || 0,
    gananciasApplied: document.getElementById("taxGanancias").checked,
    gananciasPercentage:
      parseFloat(formData.get("taxGananciasPercentage")) || 0,
    gananciasAmount:
      parseFloat(document.getElementById("gananciasAmount").textContent) || 0,
    municipalApplied: document.getElementById("taxMunicipal").checked,
    municipalPercentage:
      parseFloat(formData.get("taxMunicipalPercentage")) || 0,
    municipalAmount:
      parseFloat(document.getElementById("municipalAmount").textContent) || 0,
    totalHonorarios:
      parseFloat(document.getElementById("totalHonorarios").textContent) || 0,
    totalAportes:
      parseFloat(document.getElementById("totalAportes").textContent) || 0,
    totalFacturar:
      parseFloat(document.getElementById("totalFacturar").textContent) || 0,
  };
  return {
    template: selectedTemplate,
    project: projectData,
    client: clientData,
    professional: professionalData,
    params: calculationParams,
    budget: {
      items: budgetItems,
      subtotalMaterials:
        parseFloat(document.getElementById("subtotalMaterials").textContent) ||
        0,
      laborPercentage: parseFloat(formData.get("laborPercentage")) || 0,
      subtotalLabor:
        parseFloat(document.getElementById("subtotalLabor").textContent) || 0,
      totalCost:
        parseFloat(document.getElementById("totalCost").textContent) || 0,
    },
    honorarios: honorariosData,
    taxes: taxData,
    createdAt: serverTimestamp(),
    userId: currentUserId,
    sharedWithClients: [],
  };
}
async function saveCalculationToFirebase(calculationData) {
  try {
    let calculationId = null;
    if (activeCalculation && activeCalculation.id) {
      calculationId = activeCalculation.id;
      await updateDoc(doc(db, "calculations", calculationId), calculationData);
    } else {
      const docRef = await addDoc(
        collection(db, "calculations"),
        calculationData
      );
      calculationId = docRef.id;
    }
    document.getElementById(
      "saveAsDraftBtn"
    ).innerHTML = `<i class="fas fa-save"></i> Actualizar Cálculo`;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("completed");
    urlParams.set("edit", calculationId);
    const newSearch = urlParams.toString(); // e.g. "edit=ABC123"
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;
    window.history.pushState({}, "", newUrl);
    loadCalculationHistory(); // Recargar historial
    const calculationDoc = await getDoc(doc(db, "calculations", calculationId));
    activeCalculation = { id: calculationId, ...calculationDoc.data() };
    return calculationId;
  } catch (error) {
    console.error("Error al guardar el cálculo:", error);
    alert("Error al guardar el cálculo. Por favor intente nuevamente.");
    return null;
  }
}
async function loadCalculationHistory() {
  if (!currentUserId) return;
  try {
    const calculationsQuery = query(
      collection(db, "calculations"),
      where("userId", "==", currentUserId),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const querySnapshot = await getDocs(calculationsQuery);
    calculationHistory = [];
    querySnapshot.forEach((doc) => {
      calculationHistory.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    updateCalculationHistoryUI();
  } catch (error) {
    console.error("Error al cargar el historial:", error);
  }
}
function updateCalculationHistoryUI() {
  const historyList = document.getElementById("calculationHistory");
  if (!historyList) return;
  historyList.innerHTML = "";
  if (calculationHistory.length === 0) {
    historyList.innerHTML =
      '<p class="empty-history">No hay cálculos guardados.</p>';
    return;
  }
  calculationHistory.forEach((calculation) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    const statusClass = calculation.status === "draft" ? "draft" : "completed";
    historyItem.innerHTML = `
      <div class="history-item-header">
        <h4>${calculation.project.title || "Sin título"}</h4>
        <span class="history-status ${statusClass}">${
      calculation.status === "draft" ? "Borrador" : "Completo"
    }</span>
      </div>
      <div class="history-item-details">
        <p><i class="fas fa-building"></i> ${
          calculation.client.name || "Cliente sin especificar"
        }</p>
        <p><i class="fas fa-calendar"></i> ${formatTimestamp(
          calculation.createdAt
        )}</p>
      </div>
      <div class="history-item-actions">
        ${
          calculation.status === "completed"
            ? `<button class="btn-icon view-calculation" data-id="${calculation.id}"><i class="fas fa-eye"></i></button>`
            : `<button class="btn-icon load-calculation" data-id="${calculation.id}"><i class="fas fa-edit"></i></button>`
        }
        <button class="btn-icon delete-calculation" data-id="${
          calculation.id
        }"><i class="fas fa-trash"></i></button>
      </div>
    `;
    if (calculation.status === "completed") {
      historyItem
        .querySelector(".view-calculation")
        .addEventListener("click", () => {
          loadCalculation(calculation.id);
        });
    } else {
      historyItem
        .querySelector(".load-calculation")
        .addEventListener("click", () => {
          loadCalculation(calculation.id);
        });
    }
    historyItem
      .querySelector(".delete-calculation")
      .addEventListener("click", () => {
        deleteCalculation(calculation.id);
      });
    historyList.appendChild(historyItem);
  });
}
function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return "Fecha desconocida";
  }
  const date = timestamp.toDate();
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatCurrency(amount) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return "0,00";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}
async function loadCalculation(calculationId) {
  try {
    console.log("Loading calculation with ID:", calculationId);
    const docRef = doc(db, "calculations", calculationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const calculationData = docSnap.data();
      console.log("Calculation data loaded:", calculationData);
      activeCalculation = { id: calculationId, ...calculationData };
      fillFormWithCalculation(calculationData);
      calculateAll();
      const urlParams = new URLSearchParams(window.location.search);
      const isCompleted = urlParams.has("completed");
      const mode = isCompleted ? "completed" : "edit";
      if (isCompleted) {
        setFormReadOnly(true);
      }
      if (!urlParams.has(mode)) {
        urlParams.set(mode, calculationId);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({ calculationId }, "", newUrl);
      }
      console.log("Calculation loaded successfully");
      if (urlParams.has("edit")) {
        document.getElementById(
          "saveAsDraftBtn"
        ).innerHTML = `<i class="fas fa-save"></i> Actualizar Cálculo`;
      }
      if (isCompleted) {
        setTimeout(() => setFormReadOnly(true), 0);
      }
      showMessage("Datos cargados correctamente", "success");
    } else {
      console.error("Calculation not found:", calculationId);
      showMessage("El cálculo solicitado no existe", "error");
    }
  } catch (error) {
    console.error("Error loading calculation:", error);
    showMessage("Error al cargar el cálculo", "error");
  }
}
function checkUrlForCalculationId() {
  let urlParams = new URLSearchParams(window.location.search);
  let calculationId = urlParams.get("edit") || urlParams.get("completed");
  if (calculationId) {
    loadCalculation(calculationId);
    if (urlParams.has("completed") && !urlParams.has("edit")) {
      setFormReadOnly();
      document.getElementById("saveAsDraftBtn").style.display = "none"; // Small delay to ensure calculation is loaded
    }
  }
}
function setFormReadOnly(readOnly) {
  console.trace("setFormReadOnly called with:", readOnly);
  const form = document.getElementById("taxCalculatorForm");
  const editableFields = form.querySelectorAll(
    "input:not([type=button]):not([type=submit]), textarea, select"
  );
  editableFields.forEach((el) => {
    el.readOnly = readOnly;
    el.disabled = readOnly;
    if (["checkbox", "radio"].includes(el.type)) {
      el.onclick = readOnly
        ? (e) => {
            e.preventDefault();
            return false;
          }
        : null;
    }
  });
  const toggleDisplay = (id) => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = readOnly ? "none" : "block";
  };
  [
    "addItemBtn",
    "saveCalculationBtn",
    "resetFormBtn",
    "calculateBtn",
    "importExcelBtn",
  ].forEach(toggleDisplay);
  document
    .querySelectorAll(".delete-row")
    .forEach((btn) => (btn.style.display = readOnly ? "none" : "block"));
}
function fillFormWithCalculation(calculationData) {
  console.log("Loading calculation data:", calculationData);
  document.getElementById("projectTitle").value =
    calculationData.project.title || "";
  document.getElementById("projectType").value =
    calculationData.project.type || "";
  document.getElementById("projectLocation").value =
    calculationData.project.location || "";
  document.getElementById("projectDescription").value =
    calculationData.project.description || "";
  document.getElementById("clientName").value =
    calculationData.client.name || "";
  document.getElementById("clientDocument").value =
    calculationData.client.document || "";
  document.getElementById("clientAddress").value =
    calculationData.client.address || "";
  document.getElementById("clientNumber").value =
    calculationData.client.phone || "";
  document.getElementById("clientContact").value =
    calculationData.client.email || "";
  document.getElementById("professionalName").value =
    calculationData.professional.name || "";
  document.getElementById("professionalDocument").value =
    calculationData.professional.document || "";
  document.getElementById("professionalMatricula").value =
    calculationData.professional.matricula || "";
  document.getElementById("professionalCategory").value =
    calculationData.professional.taxCategory || "";
  document.getElementById("surfaceType").value =
    calculationData.params.surfaceType || "";
  document.getElementById("constructionQuality").value =
    calculationData.params.constructionQuality || "";
  document.getElementById("totalSurface").value =
    calculationData.params.totalSurface || "";
  let budgetTableBody = document.getElementById("budgetTableBody");
  if (
    budgetTableBody &&
    calculationData.budget &&
    calculationData.budget.items
  ) {
    budgetTableBody.innerHTML = "";
    calculationData.budget.items.forEach((item, index) => {
      let row = document.createElement("tr");
      row.className = "table-row";
      row.innerHTML = `
        <td>${index + 1}</td>
        <td><input type="text" name="itemDesc[]" value="${
          item.description
        }" placeholder="Descripción" required /></td>
        <td>
          <select name="itemUnit[]" required>
            <option value="m2" ${
              item.unit === "m2" ? "selected" : ""
            }>m²</option>
            <option value="m3" ${
              item.unit === "m3" ? "selected" : ""
            }>m³</option>
            <option value="ml" ${
              item.unit === "ml" ? "selected" : ""
            }>ml</option>
            <option value="u" ${item.unit === "u" ? "selected" : ""}>u</option>
            <option value="gl" ${
              item.unit === "gl" ? "selected" : ""
            }>gl</option>
          </select>
        </td>
        <td><input type="number" name="itemQty[]" value="${
          item.quantity
        }" min="0.01" step="0.01" placeholder="0.00" required class="qty-input" /></td>
        <td><input type="number" name="itemPrice[]" value="${
          item.price
        }" min="0.01" step="0.01" placeholder="0.00" required class="price-input" /></td>
        <td class="subtotal" data-value="${item.subtotal}">${formatCurrency(
        item.subtotal
      )}</td>
        <td><button type="button" class="btn-icon delete-row"><i class="fas fa-trash"></i></button></td>
      `;
      budgetTableBody.appendChild(row);
    });
  }
  document.getElementById("laborPercentage").value =
    calculationData.honorarios.laborPercentage || "30";
  document.getElementById("honorariosType").value =
    calculationData.honorarios.type || "ambos";
  document.getElementById("honorariosPercentage").value =
    calculationData.honorarios.percentage || "100.00";
  document.getElementById("taxIVA").checked = calculationData.taxes.ivaApplied;
  document.getElementById("taxIIBB").checked =
    calculationData.taxes.iibbApplied;
  document.getElementById("taxIIBBPercentage").value =
    calculationData.taxes.iibbPercentage || "3.50";
  document.getElementById("taxGanancias").checked =
    calculationData.taxes.gananciasApplied;
  document.getElementById("taxGananciasPercentage").value =
    calculationData.taxes.gananciasPercentage || "25.00";
  document.getElementById("taxMunicipal").checked =
    calculationData.taxes.municipalApplied;
  document.getElementById("taxMunicipalPercentage").value =
    calculationData.taxes.municipalPercentage || "1.20";
  calculateAll();
}
function updateButtonVisibility() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCompleted = urlParams.has("completed");
  const isEdit = urlParams.has("edit");
  const deleteButton = document.getElementById("deleteCalculationBtn");
  if (!deleteButton) {
    console.error("Botón de eliminar no encontrado");
    return;
  }
  if (isCompleted || isEdit) {
    deleteButton.style.display = "block"; // o "inline-block" dependiendo de tu diseño
    deleteButton.removeEventListener("click", deleteButtonHandler);
    deleteButton.addEventListener("click", deleteButtonHandler);
  } else {
    deleteButton.style.display = "none";
  }
}
function deleteButtonHandler() {
  const calculationIdToDelete = activeCalculation.id;
  if (calculationIdToDelete) {
    deleteCalculation(calculationIdToDelete);
  } else {
    console.error("No hay ID de cálculo para eliminar.");
    showMessage("No se puede eliminar: ID de cálculo no encontrado.", "error");
  }
}
document.addEventListener("DOMContentLoaded", updateButtonVisibility);
function setupHistoryListener() {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    updateButtonVisibility(); // Actualizar el botón cuando cambie la URL
  };
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    updateButtonVisibility(); // Actualizar el botón cuando cambie la URL
  };
  window.addEventListener("popstate", updateButtonVisibility);
}
setupHistoryListener();
async function deleteCalculation(id) {
  try {
    await deleteDoc(doc(db, "calculations", id));
    showMessage(
      "Cálculo eliminado correctamente. Serás redirigido al inicio.",
      "success"
    );
    setTimeout(() => {
      if (activeCalculation && activeCalculation.id === id) {
        activeCalculation = null;
        resetForm();
        let params = new URLSearchParams(window.location.search);
        params.delete("edit");
        params.delete("completed");
        window.location.href = "index.html";
        return;
      }
    }, 3000);
  } catch (error) {
    console.error("Error al eliminar el cálculo:", error);
    showMessage("Error al eliminar el cálculo", "error");
  }
}
function generatePDF() {
  if (!validateRequiredFields()) {
    showMessage(
      "Porfavor completa todos los campos antes de generar el PDF",
      "error"
    );
    return;
  }
}
function validateRequiredFields() {
  const form = document.getElementById("taxCalculatorForm");
  return form.checkValidity();
}
function generatePreviewContent() {
  const projectTitle = document.getElementById("projectTitle").value;
  const projectType = document.getElementById("projectType").value;
  const clientName = document.getElementById("clientName").value;
  const professionalName = document.getElementById("professionalName").value;
  const totalCostFormatted = document.getElementById("totalCost").textContent;
  const totalHonorariosFormatted =
    document.getElementById("totalHonorarios").textContent;
  const totalAportesFormatted =
    document.getElementById("totalAportes").textContent;
  const totalFacturarFormatted =
    document.getElementById("totalFacturar").textContent;
  const currentDate = new Date().toLocaleDateString("es-AR");
  return `
      <div class="preview-header">
        <h2>Presupuesto de Honorarios Profesionales</h2>
        <p class="preview-date">Fecha: ${currentDate}</p>
      </div>
      <div class="preview-section">
        <h3>Información del Proyecto</h3>
        <div class="preview-row">
          <div class="preview-label">Título del Proyecto:</div>
          <div class="preview-value">${projectTitle}</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Tipo de Proyecto:</div>
          <div class="preview-value">${projectType}</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Ubicación:</div>
          <div class="preview-value">${
            document.getElementById("projectLocation").value
          }</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Descripción:</div>
          <div class="preview-value">${
            document.getElementById("projectDescription").value
          }</div>
        </div>
      </div>
      <div class="preview-section">
        <h3>Información del Cliente</h3>
        <div class="preview-row">
          <div class="preview-label">Nombre/Razón Social:</div>
          <div class="preview-value">${clientName}</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">DNI/CUIT:</div>
          <div class="preview-value">${
            document.getElementById("clientDocument").value
          }</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Domicilio Legal:</div>
          <div class="preview-value">${
            document.getElementById("clientAddress").value
          }</div>
        </div>
      </div>
      <div class="preview-section">
        <h3>Información del Profesional</h3>
        <div class="preview-row">
          <div class="preview-label">Nombre/Razón Social:</div>
          <div class="preview-value">${professionalName}</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">DNI/CUIT:</div>
          <div class="preview-value">${
            document.getElementById("professionalDocument").value
          }</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Matrícula Profesional:</div>
          <div class="preview-value">${
            document.getElementById("professionalMatricula").value
          }</div>
        </div>
      </div>
      <div class="preview-section">
        <h3>Cómputo y Presupuesto</h3>
        <table class="preview-table">
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${generateBudgetTableRows()}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right"><strong>Subtotal Materiales:</strong></td>
              <td>ARS ${
                document.getElementById("subtotalMaterials").textContent
              }</td>
            </tr>
            <tr>
              <td colspan="5" class="text-right"><strong>Mano de Obra (${
                document.getElementById("laborPercentage").value
              }%):</strong></td>
              <td>ARS ${
                document.getElementById("subtotalLabor").textContent
              }</td>
            </tr>
            <tr>
              <td colspan="5" class="text-right"><strong>Costo Total de Obra:</strong></td>
              <td>ARS ${totalCostFormatted}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="preview-section">
        <h3>Honorarios Profesionales</h3>
        <div class="preview-row">
          <div class="preview-label">Tipo de Honorarios:</div>
          <div class="preview-value">${getHonorariosTypeText()}</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Porcentaje Aplicado:</div>
          <div class="preview-value">${
            document.getElementById("honorariosPercentage").value
          }%</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Honorarios Profesionales:</div>
          <div class="preview-value">ARS ${
            document.getElementById("honorariosProfesionales").textContent
          }</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Aportes Previsionales (16%):</div>
          <div class="preview-value">ARS ${
            document.getElementById("aportesPrevisionales").textContent
          }</div>
        </div>
        <div class="preview-row">
          <div class="preview-label">Aportes Colegiales (5%):</div>
          <div class="preview-value">ARS ${
            document.getElementById("aportesColegiales").textContent
          }</div>
        </div>
      </div>
      <div class="preview-section">
        <h3>Resumen de Impuestos</h3>
        ${generateTaxesPreview()}
        <div class="preview-row total">
          <div class="preview-label">TOTAL HONORARIOS (con impuestos):</div>
          <div class="preview-value">ARS ${totalHonorariosFormatted}</div>
        </div>
        <div class="preview-row total">
          <div class="preview-label">TOTAL APORTES:</div>
          <div class="preview-value">ARS ${totalAportesFormatted}</div>
        </div>
        <div class="preview-row grand-total">
          <div class="preview-label">TOTAL A FACTURAR:</div>
          <div class="preview-value">ARS ${totalFacturarFormatted}</div>
        </div>
      </div>
      <div class="preview-section">
        <h3>Condiciones Generales</h3>
        <ul>
          <li>Los valores están expresados en Pesos Argentinos (ARS).</li>
          <li>El presupuesto tiene una validez de 30 días.</li>
          <li>Forma de pago a convenir.</li>
          <li>Los aportes previsionales y colegiales son obligatorios según normativa vigente.</li>
        </ul>
      </div>
      <div class="preview-footer">
        <div class="preview-signature">
          <div class="signature-line"></div>
          <p>${professionalName}</p>
          <p>Mat. Prof. ${
            document.getElementById("professionalMatricula").value
          }</p>
        </div>
      </div>
    `;
}
function generateBudgetTableRows() {
  const tableBody = document.getElementById("budgetTableBody");
  let rows = "";
  if (tableBody) {
    const tableRows = tableBody.querySelectorAll("tr");
    tableRows.forEach((row, index) => {
      const description = row.querySelector('input[name="itemDesc[]"]').value;
      const unitSelect = row.querySelector('select[name="itemUnit[]"]');
      const unit = unitSelect.options[unitSelect.selectedIndex].text;
      const quantity = row.querySelector('input[name="itemQty[]"]').value;
      const price =
        parseFloat(row.querySelector('input[name="itemPrice[]"]').value) || 0;
      const subtotal = row.querySelector(".subtotal").textContent;
      rows += `
            <tr>
              <td>${index + 1}</td>
              <td>${description}</td>
              <td>${unit}</td>
              <td>${quantity}</td>
              <td>ARS ${formatCurrency(price)}</td>
              <td>ARS ${subtotal}</td>
            </tr>
          `;
    });
  }
  return rows;
}
function getHonorariosTypeText() {
  const honorariosType = document.getElementById("honorariosType").value;
  switch (honorariosType) {
    case "proyecto":
      return "Solo Proyecto";
    case "direccion":
      return "Solo Dirección";
    case "ambos":
      return "Proyecto y Dirección";
    default:
      return honorariosType;
  }
}
function generateTaxesPreview() {
  let taxesHtml = "";
  if (document.getElementById("taxIVA").checked) {
    taxesHtml += `
          <div class="preview-row">
            <div class="preview-label">IVA (21%):</div>
            <div class="preview-value">ARS ${
              document.getElementById("ivaAmount").textContent
            }</div>
          </div>
        `;
  }
  if (document.getElementById("taxIIBB").checked) {
    taxesHtml += `
          <div class="preview-row">
            <div class="preview-label">Ingresos Brutos (${
              document.getElementById("taxIIBBPercentage").value
            }%):</div>
            <div class="preview-value">ARS ${
              document.getElementById("iibbAmount").textContent
            }</div>
          </div>
        `;
  }
  if (document.getElementById("taxGanancias").checked) {
    taxesHtml += `
          <div class="preview-row">
            <div class="preview-label">Impuesto a las Ganancias (${
              document.getElementById("taxGananciasPercentage").value
            }%):</div>
            <div class="preview-value">ARS ${
              document.getElementById("gananciasAmount").textContent
            }</div>
          </div>
        `;
  }
  if (document.getElementById("taxMunicipal").checked) {
    taxesHtml += `
          <div class="preview-row">
            <div class="preview-label">Tasa Municipal (${
              document.getElementById("taxMunicipalPercentage").value
            }%):</div>
            <div class="preview-value">ARS ${
              document.getElementById("municipalAmount").textContent
            }</div>
          </div>
        `;
  }
  return taxesHtml;
}
async function sendCalculationToClient() {
  if (!currentUser) {
    showMessage("Debe iniciar sesión antes de enviar el cómputo", "error");
    return;
  }
  if (!validateRequiredFields()) {
    showMessage(
      "Complete todos los campos antes de enviar el cómputo",
      "error"
    );
    return;
  }
  let calculationId = activeCalculation?.id;
  if (!calculationId) {
    const calculationData = collectFormData();
    calculationData.status = "completed";
    calculationId = await saveCalculationToFirebase(calculationData);
    if (!calculationId) {
      return; // Si no se pudo guardar, salir
    }
  }
  const clientEmail = document.getElementById("clientContact").value;
  alert(`Enviando cálculo al cliente ${clientEmail}...`);
  setTimeout(() => {
    try {
      updateDoc(doc(db, "calculations", calculationId), {
        sentToClient: true,
        sentDate: serverTimestamp(),
      });
      alert("Cálculo enviado correctamente al cliente.");
    } catch (error) {
      console.error("Error al marcar el cálculo como enviado:", error);
      alert(
        "El cálculo ha sido enviado, pero hubo un error al actualizarlo en la base de datos."
      );
    }
  }, 2000);
}
function exportCalculations() {
  if (calculationHistory.length === 0) {
    alert("No hay cálculos para exportar.");
    return;
  }
  const jsonData = JSON.stringify(calculationHistory, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `calculos_vivarq_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}
function importFromExcel() {
  alert(
    "La importación desde Excel está en desarrollo. Esta funcionalidad permitirá cargar datos desde una hoja de cálculo."
  );
  const mockData = [
    {
      description: "Hormigón armado para fundaciones",
      unit: "m3",
      quantity: 12.5,
      price: 55000,
    },
    {
      description: "Mampostería de ladrillos cerámicos",
      unit: "m2",
      quantity: 85.3,
      price: 12000,
    },
    {
      description: "Revoque grueso y fino",
      unit: "m2",
      quantity: 170.6,
      price: 6000,
    },
  ];
  if (confirm("¿Desea cargar datos de muestra para demostración?")) {
    const tableBody = document.getElementById("budgetTableBody");
    if (tableBody) {
      tableBody.innerHTML = "";
      mockData.forEach((item, index) => {
        const newRow = document.createElement("tr");
        newRow.className = "table-row";
        const subtotal = (item.quantity * item.price).toFixed(2);
        newRow.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" name="itemDesc[]" value="${
              item.description
            }" placeholder="Descripción" required /></td>
            <td>
              <select name="itemUnit[]" required>
                <option value="m2" ${
                  item.unit === "m2" ? "selected" : ""
                }>m²</option>
                <option value="m3" ${
                  item.unit === "m3" ? "selected" : ""
                }>m³</option>
                <option value="ml" ${
                  item.unit === "ml" ? "selected" : ""
                }>ml</option>
                <option value="u" ${
                  item.unit === "u" ? "selected" : ""
                }>u</option>
                <option value="gl" ${
                  item.unit === "gl" ? "selected" : ""
                }>gl</option>
              </select>
            </td>
            <td><input type="number" name="itemQty[]" value="${
              item.quantity
            }" min="0.01" step="0.01" placeholder="0.00" required class="qty-input" /></td>
            <td><input type="number" name="itemPrice[]" value="${
              item.price
            }" min="0.01" step="0.01" placeholder="0.00" required class="price-input" /></td>
            <td class="subtotal">${subtotal}</td>
            <td><button type="button" class="btn-icon delete-row"><i class="fas fa-trash"></i></button></td>
          `;
        tableBody.appendChild(newRow);
      });
      updateBudgetTotals();
    }
  }
}
function getUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    userId: urlParams.get("id"),
    projectId: urlParams.get("project"),
    professionalId: urlParams.get("professional"),
  };
}
async function loadProjectData() {
  try {
    const { userId, projectId, professionalId } = getUrlParameters();
    if (!userId || !projectId || !professionalId) {
      console.error("Faltan parámetros en la URL");
      return;
    }
    const projectDoc = await getDoc(doc(db, "projects", projectId));
    if (!projectDoc.exists()) {
      console.error("El proyecto no existe");
      return;
    }
    const projectData = projectDoc.data();
    const clientDoc = await getDoc(doc(db, "users", userId));
    if (!clientDoc.exists()) {
      console.error("El cliente no existe");
      return;
    }
    const clientData = clientDoc.data();
    const professionalDoc = await getDoc(doc(db, "users", professionalId));
    if (!professionalDoc.exists()) {
      console.error("El profesional no existe");
      return;
    }
    const professionalData = professionalDoc.data();
    fillProjectForm(projectData, clientData, professionalData);
    console.log("Datos cargados correctamente");
  } catch (error) {
    console.error("Error al cargar los datos:", error);
  }
}
function fillProjectForm(projectData, clientData, professionalData) {
  console.log("Filling project fields with data:", projectData);
  const projectTitleField = document.getElementById("projectTitle");
  const projectTypeField = document.getElementById("projectType");
  const projectLocationField = document.getElementById("projectLocation");
  const projectDescriptionField = document.getElementById("projectDescription");
  const fieldsStatus = [];
  if (projectTitleField) {
    projectTitleField.value = projectData.title || "";
    fieldsStatus.push({
      field: "projectTitle",
      value: projectData.title,
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "projectTitle", found: false });
  }
  if (projectTypeField) {
    projectTypeField.value = projectData.category || "";
    fieldsStatus.push({
      field: "projectType",
      value: projectData.category,
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "projectType", found: false });
  }
  if (projectLocationField) {
    projectLocationField.value = projectData.location || "";
    fieldsStatus.push({
      field: "projectLocation",
      value: projectData.location,
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "projectLocation", found: false });
  }
  if (projectDescriptionField) {
    projectDescriptionField.value = projectData.description || "";
    fieldsStatus.push({
      field: "projectDescription",
      value: projectData.description,
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "projectDescription", found: false });
  }
  const clientNameField = document.getElementById("clientName");
  const clientDocumentField = document.getElementById("clientDocument");
  const clientAddressField = document.getElementById("clientAddress");
  const clientPhoneField = document.getElementById("clientNumber");
  const clientEmailField = document.getElementById("clientContact");
  if (clientNameField) {
    clientNameField.value = clientData.userInfo["2_Nombre y Apellido"] || "";
    fieldsStatus.push({
      field: "clientNameField",
      value: clientData.userInfo["2_Nombre y Apellido"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "clientNameField", found: false });
  }
  if (clientDocumentField) {
    clientDocumentField.value =
      clientData.userInfo["3_Número de Documento"] || "";
    fieldsStatus.push({
      field: "clientDocumentField",
      value: clientData.userInfo["3_Número de Documento"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "clientDocumentField", found: false });
  }
  if (clientAddressField) {
    clientAddressField.value = clientData.userInfo["6_Ubicación"] || "";
    fieldsStatus.push({
      field: "clientAddressField",
      value: clientData.userInfo["6_Ubicación"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "clientAddressField", found: false });
  }
  if (clientPhoneField) {
    clientPhoneField.value = clientData.userInfo["12_Número de Teléfono"] || "";
    fieldsStatus.push({
      field: "clientPhoneField",
      value: clientData.userInfo["12_Número de Teléfono"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "clientPhoneField", found: false });
  }
  if (clientEmailField) {
    clientEmailField.value = clientData.userInfo["1_Email"] || "";
    fieldsStatus.push({
      field: "clientEmailField",
      value: clientData.userInfo["1_Email"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "clientEmailField", found: false });
  }
  const professionalNameField = document.getElementById("professionalName");
  const professionalDocumentField = document.getElementById(
    "professionalDocument"
  );
  const professionalAddressField = document.getElementById(
    "professionalAddress"
  );
  const professionalPhoneField = document.getElementById("professionalNumber");
  const professionalEmailField = document.getElementById("professionalContact");
  if (professionalNameField) {
    professionalNameField.value =
      professionalData.userInfo["2_Nombre y Apellido"] || "";
    fieldsStatus.push({
      field: "professionalNameField",
      value: professionalData.userInfo["2_Nombre y Apellido"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "professionalNameField", found: false });
  }
  if (professionalDocumentField) {
    professionalDocumentField.value =
      professionalData.userInfo["3_Número de Documento"] || "";
    fieldsStatus.push({
      field: "professionalDocumentField",
      value: professionalData.userInfo["3_Número de Documento"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "professionalDocumentField", found: false });
  }
  if (professionalAddressField) {
    professionalAddressField.value =
      professionalData.userInfo["6_Ubicación"] || "";
    fieldsStatus.push({
      field: "professionalAddressField",
      value: professionalData.userInfo["6_Ubicación"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "professionalAddressField", found: false });
  }
  if (professionalPhoneField) {
    professionalPhoneField.value =
      professionalData.userInfo["12_Número de Teléfono"] || "";
    fieldsStatus.push({
      field: "professionalPhoneField",
      value: professionalData.userInfo["12_Número de Teléfono"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "professionalPhoneField", found: false });
  }
  if (professionalEmailField) {
    professionalEmailField.value = professionalData.userInfo["1_Email"] || "";
    fieldsStatus.push({
      field: "professionalEmailField",
      value: professionalData.userInfo["1_Email"],
      set: true,
    });
  } else {
    fieldsStatus.push({ field: "professionalEmailField", found: false });
  }
  console.log("Fields status:", fieldsStatus);
}
function loadTemplateContent(templateType) {
  console.log(`Loading template: ${templateType}`);
  const projectTypeField = document.getElementById("projectType");
  const clauseWarranty = document.getElementById("clauseWarranty");
  const clausePenalties = document.getElementById("clausePenalties");
  const clauseConfidentiality = document.getElementById(
    "clauseConfidentiality"
  );
  const clauseIntellectualProperty = document.getElementById(
    "clauseIntellectualProperty"
  );
  switch (templateType) {
    case "construction":
      if (projectTypeField) projectTypeField.value = "construccion";
      if (clauseWarranty) clauseWarranty.checked = true;
      if (clausePenalties) clausePenalties.checked = true;
      break;
    case "services":
      if (projectTypeField) projectTypeField.value = "mantenimiento";
      if (clauseConfidentiality) clauseConfidentiality.checked = true;
      if (clauseIntellectualProperty) clauseIntellectualProperty.checked = true;
      break;
    case "design":
      if (projectTypeField) projectTypeField.value = "diseno";
      if (clauseIntellectualProperty) clauseIntellectualProperty.checked = true;
      break;
    case "custom":
      document
        .querySelectorAll('input[name="defaultClauses[]"]')
        .forEach((cb) => {
          if (cb) cb.checked = false;
        });
      break;
  }
}
function updateSummarySection() {
  const costoTotalObraElement = document.getElementById("costoTotalObra");
  const totalAFacturarResumenElement = document.getElementById(
    "totalAFacturarResumen"
  );
  const totalGeneralElement = document.getElementById("totalGeneral");
  const totalCostElement = document.getElementById("totalCost"); // Computo y Presupuesto
  const totalFacturarElement = document.getElementById("totalFacturar"); // Honorarios + Impuestos
  let costoTotalObraValue = 0;
  if (totalCostElement) {
    costoTotalObraValue = totalCostElement.hasAttribute("data-value")
      ? parseFloat(totalCostElement.getAttribute("data-value"))
      : parseFloat(
          totalCostElement.textContent.replace(/[^\d,-]/g, "").replace(",", ".")
        ) || 0;
  }
  let totalFacturarValue = 0;
  if (totalFacturarElement) {
    totalFacturarValue = totalFacturarElement.hasAttribute("data-value")
      ? parseFloat(totalFacturarElement.getAttribute("data-value"))
      : parseFloat(
          totalFacturarElement.textContent
            .replace(/[^\d,-]/g, "")
            .replace(",", ".")
        ) || 0;
  }
  const grandTotalValue = costoTotalObraValue + totalFacturarValue;
  if (costoTotalObraElement) {
    costoTotalObraElement.textContent = formatCurrency(costoTotalObraValue);
  }
  if (totalAFacturarResumenElement) {
    totalAFacturarResumenElement.textContent =
      formatCurrency(totalFacturarValue);
  }
  if (totalGeneralElement) {
    totalGeneralElement.textContent = formatCurrency(grandTotalValue);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initializePage();
  setupEventListeners();
  checkAuthState();
  loadProjectData();
  handleSaveAsDraftDisplay();
});
document
  .getElementById("saveCalculationBtn")
  ?.addEventListener("click", async () => {
    await saveCalculation(); // Suponiendo que saveCalculation devuelve true/false
    showMessage("Cómputo guardado exitosamente", "success");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });
window.addBudgetRow = addBudgetRow;
window.calculateAll = calculateAll;
window.resetForm = resetForm;
window.saveCalculation = saveCalculation;
window.saveAsDraft = saveAsDraft;
window.generatePDF = generatePDF;
window.sendCalculationToClient = sendCalculationToClient;
window.importFromExcel = importFromExcel;
window.checkUrlForCalculationId = checkUrlForCalculationId;
