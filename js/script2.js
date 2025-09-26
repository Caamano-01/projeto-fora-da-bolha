// =========================
// FIREBASE & CLOUDINARY
// =========================

import { db } from "./firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
let currentUser = null;

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    getArmarioItems(user.uid);
  } else {
    document.getElementById('armarioImages').innerHTML = '<p>Faça login para ver seu armário.</p>';
  }
});

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dyeh43lpp/upload";
const CLOUDINARY_UPLOAD_PRESET = "fora-da-bolha";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) throw new Error("Erro ao enviar imagem para Cloudinary");

  const data = await response.json();
  return data.secure_url;
}

// =========================
// FOTO DE PERFIL
// =========================
const fotoPerfil = document.getElementById('foto-perfil');
const inputFoto = document.getElementById('input-foto');
const container = document.getElementById('foto-container');

const ICONE_PADRAO = "https://img.icons8.com/material-rounded/96/user-male-circle.png";

// 🔁 Carrega imagem salva no localStorage ao iniciar
const imagemSalva = localStorage.getItem('fotoPerfil');
  if (imagemSalva) {
    fotoPerfil.src = imagemSalva;
  } else {
    fotoPerfil.src = ICONE_PADRAO;
  }

// 📸 Ao clicar na imagem, abre o input
container.addEventListener('click', () => {
    inputFoto.click();
});

// 📥 Quando o usuário escolhe uma nova imagem
inputFoto.addEventListener('change', function () {
    const file = this.files[0];
      if (file) {
        const leitor = new FileReader();
        leitor.onload = function (e) {
            const novaImagem = e.target.result;
            fotoPerfil.src = novaImagem;

            // 💾 Salva no localStorage
            localStorage.setItem('fotoPerfil', novaImagem);
        };
        leitor.readAsDataURL(file);
    }
});

// =========================
// ELEMENTOS DOM
// =========================

const btnFazerPost = document.getElementById("btnFazerPost");
const modalOverlay = document.getElementById("modalOverlay");
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const closeModalBtn = document.getElementById("closeModalBtn");
const inputSearch = document.getElementById("inputSearch");
const btnLimparBusca = document.getElementById("btnLimparBusca");

const btnAddArmario = document.getElementById("btnAddArmario");
const modalArmario = document.getElementById("modalArmario");
const closeModalArmario = document.getElementById("closeModalArmario");
const formArmario = document.getElementById("formArmario");
const armarioImages = document.getElementById("armarioImages");


// =========================
// MODAL POSTS
// =========================

btnFazerPost.addEventListener("click", () => {
  modalOverlay.classList.add("active");
});

closeModalBtn.addEventListener("click", () => {
  modalOverlay.classList.remove("active");
  postForm.reset();
});


// =========================
// FAZER POST
// =========================

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const legenda = document.getElementById("legenda").value.trim();
  const imagemArquivo = document.getElementById("imagemUpload").files[0];
  const imagemURLManual = document.getElementById("imagemURL").value.trim();

  let imagemURLFinal = imagemURLManual;

  if (imagemArquivo) {
    try {
      imagemURLFinal = await uploadToCloudinary(imagemArquivo);
    } catch (error) {
      alert("Falha no upload da imagem: " + error.message);
      return;
    }
  }

  if (!usuario || !categoria || !legenda || !imagemURLFinal) {
    alert("Preencha todos os campos e informe uma imagem (upload ou URL).");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      usuario,
      categoria,
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


// =========================
// FEED DE POSTS
// =========================

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': "&amp;", '<': "&lt;", '>': "&gt;", '"': "&quot;", "'": "&#039;"
  })[match]);
}

function renderPost(post) {
  const timeString = post.timestamp
    ? new Date(post.timestamp.toDate()).toLocaleString()
    : "";

  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${post.usuario.charAt(0)?.toUpperCase() || "?"}</div>
        <div>${escapeHTML(post.usuario)}</div>
      </div>
      <div class="post-category">em '${escapeHTML(post.categoria)}'</div>
      <img class="post-image" src="${post.imagemURL}" alt="Imagem do post" />
      <div class="post-caption">${escapeHTML(post.legenda)}</div>
      <div class="post-timestamp">${timeString}</div>
    </div>
  `;
}

let postsCache = [];

const queryPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"));

onSnapshot(queryPosts, (snapshot) => {
  postsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderFeed(postsCache);
});

function renderFeed(posts) {
  const busca = inputSearch.value.trim().toLowerCase();
  let filteredPosts = posts;

  if (busca) {
    filteredPosts = posts.filter(post =>
      post.usuario.toLowerCase().includes(busca) ||
      post.categoria.toLowerCase().includes(busca) ||
      post.legenda.toLowerCase().includes(busca)
    );
  }

  feedPosts.innerHTML = filteredPosts.map(renderPost).join("");
}

btnLimparBusca.addEventListener("click", () => {
  inputSearch.value = "";
  renderFeed(postsCache);
});

inputSearch.addEventListener("input", () => {
  renderFeed(postsCache);
});


// =========================
// ARMÁRIO PESSOAL
// =========================

btnAddArmario.addEventListener("click", () => {
  if (currentUser) {
    modalArmario.classList.add("active");
  } else {
    alert("Você precisa estar logado para adicionar itens ao armário.");
  }
});

closeModalArmario.addEventListener("click", () => {
  modalArmario.classList.remove("active");
  formArmario.reset();
});

formArmario.addEventListener("submit", async (e) => {
  e.preventDefault();
  const imagemArquivo = document.getElementById("imagemArmarioUpload").files[0];

  if (!imagemArquivo) {
    alert("Selecione uma imagem para salvar.");
    return;
  }

  try {
    const imagemURL = await uploadToCloudinary(imagemArquivo);

    await addDoc(collection(db, "armarioItems"), {
      userId: currentUser.uid,
      imagemURL: imagemURL,
      timestamp: serverTimestamp()
    });

    alert("Imagem salva no seu armário!");
    modalArmario.classList.remove("active");
    formArmario.reset();

  } catch (error) {
    alert("Erro ao salvar imagem no armário: " + error.message);
    console.error(error);
  }
});

function getArmarioItems(userId) {
  const q = query(collection(db, "armarioItems"), where("userId", "==", userId));

  onSnapshot(q, (snapshot) => {
    armarioImages.innerHTML = "";
    if (snapshot.empty) {
      armarioImages.innerHTML = '<p>Seu armário está vazio. Adicione sua primeira peça!</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const item = doc.data();
      const img = document.createElement("img");
      img.src = item.imagemURL;
      img.classList.add("armario-img");
      armarioImages.appendChild(img);
    });
  });
}


// =========================
// SPOTIFY API
// =========================

const CLIENT_ID = '9fd81c38dae94d8f972f6b93fd975426';
const REDIRECT_URI = 'https://foradabolha.netlify.app/';
const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-read-currently-playing`;

const btnLoginSpotify = document.getElementById('btnLoginSpotify');
const spotifyPlayer = document.getElementById('spotify-player');

btnLoginSpotify.addEventListener('click', () => {
  window.location.href = authUrl;
});

function getSpotifyAccessToken() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');

  if (token) {
    sessionStorage.setItem('spotifyToken', token);
    window.location.hash = '';
  }

  return token || sessionStorage.getItem('spotifyToken');
}

async function getCurrentlyPlaying(token) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 204 || response.status > 400) {
      spotifyPlayer.innerHTML = 'Nenhuma música tocando.';
      return;
    }

    const data = await response.json();
    renderSpotifyPlayer(data);
  } catch (error) {
    console.error('Erro ao buscar música do Spotify:', error);
    spotifyPlayer.innerHTML = 'Erro ao conectar com Spotify.';
  }
}

function renderSpotifyPlayer(data) {
  if (!data.item) {
    spotifyPlayer.innerHTML = 'Nenhuma música tocando.';
    return;
  }

  const track = data.item;
  const albumArt = track.album.images[0].url;
  const artists = track.artists.map(artist => artist.name).join(', ');
  const progressMs = data.progress_ms;
  const durationMs = track.duration_ms;
  const progressPercent = (progressMs / durationMs) * 100;

  spotifyPlayer.innerHTML = `
    <div class="player-container">
      <div class="player-info">
        <img src="${albumArt}" alt="Capa do Álbum" class="player-album-art">
        <div class="player-details">
          <p class="player-track-name">${track.name}</p>
          <p class="player-artist-name">${artists}</p>
        </div>
      </div>
      <div class="player-progress-bar">
        <div class="player-progress" style="width: ${progressPercent}%;"></div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const token = getSpotifyAccessToken();
  if (token) {
    getCurrentlyPlaying(token);
    setInterval(() => getCurrentlyPlaying(token), 15000);
  }
});

// =========================
// COMUNIDADES
// =========================

const btnAddComunidade = document.getElementById('btnAddComunidade');
const modalComunidade = document.getElementById('modalComunidade');
const closeModalComunidade = document.getElementById('closeModalComunidade');
const formComunidade = document.getElementById('formComunidade');
const listaComunidades = document.getElementById('listaComunidades');

btnAddComunidade.addEventListener('click', () => {
  if (!currentUser) {
    alert("Você precisa estar logado para criar comunidades.");
    return;
  }
  modalComunidade.classList.add('active');
});

closeModalComunidade.addEventListener('click', () => {
  modalComunidade.classList.remove('active');
  formComunidade.reset();
});

formComunidade.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('nomeComunidade').value.trim();
  const imagemArquivo = document.getElementById('imagemComunidadeUpload').files[0];

  if (!nome || !imagemArquivo) {
    alert('Preencha o nome e selecione uma imagem.');
    return;
  }

  try {
    // Faz upload da imagem para Cloudinary
    const imagemURL = await uploadToCloudinary(imagemArquivo);

    // Salva no Firestore
    await addDoc(collection(db, 'comunidades'), {
      nome,
      imagemURL,
      createdBy: currentUser.uid,
      timestamp: serverTimestamp()
    });

    alert('Comunidade criada com sucesso!');
    modalComunidade.classList.remove('active');
    formComunidade.reset();

  } catch (error) {
    alert('Erro ao criar comunidade: ' + error.message);
    console.error(error);
  }
});

// Função para renderizar comunidades
function renderComunidade(comunidade) {
  return `
    <div class="comunidade-card">
      <img src="${comunidade.imagemURL}" alt="Foto da Comunidade" class="comunidade-foto" />
      <div class="comunidade-nome">${escapeHTML(comunidade.nome)}</div>
    </div>
  `;
}

function getComunidades() {
  const q = query(collection(db, 'comunidades'), orderBy('timestamp', 'desc'));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      listaComunidades.innerHTML = '<p>Nenhuma comunidade criada ainda.</p>';
      return;
    }

    const comunidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    listaComunidades.innerHTML = `<div class="lista-comunidades">${comunidades.map(renderComunidade).join('')}</div>`;
  });
}

// Inicializa a lista de comunidades ao carregar a página
getComunidades();


// =================
// SEGUINDO
// =================
const users = ['@USER-2', '@USER-3', '@USER-4', '@USER-5', '@USER-6'];

// Seleciona o elemento <ul> do HTML
const userListElement = document.getElementById('user-list');

// Itera sobre a lista de usuários para criar um <li> para cada um
users.forEach(user => {
    // Cria um novo elemento <li>
    const listItem = document.createElement('li');

    // Adiciona uma classe ao <li> para estilização
    listItem.classList.add('user-item');

    // Define o texto do <li> como o nome do usuário
    listItem.textContent = user;

    // Adiciona o <li> à lista <ul> no HTML
    userListElement.appendChild(listItem);
});