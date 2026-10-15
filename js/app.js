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

// Hilfsfunktion, damit der Runden-Code IMMER aktuell aus dem HTML-Feld geholt wird
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
// 4. VOLLSTÄNDIGE FRAGEN-DATENBANK
// ==========================================
const allQuizQuestions = [
    // GESCHICHTE - TOURI
    { theme: "geschichte", level: "touri", question: "Welcher berühmte Berg überragt Linz und ist mit einer steilen Bergbahn erreichbar?", answers: ["Schlossberg", "Pöstlingberg", "Kahlenberg", "Gaisberg"], correct: 1 },
    { theme: "geschichte", level: "touri", question: "Wie heißt der zentrale Marktplatz im Herzen der Linzer Altstadt?", answers: ["Marktplatz", "Domplatz", "Hauptplatz", "Pfarrplatz"], correct: 2 },
    { theme: "geschichte", level: "touri", question: "Welches markante sakrale Bauwerk ist die größte Kirche von Linz?", answers: ["Alter Dom", "Minoritenkirche", "Stadtpfarrkirche", "Mariendom (Neuer Dom)"], correct: 3 },
    { theme: "geschichte", level: "touri", question: "Wie wird Linz wegen seiner industriellen Stahlproduktion oft genannt?", answers: ["Goldstadt", "Stahlstadt", "Grüne Stadt", "Hafenstadt"], correct: 1 },
    { theme: "geschichte", level: "touri", question: "Welches Wahrzeichen befindet sich auf dem Pöstlingberg?", answers: ["Eine Aussichtswarte", "Ein Sendemast", "Eine Sternwarte", "Die Pöstlingbergkirche"], correct: 3 },
    { theme: "geschichte", level: "touri", question: "Welches historische Gebäude dient heute als Kultur- und Schlossmuseum über Linz?", answers: ["Das Linzer Schloss", "Das Alte Rathaus", "Die Redoutenakademie", "Das Landhaus"], correct: 0 },
    { theme: "geschichte", level: "touri", question: "Wie heißt die bekannte Einkaufsstraße im Zentrum von Linz?", answers: ["Herrengasse", "Kärntner Straße", "Landstraße", "Spittelwiese"], correct: 2 },
    { theme: "geschichte", level: "touri", question: "Welches Verkehrsmittel verbindet die Innenstadt mit dem Urfahraner Marktgelände?", answers: ["Die Straßenbahn", "Eine Seilbahn", "Ein Pendelbus", "Eine Fähre"], correct: 0 },

    // GESCHICHTE - LINZER
    { theme: "geschichte", level: "linzer", question: "In welchem Jahr wurde die Linzer Torte erstmals urkundlich erwähnt?", answers: ["1790", "1848", "1902", "1653"], correct: 3 },
    { theme: "geschichte", level: "linzer", question: "Welches historische Gebäude am Hauptplatz ist für sein dreimal täglich erklingendes Glockenspiel bekannt?", answers: ["Feichtinger-Haus", "Altes Rathaus", "Kirchmayr-Haus", "Schmidtberger-Haus"], correct: 0 },
    { theme: "geschichte", level: "linzer", question: "In welchem Jahr wurde die Voestalpine (damals Hütte Linz) gegründet?", answers: ["1918", "1938", "1945", "1955"], correct: 1 },
    { theme: "geschichte", level: "linzer", question: "Wie hieß der berühmte Dichter und Schriftsteller, der eine lange Zeit in Linz lebte?", answers: ["Franz Grillparzer", "Johann Wolfgang von Goethe", "Adalbert Stifter", "Peter Rosegger"], correct: 2 },
    { theme: "geschichte", level: "linzer", question: "Welcher historische Platz in Linz war früher ein Salz-Umschlagplatz?", answers: ["Salzamt", "Hauptplatz", "Taubenmarkt", "Mozartkreuzung"], correct: 0 },
    { theme: "geschichte", level: "linzer", question: "Welcher historische Stadtteil von Linz war bis 1919 eine eigenständige Stadt?", answers: ["Ebelsberg", "Kleinmünchen", "Urfahr", "Pichling"], correct: 2 },
    { theme: "geschichte", level: "linzer", question: "Welche Brücke in Linz war die allererste feste Donaubrücke der Stadt?", answers: ["Nibelungenbrücke", "Eisenbahnbrücke", "Voestbrücke", "Salztorbrücke"], correct: 0 },
    { theme: "geschichte", level: "linzer", question: "Welcher Orden prägte die Bildungsgeschichte von Linz im Barock maßgeblich?", answers: ["Die Benediktiner", "Die Franziskaner", "Die Jesuiten", "Die Dominikaner"], correct: 2 },

    // GESCHICHTE - BÜRGERMEISTER
    { theme: "geschichte", level: "bürgermeister", question: "Wie hieß die römische Siedlung, aus der sich Linz entwickelt hat?", answers: ["Juvavum", "Vindobona", "Ovilava", "Lentia"], correct: 3 },
    { theme: "geschichte", level: "bürgermeister", question: "Unter welchem Kaiser erlebte Linz im 15. Jahrhundert als Residenzstadt eine wichtige Blütezeit?", answers: ["Kaiser Karl V.", "Kaiser Friedrich III.", "Kaiser Franz Joseph I.", "Kaiser Maximilian I."], correct: 1 },
    { theme: "geschichte", level: "bürgermeister", question: "In welchem Jahrhundert wurde das Linzer Schloss erstmals urkundlich genannt?", answers: ["8. Jahrhundert", "11. Jahrhundert", "14. Jahrhundert", "17. Jahrhundert"], correct: 0 },
    { theme: "geschichte", level: "bürgermeister", question: "Welcher Graf erbte im Mittelalter die Geschicke der Stadt und prägte die Burgherrschaft?", answers: ["Graf von Cilli", "Herzog von Babenberg", "Graf von Schaunberg", "Graf von Lamberg"], correct: 2 },
    { theme: "geschichte", level: "bürgermeister", question: "Welcher verheerende Stadtbrand zerstörte im Jahr 1500 große Teile der gotischen Linzer Altstadt?", answers: ["Der Brand zur Türkenzeit", "Das Feuer im Landhaus", "Der Brand am Hauptplatz", "Der Große Brand von 1500"], correct: 3 },
    { theme: "geschichte", level: "bürgermeister", question: "Wann wurde das Bistum Linz offiziell gegründet?", answers: ["1785", "1805", "1848", "1900"], correct: 0 },
    { theme: "geschichte", level: "bürgermeister", question: "Welches Jahr markiert den Beginn der Eisenbahn-Ära (Pferdeeisenbahn Budweis-Linz-Gmunden) in Linz?", answers: ["1805", "1850", "1832", "1871"], correct: 2 },
    { theme: "geschichte", level: "bürgermeister", question: "Wie hieß der berühmte Humanist und Freund von Johannes Kepler, der in Linz wirkte?", answers: ["Paul Guldin", "Matthias Bernegger", "Johannes Bretter", "Veit Amerbach"], correct: 1 },
    { theme: "geschichte", level: "bürgermeister", question: "Unter welchem Namen war das heutige Bundesland Oberösterreich vor der Republikgründung bekannt?", answers: ["Herzogtum Steier", "Land ob der Enns", "Traungau", "Mühlviertel superior"], correct: 1 },
    { theme: "geschichte", level: "bürgermeister", question: "Im Jahr 1311 erhielt Linz ein teilweises Stapelrecht (Niederlagsrecht). Für welches wichtige Handelsgut galt es?", answers: ["Eisen", "Wein", "Salz", "Tuch"], correct: 2 },

    // KULTUR - TOURI
    { theme: "kultur", level: "touri", question: "Wie nennt man das berühmte Medienkunst-Festival in Linz kurz?", answers: ["Linz Art", "MediaEval", "Ars Electronica", "CyberWeek"], correct: 2 },
    { theme: "kultur", level: "touri", question: "Welches Theater zeigt in Linz große Opern-, Musical- und Ballettproduktionen?", answers: ["Burgtheater", "Metropol", "Kammerspiele", "Landestheater Linz"], correct: 3 },
    { theme: "kultur", level: "touri", question: "Welches Museum widmet sich der Geschichte und Kultur der Stadt Linz selbst?", answers: ["Lentos", "Nordico Stadtmuseum", "Schlossmuseum", "Biologiezentrum"], correct: 1 },
    { theme: "kultur", level: "touri", question: "Wie heißt das bekannte Jugendstil-Kaufhaus in der Linzer Landstraße?", answers: ["Wist", "Keplinger", "Gugl", "Passage"], correct: 3 },
    { theme: "kultur", level: "touri", question: "Welches Musikgenre hat im Brucknerhaus traditionell eine besonders große Heimat?", answers: ["Klassische Musik & Konzerte", "Techno & Rave", "Heavy Metal", "Schlager"], correct: 0 },
    { theme: "kultur", level: "touri", question: "Welche dieser Kulturzentren prägen die Linzer Konzert-, Club- und alternative Kulturszene?", answers: ["Posthof", "Kapu", "Stadtwerkstatt", "Alle genannten"], correct: 3 },
    { theme: "kultur", level: "touri", question: "Wie heißt die berühmte Linzer Kunstuniversität?", answers: ["Akademie der Künste", "Universität für künstlerische und industrielle Gestaltung", "Hochschule Linz", "Design-Uni Linz"], correct: 1 },
    { theme: "kultur", level: "touri", question: "Wie heißt das Kultur- und Jugendzentrum direkt an der unteren Donaulände?", answers: ["Knotenpunkt", "Mitte", "Stadtwerkstatt (STWST)", "Kulturhof"], correct: 2 },

    // KULTUR - LINZER
    { theme: "kultur", level: "linzer", question: "Wo befindet sich das beliebte Kultur- und Veranstaltungszentrum 'Posthof'?", answers: ["In Urfahr", "In Ebelsberg", "Auf der Gugl", "Im Hafenviertel"], correct: 3 },
    { theme: "kultur", level: "linzer", question: "Welcher renommierte Preis wird alljährlich beim Ars Electronica Festival vergeben?", answers: ["Golden Globe", "Prix Ars Electronica", "Media Award", "Cyber Oscar"], correct: 1 },
    { theme: "kultur", level: "linzer", question: "Welcher berühmte Architekt plante das moderne Lentos Kunstmuseum?", answers: ["Herzog & de Meuron", "Dietmar Feichtinger", "Splyce / Weber & Hofer", "Wolf D. Prix"], correct: 2 },
    { theme: "kultur", level: "linzer", question: "Welcher bekannte Bildhauer und Maler schuf zahlreiche Werke im öffentlichen Raum in Linz?", answers: ["Helmuth Gsöllpointner", "Fritz Wotruba", "Bruno Gironcoli", "Rudolf Hoflehner"], correct: 0 },
    { theme: "kultur", level: "linzer", question: "Welches Institut widmet sich in Linz der Erforschung und Ausstellung digitaler Kunst?", answers: ["Medialab Linz", "Digital Art Center", "Ars Electronica Futurelab", "CyberSpace Linz"], correct: 2 },
    { theme: "kultur", level: "linzer", question: "Welcher historische Verein pflegt seit dem 19. Jahrhundert die Kultur- und Naturgeschichte Oberösterreichs in Linz?", answers: ["Historischer Verein für Linz", "Museumisco / OÖ Landes-Kultur GmbH", "Heimatverein Linz", "Kulturkreis Donau"], correct: 1 },
    { theme: "kultur", level: "linzer", question: "Welche literarische Vereinigung hat ihren Sitz im Linzer StifterHaus?", answers: ["Literaturforum Linz", "Poetenclub Donau", "Linzer Autorenkreis", "Adalbert-Stifter-Institut"], correct: 3 },
    { theme: "kultur", level: "linzer", question: "Welches architektonische Juwel beherbergt das Francisco Carolinum in Linz?", answers: ["Das Schloss", "Historisches Ausstellungsgebäude an der Museumstraße", "Ein ehemaliges Bankgebäude", "Der alte Bahnhof"], correct: 1 },

    // KULTUR - BÜRGERMEISTER
    { theme: "kultur", level: "bürgermeister", question: "In welchem Jahr wurde das Brucknerhaus in Linz offiziell eröffnet?", answers: ["1965", "1982", "1990", "1974"], correct: 3 },
    { theme: "kultur", level: "bürgermeister", question: "Welche Architekten entwarfen das 2013 eröffnete Musiktheater am Volksgarten?", answers: ["Zaha Hadid", "Norman Foster", "Terry Pawson", "Mario Botta"], correct: 2 },
    { theme: "kultur", level: "bürgermeister", question: "Welcher berühmte Architekt entwarf das Erweiterungsprojekt des Schlosses Linz mit dem markanten Glas-Stahl-Riegel?", answers: ["Gilles Retsin", "Norman Foster", "Herzog & de Meuron", "Hohensinn Architektur"], correct: 3 },
    { theme: "kultur", level: "bürgermeister", question: "In welchem Jahr wurde das ursprüngliche Gebäude des Francisco Carolinum erbaut?", answers: ["1835", "1910", "1895", "1925"], correct: 2 },
    { theme: "kultur", level: "bürgermeister", question: "Welche historische Kunstsammlung bildet den Grundstock des OÖ Landesmuseums?", answers: ["Die Sammlungen des Stiftes St. Florian und private Stiftungen", "Die kaiserliche Hofbibliothek", "Die Sammlung Gurlitt", "Das Stadtarchiv Linz"], correct: 0 },
    { theme: "kultur", level: "bürgermeister", question: "Welches Jahr gilt als das Geburtsjahr der legendären 'Linzer Klangwolke'?", answers: ["1985", "1979", "1990", "1995"], correct: 1 },
    { theme: "kultur", level: "bürgermeister", question: "Welcher Künstler gestaltete die berühmten Glasfenster im Mariendom zu Linz (z. B. das Linzer Fenster)?", answers: ["Marc Chagall", "Verschiedene internationale Künstler wie Ben Jakober", "Arnulf Rainer", "Gerhard Richter"], correct: 1 },
    { theme: "kultur", level: "bürgermeister", question: "Welches architektonische Konzept verfolgte der Architekt des Lentos, Heikki Häiväoja?", answers: ["Eine schwebende Kiste aus Glas und Beton direkt am Strom", "Ein geschlossener Pyramidenbau", "Ein historisierender Backsteinbau", "Ein unterirdisches Gewölbe"], correct: 0 },

    // VERWALTUNG - TOURI
    { theme: "verwaltung", level: "touri", question: "An welchem zentralen Platz liegt das Alte Rathaus von Linz?", answers: ["Taubenmarkt", "Volksgarten", "Hauptplatz", "Pfarrplatz"], correct: 2 },
    { theme: "verwaltung", level: "touri", question: "Welches große Stadion ist die sportliche Heimat des Fußballvereins LASK?", answers: ["Kopetzkystadion", "Raiffeisen Arena (Gugl)", "Linzer Stadion", "Donauparkstadion"], correct: 1 },
    { theme: "verwaltung", level: "touri", question: "Wie heißt der Flughafen, der die Region Linz anbindet?", answers: ["Airport Linz / Blue Tomato", "Airport Donau", "Aviation Center Linz", "Flughafen Linz-Hörsching"], correct: 3 },
    { theme: "verwaltung", level: "touri", question: "Welcher Park im Linzer Süden beherbergt den Botanischen Garten der Stadt?", answers: ["Gugl / Bauernbergpark", "In der Freinbergstraße", "Volksgarten", "Ebelsberger Park"], correct: 0 },
    { theme: "verwaltung", level: "touri", question: "Welches grüne Naherholungsgebiet liegt direkt westlich des Zentrums auf den Anhöhen?", answers: ["Freinberg & JKU-Gelände", "Pöstlingberg", "Lichtenberg", "Kürnbergwald"], correct: 3 },
    { theme: "verwaltung", level: "touri", question: "Wie heißt das größte Hallenbad und Freibad im Linzer Stadtgebiet?", answers: ["Donaubad", "Linzer Bad", "Parkbad", "Solarbad"], correct: 2 },
    { theme: "verwaltung", level: "touri", question: "Welches Gebäude dient als Sitz der oberösterreichischen Landesregierung?", answers: ["Das Landhaus", "Das Alte Rathaus", "Das Regierungsgebäude", "Die Landesburg"], correct: 0 },
    { theme: "verwaltung", level: "touri", question: "Welcher bekannte Platz in der Linzer Innenstadt ist der wichtigste Umsteigepunkt für Straßenbahnen?", answers: ["Hauptplatz", "Taubenmarkt", "Blumauerplatz", "Hessenplatz"], correct: 1 },

    // VERWALTUNG - LINZER
    { theme: "verwaltung", level: "linzer", question: "Welcher See im Linzer Osten ist ein beliebtes Naherholungs- und Badegebiet?", answers: ["Traunsee", "Attersee", "Pichlinger See", "Mondsee"], correct: 2 },
    { theme: "verwaltung", level: "linzer", question: "Welche Autobahn verläuft als Westautobahn südlich an Linz vorbei?", answers: ["A7 (Mühlkreis Autobahn)", "A9", "A8", "A1"], correct: 3 },
    { theme: "verwaltung", level: "linzer", question: "Wie heißt der Autobahnzubringer und die Stadtautobahn, die mitten durch Linz führt?", answers: ["A7 Mühlkreis Autobahn", "Linzer Spange", "Donau-Schnellstraße", "Urfahr-Linie"], correct: 0 },
    { theme: "verwaltung", level: "linzer", question: "Welche Institution ist in Linz für den öffentlichen Wohnbau (Genossenschaftswohnungen) historisch sehr bedeutend?", answers: ["Gemeinnützige Baugesellschaft Linz", "WAG / Neue Heimat OÖ", "Wohnbau Linz-Süd", "Heimstätte Donau"], correct: 1 },
    { theme: "verwaltung", level: "linzer", question: "Welcher Friedhof ist der größte in Linz und schaut aus wie ein riesiger Park?", answers: ["St. Barbara-Friedhof", "Stadtfriedhof Urfahr", "Stadtfriedhof St. Martin", "Friedhof Kleinmünchen"], correct: 2 },
    { theme: "verwaltung", level: "linzer", question: "Wie heißt das moderne Innovations- und Forschungszentrum der JKU in Linz?", answers: ["TechCenter", "InnoLab", "ResearchHub", "Science Park Linz"], correct: 3 },
    { theme: "verwaltung", level: "linzer", question: "Welcher Hafen an der Donau in Linz ist einer der größten Güterhäfen Österreichs?", answers: ["Linzer Handelshafen", "Donauhafen Urfahr", "Industriehafen Ost", "Freihafen Linz"], correct: 0 },
    { theme: "verwaltung", level: "linzer", question: "Welcher Stadtteil im Osten von Linz beherbergt große Wohnsiedlungen und den Pichlinger See?", answers: ["Auwiesen", "Pichling", "Kleinmünchen", "Ebelsberg"], correct: 1 },

    // VERWALTUNG - BÜRGERMEISTER
    { theme: "verwaltung", level: "bürgermeister", question: "Wie viele Stadtteile (statistische Bezirke) umfasst die Stadt Linz offiziell?", answers: ["8", "32", "23", "16"], correct: 3 }, 
    { theme: "verwaltung", level: "bürgermeister", question: "In welchem Jahr wurde die Eingemeindung von Urfahr nach Linz rechtswirksam?", answers: ["1909", "1938", "1919", "1945"], correct: 2 },
    { theme: "verwaltung", level: "bürgermeister", question: "Welches Jahr markiert die Eingemeindung von Ebelsberg nach Linz?", answers: ["1972", "1919", "1955", "1938"], correct: 3 },
    { theme: "verwaltung", level: "bürgermeister", question: "Welches Großprojekt schützt die Stadt Linz und ihr Hafenviertel nach den Erfahrungen der Hochwasser 2002 und 2013 vor einem 300-jährlichen Donau-Hochwasser?", answers: ["Die permanente Staustufe Urfahr-West", "Das neue Hochwasserschutztor am Linzer Handelshafen", "Die unterirdische Donau-Entlastungsleitung", "Die Flutbepflanzung im Donaupark"], correct: 1 },
    { theme: "verwaltung", level: "bürgermeister", question: "Wie heißt das im Jahr 2021 eröffnete Linzer Kultur- und Linienbussystem-Steuerungszentrum?", answers: ["Verkehrsleitwarte", "CityControl Linz", "Infrastruktur-Leitzentrale Linz AG", "Mobilitäts-Zentrale Donau"], correct: 2 },
    { theme: "verwaltung", level: "bürgermeister", question: "Welches Gremium neben dem Gemeinderat leitet die Stadtgeschäfte operativ in Linz?", answers: ["Der Stadtsenat", "Der Bezirkshauptmann", "Die Landesregierung", "Das Verwaltungskomitee"], correct: 0 },
    { theme: "verwaltung", level: "bürgermeister", question: "Wie nennt sich die strategische Zusammenarbeit der drei größten Städte im oberösterreichischen Zentralraum zur gemeinsamen Standort- und Verkehrsplanung?", answers: ["Städtepakt Donau", "Metropolregion Linz-Wels-Steyr", "Oberösterreich-Mitte", "Europaregion Mühlviertel"], correct: 1 },
    { theme: "verwaltung", level: "bürgermeister", question: "Welches wichtige Raumordnungsprojekt prägt die Stadtentwicklung im Linzer Süden (ehemaliges Frachtenbahnhofgelände)?", answers: ["Neue Welt / SolarCity Pichling", "Das Projekt 'Wohnen am Park' / Tabakfabrik-Entwicklung", "Der Stadtpark Süd", "Das Industrieareal Kleinmünchen"], correct: 0 },
    { theme: "verwaltung", level: "bürgermeister", question: "Welche historische Urkunde verlieh Linz im Mittelalter wichtige Markt- und Stadtrechte?", answers: ["Die Urkunde von Friedrich III. (1493)", "Das Handfeste Privileg von 1310", "Die Stadtrechtsurkunde von 1242 (Leopold VI.)", "Die Urkunde der Babenberger"], correct: 2 }
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
            
            // 1. Runden-Code absolut frisch aus dem Eingabefeld sichern
            updateRoomFromInput();
            
            // 2. Score in die Cloud schreiben
            await saveScoreToCloud(player.name, player.score, player.level, player.theme, player.room);
            
            // 3. Auf Quell-Markierung setzen und Podest direkt anzeigen
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
