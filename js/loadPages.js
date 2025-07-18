document.addEventListener("DOMContentLoaded", function () {
  document.body.style.overflow = "hidden";
  const overlay = document.createElement("div");
  overlay.id = "loadingOverlay";
  overlay.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999;";
  const spinner = document.createElement("div");
  spinner.id = "loadingSpinner";
  spinner.style.cssText =
    "width: 50px; height: 50px; border: 5px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top-color: #ffffff; animation: spin 1s linear infinite;";
  const message = document.createElement("div");
  message.textContent = "Cargando...";
  message.style.cssText =
    "color: white; margin-top: 15px; font-family: 'Montserrat', Tahoma, Geneva, Verdana, sans-serif;";
  overlay.appendChild(spinner);
  overlay.appendChild(message);
  document.body.appendChild(overlay);
  const style = document.createElement("style");
  style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
  window.addEventListener("load", function () {
    setTimeout(function () {
      document.body.style.overflow = "auto";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.5s ease";
      setTimeout(function () {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 500);
    }, 1500);
  });
});
