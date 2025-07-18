import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "./firebase-config.js";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("project-form");
  const steps = document.querySelectorAll(".form-step");
  const progressSteps = document.querySelectorAll(".step");
  const progressBar = document.querySelector(".progress");
  const btnStep1 = document.getElementById("btn-step-1");
  const btnStep2 = document.getElementById("btn-step-2");
  const btnStep3 = document.getElementById("btn-step-3");
  const btnBack1 = document.getElementById("btn-back-1");
  const btnBack2 = document.getElementById("btn-back-2");
  const btnBack3 = document.getElementById("btn-back-3");
  const btnLater = document.getElementById("btn-later");
  const btnPublish = document.getElementById("btn-publish");
  const uploadArea = document.getElementById("upload-area");
  const browseFiles = document.getElementById("browse-files");
  const fileInput = document.getElementById("project-images");
  const uploadedFilesContainer = document.getElementById("uploaded-files");
  const addUrlBtn = document.getElementById("add-url");
  const urlInput = document.getElementById("reference-url");
  const urlsContainer = document.getElementById("reference-urls");
  const auth = getAuth();
  const db = getFirestore();
  let currentStep = 1;
  let userId = null;
  let uploadedFiles = [];
  let uploadedImages = []; // Almacenará las URLs de las imágenes en Cloudinary
  let referenceUrls = [];
  const CLOUDINARY_UPLOAD_PRESET = "VivArq"; // Debes crear esto en tu dashboard de Cloudinary
  const CLOUDINARY_CLOUD_NAME = "dtrq4auxm"; // Tu cloud name de Cloudinary
  const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
    } else {
      console.log("Usuario no autenticado");
      const newProjectId = collection(db, "projects").doc().id;
      const urlParams = new URLSearchParams(window.location.search);
      const viewingParam = urlParams.get("viewing") || "create";
      window.location.href = `login.html?redirect=projects.html&project=${newProjectId}&viewing=${viewingParam}`;
    }
  });
  function goToStep(step) {
    if (step > currentStep && !validateStep(currentStep)) {
      showValidationError();
      return;
    }
    steps.forEach((s) => s.classList.remove("active"));
    progressSteps.forEach((s) => s.classList.remove("active"));
    steps[step - 1].classList.add("active");
    for (let i = 0; i < step; i++) {
      progressSteps[i].classList.add("active");
    }
    const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;
    progressBar.style.width = `${progressPercentage}%`;
    currentStep = step;
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
  const propertyTypeSelect = document.getElementById("property-type");
  const customPropertyTypeContainer = document.getElementById(
    "custom-property-type-container"
  );
  const customPropertyTypeInput = document.getElementById(
    "custom-property-type"
  );
  propertyTypeSelect.addEventListener("change", function () {
    if (this.value === "Otro") {
      customPropertyTypeContainer.style.display = "block";
      customPropertyTypeInput.required = true;
    } else {
      customPropertyTypeContainer.style.display = "none";
      customPropertyTypeInput.required = false;
      customPropertyTypeInput.value = ""; // Clear the input
    }
  });
  function validateStep(step) {
    let isValid = true;
    if (step === 1) {
      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const category = document.getElementById("category").value;
      const location = document.getElementById("location").value.trim();
      if (!title || !description || !category || !location) {
        isValid = false;
      }
    } else if (step === 2) {
      const propiedad = document.getElementById("property-type").value;
      if (propiedad === "Otro") {
        const customPropertyType = document
          .getElementById("custom-property-type")
          .value.trim();
        return !!customPropertyType; // Returns true if not empty
      }
      return !!propiedad;
    } else if (step === 3) {
      const budgetRange = document.getElementById("budget-range").value;
      const timeframe = document.getElementById("timeframe").value;
      const payment = document.getElementById("payment-terms").value;
      if (!budgetRange || !timeframe || !payment) {
        isValid = false;
      }
    }
    return isValid;
  }
  function showValidationError() {
    alert(
      "Por favor complete todos los campos obligatorios antes de continuar."
    );
  }
  function saveDraft() {
    const formData = getFormData();
    formData.status = "draft";
    saveToFirestore(formData)
      .then(() => {
        alert(
          "Proyecto guardado como borrador. Puede continuar editándolo más tarde."
        );
        window.location.href = `profile-contractor.html?id=${userId}`;
      })
      .catch((error) => {
        console.error("Error al guardar borrador:", error);
        alert("Error al guardar el borrador. Por favor intente nuevamente.");
      });
  }
  async function publishProject(e) {
    e.preventDefault();
    if (!validateStep(4)) {
      showValidationError();
      return;
    }
    const publishBtn = document.getElementById("btn-publish");
    publishBtn.disabled = true;
    publishBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Publicando...';
    try {
      if (uploadedFiles.length > 0) {
        const uploadStatus = document.createElement("div");
        uploadStatus.className = "upload-status";
        uploadStatus.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Subiendo imágenes... 0/' +
          uploadedFiles.length;
        uploadedFilesContainer.appendChild(uploadStatus);
        await uploadImagesToCloudinary(uploadStatus);
      }
      const formData = getFormData();
      formData.status = "published";
      await saveToFirestore(formData);
      alert("¡Proyecto publicado exitosamente!");
      window.location.href = `profile-contractor.html?id=${userId}`;
    } catch (error) {
      console.error("Error al publicar proyecto:", error);
      alert("Error al publicar el proyecto. Por favor intente nuevamente.");
      publishBtn.disabled = false;
      publishBtn.innerHTML = "Publicar Proyecto";
    }
  }
  async function uploadImagesToCloudinary(statusElement) {
    const totalFiles = uploadedFiles.length;
    let uploadedCount = 0;
    for (let i = 0; i < totalFiles; i++) {
      const file = uploadedFiles[i];
      statusElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Subiendo imágenes... ${uploadedCount}/${totalFiles}`;
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", "projects"); // Opcional: define una carpeta para organizar
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        uploadedImages.push({
          public_id: data.public_id,
          secure_url: data.secure_url,
          format: data.format,
          width: data.width,
          height: data.height,
          original_filename: data.original_filename,
          resource_type: data.resource_type,
        });
        uploadedCount++;
      } catch (error) {
        console.error(`Error al subir imagen ${file.name}:`, error);
      }
    }
    statusElement.innerHTML = `<i class="fas fa-check"></i> Imágenes subidas: ${uploadedCount}/${totalFiles}`;
    if (uploadedCount < totalFiles) {
      statusElement.innerHTML += " (Algunas imágenes no pudieron ser subidas)";
    }
    setTimeout(() => {
      statusElement.remove();
    }, 3000);
  }
  function formatCurrency(value) {
    const numericValue = value.replace(/[^\d]/g, "");
    const number = parseFloat(numericValue);
    if (isNaN(number)) return "";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  }
  const budgetInput = document.getElementById("budget");
  if (budgetInput) {
    budgetInput.type = "text";
    budgetInput.addEventListener("input", function (e) {
      const cleanValue = this.value.replace(/[^\d]/g, "");
      if (cleanValue) {
        this.value = formatCurrency(cleanValue);
      } else {
        this.value = "";
      }
    });
    budgetInput.addEventListener("blur", function (e) {
      if (this.value) {
        this.value = formatCurrency(this.value);
      }
    });
  }
  function getFormData() {
    let propertyType = document.getElementById("property-type").value;
    if (propertyType === "Otro") {
      propertyType = document
        .getElementById("custom-property-type")
        .value.trim();
    }
    return {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      category: document.getElementById("category").value,
      location: document.getElementById("location").value.trim(),
      propertyType: propertyType, // Modified to handle custom type
      area: document.getElementById("area").value,
      requirements: Array.from(
        document.querySelectorAll('input[name="requirements"]:checked')
      ).map((input) => input.value),
      technicalDetails: document
        .getElementById("technical-details")
        .value.trim(),
      budgetRange: document.getElementById("budget-range").value,
      budget: document.getElementById("budget").value.replace(/[^\d]/g, ""),
      timeframe: document.getElementById("timeframe").value,
      startDate: document.getElementById("start-date").value,
      paymentTerms: document.getElementById("payment-terms").value,
      images: uploadedImages, // Ahora son las URLs de Cloudinary
      referenceUrls: referenceUrls,
      visibility: document.querySelector('input[name="visibility"]:checked')
        .value,
      userId: userId,
      imageCount: uploadedImages.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }
  function saveToFirestore(data) {
    return addDoc(collection(db, "projects"), data);
  }
  function handleFileUpload() {
    const files = fileInput.files;
    function showError(errorContainer, message) {
      errorContainer.textContent = message;
      errorContainer.style.display = "block";
      setTimeout(() => {
        errorContainer.textContent = "";
        errorContainer.style.display = "none";
      }, 3000);
    }
    let errorContainer = document.getElementById("file-error-container");
    if (!errorContainer) {
      errorContainer = document.createElement("div");
      errorContainer.id = "file-error-container";
      errorContainer.className = "error-message";
      fileInput.parentNode.insertBefore(errorContainer, fileInput.nextSibling);
    }
    errorContainer.textContent = "";
    errorContainer.style.display = "none";
    if (uploadedFiles.length + files.length > 3) {
      showError(
        errorContainer,
        `Error: Solo puedes subir un máximo de 3 archivos. Ya tienes ${uploadedFiles.length} archivo(s).`
      );
      fileInput.value = ""; // Limpiar la selección
      return;
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        alert(
          `El archivo ${file.name} no es un formato válido (JPG, PNG o PDF).`
        );
        continue;
      }
      uploadedFiles.push(file);
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";
      const filePreview = document.createElement("div");
      filePreview.className = "file-preview";
      if (file.type === "application/pdf") {
        const icon = document.createElement("i");
        icon.className = "fas fa-file-pdf";
        filePreview.appendChild(icon);
      } else {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file); // Usar URL.createObjectURL para vista previa local
        filePreview.appendChild(img);
      }
      const fileInfo = document.createElement("div");
      fileInfo.className = "file-info";
      const fileName = document.createElement("p");
      fileName.textContent = file.name;
      const fileSize = document.createElement("span");
      fileSize.textContent = formatFileSize(file.size);
      const removeButton = document.createElement("button");
      removeButton.className = "remove-file";
      removeButton.innerHTML = '<i class="fas fa-times"></i>';
      removeButton.onclick = function () {
        const index = uploadedFiles.indexOf(file);
        if (index > -1) {
          uploadedFiles.splice(index, 1);
          fileItem.remove();
        }
      };
      fileInfo.appendChild(fileName);
      fileInfo.appendChild(fileSize);
      fileItem.appendChild(filePreview);
      fileItem.appendChild(fileInfo);
      fileItem.appendChild(removeButton);
      uploadedFilesContainer.appendChild(fileItem);
    }
    fileInput.value = "";
  }
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  function addReferenceUrl() {
    const url = urlInput.value.trim();
    if (!url) {
      alert("Por favor ingrese una URL válida.");
      return;
    }
    try {
      new URL(url);
    } catch (e) {
      alert("Por favor ingrese una URL válida que incluya http:// o https://");
      return;
    }
    referenceUrls.push(url);
    const urlItem = document.createElement("div");
    urlItem.className = "url-item";
    const urlText = document.createElement("a");
    urlText.href = url;
    urlText.target = "_blank";
    urlText.textContent = url;
    const removeButton = document.createElement("button");
    removeButton.className = "remove-url";
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.onclick = function () {
      const index = referenceUrls.indexOf(url);
      if (index > -1) {
        referenceUrls.splice(index, 1);
        urlItem.remove();
      }
    };
    urlItem.appendChild(urlText);
    urlItem.appendChild(removeButton);
    urlsContainer.appendChild(urlItem);
    urlInput.value = "";
  }
  if (btnStep1) btnStep1.addEventListener("click", () => goToStep(2));
  if (btnStep2) btnStep2.addEventListener("click", () => goToStep(3));
  if (btnStep3) btnStep3.addEventListener("click", () => goToStep(4));
  if (btnBack1) btnBack1.addEventListener("click", () => goToStep(1));
  if (btnBack2) btnBack2.addEventListener("click", () => goToStep(2));
  if (btnBack3) btnBack3.addEventListener("click", () => goToStep(3));
  if (btnLater) btnLater.addEventListener("click", saveDraft);
  if (form) form.addEventListener("submit", publishProject);
  if (browseFiles) {
    browseFiles.addEventListener("click", () => {
      fileInput.click();
    });
  }
  if (uploadArea) {
    function showError(errorContainer, message) {
      errorContainer.textContent = message;
      errorContainer.style.display = "block";
      setTimeout(() => {
        errorContainer.textContent = "";
        errorContainer.style.display = "none";
      }, 3000);
    }
    uploadArea.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("dragover");
    });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadArea.classList.remove("dragover");
      const files = e.dataTransfer.files;
      const errorContainer =
        document.getElementById("file-error-container") ||
        (() => {
          const newErrorContainer = document.createElement("div");
          newErrorContainer.id = "file-error-container";
          newErrorContainer.className = "error-message";
          fileInput.parentNode.insertBefore(
            newErrorContainer,
            fileInput.nextSibling
          );
          return newErrorContainer;
        })();
      errorContainer.textContent = "";
      errorContainer.style.display = "none";
      if (uploadedFiles.length + files.length > 3) {
        showError(
          errorContainer,
          `Error: Solo puedes subir un máximo de 3 archivos. Ya tienes ${uploadedFiles.length} archivo(s).`
        );
        return;
      }
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (imageFiles.length === 0) {
        showError(
          errorContainer,
          "Error: Por favor, selecciona solo archivos de imagen."
        );
        return;
      }
      const dataTransfer = new DataTransfer();
      imageFiles.forEach((file) => dataTransfer.items.add(file));
      fileInput.files = dataTransfer.files;
      handleFileUpload();
    });
  }
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }
  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", addReferenceUrl);
  }
});
