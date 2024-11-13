// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
import firebaseConfig from './config.js';
// Firebase Configuration
//cfg
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Anonymous Sign-In
auth.signInAnonymously().catch((error) => {
    console.error(error);
});

// Get current user
let currentUser;
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        initApp();
    }
});

// Initialize the app after authentication
function initApp() {
    // Check for referral
    handleReferral();

    // Load settings and character
    loadSettings();
    loadCharacter(currentCharacterIndex);

    // Load score
    loadScore();

    // Generate character list
    generateCharactersList();

    // Load localization
    loadLocales();

    // Start animation
    animate();
}

// Handle referral system
function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref');

    if (referrerId && currentUser.uid !== referrerId) {
        // Save referral info
        db.collection('users').doc(currentUser.uid).set({
            referrer: referrerId,
            score: score,
        }, { merge: true });

        // Update referrer's data
        db.collection('users').doc(referrerId).update({
            score: firebase.firestore.FieldValue.increment(1000),
            friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
        });
    }
}

// Localization Setup
let currentLanguage = 'en';
const resources = {
    en: {},
    ru: {},
    uk: {}
};

// Load language files
async function loadLocales() {
    const langs = ['en', 'ru', 'uk'];
    for (const lang of langs) {
        const response = await fetch(`./assets/locales/${lang}.json`);
        resources[lang] = { translation: await response.json() };
    }
    initI18n();
}

// Initialize i18next
function initI18n() {
    i18next.init({
        lng: currentLanguage,
        resources
    }, (err, t) => {
        if (err) return console.error(err);
        updateContent();
    });
}

// Update content on language change
function updateContent() {
    document.getElementById('score').innerText = `${i18next.t('score')}: ${score}`;
    document.getElementById('click-button').innerText = i18next.t('clickMe');
}

// Language switcher
document.getElementById('language-switcher').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        currentLanguage = e.target.getAttribute('data-lang');
        i18next.changeLanguage(currentLanguage, updateContent);
    }
});

// Game Logic
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
});

// Three.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Characters
const characters = [
    { name: 'Character 1', modelPath: './assets/models/character1.glb' },
    { name: 'Character 2', modelPath: './assets/models/character2.glb' },
    { name: 'Character 3', modelPath: './assets/models/character3.glb' },
    { name: 'Character 4', modelPath: './assets/models/character4.glb' },
    { name: 'Character 5', modelPath: './assets/models/character5.glb' },
];

let currentCharacterIndex = 0;
let character;

// Load character
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

// Character selection
function selectCharacter(index) {
    currentCharacterIndex = index;
    loadCharacter(currentCharacterIndex);
    saveSettings();
    updateCharacterSelection();
}

// Load settings
function loadSettings() {
    db.collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            currentCharacterIndex = doc.data().characterIndex || 0;
            currentLanguage = doc.data().language || 'en';
        }
        updateContent();
    });
}

// Save settings
function saveSettings() {
    db.collection('users').doc(currentUser.uid).set({
        characterIndex: currentCharacterIndex,
        language: currentLanguage,
    }, { merge: true });
}

// Generate character list
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

// Update character selection
function updateCharacterSelection() {
    const options = document.querySelectorAll('.character-option');
    options.forEach((option, index) => {
        option.classList.toggle('selected', index === currentCharacterIndex);
    });
}

// UI Elements
const settingsButton = document.getElementById('settings-button');
const settingsMenu = document.getElementById('settings-menu');
const closeSettingsButton = document.getElementById('close-settings');
const friendsButton = document.getElementById('friends-button');
const friendsTab = document.getElementById('friends-tab');
const closeFriendsTabButton = document.getElementById('close-friends-tab');

// Open settings
settingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'block';
});

// Close settings
closeSettingsButton.addEventListener('click', () => {
    settingsMenu.style.display = 'none';
});

// Open friends tab
friendsButton.addEventListener('click', () => {
    friendsTab.style.display = 'block';
    loadFriends();
});

// Close friends tab
closeFriendsTabButton.addEventListener('click', () => {
    friendsTab.style.display = 'none';
});

// Load friends
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

                        // Add friend's info
                        friendItem.innerHTML = `
                            <img src="./assets/images/default-avatar.png" alt="Friend">
                            <div class="friend-name">Friend ID: ${friendId}</div>
                        `;

                        friendsListElement.appendChild(friendItem);
                    }
                });
            });
        }
    });
}

// Animation
camera.position.z = 5;
function animate() {
    requestAnimationFrame(animate);

    if (character) {
        character.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Handle theme based on Telegram settings
document.body.style.backgroundColor = tg.themeParams.bg_color || '#282c34';
document.body.style.color = tg.themeParams.text_color || '#ffffff';

