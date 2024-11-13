// script.js
//
import firebaseConfig from '/config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, increment } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Инициализация сервисов
const auth = getAuth(app);
const db = getFirestore(app);

// Анонимный вход
signInAnonymously(auth).catch((error) => {
    console.error('Ошибка аутентификации:', error);
});

// Текущий пользователь
let currentUser;
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;

        // Регистрация пользователя в базе данных
        registerUserInDatabase(currentUser.uid).then(() => {
            initApp();
        });
    } else {
        console.error('Пользователь не аутентифицирован');
    }
});

// Функция для регистрации пользователя в базе данных
async function registerUserInDatabase(uid) {
    const userRef = doc(db, 'users', uid);

    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        // Если пользователь не существует, создаем новый документ
        await setDoc(userRef, {
            score: 0,
            friends: [],
            referrer: null,
            characterIndex: 0,
            language: 'ru',
        });
        console.log('Новый пользователь зарегистрирован в базе данных.');
    } else {
        console.log('Пользователь уже существует в базе данных.');
    }
}

// Инициализация приложения после аутентификации
function initApp() {
    // Обработка реферальной системы
    handleReferral();

    // Загрузка настроек и персонажа
    loadSettings();

    // Загрузка счёта
    loadScore();

    // Генерация списка персонажей
    generateCharactersList();

    // Загрузка локализации
    loadLocales();

    // Запуск анимации
    animate();
}

// Обработка реферальной системы
async function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');

    if (referrerId && currentUser.uid !== referrerId) {
        const userRef = doc(db, 'users', currentUser.uid);
        const referrerRef = doc(db, 'users', referrerId);

        // Сохранение информации о реферале
        await setDoc(userRef, {
            referrer: referrerId,
        }, { merge: true });

        // Обновление данных реферера
        await updateDoc(referrerRef, {
            score: increment(1000),
            friends: arrayUnion(currentUser.uid),
        });
    }
}

// Локализация
let currentLanguage = 'ru';
const resources = {
    en: {},
    ru: {},
    uk: {}
};

// Загрузка языковых файлов
async function loadLocales() {
    const langs = ['en', 'ru', 'uk'];
    for (const lang of langs) {
        const response = await fetch(`./assets/locales/${lang}.json`);
        resources[lang] = { translation: await response.json() };
    }
    initI18n();
}

// Инициализация i18next
function initI18n() {
    i18next.init({
        lng: currentLanguage,
        resources
    }, (err, t) => {
        if (err) return console.error('Ошибка инициализации i18next:', err);
        updateContent();
    });
}

// Обновление контента при переключении языка
function updateContent() {
    document.getElementById('score').innerText = `${i18next.t('score')}: ${score}`;
    document.getElementById('click-button').innerText = i18next.t('clickMe');
}

// Переключение языка
document.getElementById('language-switcher').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        currentLanguage = e.target.getAttribute('data-lang');
        i18next.changeLanguage(currentLanguage, updateContent);
        saveSettings();
    }
});

// Логика игры
let score = 0;

async function loadScore() {
    const userRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        score = docSnap.data().score || 0;
    } else {
        score = 0;
    }
    updateContent();
}

function saveScore() {
    const userRef = doc(db, 'users', currentUser.uid);
    setDoc(userRef, { score: score }, { merge: true }).catch((error) => {
        console.error('Ошибка при сохранении счёта:', error);
    });
}

document.getElementById('click-button').addEventListener('click', () => {
    score++;
    updateContent();
    saveScore();

    // Перемещение кнопки
    moveButton();
});

// Функция перемещения кнопки
function moveButton() {
    const button = document.getElementById('click-button');
    const x = Math.random() * (window.innerWidth - button.offsetWidth);
    const y = Math.random() * (window.innerHeight - button.offsetHeight);

    button.style.position = 'absolute';
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
}

// Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Модели, перемещающиеся по экрану
const models = [];
const modelPaths = [
    './assets/models/character1.glb',
    './assets/models/character2.glb',
    './assets/models/character3.glb',
    './assets/models/character4.glb',
    './assets/models/character5.glb',
];

// Загрузка моделей и их хаотичное движение
function loadMovingModels() {
    const loader = new THREE.GLTFLoader();
    modelPaths.forEach((path, index) => {
        loader.load(path, (gltf) => {
            const model = gltf.scene;
            model.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, 0);
            scene.add(model);
            models.push({ model: model, speed: Math.random() * 0.02 });
        }, undefined, (error) => {
            console.error(`Ошибка загрузки модели ${path}:`, error);
        });
    });
}

// Анимация моделей
function animateModels() {
    models.forEach((obj) => {
        obj.model.position.x += (Math.random() - 0.5) * obj.speed;
        obj.model.position.y += (Math.random() - 0.5) * obj.speed;
    });
}

// Персонажи
const characters = [
    { name: 'Персонаж 1', modelPath: './assets/models/character1.glb' },
    { name: 'Персонаж 2', modelPath: './assets/models/character2.glb' },
    { name: 'Персонаж 3', modelPath: './assets/models/character3.glb' },
    { name: 'Персонаж 4', modelPath: './assets/models/character4.glb' },
    { name: 'Персонаж 5', modelPath: './assets/models/character5.glb' },
];

let currentCharacterIndex = 0;
let character;

// Загрузка персонажа
function loadCharacter(index) {
    if (character) {
        scene.remove(character);
    }
    const loader = new THREE.GLTFLoader();
    loader.load(characters[index].modelPath, (gltf) => {
        character = gltf.scene;
        character.position.set(0, -1, 0);
        scene.add(character);
    }, undefined, (error) => {
        console.error('Ошибка загрузки персонажа:', error);
    });
}

// Выбор персонажа
function selectCharacter(index) {
    currentCharacterIndex = index;
    loadCharacter(currentCharacterIndex);
    saveSettings();
    updateCharacterSelection();
}

// Загрузка настроек
async function loadSettings() {
    const userRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        currentCharacterIndex = docSnap.data().characterIndex || 0;
        currentLanguage = docSnap.data().language || 'ru';
        i18next.changeLanguage(currentLanguage, updateContent);
    }
    updateContent();
}

// Сохранение настроек
function saveSettings() {
    const userRef = doc(db, 'users', currentUser.uid);
    setDoc(userRef, {
        characterIndex: currentCharacterIndex,
        language: currentLanguage,
    }, { merge: true }).catch((error) => {
        console.error('Ошибка при сохранении настроек:', error);
    });
}

// Генерация списка персонажей
function generateCharactersList() {
    const charactersList = document.getElementById('characters-list');
    charactersList.innerHTML = '';
    characters.forEach((char, index) => {
        const charOption = document.createElement('div');
        charOption.classList.add('character-option');
        if (index === currentCharacterIndex) {
            charOption.classList.add('selected');
        }
        charOption.innerText = char.name;
        charOption.addEventListener('click', () => {
            selectCharacter(index);
        });
        charactersList.appendChild(charOption);
    });
}

// Обновление выделения выбранного персонажа
function updateCharacterSelection() {
    const options = document.querySelectorAll('.character-option');
    options.forEach((option, index) => {
        option.classList.toggle('selected', index === currentCharacterIndex);
    });
}

// Элементы интерфейса
const settingsButton = document.getElementById('settings-button');
const settingsMenu = document.getElementById('settings-menu');
const closeSettingsButton = document.getElementById('close-settings');
const friendsButton = document.getElementById('friends-button');
const friendsTab = document.getElementById('friends-tab');
const closeFriendsTabButton = document.getElementById('close-friends-tab');

// Открытие настроек
settingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'block';
});

// Закрытие настроек
closeSettingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'none';
});

// Открытие вкладки друзей
friendsButton.addEventListener('click', () => {
    friendsTab.style.display = 'block';
    loadFriends();
});

// Закрытие вкладки друзей
closeFriendsTabButton.addEventListener('click', () => {
    friendsTab.style.display = 'none';
});

// Загрузка списка друзей
async function loadFriends() {
    const friendsListElement = document.getElementById('friends-list');
    friendsListElement.innerHTML = '';

    const userRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        const friends = docSnap.data().friends || [];
        for (const friendId of friends) {
            const friendRef = doc(db, 'users', friendId);
            const friendDocSnap = await getDoc(friendRef);
            if (friendDocSnap.exists()) {
                const friendItem = document.createElement('div');
                friendItem.classList.add('friend-item');

                // Добавьте информацию о друге
                friendItem.innerHTML = `
                    <img src="./assets/images/default-avatar.png" alt="Friend">
                    <div class="friend-name">ID друга: ${friendId}</div>
                `;

                friendsListElement.appendChild(friendItem);
            }
        }
    }
}

// Анимация
camera.position.z = 5;
function animate() {
    requestAnimationFrame(animate);

    if (character) {
        character.rotation.y += 0.01;
    }

    animateModels();

    renderer.render(scene, camera);
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
//
//
//
// Запуск приложения
loadMovingModels();
