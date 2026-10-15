// ==========================================
// 1. SPIELER-OBJEKT & GLOBALE VARIABLEN
// ==========================================
let player = {
    name: '',
    score: 0,
    currentQuestionIndex: 0,
    level: 'touri',
    theme: 'geschichte',
    pointsPerQuestion: 1,
    room: 'runde1'
};
let selectedAnswerIndex = null;
let leaderboardSource = 'start'; 
let soundEnabled = false;        

let audioCtx = null;
let pureDrumInterval = null;

// Hilfsfunktion für den Runden-Code
function updateRoomFromInput() {
    const roomInput = document.getElementById('roomCode');
    if (roomInput && roomInput.value.trim()) {
        player.room = roomInput.value.trim().toLowerCase();
    }
}

// ==========================================
// 2. AUDIO-FUNKTIONEN
// ==========================================
function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPureDrumBeat() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
        console.log("Trommel Fehler:", e);
    }
}

function playDeathSound() {
    if (!soundEnabled) return;
    initAudioContext();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
        console.log("Sound Fehler:", e);
    }
}

function startPureDrumLoop() {
    if (!soundEnabled || pureDrumInterval) return;
    initAudioContext();

    pureDrumInterval = setInterval(() => {
        if (!soundEnabled || !audioCtx) {
            stopPureDrumLoop();
            return;
        }
        playPureDrumBeat();
    }, 500); 
}

function stopPureDrumLoop() {
    if (pureDrumInterval) {
        clearInterval(pureDrumInterval);
        pureDrumInterval = null;
    }
}

// ==========================================
// 3. DOM LOADED & EVENT-LISTENER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Linz Quiz App erfolgreich geladen!");

    // URL-Parameter prüfen (z.B. ?room=runde2)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        const roomInput = document.getElementById('roomCode');
        if (roomInput) roomInput.value = roomParam;
    }
    updateRoomFromInput();

    const viewStart = document.getElementById('view-start');
    const viewQuiz = document.getElementById('view-quiz');
    const viewToplist = document.getElementById('viewToplist');

    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            initAudioContext();

            if (soundEnabled) {
                soundBtn.style.opacity = '1';
                soundBtn.style.color = '#ffcc00'; 
                playPureDrumBeat();
                if (viewQuiz && !viewQuiz.classList.contains('hidden')) {
                    startPureDrumLoop();
                }
            } else {
                soundBtn.style.opacity = '0.5';
                soundBtn.style.color = '';
                stopPureDrumLoop();
            }
        });
        soundBtn.style.opacity = '0.5'; 
    }

    // QUIZ STARTEN BUTTON
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateRoomFromInput();

            const nameInput = document.getElementById('name');
            player.name = nameInput ? nameInput.value.trim() : '';

            if (!player.name) {
                alert("Bitte geben Sie einen Namen ein!");
                return;
            }

            const selectedThemeRadio = document.querySelector('input[name="theme"]:checked');
            if (!selectedThemeRadio) {
                alert("Bitte wählen Sie ein Thema aus!");
                return;
            }
            player.theme = selectedThemeRadio.value.toLowerCase();

            const selectedLevelRadio = document.querySelector('input[name="level"]:checked');
            if (!selectedLevelRadio) {
                alert("Bitte wählen Sie eine Schwierigkeit aus!");
                return;
            }
            player.level = selectedLevelRadio.value.toLowerCase();

            if (player.level === 'linzer') {
                player.pointsPerQuestion = 2;
            } else if (player.level === 'bürgermeister') {
                player.pointsPerQuestion = 3;
            } else {
                player.pointsPerQuestion = 1; 
            }

            if (viewStart) viewStart.classList.add('hidden');
            if (viewQuiz) viewQuiz.classList.remove('hidden');
            if (viewToplist) viewToplist.classList.add('hidden');

            playPureDrumBeat();
            startQuiz();
            startPureDrumLoop(); 
        });
    }

    // BESTENLISTE ANSEHEN BUTTON
    const topListBtn = document.getElementById('topList');
    if (topListBtn) {
        topListBtn.addEventListener('click', (e) => {
            e.preventDefault();
            leaderboardSource = 'start'; 
            updateRoomFromInput();

            if (viewStart) viewStart.classList.add('hidden');
            showLeaderboard(player.level || 'touri', player.theme || 'geschichte');
        });
    }

    const levelButtons = document.querySelectorAll('#podiumLevels .level');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            updateRoomFromInput();
            const levelText = button.textContent.trim().toLowerCase();
            showLeaderboard(levelText, player.theme || 'geschichte');
        });
    });

    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            playPureDrumBeat();
            answerButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected'); 
            selectedAnswerIndex = index;       
        });
    });

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', handleNextClick);
    }

    const jokerBtn = document.getElementById('joker-btn');
    if (jokerBtn) {
        jokerBtn.addEventListener('click', handleJokerClick);
    }
});

// ==========================================
// 4. FRAGEN-DATENBANK (Deine Fragen bleiben hier unverändert)
// ==========================================
const allQuizQuestions = [
    { theme: "geschichte", level: "touri", question: "Welcher berühmte Berg überragt Linz und ist mit einer steilen Bergbahn erreichbar?", answers: ["Schlossberg", "Pöstlingberg", "Kahlenberg", "Gaisberg"], correct: 1 },
    { theme: "geschichte", level: "touri", question: "Wie heißt der zentrale Marktplatz im Herzen der Linzer Altstadt?", answers: ["Marktplatz", "Domplatz", "Hauptplatz", "Pfarrplatz"], correct: 2 },
    // ... (restliche Fragen bleiben genau wie gehabt)
];

let activeQuestions = [];
let jokerUsed = false; 

function startQuiz() {
    activeQuestions = allQuizQuestions.filter(q => 
        q.theme.toLowerCase() === player.theme && 
        q.level.toLowerCase() === player.level
    );

    if (activeQuestions.length === 0) {
        activeQuestions = allQuizQuestions.filter(q => q.theme.toLowerCase() === player.theme);
    }
    if (activeQuestions.length === 0) {
        activeQuestions = allQuizQuestions;
    }

    player.currentQuestionIndex = 0;
    player.score = 0;
    jokerUsed = false;
    
    const jBtn = document.getElementById('joker-btn');
    if (jBtn) jBtn.style.opacity = '1';

    loadQuestions();
}

function loadQuestions() {
    stopPureDrumLoop(); 
    
    const currentQuestion = activeQuestions[player.currentQuestionIndex];
    if (!currentQuestion) return;

    const questionHtml = document.getElementById('question');
    if (questionHtml) questionHtml.textContent = currentQuestion.question;

    const answerButtons = document.querySelectorAll('.answer-btn');
    answerButtons.forEach((button, index) => {
        const answerText = currentQuestion.answers[index] || "";
        button.innerHTML = `<span class="letterCircle">${String.fromCharCode(65 + index)}</span> ${answerText}`;
        button.style.visibility = 'visible';
    });

    updateStatus();
    updateProgressBar();
    startTimer();
    startPureDrumLoop(); 
}   

async function handleNextClick() {
    if (selectedAnswerIndex === null) {
        alert("Bitte wählen Sie zuerst eine Antwort aus!");
        return;
    }

    stopPureDrumLoop(); 
    playPureDrumBeat();

    const currentQuestion = activeQuestions[player.currentQuestionIndex];
    const answerButtons = document.querySelectorAll('.answer-btn');
    const nextBtn = document.getElementById('next-btn');

    answerButtons.forEach(btn => btn.style.pointerEvents = 'none');
    if (nextBtn) nextBtn.style.pointerEvents = 'none';
    clearInterval(countdownTimer);

    const chosen = Number(selectedAnswerIndex);
    const correctIdx = Number(currentQuestion.correct);

    if (chosen === correctIdx) {
        player.score += Number(player.pointsPerQuestion || 1);
        if (answerButtons[chosen]) {
            answerButtons[chosen].classList.add('correct');
        }
    } else {
        if (answerButtons[chosen]) {
            answerButtons[chosen].classList.add('wrong');
        }
        if (answerButtons[correctIdx]) {
            answerButtons[correctIdx].classList.add('correct');
        }
    }
    
    updateStatus();

    setTimeout(async () => {
        player.currentQuestionIndex++;
        selectedAnswerIndex = null;

        answerButtons.forEach(btn => {
            btn.classList.remove('correct', 'wrong', 'selected');
            btn.style.visibility = 'visible'; 
            btn.style.pointerEvents = 'auto';
        });
        if (nextBtn) nextBtn.style.pointerEvents = 'auto';

        if (player.currentQuestionIndex < activeQuestions.length) {
            loadQuestions();  
        } else {
            stopPureDrumLoop(); 
            updateRoomFromInput();
            await saveScoreToCloud(player.name, player.score, player.level, player.theme, player.room);
            leaderboardSource = 'quiz'; 
            showLeaderboard(player.level, player.theme); 
        }
    }, 1500); 
}

function updateStatus() {
    const statusText = document.querySelector('#quiz-status-bar p:first-child');
    if (statusText) {
        statusText.innerHTML = `FRAGE <strong>${player.currentQuestionIndex + 1}</strong> / ${activeQuestions.length}`;
    }

    const scoreText = document.querySelector('#quiz-status-bar p:last-child');
    if (scoreText) {
        scoreText.innerHTML = `<strong>${player.score}</strong> Punkte`;
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    const totalQuestions = activeQuestions.length;
    const currentStep = player.currentQuestionIndex + 1;
    const percentage = (currentStep / totalQuestions) * 100;
    progressBar.style.width = percentage + '%';
}

let countdownTimer;
let timeLeft = 17; 

function startTimer() {
    clearInterval(countdownTimer);
    timeLeft = 17;

    const timeOutText = document.getElementById('timeOut');
    if (timeOutText) timeOutText.style.display = 'none'; 

    const timerDisplay = document.querySelector('#timer p');

    countdownTimer = setInterval(() => {
        timeLeft--;
        if (timerDisplay) timerDisplay.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            stopPureDrumLoop();
            playDeathSound();
            if (timeOutText) timeOutText.style.display = 'block'; 
            setTimeout(() => {
                handleNextClick();
            }, 1500);
        }
    }, 1000);
}

function handleJokerClick() {
    if (jokerUsed) {
        alert("Du hast deinen Joker für dieses Quiz schon aufgebraucht!");
        return;
    }

    playPureDrumBeat();
    const currentQuestion = activeQuestions[player.currentQuestionIndex];
    const answerButtons = document.querySelectorAll('.answer-btn');
    let hiddenCount = 0;

    answerButtons.forEach((button, index) => {
        if (index !== currentQuestion.correct && hiddenCount < 2) {
            button.style.visibility = 'hidden'; 
            hiddenCount++;
        }
    });

    jokerUsed = true; 
    const jokerBtn = document.getElementById('joker-btn');
    if (jokerBtn) jokerBtn.style.opacity = '0.4';
}

// ==========================================
// 7. GLOBALE CLOUD-BESTENLISTE
// ==========================================
const BIN_ID = '6acf4f95ffd5d1605369ef71';
const API_KEY = '$2a$10$49WBAwWSPVlw.m8Uygoy2uxkA9pAZ7F4oU5/kxMWe.Pw.SuumptSO';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function saveScoreToCloud(name, score, level, theme, room) {
    try {
        const getRes = await fetch(API_URL, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const getData = await getRes.json();
        let leaderboard = getData.record.leaderboard || [];

        leaderboard.push({ 
            name: name, 
            score: Number(score), 
            level: (level || 'touri').toLowerCase(), 
            theme: (theme || 'geschichte').toLowerCase(),
            room: (room || 'runde1').toLowerCase()
        });

        leaderboard.sort((a, b) => b.score - a.score);

        await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ leaderboard: leaderboard })
        });
        console.log("Score gespeichert für Raum:", room);
    } catch (e) {
        console.log("Fehler beim Cloud-Speichern:", e);
    }
}

async function showLeaderboard(selectedLevel = player.level || 'touri', selectedTheme = player.theme || 'geschichte') {
    stopPureDrumLoop(); 
    updateRoomFromInput();
    
    const viewQuiz = document.getElementById('view-quiz');
    const viewStart = document.getElementById('view-start');
    const viewToplist = document.getElementById('viewToplist');
    
    if (viewQuiz) viewQuiz.classList.add('hidden');
    if (viewStart) viewStart.classList.add('hidden');
    if (viewToplist) viewToplist.classList.remove('hidden');

    let leaderboard = [];
    try {
        const response = await fetch(API_URL, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        leaderboard = data.record.leaderboard || [];
    } catch (e) {
        console.log("Fehler beim Laden der Bestenliste:", e);
    }

    const currentRoom = (player.room || 'runde1').trim().toLowerCase();

    const filteredList = leaderboard.filter(item => {
        const itemRoom = (item.room || 'runde1').trim().toLowerCase();
        const itemLevel = (item.level || 'touri').trim().toLowerCase();
        const itemTheme = (item.theme || 'geschichte').trim().toLowerCase();

        return itemRoom === currentRoom && 
               itemLevel === selectedLevel.toLowerCase() && 
               itemTheme === selectedTheme.toLowerCase();
    });

    const places = [
        { id: 'p1', data: filteredList[0] }, 
        { id: 'p2', data: filteredList[1] }, 
        { id: 'p3', data: filteredList[2] }  
    ];

    places.forEach(place => {
        const placeEl = document.getElementById(place.id);
        if (!placeEl) return;

        const nameCharEl = placeEl.querySelector('.nameChar');
        const nameEl = placeEl.querySelector('.name');
        const pointsEl = placeEl.querySelector('.points');

        if (place.data) {
            const firstChar = place.data.name.charAt(0).toUpperCase();
            if (nameCharEl) nameCharEl.textContent = firstChar;
            if (nameEl) nameEl.textContent = place.data.name;
            if (pointsEl) pointsEl.innerHTML = `${place.data.score} <span>Punkte</span>`;
            placeEl.style.opacity = '1';
        } else {
            if (nameCharEl) nameCharEl.textContent = '-';
            if (nameEl) nameEl.textContent = 'Noch frei';
            if (pointsEl) pointsEl.innerHTML = `0 <span>Punkte</span>`;
            placeEl.style.opacity = '0.5';
        }
    });

    document.querySelectorAll('#podiumLevels .level').forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === selectedLevel.toLowerCase()) {
            btn.classList.add('sel');
        } else {
            btn.classList.remove('sel');
        }
    });

    const returnBtn = viewToplist ? viewToplist.querySelector('.startReturn-btn') : null;
    if (returnBtn) {
        if (leaderboardSource === 'quiz') {
            returnBtn.textContent = "NEUSTART";
            returnBtn.onclick = () => {
                playPureDrumBeat();
                player.score = 0;
                player.currentQuestionIndex = 0;
                jokerUsed = false;
                updateRoomFromInput();

                const jBtn = document.getElementById('joker-btn');
                if (jBtn) jBtn.style.opacity = '1';

                viewToplist.classList.add('hidden');
                viewStart.classList.remove('hidden');
            };
        } else {
            returnBtn.textContent = "ZURÜCK";
            returnBtn.onclick = () => {
                playPureDrumBeat();
                viewToplist.classList.add('hidden');
                viewStart.classList.remove('hidden');
            };
        }
    }
}