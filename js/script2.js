// =========================
// FIREBASE & CLOUDINARY
// =========================

import { db } from "./firebase.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    where,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth();
let currentUser = null;

auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        getArmarioItems(user.uid);
    } else {
        // Redireciona para a página de login se necessário
        console.log("Usuário não logado.");
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
// UTILS
// =========================
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": "'"
    })[match]);
}


// =========================
// AUTENTICAÇÃO (Login e Cadastro)
// =========================

const btnCadastro = document.getElementById('btnCadastro');
const btnLogin = document.getElementById('btnLogin');
const formCadastro = document.getElementById('formCadastro');
const formLogin = document.getElementById('formLogin');
const btnLoginGoogle = document.getElementById('btnLoginGoogle');

if (btnCadastro) {
    btnCadastro.addEventListener('click', () => {
        if (formCadastro && formLogin) {
            formCadastro.style.display = 'block';
            formLogin.style.display = 'none';
        }
    });
}

if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        if (formLogin && formCadastro) {
            formLogin.style.display = 'block';
            formCadastro.style.display = 'none';
        }
    });
}

if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .then(result => {
                const user = result.user;
                alert(`Bem-vindo(a), ${user.displayName}!`);
                window.location.href = 'feed.html';
            })
            .catch(error => {
                alert('Erro no login com Google: ' + error.message);
                console.error(error);
            });
    });
}

if (formCadastro) {
    formCadastro.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = formCadastro.querySelector('input[placeholder="Nome"]').value;
        const email = formCadastro.querySelector('input[type="email"]').value;
        const senha = formCadastro.querySelector('input[type="password"]').value;

        createUserWithEmailAndPassword(auth, email, senha)
            .then(userCredential => {
                return updateProfile(userCredential.user, { displayName: nome });
            })
            .then(() => {
                alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
                formCadastro.reset();
                if (formLogin) {
                    formCadastro.style.display = 'none';
                    formLogin.style.display = 'block';
                }
            })
            .catch(error => {
                alert('Erro no cadastro: ' + error.message);
                console.error(error);
            });
    });
}

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = formLogin.querySelector('input[type="email"]').value;
        const senha = formLogin.querySelector('input[type="password"]').value;

        signInWithEmailAndPassword(auth, email, senha)
            .then(() => {
                alert(`Bem-vindo(a)!`);
                window.location.href = 'feed.html';
            })
            .catch(error => {
                alert('Erro no login: ' + error.message);
                console.error(error);
            });
    });
}

// =========================
// FOTO DE PERFIL
// =========================

const fotoPerfil = document.getElementById('foto-perfil');
const inputFoto = document.getElementById('input-foto');
const container = document.getElementById('foto-container');

const ICONE_PADRAO = "https://img.icons8.com/material-rounded/96/user-male-circle.png";

const imagemSalva = localStorage.getItem('fotoPerfil');
if (imagemSalva) {
    if (fotoPerfil) fotoPerfil.src = imagemSalva;
} else {
    if (fotoPerfil) fotoPerfil.src = ICONE_PADRAO;
}

if (container) {
    container.addEventListener('click', () => {
        if (inputFoto) inputFoto.click();
    });
}

if (inputFoto) {
    inputFoto.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const leitor = new FileReader();
            leitor.onload = function (e) {
                const novaImagem = e.target.result;
                if (fotoPerfil) fotoPerfil.src = novaImagem;
                localStorage.setItem('fotoPerfil', novaImagem);
            };
            leitor.readAsDataURL(file);
        }
    });
}

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
const comunidadesPostSelect = document.getElementById('comunidadesPost');

const btnAddArmario = document.getElementById("btnAddArmario");
const modalArmario = document.getElementById("modalArmario");
const closeModalArmario = document.getElementById("closeModalArmario");
const formArmario = document.getElementById("formArmario");
const armarioImages = document.getElementById("armarioImages");

// =========================
// MODAL POSTS
// =========================

if (btnFazerPost) {
    btnFazerPost.addEventListener("click", () => {
        if (modalOverlay) {
            modalOverlay.classList.add("active");
            preencherSelectComunidades();
        }
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (modalOverlay && postForm) {
            modalOverlay.classList.remove("active");
            postForm.reset();
        }
    });
}

// =========================
// FAZER POST
// =========================

if (postForm) {
    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usuario = document.getElementById("usuario").value.trim();
        const select = document.getElementById("comunidadesSelect") || document.getElementById('comunidadesPost');
        const comunidadesSelecionadas = Array.from(select.selectedOptions).map(option => option.textContent || option.value);
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

        if (!usuario || comunidadesSelecionadas.length === 0 || !legenda || !imagemURLFinal) {
            alert("Preencha todos os campos e informe uma imagem (upload ou URL).");
            return;
        }

        try {
            await addDoc(collection(db, "posts"), {
                usuario,
                comunidades: comunidadesSelecionadas,
                legenda,
                imagemURL: imagemURLFinal,
                userId: currentUser.uid,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            alert("Erro ao salvar post: " + error.message);
            return;
        }

        modalOverlay.classList.remove("active");
        postForm.reset();
    });
}

function preencherSelectComunidades() {
    const select = document.getElementById('comunidadesSelect') || document.getElementById('comunidadesPost');
    if (!select) return;

    const q = query(collection(db, 'comunidades'), orderBy('timestamp', 'desc'));

    onSnapshot(q, snapshot => {
        select.innerHTML = '';
        snapshot.forEach(doc => {
            const comunidade = doc.data();
            const option = document.createElement('option');
            option.value = comunidade.nome;
            option.textContent = comunidade.nome;
            select.appendChild(option);
        });
    });
}

// =========================
// FEED DE POSTS
// =========================

let postsCache = [];

const queryPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"));

onSnapshot(queryPosts, (snapshot) => {
    postsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeed(postsCache);
    const deleteButtons = document.querySelectorAll('.delete-post-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const postId = e.target.dataset.postId;
            if (confirm("Tem certeza que deseja excluir este post?")) {
                try {
                    await deleteDoc(doc(db, "posts", postId));
                    alert("Post excluído com sucesso!");
                } catch (error) {
                    alert("Erro ao excluir post: " + error.message);
                }
            }
        });
    });
});

function renderPost(post) {
    const timeString = post.timestamp
        ? new Date(post.timestamp.toDate()).toLocaleString()
        : "";

    const deleteButton = (currentUser && post.userId === currentUser.uid)
        ? `<button class="delete-post-btn" data-post-id="${post.id}">×</button>`
        : '';

    return `
        <div class="post-card">
            ${deleteButton}
            <div class="post-header">
                <div class="post-avatar">${post.usuario.charAt(0)?.toUpperCase() || "?"}</div>
                <div>${escapeHTML(post.usuario)}</div>
            </div>
            <div class="post-comunidades">
                ${post.comunidades?.map(nome => `<span class="tag-comunidade">${escapeHTML(nome)}</span>`).join(" ") || ""}
            </div>
            <img class="post-image" src="${post.imagemURL}" alt="Imagem do post" />
            <div class="post-caption">${escapeHTML(post.legenda)}</div>
            <div class="post-timestamp">${timeString}</div>
        </div>
    `;
}

function renderFeed(posts) {
    const busca = inputSearch?.value.trim().toLowerCase() || '';
    let filteredPosts = posts;

    if (busca) {
        filteredPosts = posts.filter(post =>
            post.usuario?.toLowerCase().includes(busca) ||
            post.legenda?.toLowerCase().includes(busca) ||
            post.comunidades?.some(com => com.toLowerCase().includes(busca))
        );
    }

    if (feedPosts) {
        feedPosts.innerHTML = filteredPosts.map(renderPost).join("");
    }
}

if (btnLimparBusca) {
    btnLimparBusca.addEventListener("click", () => {
        if (inputSearch) inputSearch.value = "";
        renderFeed(postsCache);
    });
}

if (inputSearch) {
    inputSearch.addEventListener("input", () => {
        renderFeed(postsCache);
    });
}

// =========================
// ARMÁRIO PESSOAL
// =========================

if (btnAddArmario) {
    btnAddArmario.addEventListener("click", () => {
        if (currentUser) {
            modalArmario.classList.add("active");
        } else {
            alert("Você precisa estar logado para adicionar itens ao armário.");
        }
    });
}

if (closeModalArmario) {
    closeModalArmario.addEventListener("click", () => {
        modalArmario.classList.remove("active");
        formArmario.reset();
    });
}

if (formArmario) {
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
}

function getArmarioItems(userId) {
    const armarioImages = document.getElementById("armarioImages");
    if (!armarioImages) return;

    const q = query(collection(db, "armarioItems"), where("userId", "==", userId));

    onSnapshot(q, (snapshot) => {
        armarioImages.innerHTML = "";
        if (snapshot.empty) {
            armarioImages.innerHTML = '<p>Seu armário está vazio. Adicione sua primeira peça!</p>';
            return;
        }

        snapshot.forEach((docItem) => {
            const item = docItem.data();
            const itemId = docItem.id;

            const container = document.createElement("div");
            container.classList.add("armario-item-container");

            const img = document.createElement("img");
            img.src = item.imagemURL;
            img.classList.add("armario-img");

            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-armario-btn");
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener('click', async () => {
                if (confirm("Tem certeza que deseja excluir esta peça do seu armário?")) {
                    try {
                        await deleteDoc(doc(db, "armarioItems", itemId));
                        alert("Item excluído com sucesso!");
                    } catch (error) {
                        alert("Erro ao excluir item: " + error.message);
                    }
                }
            });

            container.appendChild(img);
            container.appendChild(deleteBtn);
            armarioImages.appendChild(container);
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

if (btnLoginSpotify) {
    btnLoginSpotify.addEventListener('click', () => {
        window.location.href = authUrl;
    });
}

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
            if (spotifyPlayer) spotifyPlayer.innerHTML = 'Nenhuma música tocando.';
            return;
        }

        const data = await response.json();
        renderSpotifyPlayer(data);
    } catch (error) {
        console.error('Erro ao buscar música do Spotify:', error);
        if (spotifyPlayer) spotifyPlayer.innerHTML = 'Erro ao conectar com Spotify.';
    }
}

function renderSpotifyPlayer(data) {
    if (!data.item) {
        if (spotifyPlayer) spotifyPlayer.innerHTML = 'Nenhuma música tocando.';
        return;
    }

    const track = data.item;
    const albumArt = track.album.images[0].url;
    const artists = track.artists.map(artist => artist.name).join(', ');
    const progressMs = data.progress_ms;
    const durationMs = track.duration_ms;
    const progressPercent = (progressMs / durationMs) * 100;

    if (spotifyPlayer) {
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
const listaComunidades = document.getElementById('listaComunidades');
const btnAddComunidade = document.getElementById('btnAddComunidade');
const modalComunidade = document.getElementById('modalComunidade');
const closeModalComunidade = document.getElementById('closeModalComunidade');
const formComunidade = document.getElementById('formComunidade');

if (btnAddComunidade) {
    btnAddComunidade.addEventListener('click', () => {
        if (!currentUser) {
            alert("Você precisa estar logado para criar comunidades.");
            return;
        }
        if (modalComunidade) modalComunidade.classList.add('active');
    });
}

if (closeModalComunidade) {
    closeModalComunidade.addEventListener('click', () => {
        if (modalComunidade && formComunidade) {
            modalComunidade.classList.remove('active');
            formComunidade.reset();
        }
    });
}

if (formComunidade) {
    formComunidade.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nomeComunidade').value.trim();
        const imagemArquivo = document.getElementById('imagemComunidadeUpload').files[0];

        if (!nome || !imagemArquivo) {
            alert('Preencha o nome e selecione uma imagem.');
            return;
        }

        try {
            const imagemURL = await uploadToCloudinary(imagemArquivo);
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
}

// Funções de renderização condicional
function renderCommunityCard(comunidade) {
    return `
        <div class="comunidade-card">
            <img src="${comunidade.imagemURL}" alt="Foto da Comunidade" class="comunidade-foto" />
            <div class="comunidade-nome">${escapeHTML(comunidade.nome)}</div>
        </div>
    `;
}

function renderCommunityBubble(comunidade) {
    const imagem = comunidade.imagemURL || "https://cdn-icons-png.flaticon.com/512/25/25694.png";
    return `
        <div class="community-bubble" data-nome="${escapeHTML(comunidade.nome)}">
            <img src="${imagem}" alt="${escapeHTML(comunidade.nome)}" />
            <span>${escapeHTML(comunidade.nome)}</span>
        </div>
    `;
}

function renderCommunities(snapshot) {
    if (!listaComunidades) return;

    if (snapshot.empty) {
        listaComunidades.innerHTML = '<p>Nenhuma comunidade criada ainda.</p>';
        return;
    }

    const comunidades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const isFeed2 = listaComunidades.classList.contains('communities-list');

    if (isFeed2) {
        // Renderiza o formato de bolhas para feed2.html
        const bolhaTodos = `
            <div class="community-bubble" data-nome="__todos__">
                <img src="https://cdn-icons-png.flaticon.com/512/25/25694.png" alt="Todos" />
                <span>Todos</span>
            </div>
        `;
        listaComunidades.innerHTML = bolhaTodos + comunidades.map(renderCommunityBubble).join('');
        addFiltroPorComunidade();
        
        if (comunidadesPostSelect) {
            comunidadesPostSelect.innerHTML = comunidades.map(comunidade =>
                `<option value="${escapeHTML(comunidade.nome)}">${escapeHTML(comunidade.nome)}</option>`
            ).join('');
        }

    } else {
        // Renderiza o formato de cartão para feed.html
        listaComunidades.innerHTML = `<div class="lista-comunidades">${comunidades.map(renderCommunityCard).join('')}</div>`;
    }
}

// Inicia a observação do Firestore
if (listaComunidades) {
    const comunidadesQuery = query(collection(db, 'comunidades'), orderBy('timestamp', 'desc'));
    onSnapshot(comunidadesQuery, renderCommunities);
}


function addFiltroPorComunidade() {
    const bolhas = document.querySelectorAll('.community-bubble');

    bolhas.forEach(bolha => {
        bolha.addEventListener('click', () => {
            bolhas.forEach(b => b.classList.remove('active'));
            bolha.classList.add('active');

            const nomeComunidade = bolha.dataset.nome;
            const feedPosts = document.getElementById('feedPosts');

            if (nomeComunidade === "__todos__") {
                renderFeed(postsCache);
                return;
            }

            const filtrados = postsCache.filter(post =>
                post.comunidades && post.comunidades.includes(nomeComunidade)
            );

            renderFeed(filtrados);
        });
    });
}


// =================
// SEGUINDO
// =================
const users = ['@USER-2', '@USER-3', '@USER-4', '@USER-5', '@USER-6'];
const userListElement = document.getElementById('user-list');

if (userListElement) {
    users.forEach(user => {
        const listItem = document.createElement('li');
        listItem.classList.add('user-item');
        listItem.textContent = user;
        userListElement.appendChild(listItem);
    });
}