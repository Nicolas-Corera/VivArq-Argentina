document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".faq-item");
  const categoryButtons = document.querySelectorAll(".category-btn");
  const searchInput = document.getElementById("faqSearch");
  const faqNotFound = document.querySelector(".faq-not-found");
  const faqContainer = document.querySelector(".faq-container");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const currentlyActive = document.querySelector(".faq-item.active");
      if (currentlyActive && currentlyActive !== item) {
        currentlyActive.classList.remove("active");
      }
      item.classList.toggle("active");
    });
  });
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      categoryButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      const category = button.getAttribute("data-category");
      faqItems.forEach((item) => {
        if (
          category === "all" ||
          item.getAttribute("data-category") === category
        ) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
      searchInput.value = "";
      faqNotFound.style.display = "none";
      faqContainer.style.display = "block";
    });
  });
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
  searchInput.addEventListener("input", () => {
    const searchTerm = normalizeText(searchInput.value);
    let foundItems = 0;
    if (searchTerm === "") {
      const activeCategory = document
        .querySelector(".category-btn.active")
        .getAttribute("data-category");
      faqItems.forEach((item) => {
        if (
          activeCategory === "all" ||
          item.getAttribute("data-category") === activeCategory
        ) {
          item.style.display = "block";
          foundItems++;
        } else {
          item.style.display = "none";
        }
      });
    } else {
      faqItems.forEach((item) => {
        const question = normalizeText(
          item.querySelector(".faq-question h3").textContent
        );
        const answer = normalizeText(
          item.querySelector(".faq-answer").textContent
        );
        const activeCategory = document
          .querySelector(".category-btn.active")
          .getAttribute("data-category");
        if (
          (question.includes(searchTerm) || answer.includes(searchTerm)) &&
          (activeCategory === "all" ||
            item.getAttribute("data-category") === activeCategory)
        ) {
          item.style.display = "block";
          foundItems++;
        } else {
          item.style.display = "none";
        }
      });
    }
    if (foundItems === 0 && searchTerm !== "") {
      faqNotFound.style.display = "block";
      faqContainer.style.display = "none";
    } else {
      faqNotFound.style.display = "none";
      faqContainer.style.display = "block";
    }
  });
  setTimeout(() => {
    if (faqItems.length > 0) {
      faqItems[0].classList.add("active");
    }
  }, 500);
});
document
  .getElementById("contactUs")
  .addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = `contactUs.html`;
  });
