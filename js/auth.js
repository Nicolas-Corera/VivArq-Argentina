import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  setDoc,
  doc,
  getDoc,
} from "./firebase-config.js";
import { displayMessage } from "./displayMessage.js";
const isRegistrationPage = document.getElementById("contractor") !== null;
const isLoginPage = document.getElementById("submitLogin") !== null;
function handleLoginButtonState() {
  const submitLogin = document.getElementById("submitLogin");
  const emailLogin = document.getElementById("emailLogin");
  const passwordLogin = document.getElementById("passwordLogin");
  if (submitLogin && emailLogin && passwordLogin) {
    submitLogin.disabled = !(
      emailLogin.value.trim() && passwordLogin.value.trim()
    );
  }
}
function handleRegisterButtonState() {
  const submitRegister = document.getElementById("submit");
  if (!submitRegister) return;
  const requiredFields = [
    document.getElementById("name_surname"),
    document.getElementById("email"),
    document.getElementById("password"),
    document.getElementById("documentNumber"),
    document.getElementById("phoneNumber"),
    document.getElementById("termsAgree"),
    document.getElementById("privacity"),
  ];
  const professionalCheckbox = document.getElementById("professional");
  if (professionalCheckbox && professionalCheckbox.checked) {
    requiredFields.push(
      document.getElementById("profession"),
      document.getElementById("experience"),
      document.getElementById("location")
    );
  }
  const professionSelect = document.getElementById("profession");
  const locationSelect = document.getElementById("location");
  if (professionSelect && professionSelect.value === "Otro") {
    requiredFields.push(document.getElementById("otraProfesion"));
  }
  if (locationSelect && locationSelect.value === "Otra provincia") {
    requiredFields.push(document.getElementById("otherLocation"));
  }
  const accountTypeSelected =
    (document.getElementById("contractor") &&
      document.getElementById("contractor").checked) ||
    (document.getElementById("professional") &&
      document.getElementById("professional").checked);
  let allValid = requiredFields.every((field) => {
    if (!field) return true; // Si el campo no existe, lo consideramos válido
    if (field.type === "checkbox") return field.checked;
    return field.value && field.value.trim() !== "";
  });
  allValid = allValid && accountTypeSelected;
  submitRegister.disabled = !allValid;
}
if (isRegistrationPage) {
  let selectedAccountType = null;
  const contractorCheckbox = document.getElementById("contractor");
  const professionalCheckbox = document.getElementById("professional");
  const contractorLabel = document.querySelector('label[for="contractor"]');
  const professionalLabel = document.querySelector('label[for="professional"]');
  const professionalFields = document.getElementById("professionalFields");
  const contractorFields = document.getElementById("contractorFields");
  const allInputFields = document.querySelectorAll("input, select");
  allInputFields.forEach((field) => {
    const eventType = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventType, handleRegisterButtonState);
  });
  const termsCheckbox = document.getElementById("termsAgree");
  const privacityCheckbox = document.getElementById("privacity");
  if (termsCheckbox) {
    termsCheckbox.addEventListener("change", handleRegisterButtonState);
  }
  if (privacityCheckbox) {
    privacityCheckbox.addEventListener("change", handleRegisterButtonState);
  }
  function toggleAdditionalFields() {
    if (professionalCheckbox.checked) {
      professionalFields.style.display = "block";
      contractorFields.style.display = "block";
    } else if (contractorCheckbox.checked) {
      professionalFields.style.display = "none";
      contractorFields.style.display = "none";
    } else {
      professionalFields.style.display = "none";
      contractorFields.style.display = "none";
    }
    handleRegisterButtonState();
  }
  const professionSelect = document.getElementById("profession");
  const otraProfesionContainer = document.getElementById(
    "otraProfesionContainer"
  );
  function toggleOtraProfesion() {
    if (professionSelect.value === "Otro") {
      otraProfesionContainer.style.display = "block";
    } else {
      otraProfesionContainer.style.display = "none";
    }
    handleRegisterButtonState();
  }
  professionSelect?.addEventListener("change", toggleOtraProfesion);
  toggleOtraProfesion?.();
  const locationSelect = document.getElementById("location");
  const otraLocacion = document.getElementById("otherLocationContainer");
  function toggleOtraLocation() {
    if (locationSelect.value === "Otra provincia") {
      otraLocacion.style.display = "block";
    } else {
      otraLocacion.style.display = "none";
    }
    handleRegisterButtonState();
  }
  locationSelect?.addEventListener("change", toggleOtraLocation);
  toggleOtraLocation?.();
  function selectAccountType(event) {
    if (event.target.checked) {
      event.target.closest("label").classList.add("active");
      if (event.target.id === "contractor") {
        professionalCheckbox.checked = false;
        professionalLabel.classList.remove("active");
        selectedAccountType = "contractor";
      } else {
        contractorCheckbox.checked = false;
        contractorLabel.classList.remove("active");
        selectedAccountType = "professional";
      }
    }
    toggleAdditionalFields();
    console.log("Tipo de cuenta seleccionado:", selectedAccountType);
    handleRegisterButtonState();
  }
  contractorCheckbox?.addEventListener("change", selectAccountType);
  professionalCheckbox?.addEventListener("change", selectAccountType);
  handleRegisterButtonState();
  const submit = document.getElementById("submit");
  submit?.addEventListener("click", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const name_surname = document.getElementById("name_surname").value.trim();
    const documentNumber = document
      .getElementById("documentNumber")
      .value.trim();
    const location = document.getElementById("location").value.trim();
    const profession = document.getElementById("profession")?.value.trim();
    const otherProfesion = document
      .getElementById("otraProfesion")
      ?.value.trim();
    const otherLocation = document
      .getElementById("otherLocation")
      ?.value.trim();
    const experience = document.getElementById("experience")?.value.trim();
    const companyName = document.getElementById("companyName")?.value.trim();
    const termsAgree = document.getElementById("termsAgree").checked;
    const privacity = document.getElementById("privacity").checked;
    const phoneNumber = document.getElementById("phoneNumber").value.trim();
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    }
    if (
      !email ||
      !password ||
      !name_surname ||
      !documentNumber ||
      !selectedAccountType ||
      !location ||
      !phoneNumber
    ) {
      displayMessage("¡Completa todos los campos!", "error");
      return;
    }
    if (!termsAgree) {
      displayMessage("Debes aceptar los Términos y Condiciones", "error");
      return;
    }
    if (!privacity) {
      displayMessage("Debes aceptar la Política de Privacidad", "error");
      return;
    }
    if (!validateEmail(email)) {
      displayMessage("Correo electrónico no válido", "error");
      return;
    }
    if (!validatePassword(password)) {
      displayMessage(
        "La contraseña debe tener entre 8 y 16 caracteres, incluir mayúsculas, minúsculas, números y símbolos.",
        "error"
      );
      return;
    }
    if (!location) {
      displayMessage("¡Selecciona una ubicación!", "error");
      return;
    }
    if (profession === "Otro" && !otherProfesion) {
      displayMessage("¡Especifica tu profesión!", "error");
      return;
    }
    if (location === "Otra provincia" && !otherLocation) {
      displayMessage("¡Especifica tu provincia!", "error");
      return;
    }
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.length > 0) {
        displayMessage(
          "¡El correo electrónico ingresado ya está en uso!",
          "error"
        );
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Crear Cuenta";
        }
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const creationDate = new Date();
      const formattedDate = creationDate.toLocaleString("es-LA");
      const userData = {
        userInfo: {
          "1_Email": email,
          "2_Nombre y Apellido": name_surname,
          "3_Número de Documento": documentNumber,
          "4_Fecha de Creación": formattedDate,
          "5_Tipo de Cuenta": selectedAccountType,
          "6_Ubicación":
            location === "Otra provincia" ? otherLocation : location,
          "7_Profesión": profession === "Otro" ? otherProfesion : profession,
          "8_Años de Experiencia": experience,
          "9_Nombre de la Empresa": companyName,
          "10_Términos y condiciones": termsAgree,
          "10.1_Política de Privacidad": privacity,
          "11_Contraseña": password,
          "12_Número de Teléfono": phoneNumber,
        },
      };
      console.log("Profesión:", profession);
      console.log("Años de experiencia:", experience);
      console.log("Nombre de la empresa:", companyName);
      console.log("Tipo de cuenta:", selectedAccountType);
      await setDoc(doc(db, "users", user.uid), userData);
      localStorage.setItem("logguedInUserId", user.uid);
      localStorage.setItem("userRole", selectedAccountType);
      displayMessage("¡Cuenta creada correctamente! Redirigiendo.", "success");
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Crear Cuenta";
      }
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPage = urlParams.get("redirect");
      const userParam = urlParams.get("user");
      const viewingParam = urlParams.get("viewing");
      setTimeout(() => {
        if (redirectPage) {
          let redirectUrl = redirectPage;
          const params = new URLSearchParams();
          if (userParam) params.append("user", userParam);
          if (viewingParam) params.append("viewing", viewingParam);
          if (params.toString()) {
            redirectUrl += `?${params.toString()}`;
          }
          window.location.href = redirectUrl;
        } else {
          window.location.href = "index.html";
        }
      }, 3000);
    } catch (error) {
      const errorCode = error.code;
      if (errorCode === "auth/email-already-in-use") {
        displayMessage("¡El correo electrónico ingresado ya existe!", "error");
      } else {
        displayMessage("¡Error al crear la cuenta!", "error");
        console.error("Error de registro:", error);
      }
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Crear Cuenta";
      }
    }
  });
}
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
function validatePassword(password) {
  const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
  return passwordPattern.test(password);
}
if (isLoginPage) {
  const submitLogin = document.getElementById("submitLogin");
  const emailLogin = document.getElementById("emailLogin");
  const passwordLogin = document.getElementById("passwordLogin");
  if (submitLogin && emailLogin && passwordLogin) {
    submitLogin.disabled = true;
    emailLogin.addEventListener("input", handleLoginButtonState);
    passwordLogin.addEventListener("input", handleLoginButtonState);
    handleLoginButtonState();
  }
}
submitLogin?.addEventListener("click", async (event) => {
  event.preventDefault();
  const emailLogin = document.getElementById("emailLogin").value.trim();
  const passwordLogin = document.getElementById("passwordLogin").value.trim();
  if (submitLogin) {
    submitLogin.disabled = true;
    submitLogin.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Cargando...';
  }
  if (!emailLogin || !passwordLogin) {
    displayMessage("¡Completa todos los campos!", "error");
    if (submitLogin) {
      submitLogin.disabled = false;
      submitLogin.textContent = "Iniciar Sesión";
    }
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailLogin,
      passwordLogin
    );
    const user = userCredential.user;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userInfo = userData.userInfo;
        const accountType = userInfo
          ? userInfo["5_Tipo de Cuenta"]
          : "contractor";
        localStorage.setItem("userRole", accountType);
        console.log("Tipo de cuenta guardado en localStorage:", accountType);
      } else {
        console.warn(
          "Documento de usuario no encontrado, usando rol predeterminado."
        );
        localStorage.setItem("userRole", "contractor");
      }
    } catch (error) {
      console.error("Error al obtener rol del usuario:", error);
      localStorage.setItem("userRole", "contractor");
    }
    displayMessage("¡Sesión iniciada con éxito! Redirigiendo.", "success");
    if (submitLogin) {
      submitLogin.disabled = false;
      submitLogin.textContent = "Iniciar Sesión";
    }
    localStorage.setItem("logguedInUserId", user.uid);
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPage = urlParams.get("redirect");
    const userParam = urlParams.get("user");
    const viewingParam = urlParams.get("viewing");
    setTimeout(() => {
      if (redirectPage) {
        let redirectUrl = redirectPage;
        const params = new URLSearchParams();
        if (userParam) params.append("user", userParam);
        if (viewingParam) params.append("viewing", viewingParam);
        if (params.toString()) {
          redirectUrl += `?${params.toString()}`;
        }
        window.location.href = redirectUrl;
      } else {
        window.location.href = "index.html";
      }
    }, 3000);
  } catch (error) {
    const errorCode = error.code;
    const loginErrorMessages = {
      "auth/wrong-password": "Contraseña incorrecta",
      "auth/user-not-found": "Usuario no registrado",
      "auth/invalid-email": "Correo electrónico inválido",
      "auth/user-disabled": "La cuenta está deshabilitada",
      "auth/too-many-requests":
        "Demasiados intentos. Vuelve a intentarlo más tarde.",
      "auth/invalid-credential": "Datos incorrectos",
      "auth/network-request-failed": "Error de conexión. Verifica tu internet.",
    };
    const message =
      loginErrorMessages[errorCode] || "¡Error al iniciar sesión!";
    displayMessage(message, "error");
    if (!loginErrorMessages[errorCode]) {
      console.error("Error inesperado:", error);
    }
    if (submitLogin) {
      submitLogin.disabled = false;
      submitLogin.textContent = "Iniciar Sesión";
    }
  }
});
const btnForgotPassword = document.getElementById("forgotPasswordLink");
const sendEmailButton = document.getElementById("sendEmailButton");
const emailResetInput = document.getElementById("emailReset");
if (btnForgotPassword) {
  btnForgotPassword.onclick = () => {
    window.location.href = "resetPassword.html";
  };
}
if (emailResetInput) {
  emailResetInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter" && sendEmailButton) {
      sendEmailButton.click();
    }
  });
}
document.addEventListener("DOMContentLoaded", function () {
  const documentInput = document.getElementById("documentNumber");
  if (documentInput) {
    documentInput.type = "text";
    let numericValue = "";
    documentInput.addEventListener("input", function (e) {
      const cursorPos = e.target.selectionStart;
      const previousLength = e.target.value.length;
      numericValue = e.target.value.replace(/[^\d]/g, "");
      if (numericValue.length > 8) {
        numericValue = numericValue.slice(0, 8);
      }
      let formattedValue = "";
      for (let i = 0; i < numericValue.length; i++) {
        if (i === 2 || i === 5) {
          formattedValue += "." + numericValue[i];
        } else {
          formattedValue += numericValue[i];
        }
      }
      e.target.value = formattedValue;
      const lengthDiff = e.target.value.length - previousLength;
      const newCursorPos = cursorPos + (lengthDiff > 0 ? 1 : 0);
      if (lengthDiff >= 0 && (cursorPos === 2 || cursorPos === 6)) {
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
    const form = documentInput.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        if (numericValue.length < 7 || numericValue.length > 8) {
          e.preventDefault();
          displayMessage("El DNI debe tener entre 7 y 8 dígitos", "error");
          return;
        }
        documentInput.value = numericValue;
      });
    }
  }
});
document.addEventListener("DOMContentLoaded", function () {
  const phoneInput = document.getElementById("phoneNumber");
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
    const form = phoneInput.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        if (numericPhone.length !== 10) {
          e.preventDefault();
          displayMessage("El número debe tener 10 dígitos", "error");
          return;
        }
        phoneInput.value = numericPhone;
      });
    }
  }
});
