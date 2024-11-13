// script.js

// Firebase конфигурация
const firebaseConfig = {
  apiKey: "AIzaSyAkdTpWuDDqs0iKDdxOkDlgnue9uEQOUO0",
  authDomain: "ayurtestbot2-6d1ea.firebaseapp.com",
  projectId: "ayurtestbot2-6d1ea",
  storageBucket: "ayurtestbot2-6d1ea.firebasestorage.app",
  messagingSenderId: "935248261137",
  appId: "1:935248261137:web:4a468ed8d42dc0b724c1b0"
};

// Импорт Firebase модулей
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    increment,
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

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
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        // Регистрация пользователя в базе данных
        await registerUserInDatabase(currentUser.uid);

        initApp();
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
            achievements: [],
            theme: 'dark'
        });
        console.log('Новый пользователь зарегистрирован в базе данных.');
    } else {
        console.log('Пользователь уже существует в базе данных.');
    }
}

// Инициализация приложения после аутентификации
async function initApp() {
    // Обработка реферальной системы
    await handleReferral();

    // Загрузка настроек и персонажа
    await loadSettings();

    // Загрузка счёта
    await loadScore();

    // Загрузка достижений
    await loadUserAchievements();

    // Генерация списка персонажей
    generateCharactersList();

    // Загрузка локализации
    await loadLocales();

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
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            score = docSnap.data().score || 0;
        } else {
            score = 0;
        }
        updateContent();
    } catch (error) {
        console.error('Ошибка при загрузке счёта:', error);
    }
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

    // Звуковой эффект клика
    playSound('click');

    // Проверка достижений
    checkAchievements();

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
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentCharacterIndex = data.characterIndex || 0;
            currentLanguage = data.language || 'ru';
            currentTheme = data.theme || 'dark';
            i18next.changeLanguage(currentLanguage, updateContent);

            // Применение темы
            applyTheme(currentTheme);
        }
        updateContent();
    } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
    }
}

// Сохранение настроек
function saveSettings() {
    const userRef = doc(db, 'users', currentUser.uid);
    setDoc(userRef, {
        characterIndex: currentCharacterIndex,
        language: currentLanguage,
        theme: currentTheme,
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

// Тема оформления
let currentTheme = 'dark';

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    saveSettings();
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
    }
}

// Переключение темы по кнопке
document.getElementById('toggle-theme').addEventListener('click', toggleTheme);

// Уведомления
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Звуковые эффекты
function playSound(sound) {
    const audio = new Audio(`./assets/sounds/${sound}.mp3`);
    audio.play();
}

// Элементы интерфейса
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const openSettingsButton = document.getElementById('open-settings');
const openFriendsButton = document.getElementById('open-friends');
const openLeaderboardButton = document.getElementById('open-leaderboard');
const openAchievementsButton = document.getElementById('open-achievements');
const settingsMenu = document.getElementById('settings-menu');
const closeSettingsButton = document.getElementById('close-settings');
const friendsTab = document.getElementById('friends-tab');
const closeFriendsTabButton = document.getElementById('close-friends-tab');
const leaderboardTab = document.getElementById('leaderboard-tab');
const closeLeaderboardTabButton = document.getElementById('close-leaderboard-tab');
const achievementsTab = document.getElementById('achievements-tab');
const closeAchievementsTabButton = document.getElementById('close-achievements-tab');

// Открытие/закрытие выпадающего меню
menuButton.addEventListener('click', () => {
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

// Открытие настроек
openSettingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'block';
    dropdownMenu.style.display = 'none';
});

// Закрытие настроек
closeSettingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'none';
});

// Открытие вкладки друзей
openFriendsButton.addEventListener('click', () => {
    friendsTab.style.display = 'block';
    dropdownMenu.style.display = 'none';
    loadFriends();
});

// Закрытие вкладки друзей
closeFriendsTabButton.addEventListener('click', () => {
    friendsTab.style.display = 'none';
});

// Открытие таблицы лидеров
openLeaderboardButton.addEventListener('click', () => {
    leaderboardTab.style.display = 'block';
    dropdownMenu.style.display = 'none';
    loadLeaderboard();
});

// Закрытие таблицы лидеров
closeLeaderboardTabButton.addEventListener('click', () => {
    leaderboardTab.style.display = 'none';
});

// Открытие достижений
openAchievementsButton.addEventListener('click', () => {
    achievementsTab.style.display = 'block';
    dropdownMenu.style.display = 'none';
    loadAchievements();
});

// Закрытие достижений
closeAchievementsTabButton.addEventListener('click', () => {
    achievementsTab.style.display = 'none';
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

// Загрузка таблицы лидеров
async function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    const usersRef = collection(db, 'users');
    const topUsersQuery = query(usersRef, orderBy('score', 'desc'), limit(10));
    const querySnapshot = await getDocs(topUsersQuery);

    querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const leaderboardItem = document.createElement('div');
        leaderboardItem.classList.add('leaderboard-item');
        leaderboardItem.innerHTML = `
            <span>ID: ${doc.id}</span>
            <span>Очки: ${userData.score}</span>
        `;
        leaderboardList.appendChild(leaderboardItem);
    });
}

// Достижения
const achievements = [
    { id: 1, name: 'Первый клик', description: 'Сделайте первый клик', achieved: false },
    { id: 2, name: '100 кликов', description: 'Сделайте 100 кликов', achieved: false },
    // Добавьте больше достижений
];

// Проверка достижений
function checkAchievements() {
    achievements.forEach((achievement) => {
        if (!achievement.achieved) {
            if (achievement.id === 1 && score >= 1) {
                achievement.achieved = true;
                notifyAchievement(achievement);
            } else if (achievement.id === 2 && score >= 100) {
                achievement.achieved = true;
                notifyAchievement(achievement);
            }
            // Добавьте дополнительные условия для других достижений
        }
    });
    saveAchievements();
}

// Уведомление о достижении
function notifyAchievement(achievement) {
    showNotification(`Достижение разблокировано: ${achievement.name}`);
    playSound('achievement');
}

// Загрузка достижений
function loadAchievements() {
    const achievementsList = document.getElementById('achievements-list');
    achievementsList.innerHTML = '';
    achievements.forEach((achievement) => {
        const achievementItem = document.createElement('div');
        achievementItem.classList.add('achievement-item');
        achievementItem.innerHTML = `
            <strong>${achievement.name}</strong> - ${achievement.description} - ${achievement.achieved ? '✅' : '❌'}
        `;
        achievementsList.appendChild(achievementItem);
    });
}

// Сохранение достижений
function saveAchievements() {
    const userRef = doc(db, 'users', currentUser.uid);
    const achievedIds = achievements.filter(a => a.achieved).map(a => a.id);
    setDoc(userRef, {
        achievements: achievedIds,
    }, { merge: true }).catch((error) => {
        console.error('Ошибка при сохранении достижений:', error);
    });
}

// Загрузка достижений из базы данных
async function loadUserAchievements() {
    const userRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const achievedIds = docSnap.data().achievements || [];
        achievements.forEach((achievement) => {
            if (achievedIds.includes(achievement.id)) {
                achievement.achieved = true;
            }
        });
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

// Запуск приложения
loadMovingModels();
