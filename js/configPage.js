import {
  auth,
  db,
  doc,
  getDoc,
  updateDoc,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteDoc,
  deleteUser,
  collection,
  query,
  where,
  getDocs,
} from "./firebase-config.js";
import { displayMessage } from "./displayMessage.js";
let currentUser = null;
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("showProfileUpdateSuccess") === "true") {
    setTimeout(() => {
      displayMessage("Perfil actualizado con éxito", "success");
      localStorage.removeItem("showProfileUpdateSuccess");
    }, 1600);
  }
  const tabLinks = document.querySelectorAll(".tab-link");
  const tabContents = document.querySelectorAll(".tab-content");
  tabLinks.forEach((tabLink) => {
    tabLink.addEventListener("click", () => {
      tabLinks.forEach((link) => link.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));
      tabLink.classList.add("active");
      const tabId = tabLink.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
  const userId = localStorage.getItem("logguedInUserId");
  if (!userId) {
    window.location.href = "login.html?redirect=config.html";
    return;
  }
  loadUserData(userId);
  const personalInfoForm = document.querySelector("#personalInfoForm");
  if (personalInfoForm) {
    personalInfoForm.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevenir el envío accidental
      updateUserInfo(userId); // Solo actualiza la info personal
    });
  }
  const passwordForm = document.querySelector("#passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (event) => {
      event.preventDefault(); // Prevenir el envío accidental
      updateUserPassword(); // Solo actualiza la contraseña
    });
  }
  const deleteAccountBtn = document.querySelector(".btn-error");
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", showDeleteModal);
  }
  const deleteAccountForm = document.getElementById("delete-account-form");
  deleteAccountForm.addEventListener("submit", handleAccountDeletion);
  const cancelDeleteBtn = document.getElementById("cancel-delete");
  cancelDeleteBtn.addEventListener("click", hideDeleteModal);
  const closeModal = document.querySelector(".close-modalDelete");
  closeModal.addEventListener("click", hideDeleteModal);
  const toggleSwitches = document.querySelectorAll(
    ".toggle input[type='checkbox']"
  );
  toggleSwitches.forEach((toggle) => {
    toggle.addEventListener("change", (event) => {
      const setting = event.target
        .closest(".notification-option")
        .querySelector("h4").textContent;
      const isEnabled = event.target.checked;
      updateUserPreference(userId, setting, isEnabled);
    });
  });
  const themeOptions = document.querySelectorAll('input[name="theme"]');
  themeOptions.forEach((option) => {
    option.addEventListener("change", (event) => {
      if (event.target.checked) {
        const theme = event.target.id.replace("-theme", "");
        updateUserTheme(userId, theme);
      }
    });
  });
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          localStorage.removeItem("logguedInUserId");
          localStorage.removeItem("userRole");
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Error logging out:", error);
        });
    });
  }
});
async function loadUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const userInfo = userData.userInfo;
      if (userInfo) {
        document.getElementById("firstName").value = extractFirstName(
          userInfo["2_Nombre y Apellido"]
        );
        document.getElementById("lastName").value = extractLastName(
          userInfo["2_Nombre y Apellido"]
        );
        document.getElementById("userPhone").value =
          userInfo["12_Número de Teléfono"] || "";
        document.getElementById("location").value =
          userInfo["6_Ubicación"] || "";
        document.getElementById("userProfession").value =
          userInfo["7_Profesión"] || "";
        document.getElementById("accountTypeProfile").textContent =
          userInfo["5_Tipo de Cuenta"] === "professional"
            ? "Professional account"
            : "Personal account";
        if (userInfo["5_Tipo de Cuenta"] === "professional") {
          document.getElementById("professionalPlans").style.display = "block";
          document.getElementById("contratistPlans").style.display = "none";
          document.getElementById("linkedinCard").style.display = "block";
          document.getElementById("userProfessionGeneral").style.display =
            "block";
        } else {
          document.getElementById("professionalPlans").style.display = "none";
          document.getElementById("contratistPlans").style.display = "block";
          document.getElementById("linkedinCard").style.display = "none";
          document.getElementById("userProfessionGeneral").style.display =
            "none";
        }
      }
    } else {
      console.warn("No user data found");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    displayMessage("Error loading user data", "error");
  }
}
function extractFirstName(fullName) {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}
function extractLastName(fullName) {
  if (!fullName) return "";
  const parts = fullName.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : "";
}
async function updateUserInfo(userId) {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const location = document.getElementById("location").value.trim();
  if (!firstName || !lastName || !location) {
    displayMessage("All fields are required", "error");
    return;
  }
  try {
    const fullName = `${firstName} ${lastName}`;
    await updateDoc(doc(db, "users", userId), {
      "userInfo.6_Ubicación": location,
      "userInfo.2_Nombre y Apellido": fullName,
      "userInfo.12_Número de Teléfono":
        document.getElementById("userPhone").value,
      "userInfo.7_Profesión": document.getElementById("userProfession").value,
    });
    document.getElementById("userName").textContent = fullName;
    localStorage.setItem("showProfileUpdateSuccess", "true");
    window.location.reload(); // recarga la página
  } catch (error) {
    console.error("Error updating profile:", error);
    displayMessage("Error updating profile", "error");
  }
}
async function updateUserPassword() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (!currentPassword || !newPassword || !confirmPassword) {
    displayMessage("All password fields are required", "error");
    return;
  }
  if (newPassword !== confirmPassword) {
    displayMessage("New passwords don't match", "error");
    return;
  }
  if (!validatePassword(newPassword)) {
    displayMessage(
      "Password must be 8-16 characters and include uppercase, lowercase, numbers, and symbols",
      "error"
    );
    return;
  }
  try {
    const user = auth.currentUser;
    if (user) {
      const email = user.email;
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
      displayMessage("Password updated successfully", "success");
    } else {
      displayMessage("You must be logged in to change your password", "error");
    }
  } catch (error) {
    console.error("Error updating password:", error);
    if (error.code === "auth/wrong-password") {
      displayMessage("Current password is incorrect", "error");
    } else if (error.code === "auth/too-many-requests") {
      displayMessage("Too many failed attempts. Try again later", "error");
    } else {
      displayMessage("Error updating password", "error");
    }
  }
}
function showDeleteModal() {
  const modal = document.getElementById("delete-modal");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  const deletePasswordInput = document.getElementById("delete-password");
  const confirmDeleteButton = document.getElementById("confirm-delete-btn");
  if (confirmDeleteButton && deletePasswordInput) {
    confirmDeleteButton.disabled = true;
    deletePasswordInput.removeEventListener("input", handlePasswordInput);
    deletePasswordInput.addEventListener("input", handlePasswordInput);
  }
}
function hideDeleteModal() {
  const modal = document.getElementById("delete-modal");
  modal.classList.remove("active");
  const deletePasswordInput = document.getElementById("delete-password");
  if (deletePasswordInput) {
    deletePasswordInput.value = "";
  }
  const confirmDeleteButton = document.getElementById("confirm-delete-btn");
  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Eliminar cuenta";
  }
  document.body.style.overflow = "";
}
function handlePasswordInput() {
  const confirmDeleteButton = document.getElementById("confirm-delete-btn");
  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = !this.value.trim();
  }
  const changUsernameBtn = document.getElementById("change-username-btn");
  if (changUsernameBtn) {
    changUsernameBtn.disabled = !this.value.trim();
  }
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    const allFilled = inputs.every((input) => input.value.trim() !== "");
    changePasswordBtn.disabled = !allFilled;
  }
}
async function handleAccountDeletion(e) {
  e.preventDefault();
  const password = document.getElementById("delete-password").value;
  if (!password) {
    displayMessage("Por favor, ingresa tu contraseña para confirmar", "error");
    return;
  }

  const confirmDeleteButton = document.getElementById("confirm-delete-btn");
  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Cargando...';
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      displayMessage(
        "Error de autenticación. Por favor, inicia sesión nuevamente.",
        "error"
      );
      if (confirmDeleteButton) {
        confirmDeleteButton.disabled = false;
        confirmDeleteButton.textContent = "Eliminar cuenta";
      }
      return;
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Use user.uid instead of user object
    const notesRef = collection(db, `users/${user.uid}/notas`);
    const notesSnapshot = await getDocs(notesRef);
    for (const doc of notesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const eventsRef = collection(db, `users/${user.uid}/eventos`);
    const eventsSnapshot = await getDocs(eventsRef);
    for (const doc of eventsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const savedProjectsRef = collection(db, "saved_projects");
    const savedProjectsQuery = query(
      savedProjectsRef,
      where("userId", "==", user.uid) // Changed user to user.uid
    );
    const savedProjectsSnapshot = await getDocs(savedProjectsQuery);
    for (const doc of savedProjectsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const projectsRef = collection(db, "projects");
    const projectsQuery = query(projectsRef, where("userId", "==", user.uid)); // Changed user to user.uid
    const projectsSnapshot = await getDocs(projectsQuery);
    for (const doc of projectsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", user.uid) // Changed user to user.uid
    );
    const chatsSnapshot = await getDocs(chatsQuery);
    for (const doc of chatsSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const messagesRef = collection(db, "messages");
    const messagesQuery = query(messagesRef, where("userId", "==", user.uid)); // Changed user to user.uid
    const messagesSnapshot = await getDocs(messagesQuery);
    for (const doc of messagesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const computosRef = collection(db, "calculations");
    const computosSnapshot = await getDocs(computosRef);
    for (const doc of computosSnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);

    localStorage.removeItem("logguedInUserId");
    localStorage.removeItem("userName");

    displayMessage("Cuenta eliminada con éxito", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 3000);
  } catch (error) {
    console.error("Error al eliminar la cuenta:", error);
    if (error.code === "auth/wrong-password") {
      displayMessage("Contraseña incorrecta", "error");
    } else {
      displayMessage("Error al eliminar la cuenta", "error");
    }
    if (confirmDeleteButton) {
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.textContent = "Eliminar cuenta";
    }
  }
}
function validatePassword(password) {
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
  return passwordPattern.test(password);
}
document.addEventListener("DOMContentLoaded", function () {
  const phoneInput = document.getElementById("userPhone");
  if (phoneInput) {
    phoneInput.type = "text";
    let numericPhone = "";
    phoneInput.addEventListener("input", function (e) {
      const cursorPos = e.target.selectionStart;
      const previousLength = e.target.value.length;
      numericPhone = e.target.value.replace(/[^\d]/g, "");
      if (numericPhone.length > 10) {
        numericPhone = numericPhone.slice(0, 10);
      }
      let formattedPhone = "";
      for (let i = 0; i < numericPhone.length; i++) {
        if (i === 2) {
          formattedPhone += " " + numericPhone[i];
        } else if (i === 6) {
          formattedPhone += "-" + numericPhone[i];
        } else {
          formattedPhone += numericPhone[i];
        }
      }
      e.target.value = formattedPhone;
      const lengthDiff = e.target.value.length - previousLength;
      const newCursorPos = cursorPos + (lengthDiff > 0 ? 1 : 0);
      if (lengthDiff >= 0 && (cursorPos === 2 || cursorPos === 7)) {
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }
});
