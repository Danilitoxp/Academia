import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcbwSXVCM5dqAUvOUJCiu0jZRWBAgpdJ8",
  authDomain: "academia-35b4d.firebaseapp.com",
  projectId: "academia-35b4d",
  storageBucket: "academia-35b4d.firebasestorage.app",
  messagingSenderId: "574826780755",
  appId: "1:574826780755:web:b6a65e5f770985b92d8ea6",
};

// Inicializa o Firebase apenas uma vez
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Garante que o DOM foi carregado antes de acessar elementos
document.addEventListener("DOMContentLoaded", function () {
  const btnCriarTreino = document.getElementById("btnCriarTreino");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnSalvarConfiguracoes = document.getElementById("salvarConfiguracoes");
  const btnFecharConfiguracoes = document.getElementById("fecharConfiguracoes");
  const BotãoAbrirModalCriarTreino = document.getElementById(
    "BotãoAbrirModalCriarTreino"
  );
  const botãoFecharModalCriarNovoTreino = document.getElementById(
    "botãoFecharModalCriarNovoTreino"
  );

  const treinos = document.querySelector(".Treinos");
  const dashboard = document.querySelector(".dashboard");
  const loginBtn = document.querySelector(".login-btn");
  const registerBtn = document.querySelector(".register-btn");
  const loginForm = document.querySelector(".login form");
  const registerForm = document.querySelector(".register form");
  const ModalTreinos = document.querySelector(".Modal-Treinos");

  // Variaveis Globais
  let gruposMuscularesSelecionados = [];
  let treinoSelecionadoId = null;
  let treinoAtualId = null;

  // Chamada de Função
  carregarDadosDoFirestore();
  

  async function carregarDadosDoFirestore() {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("⚠️ Usuário não autenticado. Abortando carregamento.");
        return;
      }

      console.log("✅ Usuário autenticado:", user.email);
      const emailPrefix = user.email.split("@")[0];
      const userDocRef = doc(db, emailPrefix, user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        return;
      }

      const dados = docSnap.data();
      const treinos = dados.treinos || [];
      const nomeUsuario = dados.username || "Usuário";
      const emailUsuario = dados.email || "Email não cadastrado";

      // Atualiza as informações do usuário na interface
      document.getElementById("nomeUsuario").value = nomeUsuario;
      document.getElementById("emailUsuario").value = emailUsuario;

      // Atualiza a lista de treinos
      const listaTreinos = document.querySelector(".Treinos main");
      listaTreinos.innerHTML = ""; // Limpa a lista antes de adicionar novos itens

      treinos.forEach((treino) => {
        if (!treino || !treino.nome) {
          console.error("❌ ERRO: Treino indefinido ou sem nome.");
          return;
        }

        // 🔹 Se gruposMusculares não existir, define como "Desconhecido"
        let gruposMusculares =
          Array.isArray(treino.gruposMusculares) &&
          treino.gruposMusculares.length > 0
            ? treino.gruposMusculares
            : ["desconhecido"];

        // ✅ Criamos um novo elemento <div> para representar o treino
        const treinoElement = document.createElement("div"); // <=== Definição corrigida
        treinoElement.setAttribute("data-grupos", gruposMusculares.join(",")); // Agora `gruposMusculares` já está definido
        treinoElement.classList.add("Treino");
        treinoElement.id = treino.nome.toLowerCase().replace(/\s+/g, "-");

        let iconesHTML = gruposMusculares
          .map(
            (grupo) =>
              `<img src="/Main/img/${grupo}-icone.svg" alt="${grupo}" class="grupo-icone">`
          )
          .join("");

        // ✅ Agora que treinoElement está definido, podemos atualizar o conteúdo dele
        treinoElement.innerHTML = `
  <div class="icones">${iconesHTML}</div>
  <div class="descricao">
    <div class="descricaoInfo">
        <h5>${treino.nome.toUpperCase()}</h5>
      <p>Exercícios: ${
        Array.isArray(treino.exercicios) ? treino.exercicios.length : 0
      }</p>
    </div>
      <div class="excluir">
        <button class="remover-treino" data-treino="${treinoElement.id}">
            <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
  </div>
`;

        console.log("✅ Treino carregado:", treino);
        listaTreinos.appendChild(treinoElement);
      });

      console.log("✅ Dados carregados do Firestore!");
    });
  }

  document.addEventListener("click", async function (event) {
    const btnRemoverTreino = event.target.closest(".remover-treino");
    if (!btnRemoverTreino) return;

    const treinoId = btnRemoverTreino.getAttribute("data-treino");
    const treinoParaRemover = document.getElementById(treinoId);

    if (!treinoId || !treinoParaRemover) {
      console.error(`❌ ERRO: Treino com ID '${treinoId}' não encontrado.`);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      console.error("❌ ERRO: Usuário não autenticado.");
      return;
    }

    if (
      confirm(
        `❌ Tem certeza que deseja excluir o treino "${
          treinoParaRemover.querySelector("h5").textContent
        }"?`
      )
    ) {
      // Remove o treino da interface
      treinoParaRemover.remove();
      console.log(`✅ Treino removido da interface: ${treinoId}`);

      // Remove o treino do Firestore
      await removerTreinoDoFirestore(treinoId);
    }
  });

  async function atualizarExercicioNoFirestore(treinoId, exercicioId, novasSeries, novasReps, novoPeso) {
    const user = auth.currentUser;
    if (!user) {
        console.error("❌ ERRO: Usuário não autenticado!");
        return;
    }

    const emailPrefix = user.email.split("@")[0];
    const userDocRef = doc(db, emailPrefix, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
        console.error("❌ ERRO: Documento do usuário não encontrado.");
        return;
    }

    let treinos = docSnap.data().treinos || [];

    console.log(`📌 Treinos carregados do Firestore:`, treinos);

    // 🔍 Encontrar o treino correto
    let treinoIndex = treinos.findIndex(t => t.nome.toLowerCase().replace(/\s+/g, "-") === treinoId);
    if (treinoIndex === -1) {
        console.error(`❌ ERRO: Treino '${treinoId}' não encontrado.`);
        return;
    }

    console.log(`✅ Treino encontrado:`, treinos[treinoIndex]);

    // 🔍 Encontrar o exercício correto dentro do treino
    let exercicioIndex = treinos[treinoIndex].exercicios.findIndex(e => e.id === exercicioId);
    if (exercicioIndex === -1) {
        console.error(`❌ ERRO: Exercício '${exercicioId}' não encontrado no treino '${treinoId}'.`);
        return;
    }

    console.log(`✅ Exercício encontrado antes da atualização:`, treinos[treinoIndex].exercicios[exercicioIndex]);

    // 📌 Atualizar os dados do exercício
    treinos[treinoIndex].exercicios[exercicioIndex].series = novasSeries;
    treinos[treinoIndex].exercicios[exercicioIndex].repeticoes = novasReps;
    treinos[treinoIndex].exercicios[exercicioIndex].peso = novoPeso;

    console.log(`🔥 Novo estado do exercício após atualização:`, treinos[treinoIndex].exercicios[exercicioIndex]);

    // 🚀 Atualizar no Firestore
    await updateDoc(userDocRef, { treinos });

    console.log(`✅ Exercício '${exercicioId}' atualizado no Firestore no treino '${treinoId}'`);
}


  async function removerTreinoDoFirestore(treinoId) {
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ ERRO: Usuário não autenticado.");
      return;
    }

    const emailPrefix = user.email.split("@")[0];
    const userDocRef = doc(db, emailPrefix, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      console.error("❌ ERRO: Documento do usuário não encontrado.");
      return;
    }

    let treinos = docSnap.data().treinos || [];

    // Filtra para remover o treino específico
    treinos = treinos.filter(
      (treino) => treino.nome.toLowerCase().replace(/\s+/g, "-") !== treinoId
    );

    // Atualiza no Firestore
    await updateDoc(userDocRef, { treinos });

    console.log(`✅ Treino '${treinoId}' removido do Firestore.`);
  }

  // ✅ Adiciona eventos apenas se os botões existirem
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      document.querySelector(".container").classList.add("active");
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      document.querySelector(".container").classList.remove("active");
    });
  }

  if (btnCriarTreino) {
    btnCriarTreino.addEventListener("click", function () {
      console.log("✅ Clicou para Abrir Modal de Treinos.");
      document.querySelector(".dashboard").style.display = "none";
      document.querySelector(".Treinos").style.display = "block";

      carregarDadosDoFirestore();
    });
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", function () {
      console.log("✅ Clicou no botão para Voltar ao Dashboard.");
      treinos.style.display = "none"; // ✅ Agora 'treinos' está definido
      dashboard.style.display = "block"; // ✅ Evita erro caso 'dashboard' não esteja definido
    });
  }

  if (BotãoAbrirModalCriarTreino) {
    BotãoAbrirModalCriarTreino.addEventListener("click", function () {
      treinos.style.display = "none";
      ModalTreinos.style.display = "block"; // ✅ Agora 'ModalTreinos' está definido
    });
  }

  if (botãoFecharModalCriarNovoTreino) {
    botãoFecharModalCriarNovoTreino.addEventListener("click", function () {
      console.log("✅ Clicou no Botão e fechou Modal de Treino.");
      treinos.style.display = "block";
      ModalTreinos.style.display = "none"; // ✅ Agora 'ModalTreinos' está definido
    });
  }

  if (btnSalvarConfiguracoes) {
    btnSalvarConfiguracoes.addEventListener("click", function () {
      console.log("✅ Clicou para salvar configurações.");
      const nomeUsuario = document.getElementById("nomeUsuario").value.trim();
      const emailUsuario = document.getElementById("emailUsuario").value.trim();
      const temaSelecionado = document.getElementById("tema").value;

      if (!nomeUsuario || !emailUsuario) {
        alert("⚠️ Preencha todos os campos.");
        return;
      }

      document.body.style.backgroundColor =
        temaSelecionado === "escuro" ? "#181A1E" : "#ffffff";
      console.log("✅ Tema aplicado:", temaSelecionado);
      document.getElementById("modalConfiguracoes").style.display = "none";
    });
  }

  if (btnFecharConfiguracoes) {
    btnFecharConfiguracoes.addEventListener("click", function () {
      console.log("✅ Clicou para Fechar configurações.");
      document.getElementById("modalConfiguracoes").style.display = "none";
    });
  }

  // ✅ Função de login
  if (loginForm) {
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
            console.warn("⚠️ Criado um novo documento para o usuário.");
            await setDoc(userDocRef, {
              username: emailPrefix,
              email: email,
              treinos: [],
            });
          }

          window.location.href = "/Main/index.html";
        })
        .catch((error) => {
          alert("Erro ao fazer login: " + error.message);
        });
    });
  }

  // ✅ Função de registro
  if (registerForm) {
    document.querySelector(".register .btn").addEventListener("click", (e) => {
      e.preventDefault();
      const username = registerForm.querySelector(
        "input[placeholder='Username']"
      ).value;
      const email = registerForm.querySelector(
        "input[placeholder='Email']"
      ).value;
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
              treinos: [],
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
  }

  document
    .getElementById("BotãoCriarNovoTreino")
    .addEventListener("click", async () => {
      const nomeTreino = document.getElementById("nometreino").value.trim();
      if (!nomeTreino) {
        alert("⚠️ Defina um nome para o treino!");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        alert("Usuário não autenticado");
        return;
      }

      const emailPrefix = user.email.split("@")[0];
      const userDocRef = doc(db, emailPrefix, user.uid);
      const docSnap = await getDoc(userDocRef);

      let treinos = [];

      // ✅ Se o documento do usuário já existe, pegamos os treinos existentes
      if (docSnap.exists()) {
        treinos = docSnap.data().treinos || [];
      } else {
        // ❗ Se não existir, criamos um novo documento com um array vazio de treinos
        await setDoc(userDocRef, { treinos: [] });
        console.warn("⚠️ Criado um novo documento para o usuário.");
      }

      let gruposSelecionados = Array.from(
        document.querySelectorAll(".gruposMuscularesTreino button.selecionado")
      ).map((btn) => btn.id);

      if (gruposSelecionados.length === 0) {
        console.warn(
          "⚠️ Nenhum grupo muscular selecionado. Definindo como 'Desconhecido'."
        );
        gruposSelecionados = ["Desconhecido"];
      }

      // Adiciona o novo treino ao array
      treinos.push({
        nome: nomeTreino,
        gruposMusculares: gruposSelecionados, // 🔹 Sempre definimos um array válido
        exercicios: [],
      });

      await updateDoc(userDocRef, { treinos });
      console.log("✅ Treino salvo no Firestore!", treinos);

      // Aguarde a atualização e recarregue os treinos
      await carregarDadosDoFirestore();

      // ✅ Fecha o modal após criar o treino
      document.querySelector(".Modal-Treinos").style.display = "none";

      // ✅ Limpa os campos após criar o treino
      document.getElementById("nometreino").value = "";
      document
        .querySelectorAll(".gruposMuscularesTreino button.selecionado")
        .forEach((btn) => btn.classList.remove("selecionado"));

      // ✅ Retorna para a tela "Meus Treinos"
      document.querySelector(".Treinos").style.display = "block"; // Mostra a tela de treinos
      document.querySelector(".dashboard").style.display = "none"; // Esconde o dashboard, se necessário

      // ✅ Atualiza a lista de treinos
      carregarDadosDoFirestore();

      console.log(`✅ Treino "${nomeTreino}" criado e salvo no Firestore.`);
    });

  // ✅ Salvar Configurações
  if (btnSalvarConfiguracoes) {
    btnSalvarConfiguracoes.addEventListener("click", function () {
      console.log("✅ Clicou para salvar configurações.");
      const nomeUsuario = document.getElementById("nomeUsuario").value.trim();
      const emailUsuario = document.getElementById("emailUsuario").value.trim();
      const temaSelecionado = document.getElementById("tema").value;

      if (!nomeUsuario || !emailUsuario) {
        alert("⚠️ Preencha todos os campos.");
        console.warn("⚠️ Campos vazios detectados. Preenchimento obrigatório.");
        return;
      }

      document.body.style.backgroundColor =
        temaSelecionado === "escuro" ? "#181A1E" : "#ffffff";
      console.log("✅ Tema aplicado:", temaSelecionado);

      // Fecha o modal
      modalConfiguracoes.style.display = "none";
    });
  } else {
    console.error("❌ ERRO: Botão 'Salvar Configurações' não encontrado!");
  }

  // ✅ Fechar Configurações
  if (btnFecharConfiguracoes) {
    btnFecharConfiguracoes.addEventListener("click", function () {
      console.log("✅ Clicou para Fechar configurações.");

      modalConfiguracoes.style.display = "none";
    });
  } else {
    console.error("❌ ERRO: Botão 'Salvar Configurações' não encontrado!");
  }

  // Seleciona a div do usuário
  const usuarioDiv = document.querySelector(".usuario");

  // ✅ Adiciona evento apenas se a div existir
  if (usuarioDiv) {
    usuarioDiv.addEventListener("click", function () {
      console.log("✅ Clicou para Abrir Modal Configurações.");
      document.getElementById("modalConfiguracoes").style.display = "flex";
    });
  } else {
    console.error("❌ ERRO: Não encontrou a div .usuario no DOM!");
  }

  // ✅ Atualizar o Progresso de Dias Treinando
  function atualizarProgresso(diaAtual, totalDias) {
    const progresso = document.querySelector(".progress-circle .progress");
    const numeroDia = document.getElementById("NumeroDia");

    let porcentagem = (diaAtual / totalDias) * 283;

    progresso.style.strokeDashoffset = 283 - porcentagem;
    numeroDia.textContent = diaAtual;
  }

  // ✅ Abrir modal de Treinos
  if (btnCriarTreino) {
    btnCriarTreino.addEventListener("click", function () {
      document.querySelector(".dashboard").style.display = "none";
      document.querySelector(".Treinos").style.display = "block";
    });
  }

  // ✅ Abriu Modal para Criar novo Treino
  BotãoAbrirModalCriarTreino.addEventListener("click", function () {
    console.log("✅ Abriu o Modal Para Criar novo Treino.");
    treinos.style.display = "none";
    ModalTreinos.style.display = "block";
  });

  // ✅ Botão para Fechar Modal de Criar Treino
  botãoFecharModalCriarNovoTreino.addEventListener("click", function () {
    console.log("✅ Clicou no Botão E fechou Modal de Treino");
    treinos.style.display = "block";
    ModalTreinos.style.display = "none";
  });

  // ✅ Quando um treino é aberto, armazenamos o ID do treino selecionado
  document
    .querySelector(".Treinos main")
    .addEventListener("click", function (event) {
      let card = event.target.closest(".Treino");
      if (!card) return; // Se não clicou em um treino, sai da função

      treinoSelecionadoId = card.id; // 🔹 Atualiza o treino atualmente selecionado
      let modalEditarTreinos = document.getElementById(
        `modal-${treinoSelecionadoId}`
      );

      if (!modalEditarTreinos) {
        console.error();
        return;
      }

      // Abre o modal do treino
      document.querySelector(".Treinos").style.display = "none";
      modalEditarTreinos.style.display = "block";
      console.log(`✅ Treino selecionado: ${treinoSelecionadoId}`);
    });

  // ✅ Botão para Excluir Treino
  document.addEventListener("click", function (event) {
    const botaoExcluirTreino = event.target.closest(".delete-treino");

    if (botaoExcluirTreino) {
      const treinoId = botaoExcluirTreino.getAttribute("data-treino");
      const treinoParaExcluir = document.getElementById(treinoId);
      const listaTreinos = document.querySelector(".Treinos main");
      const modalEditarTreinos = document.getElementById(`modal-${treinoId}`);
      const modalAdicionarExercicio = document.querySelector(
        ".modal-adicionar-exercicio"
      );
      const treinos = document.querySelector(".Treinos");

      if (!treinoId || !treinoParaExcluir) {
        console.error(`❌ ERRO: Treino com ID '${treinoId}' não encontrado.`);
        return;
      }

      const nomeTreino = treinoParaExcluir.querySelector("h5").textContent;

      if (
        confirm(`❌ Tem certeza que deseja excluir o treino: "${nomeTreino}"?`)
      ) {
        // Remove o treino da lista
        treinoParaExcluir.remove();

        // Esconde o modal de edição, se estiver aberto
        if (modalEditarTreinos) modalEditarTreinos.style.display = "none";
        if (modalAdicionarExercicio)
          modalAdicionarExercicio.style.display = "none";

        // Volta para a tela de treinos
        treinos.style.display = "block";

        // Verifica se há treinos restantes
        if (listaTreinos.children.length === 0) {
          listaTreinos.innerHTML = `
          <div class="mensagem-sem-treinos">
            <p>📌 Nenhum treino cadastrado. Clique em "Adicionar Treino" para começar.</p>
          </div>
        `;
        }

        console.log(`✅ Clicou no Botão e Excluiu o Treino: ${nomeTreino}`);
      }
    }
  });

  // ✅ Botão para Abrir Modal do Treino selecionado
  document
    .querySelector(".Treinos main")
    .addEventListener("click", async function (event) {
      let card = event.target.closest(".Treino");
      if (!card) return; // Sai da função se não clicou em um treino

      let treinoSelecionadoId = card.id;
      let modalEditarTreinos = document.getElementById(
        `modal-${treinoSelecionadoId}`
      );

      // Captura o nome do treino para exibição
      let nomeTreino = card.querySelector("h5")
        ? card.querySelector("h5").textContent.trim()
        : "Treino";

      // Captura os grupos musculares armazenados no card
      let gruposMusculares = card.getAttribute("data-grupos") || "";
      let gruposArray = gruposMusculares
        ? gruposMusculares.split(",").map((grupo) => grupo.trim())
        : [];

      // Acessa os dados do treino no Firestore
      const user = auth.currentUser;
      if (!user) {
        console.warn(
          "⚠️ Usuário não autenticado. Não é possível carregar os exercícios."
        );
        return;
      }

      const emailPrefix = user.email.split("@")[0];
      const userDocRef = doc(db, emailPrefix, user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        console.warn("⚠️ Nenhum dado encontrado para este usuário.");
        return;
      }

      let treinos = docSnap.data().treinos || [];

      // Encontrar o treino correto
      let treino = treinos.find(
        (t) => t.nome.toLowerCase().replace(/\s+/g, "-") === treinoSelecionadoId
      );

      if (!treino) {
        console.error(
          `❌ ERRO: Treino '${treinoSelecionadoId}' não encontrado.`
        );
        return;
      }

      // ✅ Exibir exercícios no console
      let listaExerciciosHTML = "";
if (Array.isArray(treino.exercicios) && treino.exercicios.length > 0) {
  treino.exercicios.forEach((exercicio, index) => {
    console.log(`📋 Exercício carregado: ${exercicio.nome} - ID: ${exercicio.id}`);

    listaExerciciosHTML += `
    <div class="exercicio" data-id="${exercicio.id}">
      <div class="imagemDoExercicio">
        <img src="${exercicio.imagem}" alt="${exercicio.nome}" />
      </div>
      <div class="infosDoExercicio">
        <div class="equipamento">
          <span>${exercicio.equipamento}</span>
          <button class="remover-exercicio" data-treino="${treinoSelecionadoId}" data-exercicio-id="${exercicio.id}">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <p>${exercicio.nome}</p>
        <div class="dadosExercicio">
          <div class="series"><span>${exercicio.series || 3}</span><p>Séries</p></div>
          <div class="Repticoes"><span>${exercicio.repeticoes || 15}</span><p>Rep(s)</p></div>
          <div class="Kg"><span>${exercicio.peso || 60}</span><p>Kg(s)</p></div>
        </div>
      </div>
    </div>
    `;
  });

      } else {
        console.log(
          `📌 O treino '${treino.nome}' não possui exercícios cadastrados.`
        );
        listaExerciciosHTML = `
      <div class="exercicio placeholder">
        <span class="material-symbols-outlined">error_outline</span>
        <p>Você ainda não adicionou nenhum exercício.</p>
      </div>
    `;
      }

      let gruposHTML =
        gruposArray.length > 0
          ? gruposArray
              .map(
                (grupo) =>
                  `<span class="grupo-tag">${grupo.toUpperCase()}</span>`
              )
              .join(" <span class='separador'>+</span> ")
          : "<span>Nenhum grupo selecionado</span>";

      // 🔹 Garante que `iconesHTML` é definido corretamente para evitar erros
      let iconesHTML = "";
      if (Array.isArray(gruposArray) && gruposArray.length > 0) {
        iconesHTML = gruposArray
          .map(
            (grupo) =>
              `<img src="/Main/img/${grupo}-icone.svg" alt="${grupo}" class="grupo-icone">`
          )
          .join("");
      }

      // Se o modal ainda não existe, cria um novo
      if (!modalEditarTreinos) {
        modalEditarTreinos = document.createElement("section");
        modalEditarTreinos.classList.add("Modal-Editar-Treinos");
        modalEditarTreinos.id = `modal-${treinoSelecionadoId}`;
        document.body.appendChild(modalEditarTreinos);
      }

      // Atualiza o conteúdo do modal
      modalEditarTreinos.innerHTML = `
    <nav>
        <button class="back fechar-modal-editar" data-treino="${treinoSelecionadoId}">
            <span class="material-symbols-outlined">keyboard_backspace</span>
        </button>
        <p>${nomeTreino.toUpperCase()}</p>
        <button class="add" id="btnAdicionarExercicio${treinoSelecionadoId}" data-treino="${treinoSelecionadoId}">
            <span class="material-symbols-outlined">add</span>
        </button>
    </nav>
    <div class="modal-adicionar-exercicio">
        <div class="detalhes-treino">${iconesHTML}</div>
        <div class="lista-exercicios-disponiveis">
            <div class="exerciciosAdicionados">
                <h6>${gruposHTML}</h6>
            </div>
            <div class="lista-exercicios">
                ${listaExerciciosHTML}
            </div>
        </div>
    </div>
  `;

      console.log(`✅ Abriu o Modal do Treino: ${nomeTreino}`);

      // Exibe o modal e oculta a lista de treinos
      document.querySelector(".Treinos").style.display = "none";
      modalEditarTreinos.style.display = "block";
    });

  // ✅ Botão para Fechar modal de edição do treino e voltar para a lista de treinos
  document.addEventListener("click", function (event) {
    const btnFecharModalEditarTreino = event.target.closest(
      ".fechar-modal-editar"
    );

    if (!btnFecharModalEditarTreino) return;

    const treinoId = btnFecharModalEditarTreino.getAttribute("data-treino");
    if (!treinoId) {
      console.error(
        "❌ ERRO: Treino ID não encontrado ao tentar fechar o modal."
      );
      return;
    }

    const modalTreino = document.getElementById(`modal-${treinoId}`);
    const listaTreinos = document.querySelector(".Treinos");
    const modalAdicionarExercicio = document.querySelector(
      ".modal-adicionar-exercicio"
    );

    if (modalTreino) {
      modalTreino.style.display = "none"; // Esconde o modal do treino atual
    }

    if (listaTreinos) {
      listaTreinos.style.display = "block"; // Mostra a lista de treinos
    }

    if (modalAdicionarExercicio) {
      modalAdicionarExercicio.style.display = "none"; // Garante que o modal de adicionar exercícios fique oculto
    }

    console.log(
      `✅ Fechou o modal do treino: ${treinoId}, ocultou modal-adicionar-exercicio e voltou para a lista.`
    );
  });

  // ✅ Botão para Abrir Modal De adicionar Exercícios
  document.addEventListener("click", function (event) {
    const btnAdicionarExercicio = event.target.closest(
      "[id^='btnAdicionarExercicio']"
    );

    if (!btnAdicionarExercicio) return;

    treinoAtualId = btnAdicionarExercicio.getAttribute("data-treino");
    if (!treinoAtualId) {
      console.error(
        "❌ ERRO: Nenhum treino ID encontrado ao tentar adicionar exercício."
      );
      return;
    }

    const modalTreino = document.getElementById(`modal-${treinoAtualId}`);
    const modalExerciciosDisponiveis = document.querySelector(
      ".exerciciosDisponiveis"
    );

    if (!modalTreino || !modalExerciciosDisponiveis) {
      console.error("❌ ERRO: Algum modal não foi encontrado.");
      return;
    }

    modalTreino.style.display = "none";
    modalExerciciosDisponiveis.style.display = "flex";

    console.log(
      `✅ Modal de exercícios aberto para o treino: ${treinoAtualId}`
    );

    // 🔹 Carrega os exercícios disponíveis do Firestore ao abrir o modal
    carregarExerciciosDoFirestore();
  });

  // ✅ Botão Para Fechar modal de Exercícios Disponíveis e voltar para o treino correto
  document.addEventListener("click", function (event) {
    const btnVoltarExercicioDisponiveis = event.target.closest(
      "#btnVoltarExercicioDisponiveis"
    );

    if (!btnVoltarExercicioDisponiveis) return;

    const modalExerciciosDisponiveis = document.querySelector(
      ".exerciciosDisponiveis"
    );
    const modalTreinoAtual = document.getElementById(`modal-${treinoAtualId}`); // Recupera o treino armazenado

    if (!modalTreinoAtual) {
      console.error(
        `❌ ERRO: Modal do treino '${treinoAtualId}' não encontrado ao tentar voltar.`
      );
      return;
    }

    modalExerciciosDisponiveis.style.display = "none";
    modalTreinoAtual.style.display = "block"; // Garante que o treino correto será exibido

    console.log(`✅ Voltou para o treino: ${treinoAtualId}`);
  });

  // ✅ Botão Para Abrir modal de Criação de novo Exercicio
  document.addEventListener("click", function (event) {
    const btnCriarNovoExercicio = event.target.closest("#CriarNovoExercicio");
    const modalCriarExercicio = document.querySelector("#modalCriarExercicio");
    const modalExerciciosDisponiveis = document.querySelector(
      ".exerciciosDisponiveis"
    );

    if (btnCriarNovoExercicio && modalCriarExercicio) {
      // Fecha o modal de exercícios disponíveis (se necessário)
      if (modalExerciciosDisponiveis)
        modalExerciciosDisponiveis.style.display = "none";

      // Abre o modal de criação de exercício
      modalCriarExercicio.style.display = "flex";

      console.log("✅ Modal de Criação de Novo Exercício aberto.");
    }
  });

  // ✅ Evento para fechar o modal deEditar Dados do Exercicio sem salvar
  document
    .getElementById("fecharModalEdicao")
    .addEventListener("click", function () {
      document.getElementById("modalEditarExercicio").style.display = "none";
    });

  function redimensionarGIF(
    arquivo,
    larguraDesejada,
    alturaDesejada,
    callback
  ) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.src = event.target.result;

      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = larguraDesejada;
        canvas.height = alturaDesejada;

        // Redimensiona o GIF desenhando no canvas
        ctx.drawImage(img, 0, 0, larguraDesejada, alturaDesejada);

        // Converte para Base64
        const imagemBase64 = canvas.toDataURL("image/gif");

        callback(imagemBase64);
      };
    };

    reader.readAsDataURL(arquivo);
  }

  // ✅ Botão para Abrir o Modal de Editar os dados do exercicio
  document.getElementById("salvarEdicao").addEventListener("click", function () {
    const modal = document.getElementById("modalEditarExercicio");
    const exercicioId = modal.getAttribute("data-exercicio-id");
    const treinoId = modal.getAttribute("data-treino-id"); // Obtendo treinoId do modal

    if (!exercicioId || !treinoId) {
        console.error("❌ ERRO: Exercício ID ou Treino ID ausente!");
        return;
    }

    // Captura os novos valores digitados pelo usuário
    const novasSeries = document.getElementById("seriesInput").value;
    const novasReps = document.getElementById("repsInput").value;
    const novosKgs = document.getElementById("kgsInput").value;

    // Localiza o exercício na DOM usando o ID armazenado no modal
    const exercicioAtualizado = document.querySelector(
        `.exercicio[data-id="${exercicioId}"]`
    );

    if (!exercicioAtualizado) {
        console.error(`❌ ERRO: Exercício com ID '${exercicioId}' não encontrado na interface!`);
        return;
    }

    // Atualiza os valores no exercício na interface
    exercicioAtualizado.querySelector(".series span").textContent = novasSeries;
    exercicioAtualizado.querySelector(".Repticoes span").textContent = novasReps;
    exercicioAtualizado.querySelector(".Kg span").textContent = novosKgs;

    // Fecha o modal
    modal.style.display = "none";

    console.log(`✅ Exercício atualizado com sucesso! ID: ${exercicioId} no Treino: ${treinoId}`);

    // 🚀 **Aqui está a chamada corrigida para garantir que treinoId está correto**
    atualizarExercicioNoFirestore(treinoId, exercicioId, novasSeries, novasReps, novosKgs);
});


  // ✅ Botão para Fechar Modal de Criação de Exercício, retornando para Exercícios Disponíveis
  document.addEventListener("click", function (event) {
    const btnFecharModalExercicioAdicionar = event.target.closest(
      "#fecharModalExercicioAdicionarExercicio"
    );
    const modalCriarExercicio = document.querySelector("#modalCriarExercicio");
    const modalExerciciosDisponiveis = document.querySelector(
      ".exerciciosDisponiveis"
    );

    if (btnFecharModalExercicioAdicionar && modalCriarExercicio) {
      // Fecha o modal de criação de exercício
      modalCriarExercicio.style.display = "none";

      // Volta para o modal de exercícios disponíveis (se necessário)
      if (modalExerciciosDisponiveis)
        modalExerciciosDisponiveis.style.display = "flex";

      console.log(
        "✅ Modal de Criação de Exercício fechado, retornando para Exercícios Disponíveis."
      );
    }
  });

  // ✅ Botão para adicionar Novo Exercicio, e Voltar para Tela de Exercicios Disponveis
  document
    .getElementById("salvarExercicio")
    .addEventListener("click", async () => {
      const nomeExercicio = document
        .getElementById("nomeExercicio")
        .value.trim();
      const equipamento = document
        .getElementById("equipamentoExercicio")
        .value.trim();
      const grupoMuscular = document
        .getElementById("grupoMuscularExercicio")
        .value.trim();
      const imagemInput = document.getElementById("uploadGif");

      if (
        !nomeExercicio ||
        !equipamento ||
        !grupoMuscular ||
        imagemInput.files.length === 0
      ) {
        alert("⚠️ Preencha todos os campos corretamente.");
        return;
      }

      const imagemArquivo = imagemInput.files[0];

      // Redimensiona o GIF e converte para Base64 antes de salvar
      redimensionarGIF(imagemArquivo, 200, 200, async (imagemBase64) => {
        const user = auth.currentUser;
        if (!user) {
          alert("Usuário não autenticado.");
          return;
        }

        const emailPrefix = user.email.split("@")[0];
        const userDocRef = doc(db, emailPrefix, user.uid);
        const docSnap = await getDoc(userDocRef);

        let exercicios = [];

        if (docSnap.exists()) {
          exercicios = docSnap.data().exercicios || [];
        } else {
          await setDoc(userDocRef, { exercicios: [] });
        }

        // Criando um ID único para o exercício
        const novoExercicio = {
          id: `exercicio-${Date.now()}`,
          nome: nomeExercicio,
          equipamento,
          grupoMuscular,
          imagem: imagemBase64, // Agora salvamos a imagem como Base64
        };

        exercicios.push(novoExercicio);
        await updateDoc(userDocRef, { exercicios });

        console.log("✅ Exercício salvo no Firestore!", novoExercicio);

        // Fecha o modal e volta para a lista de exercícios disponíveis
        document.getElementById("modalCriarExercicio").style.display = "none";
        document.querySelector(".exerciciosDisponiveis").style.display = "flex";

        // Atualiza a lista de exercícios disponíveis
        carregarExerciciosDoFirestore();
      });
    });

  async function carregarExerciciosDoFirestore() {
    const user = auth.currentUser;
    if (!user) {
      console.warn(
        "⚠️ Usuário não autenticado. Não é possível carregar os exercícios."
      );
      return;
    }

    const emailPrefix = user.email.split("@")[0];
    const userDocRef = doc(db, emailPrefix, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      console.warn("⚠️ Nenhum dado encontrado para este usuário.");
      return;
    }

    const exercicios = docSnap.data().exercicios || [];
    const listaExercicios = document.querySelector(".lista-exercicios");

    // Limpa a lista antes de adicionar os exercícios do Firestore
    listaExercicios.innerHTML = "";

    if (exercicios.length === 0) {
      listaExercicios.innerHTML = `
        <div class="exercicio placeholder">
          <span class="material-symbols-outlined">error_outline</span>
          <p>Você ainda não adicionou nenhum exercício.</p>
        </div>`;
      return;
    }

    exercicios.forEach((exercicio) => {
      const novoExercicio = document.createElement("div");
      novoExercicio.classList.add("exercicio");
      novoExercicio.setAttribute("data-id", exercicio.id);

      novoExercicio.innerHTML = `
  <div class="imagemDoExercicio">
    <img src="${exercicio.imagem}" alt="${exercicio.nome}" />
  </div>
  <div class="infosDoExercicio">
    <div class="equipamento">
      <span>${exercicio.equipamento}</span>
      <div class="separarBotoes">
        <span class="material-symbols-outlined" id="BtnSelecionarExercicio" style="cursor: pointer;">add</span>
        <button class="remover-exercicio-do-firestore" data-treino="${treinoSelecionadoId}" data-exercicio-id="${exercicio.id}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
    <p>${exercicio.nome}</p>
    <div class="dadosExercicio">
      <div class="series"><span>3</span><p>Séries</p></div>
      <div class="Repticoes"><span>15</span><p>Rep(s)</p></div>
      <div class="Kg"><span>60</span><p>Kg(s)</p></div>
    </div>
  </div>`;


      listaExercicios.appendChild(novoExercicio);
    });

    console.log("✅ Exercícios carregados do Firestore!", exercicios);
  }

  // ✅ Botão para Abrir Modal de Editar Pesos
  document.addEventListener("click", function (event) {
    const dadosExercicio = event.target.closest(".dadosExercicio");

    if (!dadosExercicio) return;

    let exercicioAtual = dadosExercicio.closest(".exercicio");

    if (!exercicioAtual) {
        console.warn("⚠️ Nenhum exercício encontrado para edição.");
        return;
    }

    // Captura o ID do exercício
    const exercicioId = exercicioAtual.getAttribute("data-id");
    const treinoId = exercicioAtual.closest(".Modal-Editar-Treinos")?.id.replace("modal-", "");

    if (!exercicioId || !treinoId) {
        console.error("❌ ERRO: Exercício ou Treino não encontrado ao abrir o modal de edição.");
        return;
    }

    // Captura os valores do exercício
    const series = exercicioAtual.querySelector(".series span")?.textContent || "3";
    const reps = exercicioAtual.querySelector(".Repticoes span")?.textContent || "15";
    const kgs = exercicioAtual.querySelector(".Kg span")?.textContent || "60";

    console.log(`📌 Exercício encontrado: ID: ${exercicioId}, no Treino ID: ${treinoId}, Séries: ${series}, Repetições: ${reps}, Peso: ${kgs}`);

    // Preenche os inputs do modal com os valores atuais
    document.getElementById("seriesInput").value = series;
    document.getElementById("repsInput").value = reps;
    document.getElementById("kgsInput").value = kgs;

    // Guarda a referência do exercício e do treino para edição
    const modal = document.getElementById("modalEditarExercicio");
    modal.setAttribute("data-exercicio-id", exercicioId);
    modal.setAttribute("data-treino-id", treinoId);

    // Exibe o modal de edição
    modal.style.display = "flex";

    console.log(`✅ Modal de edição aberto para o exercício ID: ${exercicioId} no Treino ID: ${treinoId}`);
});


  // ✅ Função para Carregar o Gif com Animação
  document.addEventListener("change", function (event) {
    const uploadGif = event.target.closest("#uploadGif");
    const uploadIcon = document.getElementById("uploadIcon");
    const uploadContainer = document.querySelector(".upload-container");

    if (uploadGif) {
      if (uploadGif.files.length > 0) {
        // Atualiza o ícone para indicar sucesso
        uploadIcon.textContent = "check_circle"; // Ícone de sucesso
        uploadIcon.classList.add("upload-success");

        // Adiciona classe de carregamento ao container
        uploadContainer.classList.add("loading");

        // Remove a classe de carregamento após 3 segundos
        setTimeout(() => {
          uploadContainer.classList.remove("loading");
        }, 3000);

        console.log("✅ GIF carregado com sucesso.");
      } else {
        // Reseta a interface caso o usuário não selecione nenhum arquivo
        uploadIcon.textContent = "upload";
        uploadIcon.classList.remove("upload-success");
        uploadContainer.classList.remove("loading");

        console.warn("⚠️ Nenhum arquivo foi carregado.");
      }
    }
  });

  // ✅ Capturar clique no botão "Selecionar Exercício"
// ✅ Capturar clique no botão "Selecionar Exercício"
document.addEventListener("click", async function (event) {
  const btnSelecionarExercicio = event.target.closest("#BtnSelecionarExercicio");
  if (!btnSelecionarExercicio) return;

  const exercicioSelecionado = btnSelecionarExercicio.closest(".exercicio");
  if (!exercicioSelecionado) {
    console.warn("⚠️ Nenhum exercício encontrado para ser adicionado.");
    return;
  }

  if (!treinoSelecionadoId) {
    console.error("❌ ERRO: Nenhum treino armazenado para adicionar o exercício.");
    return;
  }

  // Captura os detalhes do exercício selecionado
  const nomeExercicio = exercicioSelecionado.querySelector("p").textContent;
  const equipamento = exercicioSelecionado.querySelector(".equipamento span").textContent;
  const imagemExercicio = exercicioSelecionado.querySelector("img").src;
  const idDataExercicio = exercicioSelecionado.getAttribute("data-id"); // Captura o id-data do exercício

  // Criando o objeto do exercício
  const novoExercicio = {
    id: idDataExercicio || `exercicio-${Date.now()}`, // Usa o id-data, se disponível
    nome: nomeExercicio,
    equipamento: equipamento,
    imagem: imagemExercicio,
    series: 3,
    repeticoes: 15,
    peso: 60,
  };

  // Adiciona o exercício na interface
  const exercicioHTML = document.createElement("div");
  exercicioHTML.classList.add("exercicio");
  exercicioHTML.setAttribute("data-id", novoExercicio.id); // Define o id-data no elemento HTML
  exercicioHTML.innerHTML = `
    <div class="imagemDoExercicio">
      <img src="${novoExercicio.imagem}" alt="${novoExercicio.nome}" />
    </div>
    <div class="infosDoExercicio">
      <div class="equipamento">
        <span>${novoExercicio.equipamento}</span>
        <button class="remover-exercicio" data-treino="${treinoSelecionadoId}" data-exercicio-id="${novoExercicio.id}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <p>${novoExercicio.nome}</p>
      <div class="dadosExercicio">
        <div class="series"><span>${novoExercicio.series}</span><p>Séries</p></div>
        <div class="Repticoes"><span>${novoExercicio.repeticoes}</span><p>Rep(s)</p></div>
        <div class="Kg"><span>${novoExercicio.peso}</span><p>Kg(s)</p></div>
      </div>
    </div>
  `;

  let modalTreino = document.getElementById(`modal-${treinoSelecionadoId}`);
  let listaExercicios = modalTreino.querySelector(".lista-exercicios");

  if (!listaExercicios) {
    listaExercicios = document.createElement("div");
    listaExercicios.classList.add("lista-exercicios");
    modalTreino.appendChild(listaExercicios);
  }

  // Remove placeholder antes de adicionar um novo exercício
  const placeholder = listaExercicios.querySelector(".exercicio.placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  listaExercicios.appendChild(exercicioHTML);

  // Salvar no Firestore com id-data do exercício
  await salvarExercicioNoFirestore(treinoSelecionadoId, novoExercicio);

  console.log(`✅ Exercício "${novoExercicio.nome}" (ID: ${novoExercicio.id}) adicionado ao treino: ${treinoSelecionadoId}`);

  // Fecha o modal de exercícios disponíveis e volta para o treino
  document.querySelector(".exerciciosDisponiveis").style.display = "none";
  modalTreino.style.display = "block";
});



  async function salvarExercicioNoFirestore(treinoId, exercicio) {
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ ERRO: Usuário não autenticado!");
      return;
    }

    const emailPrefix = user.email.split("@")[0];
    const userDocRef = doc(db, emailPrefix, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      console.error("❌ ERRO: Documento do usuário não encontrado.");
      return;
    }

    let treinos = docSnap.data().treinos || [];

    // Encontrar o treino correto
    let treinoIndex = treinos.findIndex(
      (treino) => treino.nome.toLowerCase().replace(/\s+/g, "-") === treinoId
    );
    if (treinoIndex === -1) {
      console.error(`❌ ERRO: Treino '${treinoId}' não encontrado.`);
      return;
    }

    // Adiciona o exercício ao treino
    treinos[treinoIndex].exercicios.push(exercicio);

    // Atualiza o Firestore
    await updateDoc(userDocRef, { treinos });

    console.log(
      `✅ Exercício '${exercicio.nome}' salvo no Firestore dentro do treino '${treinos[treinoIndex].nome}'`
    );
  }

  // ✅ Abrir modal de edição de treino ao clicar no card
  document.addEventListener("click", function (event) {
    const cardTreino = event.target.closest(".Treino");

    if (!cardTreino) return;

    const treinoSelecionadoId = cardTreino.id;
    const modalEditarTreinos = document.getElementById(
      `modal-${treinoSelecionadoId}`
    );

    if (modalEditarTreinos) {
      // Fecha qualquer outro modal aberto antes de abrir o novo
      document
        .querySelectorAll(".Modal-Editar-Treinos")
        .forEach((modal) => (modal.style.display = "none"));

      document.querySelector(".Treinos").style.display = "none";
      modalEditarTreinos.style.display = "block";
    }
  });

  // ✅ Botão para Fechar modal de edição do treino e limpar treino armazenado
  document.addEventListener("click", function (event) {
    const btnFecharModalEditarTreino = event.target.closest(
      ".fechar-modal-editar"
    );
    if (!btnFecharModalEditarTreino) return;

    treinoSelecionadoId = null; // 🔹 Limpa o treino armazenado
    document.querySelector(".Treinos").style.display = "block";
    document.querySelector(".Modal-Editar-Treinos").style.display = "none";
    console.log("✅ Modal fechado e treino armazenado resetado.");
  });

  // ✅ Capturar clique no botão "Remover Exercício" e atualizar Firestore
  document.addEventListener("click", async function (event) {
    const btnRemoverExercicio = event.target.closest(".remover-exercicio");
    if (!btnRemoverExercicio) return;

    const treinoId = btnRemoverExercicio.getAttribute("data-treino");
    const exercicioId = btnRemoverExercicio.getAttribute("data-exercicio-id");
    const exercicioParaRemover = btnRemoverExercicio.closest(".exercicio");

    if (!treinoId || !exercicioParaRemover || !exercicioId) {
      console.error("❌ ERRO: Informações do exercício ausentes.");
      return;
    }

    exercicioParaRemover.remove();
    console.log(`❌ Exercício removido do treino: ${treinoId}`);

    await removerExercicioDoFirestore(treinoId, exercicioId);
  });

  // Event listener para o botão remover-exercicio-do-firestore
document.addEventListener("click", async function (event) {
  const btnRemover = event.target.closest(".remover-exercicio-do-firestore");
  if (!btnRemover) return;

  const exercicioId = btnRemover.getAttribute("data-exercicio-id");
  if (!exercicioId) {
    console.error("❌ Exercício ID não encontrado.");
    return;
  }

  // Remove o elemento do DOM (do modal de Exercícios Disponíveis)
  const exercicioElemento = btnRemover.closest(".exercicio");
  if (exercicioElemento) {
    exercicioElemento.remove();
  }

  // Chama a função para remover do Firestore
  await removerExercicioDisponivelDoFirestore(exercicioId);
});

  // Função que remove o exercício do Firestore (da lista global de exercícios)
async function removerExercicioDisponivelDoFirestore(exercicioId) {
  const user = auth.currentUser;
  if (!user) {
    console.error("❌ Usuário não autenticado!");
    return;
  }
  
  const emailPrefix = user.email.split("@")[0];
  const userDocRef = doc(db, emailPrefix, user.uid);
  const docSnap = await getDoc(userDocRef);
  
  if (!docSnap.exists()) {
    console.error("❌ Documento do usuário não encontrado.");
    return;
  }
  
  // Obtém o array de exercícios e filtra removendo o exercício com o ID informado
  let exercicios = docSnap.data().exercicios || [];
  exercicios = exercicios.filter(exercicio => exercicio.id !== exercicioId);
  
  // Atualiza o Firestore com a nova lista
  await updateDoc(userDocRef, { exercicios });
  console.log(`✅ Exercício removido do Firestore: ${exercicioId}`);
}

  // ✅ Função para Remover Exercício do Firestore
  async function removerExercicioDoFirestore(treinoId, exercicioId) {
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ ERRO: Usuário não autenticado!");
      return;
    }

    const emailPrefix = user.email.split("@")[0];
    const userDocRef = doc(db, emailPrefix, user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      console.error("❌ ERRO: Documento do usuário não encontrado.");
      return;
    }

    let treinos = docSnap.data().treinos || [];

    // Encontrar o treino correto
    let treinoIndex = treinos.findIndex(
      (treino) => treino.nome.toLowerCase().replace(/\s+/g, "-") === treinoId
    );
    if (treinoIndex === -1) {
      console.error(`❌ ERRO: Treino '${treinoId}' não encontrado.`);
      return;
    }

    // Remove o exercício pelo ID
    treinos[treinoIndex].exercicios = treinos[treinoIndex].exercicios.filter(
      (exercicio) => exercicio.id !== exercicioId
    );

    // Atualiza no Firestore
    await updateDoc(userDocRef, { treinos });

    console.log(
      `✅ Exercício removido do Firestore no treino '${treinos[treinoIndex].nome}'`
    );
  }

  function toggleIconeExercicio() {
    document.querySelectorAll(".selecionarExercicio").forEach(function (icon) {
      // Remove event listeners anteriores para evitar duplicação
      icon.removeEventListener("click", alternarIcone);

      // Adiciona evento de clique
      icon.addEventListener("click", alternarIcone);
    });
  }

  // ✅ Função auxiliar para alternar o ícone
  function alternarIcone(event) {
    const icon = event.target;
    icon.textContent = icon.textContent === "add" ? "check_circle" : "add";
  }

  // ✅ Chamar a função para garantir que os eventos sejam aplicados
  toggleIconeExercicio();


  // ✅ Ativar Seleção de Grupo Muscular ao carregar a página
  function ativarSelecaoGrupoMuscular() {
    document
      .querySelectorAll(".gruposMuscularesTreino button")
      .forEach((button) => {
        button.removeEventListener("click", selecionarGrupoMuscular);
        button.addEventListener("click", selecionarGrupoMuscular);
      });
  }

  // ✅ Selecionar Grupo Muscular e exibir no Console
  function selecionarGrupoMuscular(event) {
    const button = event.currentTarget;
    const grupoMuscular = button.id;

    // Se já estiver selecionado, remove
    if (button.classList.contains("selecionado")) {
      button.classList.remove("selecionado");
      gruposMuscularesSelecionados = gruposMuscularesSelecionados.filter(
        (g) => g !== grupoMuscular
      );
    } else {
      // Permite selecionar até 3 grupos musculares
      if (gruposMuscularesSelecionados.length < 3) {
        button.classList.add("selecionado");
        gruposMuscularesSelecionados.push(grupoMuscular);
      } else {
        alert("⚠️ Você só pode selecionar no máximo 3 grupos musculares.");
        return;
      }
    }

    // ✅ Exibir no Console cada grupo selecionado ou removido em tempo real
    console.log(`🔵 Grupo Muscular Atual Selecionado: ${grupoMuscular}`);
  }

  // ✅ Reatribuir eventos sempre que o modal abrir
  document.addEventListener("click", function () {
    const modalTreinosAberto = document.querySelector(".Modal-Treinos");
    if (modalTreinosAberto?.style.display === "block") {
      ativarSelecaoGrupoMuscular();
    }
  });

  // ✅ Chamada inicial para garantir que os eventos sejam atribuídos corretamente
  ativarSelecaoGrupoMuscular();
});
