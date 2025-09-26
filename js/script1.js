// Config do Firebase (substitua com seus dados)
const firebaseConfig = {
  apiKey: "AIzaSyATlni7o4e_1gTrEYxvo-_RyO79NxRC0MI",
  authDomain: "fora-da-bolha.firebaseapp.com",
  projectId: "fora-da-bolha",
  storageBucket: "fora-da-bolha.firebasestorage.com",
  messagingSenderId: "374522033401",
  appId: "1:374522033401:web:ba0337cb876fcca900de28",
  measurementId: "G-3QGSNH5RQ8"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const btnCadastro = document.getElementById('btnCadastro');
const btnLogin = document.getElementById('btnLogin');
const formCadastro = document.getElementById('formCadastro');
const formLogin = document.getElementById('formLogin');
const btnLoginGoogle = document.getElementById('btnLoginGoogle');

btnCadastro.addEventListener('click', () => {
    formCadastro.style.display = 'block';
    formLogin.style.display = 'none';
});

btnLogin.addEventListener('click', () => {
    formLogin.style.display = 'block';
    formCadastro.style.display = 'none';
});

// Login com Google
btnLoginGoogle.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then(result => {
      const user = result.user;
      alert(`Bem-vindo(a), ${user.displayName}!`);
      console.log(user);
      window.location.href = 'feed.html'; // redireciona após login
    })
    .catch(error => {
      alert('Erro no login com Google: ' + error.message);
      console.error(error);
    });
});

// Login com email e senha
formCadastro.addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = formCadastro.querySelector('input[placeholder="Nome"]').value;
  const usuario = formCadastro.querySelector('input[placeholder="Nome de usuário"]').value;
  const email = formCadastro.querySelector('input[type="email"]').value;
  const senha = formCadastro.querySelector('input[type="password"]').value;

  auth.createUserWithEmailAndPassword(email, senha)
    .then(userCredential => {
      // Atualiza o displayName do usuário com o nome que você pegou
      return userCredential.user.updateProfile({ displayName: nome });
    })
    .then(() => {
      alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
      formCadastro.reset();
      formCadastro.style.display = 'none';
      formLogin.style.display = 'block';
    })
    .catch(error => {
      alert('Erro no cadastro: ' + error.message);
      console.error(error);
    });
});

formLogin.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = formLogin.querySelector('input[type="email"]').value;
  const senha = formLogin.querySelector('input[type="password"]').value;

  auth.signInWithEmailAndPassword(email, senha)
    .then(userCredential => {
      alert(`Bem-vindo(a), ${userCredential.user.email}!`);
      window.location.href = 'feed.html'; // redireciona após login
    })
    .catch(error => {
      alert('Erro no login: ' + error.message);
      console.error(error);
    });
});