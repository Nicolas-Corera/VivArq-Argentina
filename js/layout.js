document.addEventListener("DOMContentLoaded", () => {
  fetch("layout.html")
    .then((res) => res.text())
    .then((data) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = data;

      // Insertar navbar
      const navbar = tempDiv.querySelector("#navbar");
      document.getElementById("headerLayout").innerHTML = navbar.innerHTML;

      // Insertar footer
      const footer = tempDiv.querySelector("#footer");
      document.getElementById("footerLayout").innerHTML = footer.innerHTML;
    });
});
