import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Elementos DOM ---
const comunidadesPostSelect = document.getElementById('comunidadesPost');
const listaComunidades = document.getElementById('listaComunidades');
const btnFazerPost = document.getElementById("btnFazerPost");
const modalOverlay = document.getElementById("modalOverlay");
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const closeModalBtn = document.getElementById("closeModalBtn");
const inputSearch = document.getElementById("inputSearch");
const btnLimparBusca = document.getElementById("btnLimparBusca");

// --- Dados Cloudinary ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dyeh43lpp/upload";
const CLOUDINARY_UPLOAD_PRESET = "fora-da-bolha";

// --- Abrir modal formulário ---
btnFazerPost.addEventListener("click", () => {
  modalOverlay.classList.add("active");
});

// --- Fechar modal e resetar form ---
closeModalBtn.addEventListener("click", () => {
  modalOverlay.classList.remove("active");
  postForm.reset();
});

// --- Upload para Cloudinary ---
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Erro ao enviar imagem para Cloudinary");
  }

  const data = await response.json();
  return data.secure_url;
}

// --- Postar no Firestore ---
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const legenda = document.getElementById("legenda").value.trim();
  const imagemArquivo = document.getElementById("imagemUpload").files[0];
  const imagemURLManual = document.getElementById("imagemURL").value.trim();
  const comunidadesSelecionadas = Array.from(comunidadesPostSelect.selectedOptions).map(option => option.value);

  let imagemURLFinal = imagemURLManual;

  if (imagemArquivo) {
    try {
      imagemURLFinal = await uploadToCloudinary(imagemArquivo);
    } catch (error) {
      alert("Falha no upload da imagem: " + error.message);
      return;
    }
  }

  if (!usuario || comunidadesSelecionadas.length === 0 || !legenda || !imagemURLFinal) {
    alert("Preencha todos os campos e informe uma ou mais comunidades.");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      usuario,
      comunidades: comunidadesSelecionadas,
      legenda,
      imagemURL: imagemURLFinal,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    alert("Erro ao salvar post: " + error.message);
    return;
  }

  modalOverlay.classList.remove("active");
  postForm.reset();
});

// --- Renderizar comunidades em tempo real ---
const comunidadesQuery = query(collection(db, 'comunidades'), orderBy('timestamp', 'desc'));
onSnapshot(comunidadesQuery, (snapshot) => {
  if (snapshot.empty) {
    if (listaComunidades) {
      listaComunidades.innerHTML = '<p>Nenhuma comunidade criada ainda.</p>';
    }
    comunidadesPostSelect.innerHTML = '<option value="" disabled>Nenhuma comunidade disponível</option>';
    return;
  }

  const comunidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (listaComunidades) {
    listaComunidades.innerHTML = comunidades.map(renderComunidade).join('');
  }

  comunidadesPostSelect.innerHTML = comunidades.map(comunidade =>
    `<option value="${comunidade.nome}">${comunidade.nome}</option>`
  ).join('');
});

// --- Renderizar um post individual ---
function renderPost(post) {
  const timeString = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString() : "";
  const comunidadesText = post.comunidades ? post.comunidades.join(', ') : 'N/A';

  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${post.usuario.charAt(0)?.toUpperCase() || "?"}</div>
        <div>${post.usuario}</div>
      </div>
      <div class="post-category">em '${comunidadesText}'</div> 
      <img class="post-image" src="${post.imagemURL}" alt="Imagem do post" />
      <div class="post-caption">${post.legenda}</div>
      <div class="post-timestamp">${timeString}</div>
    </div>
  `;
}

// --- Feed de posts em tempo real ---
let postsCache = [];

const queryPosts = query(
  collection(db, "posts"),
  orderBy("timestamp", "desc")
);

onSnapshot(queryPosts, (snapshot) => {
  postsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderFeed(postsCache);
});

// --- Renderizar o feed com filtro ---
function renderFeed(posts) {
  const busca = inputSearch.value.trim().toLowerCase();
  let filteredPosts = posts;

  if (busca) {
    filteredPosts = posts.filter(post =>
      post.usuario.toLowerCase().includes(busca) ||
      (post.legenda && post.legenda.toLowerCase().includes(busca)) ||
      (post.comunidades && post.comunidades.join(', ').toLowerCase().includes(busca))
    );
  }

  feedPosts.innerHTML = filteredPosts.map(renderPost).join("");
}

// --- Eventos de busca ---
btnLimparBusca.addEventListener("click", () => {
  inputSearch.value = "";
  renderFeed(postsCache);
});

inputSearch.addEventListener("input", () => {
  renderFeed(postsCache);
});

function renderComunidade(comunidade) {
  const imagem = comunidade.imagemURL || "https://api.cloudinary.com/v1_1/dyeh43lpp/upload";

  return `
    <div class="community-bubble">
      <img src="${imagem}" alt="${comunidade.nome}" />
      <span>${comunidade.nome}</span>
    </div>
  `;
}

function addFiltroPorComunidade() {
  const bolhas = document.querySelectorAll('.community-bubble');

  bolhas.forEach(bolha => {
    bolha.addEventListener('click', () => {
      const nomeComunidade = bolha.dataset.nome;

      const filtrados = postsCache.filter(post =>
        post.comunidades && post.comunidades.includes(nomeComunidade)
      );

      renderFeed(filtrados);
    });
  });
}

listaComunidades.innerHTML = comunidades.map(renderComunidade).join('');
addFiltroPorComunidade(); // <- importante!
