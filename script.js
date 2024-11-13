// script.js

import firebaseConfig from './config.js';

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Инициализация сервисов
const auth = firebase.auth();
const db = firebase.firestore();

// Анонимный вход
auth.signInAnonymously().catch((error) => {
    console.error(error);
});

// Текущий пользователь
let currentUser;
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        initApp();
    }
});

// Инициализация приложения после аутентификации
function initApp() {
    // Обработка реферальной системы
    handleReferral();

    // Загрузка настроек и персонажа
    loadSettings();
    loadCharacter(currentCharacterIndex);

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
function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');

    if (referrerId && currentUser.uid !== referrerId) {
        // Сохранение информации о реферале
        db.collection('users').doc(currentUser.uid).set({
            referrer: referrerId,
            score: score,
        }, { merge: true });

        // Обновление данных реферера
        db.collection('users').doc(referrerId).update({
            score: firebase.firestore.FieldValue.increment(1000),
            friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
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
        if (err) return console.error(err);
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

function loadScore() {
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            score = doc.data().score || 0;
        } else {
            score = 0;
        }
        updateContent();
    });
}

function saveScore() {
    db.collection('users').doc(currentUser.uid).set({
        score: score,
    }, { merge: true });
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
    const x = Math.random();
    const y = Math.random();

    button.style.setProperty('--random-x', x);
    button.style.setProperty('--random-y', y);
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
        scene.add(character);
    }, undefined, (error) => {
        console.error(error);
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
function loadSettings() {
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            currentCharacterIndex = doc.data().characterIndex || 0;
            currentLanguage = doc.data().language || 'ru';
            i18next.changeLanguage(currentLanguage, updateContent);
        }
        updateContent();
    });
}

// Сохранение настроек
function saveSettings() {
    db.collection('users').doc(currentUser.uid).set({
        characterIndex: currentCharacterIndex,
        language: currentLanguage,
    }, { merge: true });
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
function loadFriends() {
    const friendsListElement = document.getElementById('friends-list');
    friendsListElement.innerHTML = '';

    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            const friends = doc.data().friends || [];
            friends.forEach((friendId) => {
                db.collection('users').doc(friendId).get().then((friendDoc) => {
                    if (friendDoc.exists) {
                        const friendData = friendDoc.data();
                        const friendItem = document.createElement('div');
                        friendItem.classList.add('friend-item');

                        // Добавьте информацию о друге
                        friendItem.innerHTML = `
                            <img src="./assets/images/default-avatar.png" alt="Friend">
                            <div class="friend-name">ID друга: ${friendId}</div>
                        `;

                        friendsListElement.appendChild(friendItem);
                    }
                });
            });
        }
    });
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

// Загрузка локализаций
loadMovingModels();
