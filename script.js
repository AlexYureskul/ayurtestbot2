// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Получение идентификатора пользователя (для возможного будущего использования)
const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;

// Инициализация i18next для локализации
let currentLanguage = 'ru'; // По умолчанию русский
const resources = {
    en: {},
    ru: {},
    uk: {}
};

// Функция загрузки языковых файлов
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

// Обработка переключения языка
document.getElementById('language-switcher').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        currentLanguage = e.target.getAttribute('data-lang');
        i18next.changeLanguage(currentLanguage, updateContent);
    }
});

// Инициализация игры
let score = loadScore();
function loadScore() {
    const savedScore = localStorage.getItem('score');
    return savedScore ? parseInt(savedScore) : 0;
}

function saveScore() {
    localStorage.setItem('score', score);
}

document.getElementById('click-button').addEventListener('click', () => {
    score++;
    updateContent();
    saveScore();
});

// Настройка 3D-сцены с помощью Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Добавление света
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Загрузка модели персонажа
const loader = new THREE.ObjectLoader();
loader.load('./assets/models/character.json', (obj) => {
    scene.add(obj);
});

// Если у вас нет модели, можно использовать простой объект
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const character = new THREE.Mesh(geometry, material);
scene.add(character);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);

    // Анимация персонажа
    character.rotation.x += 0.01;
    character.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();

// Обработка изменения размеров окна
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Установка темы в соответствии с темой Telegram
document.body.style.backgroundColor = tg.themeParams.bg_color || '#FFFFFF';
document.body.style.color = tg.themeParams.text_color || '#000000';

// Загрузка локализаций
loadLocales();
