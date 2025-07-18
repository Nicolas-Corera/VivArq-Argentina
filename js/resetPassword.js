import { auth, sendPasswordResetEmail } from "./firebase-config.js";
document.addEventListener("DOMContentLoaded", () => {
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const successMessage = document.getElementById("successMessage");
  const cardBody = document.querySelector(".card-body");
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get("email");
  if (emailParam) {
    document.getElementById("email").value = decodeURIComponent(emailParam);
  }
  resetPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    if (!email) {
      showNotification("Please enter your email address", "error");
      return;
    }
    if (!validateEmail(email)) {
      showNotification("Please enter a valid email address", "error");
      return;
    }
    try {
      const sentAt = Date.now();
      const actionCodeSettings = {
        url: `${window.location.origin}/vivarq/newPassword.html?sentAt=${sentAt}`,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      cardBody.style.display = "none";
      successMessage.classList.add("active");
      console.log("Password reset email sent to:", email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      if (error.code === "auth/user-not-found") {
        cardBody.style.display = "none";
        successMessage.classList.add("active");
      } else if (error.code === "auth/invalid-email") {
        showNotification("Please enter a valid email address", "error");
      } else if (error.code === "auth/too-many-requests") {
        showNotification("Too many requests. Please try again later", "error");
      } else {
        showNotification(
          "Error sending reset email. Please try again",
          "error"
        );
      }
    }
  });
});
function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
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
