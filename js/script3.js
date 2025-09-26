import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const btnFazerPost = document.getElementById("btnFazerPost");
const modalOverlay = document.getElementById("modalOverlay");
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const closeModalBtn = document.getElementById("closeModalBtn");
const inputSearch = document.getElementById("inputSearch");
const btnLimparBusca = document.getElementById("btnLimparBusca");

// Dados Cloudinary - substitua pelos seus
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

// --- Função para upload na Cloudinary ---
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
  return data.secure_url; // URL pública da imagem
}

// --- Postar no Firestore com upload Cloudinary ---
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const legenda = document.getElementById("legenda").value.trim();
  const imagemArquivo = document.getElementById("imagemUpload").files[0];
  const imagemURLManual = document.getElementById("imagemURL").value.trim();

  let imagemURLFinal = imagemURLManual;

  // Upload arquivo para Cloudinary se existir
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

// --- Renderizar posts individualmente ---
function renderPost(post) {
  const timeString = post.timestamp
    ? new Date(post.timestamp.toDate()).toLocaleString()
    : "";

  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${post.usuario.charAt(1)?.toUpperCase() || "?"}</div>
        <div>${post.usuario}</div>
      </div>
      <div class="post-category">em '${post.categoria}'</div>
      <img class="post-image" src="${post.imagemURL}" alt="Imagem do post" />
      <div class="post-caption">${post.legenda}</div>
      <div class="post-timestamp">${timeString}</div>
    </div>
  `;
}

let postsCache = [];

// --- Query para pegar posts em tempo real ordenados por timestamp ---
const queryPosts = query(
  collection(db, "posts"),
  orderBy("timestamp", "desc")
);

// --- Atualiza feed em tempo real ---
onSnapshot(queryPosts, (snapshot) => {
  postsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderFeed(postsCache);
});

// --- Renderiza o feed com filtro de busca ---
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

// --- Botão limpar busca ---
btnLimparBusca.addEventListener("click", () => {
  inputSearch.value = "";
  renderFeed(postsCache);
});

// --- Atualiza feed enquanto digita ---
inputSearch.addEventListener("input", () => {
  renderFeed(postsCache);
});



// =========================================================
// INTEGRAÇÃO COM SPOTIFY API
// =========================================================

const CLIENT_ID = '9fd81c38dae94d8f972f6b93fd975426';
const REDIRECT_URI = 'http://127.0.0.1:5500/feed.html';

const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-read-currently-playing`;

const btnLoginSpotify = document.getElementById('btnLoginSpotify');
const spotifyPlayer = document.getElementById('spotify-player');

// 1. Lida com o clique no botão para iniciar a autenticação
btnLoginSpotify.addEventListener('click', () => {
    window.location.href = authUrl;
});

// 2. Verifica o URL para obter o token de acesso após o redirecionamento
function getSpotifyAccessToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

// 3. Busca a música que está tocando no momento
async function getCurrentlyPlaying(token) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
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

// 4. Renderiza a interface do player
// 4. Renderiza a interface do player
function renderSpotifyPlayer(data) {
    if (!data.item) {
        spotifyPlayer.innerHTML = 'Nenhuma música tocando.';
        return;
    }

    const track = data.item;
    const albumArt = track.album.images[0].url;
    const artists = track.artists.map(artist => artist.name).join(', ');

    // Usando `data.progress_ms` para o progresso da música
    const progressMs = data.progress_ms;
    const durationMs = track.duration_ms;

    // Apenas para mostrar o progresso visualmente (não é funcional)
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
            
            <div class="player-controls">
                <div class="player-progress-bar">
                    <div class="player-progress" style="width: ${progressPercent}%;"></div>
                </div>
                <div class="player-progress-time">
                    <span>${(progressMs / 1000).toFixed(0)}</span>
                    <span>-${((durationMs - progressMs) / 1000).toFixed(0)}</span>
                </div>
                <div class="player-buttons">
                    <i class="fas fa-step-backward"></i>
                    <i class="fas fa-play"></i>
                    <i class="fas fa-step-forward"></i>
                    <i class="fas fa-podcast"></i>
                </div>
            </div>
        </div>
    `;
}