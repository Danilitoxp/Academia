import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcbwSXVCM5dqAUvOUJCiu0jZRWBAgpdJ8",
  authDomain: "academia-35b4d.firebaseapp.com",
  projectId: "academia-35b4d",
  storageBucket: "academia-35b4d.firebasestorage.app",
  messagingSenderId: "574826780755",
  appId: "1:574826780755:web:b6a65e5f770985b92d8ea6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

const container = document.querySelector(".container");
const registerBtn = document.querySelector(".register-btn");
const loginBtn = document.querySelector(".login-btn");
const loginForm = document.querySelector(".login form");
const registerForm = document.querySelector(".register form");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

// Função de login
document.querySelector(".login .btn").addEventListener("click", (e) => {
  e.preventDefault();
  const email = loginForm.querySelector("input[type='text']").value;
  const password = loginForm.querySelector("input[type='password']").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      const emailPrefix = email.split("@")[0];
      const userDocRef = doc(db, emailPrefix, user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          email: email,
          loginTimestamp: new Date(),
        });
      }

      window.location.href = "/Main/index.html";
    })
    .catch((error) => {
      alert("Erro ao fazer login: " + error.message);
    });
});

// Função de registro
document.querySelector(".register .btn").addEventListener("click", (e) => {
  e.preventDefault();
  const username = registerForm.querySelector(
    "input[placeholder='Username']"
  ).value;
  const email = registerForm.querySelector("input[placeholder='Email']").value;
  const password = registerForm.querySelector(
    "input[placeholder='Password']"
  ).value;
  const emailPrefix = email.split("@")[0];

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      try {
        await setDoc(doc(db, emailPrefix, user.uid), {
          username: username,
          email: email,
        });
        alert("Usuário registrado com sucesso!");
      } catch (firestoreError) {
        console.error("Erro ao salvar no Firestore:", firestoreError);
        alert("Erro ao salvar os dados no Firestore.");
      }
    })
    .catch((error) => {
      console.error("Erro ao registrar usuário:", error);
      alert("Erro ao registrar: " + error.message);
    });
});
