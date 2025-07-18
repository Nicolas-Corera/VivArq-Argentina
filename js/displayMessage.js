function displayMessage(message, type = "info") {
  const messageContainer = document.createElement("div");
  messageContainer.className = `message-container ${type}`;
  messageContainer.innerHTML = `
    <div class="message-content">
      <i class="fas ${getIconByType(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(messageContainer);
  setTimeout(() => {
    messageContainer.classList.add("show");
  }, 10);
  setTimeout(() => {
    messageContainer.classList.remove("show");
    setTimeout(() => {
      document.body.removeChild(messageContainer);
    }, 300); // Esperar a que termine la animación antes de eliminar
  }, 3000);
}
function getIconByType(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "error":
      return "fa-times-circle";
    case "warning":
      return "fa-exclamation-triangle";
    default:
      return "fa-info-circle";
  }
}
export { displayMessage };
