import {
  getFirestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "./firebase-config.js";
let projectStatus = null;
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
  const btnUpdate = document.getElementById("btn-update");
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
  let projectId = null;
  let uploadedFiles = [];
  let imageDataUrls = []; // Almacenará las imágenes como Data URLs
  let existingImages = []; // Almacenará las imágenes existentes
  let referenceUrls = [];
  const urlParams = new URLSearchParams(window.location.search);
  projectId = urlParams.get("id");
  if (!projectId) {
    alert("ID de proyecto no proporcionado");
    window.location.href = "index.html";
    return;
  }
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      loadProjectData();
    } else {
      window.location.href = "login.html";
    }
  });
  async function loadProjectData() {
    try {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        alert("El proyecto no existe");
        window.location.href = "index.html";
        return;
      }
      const projectData = projectSnap.data();
      if (projectData.userId !== userId) {
        alert("No tienes permiso para editar este proyecto");
        window.location.href = "index.html";
        return;
      }
      projectStatus = projectData.status || "draft";
      populateFormData(projectData);
      if (projectData.hasStoredImages) {
        loadStoredImages();
      } else if (projectData.images && projectData.images.length > 0) {
        existingImages = [...projectData.images];
        displayExistingImages(existingImages);
      }
    } catch (error) {
      console.error("Error al cargar datos del proyecto:", error);
      alert("Error al cargar el proyecto. Por favor intente nuevamente.");
    }
  }
  async function loadStoredImages() {
    try {
      const imagesQuery = await getDocs(
        query(
          collection(db, "project_images"),
          where("projectId", "==", projectId)
        )
      );
      if (!imagesQuery.empty) {
        const images = [];
        imagesQuery.forEach((doc) => {
          images.push(doc.data());
        });
        images.sort((a, b) => a.index - b.index);
        existingImages = images;
        displayExistingImages(existingImages);
      }
    } catch (error) {
      console.error("Error al cargar imágenes:", error);
    }
  }
  function populateFormData(data) {
    document.getElementById("title").value = data.title || "";
    document.getElementById("description").value = data.description || "";
    if (data.category) {
      document.getElementById("category").value = data.category;
    }
    document.getElementById("location").value = data.location || "";
    if (data.propertyType) {
      document.getElementById("property-type").value = data.propertyType;
    }
    document.getElementById("area").value = data.area || "";
    if (data.requirements && data.requirements.length > 0) {
      data.requirements.forEach((req) => {
        const checkbox = document.querySelector(
          `input[name="requirements"][value="${req}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    }
    document.getElementById("technical-details").value =
      data.technicalDetails || "";
    if (data.budgetRange) {
      document.getElementById("budget-range").value = data.budgetRange;
    }
    document.getElementById("budget").value = data.budget || "";
    if (data.timeframe) {
      document.getElementById("timeframe").value = data.timeframe;
    }
    document.getElementById("start-date").value = data.startDate || "";
    document.getElementById("payment-terms").value = data.paymentTerms || "";
    if (data.visibility) {
      document.querySelector(
        `input[name="visibility"][value="${data.visibility}"]`
      ).checked = true;
    }
    if (data.referenceUrls && data.referenceUrls.length > 0) {
      referenceUrls = [...data.referenceUrls];
      displayReferenceUrls(referenceUrls);
    }
  }
  function displayReferenceUrls(urls) {
    urlsContainer.innerHTML = ""; // Limpiar contenedor
    urls.forEach((url) => {
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
    });
  }
  function displayExistingImages(images) {
    console.log("Mostrando imágenes existentes:", images);
    if (!images || images.length === 0) {
      console.log("No hay imágenes para mostrar");
      return;
    }
    for (const img of images) {
      try {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item existing-file";
        const filePreview = document.createElement("div");
        filePreview.className = "file-preview";
        if (img.resource_type === "pdf" || img.type === "application/pdf") {
          const icon = document.createElement("i");
          icon.className = "fas fa-file-pdf";
          filePreview.appendChild(icon);
        } else {
          const imgElement = document.createElement("img");
          let imageUrl;
          if (img.secure_url) {
            imageUrl = img.secure_url;
          } else if (img.dataUrl) {
            imageUrl = img.dataUrl;
          } else if (img.public_id) {
            imageUrl = `https://res.cloudinary.com/dtrq4auxm/image/upload/${img.public_id}`;
          } else {
            console.error("Imagen sin URL o ID:", img);
            continue; // Saltar esta imagen
          }
          imgElement.src = imageUrl;
          imgElement.onerror = function () {
            console.error("Error al cargar imagen:", img);
            this.src = "placeholder.jpg"; // Una imagen de placeholder
          };
          filePreview.appendChild(imgElement);
        }
        const fileInfo = document.createElement("div");
        fileInfo.className = "file-info";
        const fileName = document.createElement("p");
        fileName.textContent =
          img.original_filename || img.name || img.public_id || "Imagen";
        const removeButton = document.createElement("button");
        removeButton.className = "remove-file";
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.onclick = function () {
          img.toDelete = true;
          fileItem.classList.add("to-delete");
          fileItem.style.opacity = "0.5";
          removeButton.classList.add("hidden");
          restoreButton.classList.remove("hidden");
        };
        const restoreButton = document.createElement("button");
        restoreButton.className = "restore-file hidden";
        restoreButton.innerHTML = '<i class="fas fa-undo"></i>';
        restoreButton.onclick = function () {
          delete img.toDelete;
          fileItem.classList.remove("to-delete");
          fileItem.style.opacity = "1";
          restoreButton.classList.add("hidden");
          removeButton.classList.remove("hidden");
        };
        fileInfo.appendChild(fileName);
        fileItem.appendChild(filePreview);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeButton);
        fileItem.appendChild(restoreButton);
        uploadedFilesContainer.appendChild(fileItem);
      } catch (error) {
        console.error("Error al mostrar imagen:", error, img);
      }
    }
  }
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
    } else if (step === 3) {
      const budgetRange = document.getElementById("budget-range").value;
      const timeframe = document.getElementById("timeframe").value;
      if (!budgetRange || !timeframe) {
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
    updateInFirestore(formData)
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
  function updateProject(e) {
    e.preventDefault();
    if (!validateStep(4)) {
      showValidationError();
      return;
    }
    const updateBtn = document.getElementById("btn-update");
    if (updateBtn) {
      updateBtn.disabled = true;
      updateBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    }
    const formData = getFormData();
    const statusInput = document.querySelector(
      'input[name="visibility"]:checked'
    );
    if (statusInput && statusInput.value === "public") {
      formData.status = "published";
    } else if (statusInput && statusInput.value === "private") {
      formData.status = projectStatus || "draft";
    }
    if (projectStatus === "published") {
      formData.status = "published";
    }
    const filteredExistingImages = existingImages.filter(
      (img) => !img.toDelete
    );
    const processImagePromises = imageDataUrls.map((dataUrl) =>
      compressImage(dataUrl)
    );
    Promise.all(processImagePromises)
      .then((compressedImages) => {
        formData.images = [...filteredExistingImages];
        if (compressedImages.length > 0 && formData.status === "published") {
          return uploadToCloudinary(compressedImages).then(
            (cloudinaryImages) => {
              formData.images = [...formData.images, ...cloudinaryImages];
              return updateInFirestore(formData);
            }
          );
        } else if (compressedImages.length > 0) {
          const newImages = compressedImages.map((dataUrl, index) => ({
            name: uploadedFiles[index]?.name || `Imagen ${index + 1}`,
            dataUrl: dataUrl,
            type: uploadedFiles[index]?.type || "image/jpeg",
            isNew: true,
          }));
          formData.images = [...formData.images, ...newImages];
          return updateInFirestore(formData);
        } else {
          return updateInFirestore(formData);
        }
      })
      .then(() => {
        alert("¡Proyecto actualizado exitosamente!");
        window.location.href = `profile-contractor.html?id=${userId}`;
      })
      .catch((error) => {
        console.error("Error al actualizar proyecto:", error);
        if (updateBtn) {
          updateBtn.disabled = false;
          updateBtn.innerHTML = "Actualizar Proyecto";
        }
        alert("Error al actualizar el proyecto. Por favor intente nuevamente.");
      });
  }
  function uploadToCloudinary(compressedImages) {
    const CLOUDINARY_UPLOAD_PRESET = "VivArq";
    const CLOUDINARY_CLOUD_NAME = "dtrq4auxm";
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const uploadPromises = compressedImages.map((dataUrl, index) => {
      const byteString = atob(dataUrl.split(",")[1]);
      const mimeType = dataUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", `projects/${projectId}`);
      return fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          return {
            secure_url: data.secure_url,
            public_id: data.public_id,
            name: uploadedFiles[index]?.name || `Imagen ${index + 1}`,
            type: mimeType,
            resource_type: data.resource_type,
            original_filename: data.original_filename,
          };
        });
    });
    return Promise.all(uploadPromises);
  }
  function getFormData() {
    return {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      category: document.getElementById("category").value,
      location: document.getElementById("location").value.trim(),
      propertyType: document.getElementById("property-type").value,
      area: document.getElementById("area").value,
      requirements: Array.from(
        document.querySelectorAll('input[name="requirements"]:checked')
      ).map((input) => input.value),
      technicalDetails: document
        .getElementById("technical-details")
        .value.trim(),
      budgetRange: document.getElementById("budget-range").value,
      budget: document.getElementById("budget").value,
      timeframe: document.getElementById("timeframe").value,
      startDate: document.getElementById("start-date").value,
      paymentTerms: document.getElementById("payment-terms").value,
      referenceUrls: referenceUrls,
      visibility: document.querySelector('input[name="visibility"]:checked')
        .value,
      userId: userId,
      updatedAt: serverTimestamp(),
    };
  }
  async function updateInFirestore(data) {
    const projectRef = doc(db, "projects", projectId);
    if (data.images && data.images.length > 0) {
      let totalSize = JSON.stringify(data).length;
      if (totalSize > 800000) {
        const imageRefs = data.images.map((img, index) => ({
          name: img.name,
          type: img.type,
          index: index,
        }));
        data.images = imageRefs;
        data.hasStoredImages = true;
        data.imageCount = imageRefs.length;
        await updateDoc(projectRef, data);
        const imagesQuery = await getDocs(
          query(
            collection(db, "project_images"),
            where("projectId", "==", projectId)
          )
        );
        const deletePromises = [];
        imagesQuery.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        const imageUploads = [];
        data.images.forEach((img, index) => {
          const imgData = {
            projectId: projectId,
            index: index,
            name: img.name,
            type: img.type,
            createdAt: serverTimestamp(),
          };
          if (img.secure_url) {
            imgData.secure_url = img.secure_url;
            imgData.public_id = img.public_id;
          } else if (img.dataUrl) {
            imgData.dataUrl = img.dataUrl;
          }
          imageUploads.push(addDoc(collection(db, "project_images"), imgData));
        });
        return Promise.all(imageUploads);
      }
    }
    return updateDoc(projectRef, data);
  }
  function handleFileUpload() {
    const files = fileInput.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 2 * 1024 * 1024) {
        alert(
          `El archivo ${file.name} excede el tamaño máximo recomendado de 2MB. Las imágenes grandes pueden causar problemas al guardar.`
        );
      }
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        alert(
          `El archivo ${file.name} no es un formato válido (JPG, PNG o PDF).`
        );
        continue;
      }
      uploadedFiles.push(file);
      const reader = new FileReader();
      reader.onload = function (e) {
        const dataUrl = e.target.result;
        imageDataUrls.push(dataUrl);
        const fileItem = document.createElement("div");
        fileItem.className = "file-item new-file";
        const filePreview = document.createElement("div");
        filePreview.className = "file-preview";
        if (file.type === "application/pdf") {
          const icon = document.createElement("i");
          icon.className = "fas fa-file-pdf";
          filePreview.appendChild(icon);
        } else {
          const img = document.createElement("img");
          img.src = dataUrl;
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
            imageDataUrls.splice(index, 1);
            fileItem.remove();
          }
        };
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        fileItem.appendChild(filePreview);
        fileItem.appendChild(fileInfo);
        fileItem.appendChild(removeButton);
        uploadedFilesContainer.appendChild(fileItem);
      };
      reader.readAsDataURL(file);
    }
    fileInput.value = "";
  }
  function formatCurrency(value) {
    const numericValue = value.replace(/[^\d]/g, "");
    const number = parseFloat(numericValue);
    if (isNaN(number)) return "";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
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
  function compressImage(dataUrl, maxWidth = 800) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = function () {
        const width = img.width;
        const height = img.height;
        if (width <= maxWidth) {
          resolve(dataUrl); // No necesita compresión
          return;
        }
        const newWidth = maxWidth;
        const newHeight = Math.floor(height * (newWidth / width));
        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
    });
  }
  if (btnStep1) btnStep1.addEventListener("click", () => goToStep(2));
  if (btnStep2) btnStep2.addEventListener("click", () => goToStep(3));
  if (btnStep3) btnStep3.addEventListener("click", () => goToStep(4));
  if (btnBack1) btnBack1.addEventListener("click", () => goToStep(1));
  if (btnBack2) btnBack2.addEventListener("click", () => goToStep(2));
  if (btnBack3) btnBack3.addEventListener("click", () => goToStep(3));
  if (btnLater) btnLater.addEventListener("click", saveDraft);
  if (form) form.addEventListener("submit", updateProject);
  if (browseFiles) {
    browseFiles.addEventListener("click", () => {
      fileInput.click();
    });
  }
  if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileUpload();
      }
    });
  }
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }
  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", addReferenceUrl);
  }
});
