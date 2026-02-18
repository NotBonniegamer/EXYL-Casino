// ==========================================
// 1. SUPABASE KONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ==========================================
// 2. UI & SYSTEM CONTROLLER
// ==========================================

// Custom Modal (Ersatz für alert)
function showModal(title, text) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden');
    modal.classList.add('flex-center');
}

window.closeModal = function() {
    const modal = document.getElementById('modal-overlay');
    modal.classList.add('hidden');
    modal.classList.remove('flex-center');
}

// Navigation zwischen den Views
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    syncBalancesToUI(); // Balance beim Tab-Wechsel updaten
}

// Theme Switcher
window.toggleTheme = function() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    localStorage.setItem('exyl-theme', theme);
}

// ==========================================
// 3. AUTH & DATENBANK
// ==========================================

window.appLogin = async function() {
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if(error) showModal("Login Fehler", error.message);
}

window.appLogout = async function() {
    await _supabase.auth.signOut();
    location.reload();
}

// Überprüft, ob der User existiert und aktualisiert die UI
async function initSession() {
    const { data: { user } } = await _supabase.auth.getUser();
    const loader = document.getElementById('app-loader');

    if (user) {
        currentUser = user;
        document.getElementById('view-login').classList.remove('active');
        document.getElementById('secure-area').classList.remove('hidden');
        document.getElementById('display-username').innerText = user.user_metadata.full_name || 'Spieler';
        
        await syncBalancesToUI();
        switchView('view-dashboard');
    }

    if(loader) loader.classList.add('hidden'); // Loader ausschalten
}

// Holt Guthaben aus Supabase und erstellt Profil falls nötig
async function syncBalancesToUI() {
    if (!currentUser) return;

    let { data, error } = await _supabase.from('profiles').select('credits').eq('id', currentUser.id).maybeSingle();

    if (!data) {
        const { data: newData } = await _supabase.from('profiles')
            .insert([{ id: currentUser.id, username: currentUser.user_metadata.full_name, credits: 1000 }])
            .select().single();
        data = newData;
    }

    if (data) {
        document.querySelectorAll('.balance-amount').forEach(el => {
            el.innerText = data.credits;
        });
    }
}

// Zentrale Funktion zum Geld abziehen/hinzufügen
async function modifyBalance(amount) {
    if (!currentUser) return false;
    
    // Aktuelles Guthaben von der UI lesen
    const currentBal = parseInt(document.querySelector('.balance-amount').innerText);
    const newBal = currentBal + amount;

    if (newBal < 0) return false; // Sicherheitsscheck

    const { error } = await _supabase.from('profiles').update({ credits: newBal }).eq('id', currentUser.id);
    if (!error) {
        await syncBalancesToUI();
        return true;
    }
    return false;
}

// Hilfsfunktion: Überprüft ob genug Einsatz da ist
function getBetAmount(inputId) {
    const bet = parseInt(document.getElementById(inputId).value);
    const currentBal = parseInt(document.querySelector('.balance-amount').innerText);
    if (isNaN(bet) || bet <= 0) {
        showModal("Fehler", "Ungültiger Einsatz!");
        return -1;
    }
    if (bet > currentBal) {
        showModal("Zu wenig Credits", "Dein Guthaben reicht dafür nicht aus.");
        return -1;
    }
    return bet;
}

// ==========================================
// 4. SPIELE LOGIK
// ==========================================

// --- SLOTS ---
window.playSlots = async function() {
    const bet = getBetAmount('bet-slots');
    if (bet === -1) return;

    const display = document.getElementById('slots-machine-display');
    display.innerHTML = "<span>🌀</span> | <span>🌀</span> | <span>🌀</span>";

    setTimeout(async () => {
        const symbols = ['🍒', '💎', '7️⃣', '🍋'];
        const r = [
            symbols[Math.floor(Math.random() * 4)],
            symbols[Math.floor(Math.random() * 4)],
            symbols[Math.floor(Math.random() * 4)]
        ];
        
        display.innerHTML = `<span>${r[0]}</span> | <span>${r[1]}</span> | <span>${r[2]}</span>`;

        if (r[0] === r[1] && r[1] === r[2]) {
            const win = bet * 10;
            await modifyBalance(win);
            showModal("JACKPOT!", `Drei gleiche! Du gewinnst ${win} Credits!`);
        } else {
            await modifyBalance(-bet);
        }
    }, 800);
}

// --- COINFLIP ---
window.playCoinflip = async function(choice) {
    const bet = getBetAmount('bet-coinflip');
    if (bet === -1) return;

    const coin = document.getElementById('coin-visual');
    coin.innerHTML = "<span>🔄</span>";
    coin.style.animation = "spin 0.5s linear infinite";

    setTimeout(async () => {
        coin.style.animation = "none";
        const result = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
        coin.innerHTML = `<span>${result === 'Kopf' ? 'KOPF' : 'ZAHL'}</span>`;

        if (choice === result) {
            await modifyBalance(bet);
            showModal("Gewonnen!", `Die Münze zeigt ${result}. Du gewinnst ${bet} Credits.`);
        } else {
            await modifyBalance(-bet);
            showModal("Verloren!", `Die Münze zeigt ${result}. Du verlierst ${bet} Credits.`);
        }
    }, 1000);
}

// --- CRASH ---
let crashRunning = false;
let crashMult = 1.0;
let crashTimer;
let currentCrashBet = 0;

window.startCrash = async function() {
    if (crashRunning) return;
    currentCrashBet = getBetAmount('bet-crash');
    if (currentCrashBet === -1) return;

    crashRunning = true;
    crashMult = 1.0;
    document.getElementById('btn-start-crash').classList.add('hidden');
    document.getElementById('btn-cashout-crash').classList.remove('hidden');
    document.getElementById('crash-graph').style.borderColor = 'var(--accent)';

    const crashPoint = (Math.random() * 4 + 1.1).toFixed(2);

    crashTimer = setInterval(async () => {
        crashMult = (parseFloat(crashMult) + 0.05).toFixed(2);
        document.getElementById('crash-multiplier').innerText = crashMult + "x";

        if (crashMult >= crashPoint) {
            clearInterval(crashTimer);
            document.getElementById('crash-graph').style.borderColor = 'red';
            showModal("BOOM!", `Gecrasht bei ${crashMult}x. Einsatz verloren.`);
            await modifyBalance(-currentCrashBet);
            resetCrashUI();
        }
    }, 150);
}

window.cashoutCrash = async function() {
    if (!crashRunning) return;
    clearInterval(crashTimer);
    
    const win = Math.floor(currentCrashBet * crashMult) - currentCrashBet;
    showModal("Erfolgreich!", `Ausgestiegen bei ${crashMult}x. Gewinn: ${win} Credits.`);
    await modifyBalance(win);
    resetCrashUI();
}

function resetCrashUI() {
    crashRunning = false;
    document.getElementById('btn-start-crash').classList.remove('hidden');
    document.getElementById('btn-cashout-crash').classList.add('hidden');
}

// --- ROULETTE ---
window.playRoulette = async function(color) {
    const bet = getBetAmount('bet-roulette');
    if (bet === -1) return;

    const wheel = document.getElementById('roulette-visual');
    wheel.style.transform = `rotate(${Math.floor(Math.random() * 360) + 1080}deg)`;

    setTimeout(async () => {
        const num = Math.floor(Math.random() * 37);
        const resColor = num === 0 ? 'green' : (num % 2 === 0 ? 'red' : 'black');

        if (color === resColor) {
            const win = color === 'green' ? bet * 14 : bet;
            await modifyBalance(win);
            showModal("Gewonnen!", `Die Kugel landete auf ${resColor} (${num}). +${win} Credits.`);
        } else {
            await modifyBalance(-bet);
            showModal("Verloren!", `Die Kugel landete auf ${resColor} (${num}).`);
        }
    }, 2000);
}

// --- HI-LO ---
let hiloCard = 5;
window.playHiLo = async function(guess) {
    const bet = getBetAmount('bet-hilo');
    if (bet === -1) return;

    const nextCard = Math.floor(Math.random() * 10) + 1;
    document.getElementById('hilo-card-visual').innerText = nextCard;

    const isHigher = nextCard > hiloCard;
    const isLower = nextCard < hiloCard;
    const tie = nextCard === hiloCard;

    if (tie || (guess === 'hi' && isHigher) || (guess === 'lo' && isLower)) {
        await modifyBalance(bet);
        showModal("Richtig!", `Die nächste Karte war ${nextCard}. Du gewinnst ${bet} Credits.`);
    } else {
        await modifyBalance(-bet);
        showModal("Falsch!", `Die nächste Karte war ${nextCard}. Du verlierst.`);
    }
    hiloCard = nextCard;
}

// --- DAILY BONUS ---
window.claimDaily = async function() {
    if (!currentUser) return;
    const { data } = await _supabase.from('profiles').select('last_claim').eq('id', currentUser.id).single();
    
    const now = new Date();
    const lastClaim = data.last_claim ? new Date(data.last_claim) : new Date(0);
    const diffHours = (now - lastClaim) / (1000 * 60 * 60);

    if (diffHours >= 24) {
        await _supabase.from('profiles').update({ last_claim: now.toISOString() }).eq('id', currentUser.id);
        await modifyBalance(1000);
        showModal("Daily Bonus", "1.000 Credits wurden gutgeschrieben!");
    } else {
        const left = Math.ceil(24 - diffHours);
        showModal("Geduld", `Du kannst deinen nächsten Bonus in ca. ${left} Stunden abholen.`);
    }
}

// ==========================================
// 5. STARTUP LOGIK
// ==========================================

// Lade Theme aus Speicher
if(localStorage.getItem('exyl-theme')) {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('exyl-theme'));
}

// Supabase Listener
_supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') initSession();
});

// Init App
initSession();
