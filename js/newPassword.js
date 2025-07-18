import {
  auth,
  getAuth,
  updatePassword,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "./firebase-config.js";
document.addEventListener("DOMContentLoaded", () => {
  const newPasswordForm = document.getElementById("newPasswordForm");
  const successMessage = document.getElementById("successMessage");
  const errorMessage = document.getElementById("errorMessage");
  const cardBody = document.querySelector(".card-body");
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");
  let sentAtParam = urlParams.get("sentAt");
  if (!sentAtParam && urlParams.has("continueUrl")) {
    const continueUrl = decodeURIComponent(urlParams.get("continueUrl"));
    const qs = continueUrl.split("?", 2)[1] || "";
    const cParams = new URLSearchParams(qs);
    sentAtParam = cParams.get("sentAt");
  }
  const TEN_MIN = 10 * 60 * 1000;
  if (!sentAtParam || Date.now() - Number(sentAtParam) > TEN_MIN) {
    cardBody.style.display = "none";
    errorMessage.innerHTML = `
      <div class="error-icon">!</div>
      <h3>Link expirado</h3>
      <p>
        Este enlace para restablecer tu contraseña ha caducado o no es válido.
        Solicita un nuevo enlace para restablecer tu contraseña.
      </p>
      <button
        onclick="window.location.href='resetPassword.html'"
        class="btn btn-primary"
      >
        Solicitar nuevo link
      </button>
    `;
    errorMessage.classList.add("active");
    return;
  }
  if (mode !== "resetPassword" || !oobCode || oobCode === "code") {
    cardBody.style.display = "none";
    errorMessage.classList.add("active");
    return;
  }
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const strengthBar = document.getElementById("strengthBar");
  const strengthText = document.getElementById("strengthText");
  newPasswordInput.addEventListener("input", () => {
    const password = newPasswordInput.value;
    updatePasswordStrength(password);
  });
  newPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (!newPassword || !confirmPassword) {
      showNotification("Please fill in all fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }
    if (!validatePassword(newPassword)) {
      showNotification("Password must meet all requirements", "error");
      return;
    }
    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, newPassword);
      cardBody.style.display = "none";
      successMessage.classList.add("active");
    } catch (error) {
      console.error("Error resetting password:", error);
      if (
        error.code === "auth/expired-action-code" ||
        error.code === "auth/invalid-action-code"
      ) {
        cardBody.style.display = "none";
        errorMessage.classList.add("active");
      } else if (error.code === "auth/weak-password") {
        showNotification(
          "Password is too weak. Please use a stronger password.",
          "error"
        );
      } else {
        showNotification("Error updating password. Please try again.", "error");
      }
    }
  });
});
function validatePassword(password) {
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
  return passwordPattern.test(password);
}
function showNotification(message, type) {
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    document.body.appendChild(notification);
  }
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.display = "block";
  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}
