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
        console.log("KH-Monitor Sound Fehler:", e);
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

    // QR-Code mit kleiner Sicherheitsverzögerung laden, damit die Bibliothek bereit ist
    setTimeout(() => {
        const qrContainer = document.getElementById('qrcode');
        if (qrContainer) {
            qrContainer.innerHTML = ""; 
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: "https://imaashk05.github.io/Projekt-Quiz-sheWorks/index.html",
                    width: 100,
                    height: 100,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
                console.log("QR-Code erfolgreich generiert!");
            } else {
                console.error("QRCode-Bibliothek konnte nicht geladen werden.");
            }
        }
    }, 200);

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

                if (!viewQuiz.classList.contains('hidden')) {
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

    const startForm = document.querySelector('#view-start form');
    if (startForm) {
        startForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('name');
            if (!nameInput) return;

            player.name = nameInput.value.trim();
            if (!player.name) {
                alert("Bitte geben Sie einen Namen ein!");
                return;
            }

            const selectedLevelRadio = document.querySelector('input[name="level"]:checked');
            if (selectedLevelRadio) {
                player.level = selectedLevelRadio.value.toLowerCase();
            }
            const roomInput = document.getElementById('roomCode');
            if (roomInput) {
                player.room = roomInput.value.trim().toLowerCase() || 'runde1';
            }

            if (player.level === 'linzer') {
                player.pointsPerQuestion = 2;
            } else if (player.level === 'bürgermeister') {
                player.pointsPerQuestion = 3;
            } else {
                player.pointsPerQuestion = 1; 
            }

            const selectedThemeRadio = document.querySelector('input[name="theme"]:checked');
            if (selectedThemeRadio) {
                player.theme = selectedThemeRadio.value.toLowerCase();
            }

            if (viewStart) viewStart.classList.add('hidden');
            if (viewQuiz) viewQuiz.classList.remove('hidden');
            if (viewToplist) viewToplist.classList.add('hidden');

            playPureDrumBeat();
            startQuiz();
            startPureDrumLoop(); 
        });
    }

    const topListBtn = document.getElementById('topList');
    if (topListBtn) {
        topListBtn.addEventListener('click', () => {
            leaderboardSource = 'start'; 
            if (viewStart) viewStart.classList.add('hidden');
            showLeaderboard(player.level || 'touri', player.theme || 'geschichte');
        });
    }

    const levelButtons = document.querySelectorAll('#podiumLevels .level');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
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
// 4. FRAGEN-DATENBANK
// ==========================================
const allQuizQuestions = [
    { theme: "geschichte", level: "touri", question: "Welcher berühmte Berg überragt Linz und ist mit einer steilen Bergbahn erreichbar?", answers: ["Schlossberg", "Pöstlingberg", "Kahlenberg"... ]
    { theme: "geschichte", level: "touri", question: "Wie heißt der zentrale Marktplatz im Herzen der Linzer Altstadt?", answers: ["Marktplatz", "Domplatz", "Hauptplatz", "Pfarrplatz"], correct:... ]
    { theme: "geschichte", level: "touri", question: "Welches markante sakrale Bauwerk ist die größte Kirche von Linz?", answers: ["Alter Dom", "Minoritenkirche", "Stadtpfarrkirche", "Mariendom"... ]
    { theme: "geschichte", level: "touri", question: "Wie wird Linz wegen seiner industriellen Stahlproduktion oft genannt?", answers: ["Goldstadt", "Stahlstadt", "Grüne Stadt", "Hafenstadt"], correct: ... ]
    { theme: "geschichte", level: "touri", question: "Welches Wahrzeichen befindet sich auf dem Pöstlingberg?", answers: ["Eine Aussichtswarte", "Ein Sendemast", "Eine Sternwarte", "Die Pöstlingbergbahn"... ]
    { theme: "geschichte", level: "touri", question: "Welches historische Gebäude dient heute als Kultur- und Schlossmuseum über Linz?", answers: ["Das Linzer Schloss", "Das Alte Rathaus", "Die Stadtbibliothek"... ]
    { theme: "geschichte", level: "touri", question: "Wie heißt die bekannte Einkaufsstraße im Zentrum von Linz?", answers: ["Herrengasse", "Kärntner Straße", "Landstraße", "Spittelwiese"], ... ]
    { theme: "geschichte", level: "touri", question: "Welches Verkehrsmittel verbindet die Innenstadt mit dem Urfahraner Marktgelände?", answers: ["Die Straßenbahn", "Eine Seilbahn", "Ein Pendelbus", "Eine Fähre"... ]

    { theme: "geschichte", level: "linzer", question: "In welchem Jahr wurde die Linzer Torte erstmals urkundlich erwähnt?", answers: ["1790", "1848", "1902", "1653"], correct: 3 },
    { theme: "geschichte", level: "linzer", question: "Welches historische Gebäude am Hauptplatz ist für sein dreimal täglich erklingendes Glockenspiel bekannt?", answers: ["Feichtinger-Haus", ... ]
    { theme: "geschichte", level: "linzer", question: "In welchem Jahr wurde die Voestalpine (damals Hütte Linz) gegründet?", answers: ["1918", "1938", "1945", "1955"], correct: 1 },
    { theme: "geschichte", level: "linzer", question: "Wie hieß der berühmte Dichter und Schriftsteller, der eine lange Zeit in Linz lebte?", answers: ["Franz Grillparzer", "Johann Wolfgang von Goethe", ... ]
    { theme: "geschichte", level: "linzer", question: "Welcher historische Platz in Linz war früher ein Salz-Umschlagplatz?", answers: ["Salzamt", "Hauptplatz", "Taubenmarkt", "Mozartkreuzung"], ... ]
    { theme: "geschichte", level: "linzer", question: "Welcher historische Stadtteil von Linz war bis 1919 eine eigenständige Stadt?", answers: ["Ebelsberg", "Kleinmünchen", "Urfahr", "Pichling"... ]
    { theme: "geschichte", level: "linzer", question: "Welche Brücke in Linz war die allererste feste Donaubrücke der Stadt?", answers: ["Nibelungenbrücke", "Eisenbahnbrücke", "Voestbrücke"... ]
    { theme: "geschichte", level: "linzer", question: "Welcher Orden prägte die Bildungsgeschichte von Linz im Barock maßgeblich?", answers: ["Die Benediktiner", "Die Franziskaner", "Die Jesuiten"... ]

    { theme: "geschichte", level: "bürgermeister", question: "Wie hieß die römische Siedlung, aus der sich Linz entwickelt hat?", answers: ["Juvavum", "Vindobona", "Ovilava", "Lentia"], correct:... ]
    { theme: "geschichte", level: "bürgermeister", question: "Unter welchem Kaiser erlebte Linz im 15. Jahrhundert als Residenzstadt eine wichtige Blütezeit?", answers: ["Kaiser Karl V.", ... ]
    { theme: "geschichte", level: "bürgermeister", question: "In welchem Jahrhundert wurde das Linzer Schloss erstmals urkundlich genannt?", answers: ["8. Jahrhundert", "11. Jahrhundert", "14. Jahrhundert"... ]
    { theme: "geschichte", level: "bürgermeister", question: "Welcher Graf erbte im Mittelalter die Geschicke der Stadt und prägte die Burgherrschaft?", answers: ["Graf von Cilli", "Herzog von ..."... ]
    { theme: "geschichte", level: "bürgermeister", question: "Welcher verheerende Stadtbrand zerstörte im Jahr 1500 große Teile der gotischen Linzer Altstadt?", answers: ["Der Brand zur Türkenzeit", ... ]
    { theme: "geschichte", level: "bürgermeister", question: "Wann wurde das Bistum Linz offiziell gegründet?", answers: ["1785", "1805", "1848", "1900"], correct: 0 },
    { theme: "geschichte", level: "bürgermeister", question: "Welches Jahr markiert den Beginn der Eisenbahn-Ära (Pferdeeisenbahn Budweis-Linz-Gmunden) in Linz?", answers: ["1805", "1850", "1832", "1849"... ]
    { theme: "geschichte", level: "bürgermeister", question: "Wie hieß der berühmte Humanist und Freund von Johannes Kepler, der in Linz wirkte?", answers: ["Paul Guldin", "Matthias Bernegger"... ]
    { theme: "geschichte", level: "bürgermeister", question: "Unter welchem Namen war das heutige Bundesland Oberösterreich vor der Republikgründung bekannt?", answers: ["Herzogtum Steier", "L..."... ]
    { theme: "geschichte", level: "bürgermeister", question: "Im Jahr 1311 erhielt Linz ein teilweises Stapelrecht (Niederlagsrecht). Für welches wichtige Handelsgut galt es?", answers: ["Eisen", ... ]

    { theme: "kultur", level: "touri", question: "Wie nennt man das berühmte Medienkunst-Festival in Linz kurz?", answers: ["Linz Art", "MediaEval", "Ars Electronica", "CyberWeek"], correct: 2 },... 
    // (the rest of the question bank continues)
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
            
            // 1. Score in die Cloud speichern (inklusive Runden-Code)
            await saveScoreToCloud(player.name, player.score, player.level, player.theme, player.room);
            
            // 2. Direkt automatisch das Runden-Podium anzeigen
            leaderboardSource = 'quiz'; 
            showLeaderboard(player.level, player.theme); 
        }
    }, 1500); 
}

// ==========================================
// 5. STATUS, PROGRESSBAR & TIMER
// ==========================================
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

// ==========================================
// 6. JOKER
// ==========================================
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
// 7. GLOBALE CLOUD-BESTENLISTE (Mit Runden-Code)
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

        // Neuen Spieler inklusive Runden-Code hinzufügen
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
        console.log("Score für Raum gespeichert!");
    } catch (e) {
        console.log("Fehler beim Cloud-Speichern:", e);
    }
}

async function showLeaderboard(selectedLevel = player.level || 'touri', selectedTheme = player.theme || 'geschichte') {
    stopPureDrumLoop(); 
    
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

    // Der Runden-Code, den der Spieler eingegeben hat
    const currentRoom = (player.room || 'runde1').trim().toLowerCase();
    console.log("Aktiver Runden-Code für Podest:", currentRoom);

    // Filter: Nur Spieler, die exakt DIESEN Runden-Code, dieses Level und dieses Thema haben!
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

    const returnBtn = viewToplist.querySelector('.startReturn-btn');
    if (returnBtn) {
        if (leaderboardSource === 'quiz') {
            returnBtn.textContent = "NEUSTART";
            returnBtn.onclick = () => {
                playPureDrumBeat();
                player.score = 0;
                player.currentQuestionIndex = 0;
                jokerUsed = false;
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
