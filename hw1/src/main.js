import './style.css';


// FAKE USER FOR LOGIN

const fakeUser = {
  email: "student@gmail.com",
  password: "1234"
};


// SWITCH FORMS

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const cardBox = document.getElementById("cardBox");

window.showRegister = function () {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  cardBox.classList.add("scale-105");
  setTimeout(() => cardBox.classList.remove("scale-105"), 200);
};

window.showLogin = function () {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  cardBox.classList.add("scale-105");
  setTimeout(() => cardBox.classList.remove("scale-105"), 200);
};


// FROM LOGIN BUTTON  Redirect to Dashboard

const loginBtn = document.querySelector("#loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPass").value.trim();

    if (email === "" || password === "") {
      alert("Please enter email and password.");
      return;
    }

    // CHECK FAKE DATA
    if (email === fakeUser.email && password === fakeUser.password) {
      window.location.href = "dashboard.html";
    } else {
      alert("Incorrect email or password!");
    }
  });
}


// REGISTER BUTTON

const registerBtn = document.querySelector("#registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPass").value.trim();

    if (name === "" || email === "" || password === "") {
      alert("Please fill all fields.");
      return;
    }

    alert("Account created! Now you can login.");
    showLogin(); // move back to login form
  });
}
