// --- KONFIGURATION ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';

// Initialisierung mit Unterstrich, um Namenskonflikte zu vermeiden
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- NAVIGATION & UI ---
function showGamePage(pageId, sectionId = null) {
    // Alle Seiten verstecken
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Zielseite zeigen
    const targetPage = document.getElementById(pageId);
    targetPage.classList.add('active');

    // Falls eine Sektion im Dashboard (Spiele/Profil) gemeint ist
    if (sectionId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId + '-section').classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-target="${sectionId}"]`).classList.add('active');
    }
    updateBalance();
}

// Event Listener für die Navigation im Dashboard
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        showGamePage('dashboard-page', target);
    });
});

// --- AUTHENTIFIZIERUNG ---
async function login() {
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert("Login Fehler: " + error.message);
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        showGamePage('dashboard-page', 'games');
        document.getElementById('username').innerText = user.user_metadata.full_name || user.email;
        document.getElementById('profile-username').innerText = user.user_metadata.full_name || user.email;
        document.getElementById('profile-joined').innerText = new Date(user.created_at).toLocaleDateString();
        updateBalance();
    } else {
        document.getElementById('loading-overlay').classList.add('hidden');
    }
}

// --- DATENBANK INTERAKTION ---
async function updateBalance() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    let { data, error } = await _supabase.from('profiles').select('credits').eq('id', user.id).maybeSingle();

    // Profil erstellen, falls neu
    if (!data) {
        const { data: newData } = await _supabase.from('profiles')
            .insert([{ id: user.id, username: user.user_metadata.full_name, credits: 1000 }])
            .select().single();
        data = newData;
    }

    if (data) {
        const bal = data.credits;
        // Alle Guthaben-Anzeigen auf allen Seiten updaten
        document.querySelectorAll('[id$="balance"]').forEach(el => el.innerText = bal);
    }
    document.getElementById('loading-overlay').classList.add('hidden');
}

async function changeCredits(amount) {
    const { data: { user } } = await _supabase.auth.getUser();
    const currentBal = parseInt(document.getElementById('balance').innerText);
    
    const { data, error } = await _supabase.from('profiles')
        .update({ credits: currentBal + amount })
        .eq('id', user.id)
        .select().single();
    
    if (error) console.error("Update Fehler:", error);
    updateBalance();
}

// --- SPIELE LOGIK ---

// 1. SLOTS
async function playSlots() {
    if (parseInt(document.getElementById('balance').innerText) < 100) return alert("Zu wenig Credits!");
    
    const symbols = ['🍎', '🍒', '💎', '7️⃣', '🌟'];
    const display = document.getElementById('slots-display');
    display.innerHTML = "<span>🔄</span> | <span>🔄</span> | <span>🔄</span>";
    
    setTimeout(async () => {
        const s = [symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)]];
        display.innerHTML = `<span>${s[0]}</span> | <span>${s[1]}</span> | <span>${s[2]}</span>`;
        
        const win = (s[0] === s[1] && s[1] === s[2]) ? 1000 : -100;
        await changeCredits(win);
        if(win > 0) alert("JACKPOT! +1000 Credits");
    }, 800);
}

// 2. COINFLIP
async function playCoinflip(choice) {
    if (parseInt(document.getElementById('balance').innerText) < 100) return alert("Zu wenig Credits!");
    
    const coin = document.getElementById('coin-display');
    coin.classList.add('flip');
    
    setTimeout(async () => {
        const result = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
        coin.innerHTML = `<span>${result === 'Kopf' ? '🪙' : '👑'}</span>`;
        coin.classList.remove('flip');
        
        const win = (choice === result) ? 100 : -100;
        alert(`${result}! ${win > 0 ? 'Gewonnen!' : 'Verloren!'}`);
        await changeCredits(win);
    }, 1000);
}

// 3. CRASH
let crashInterval;
let currentMultiplier = 1.0;
function startCrash() {
    if (parseInt(document.getElementById('balance').innerText) < 100) return alert("Zu wenig Credits!");
    
    document.getElementById('crash-start-btn').style.display = 'none';
    document.getElementById('crash-cashout-btn').style.display = 'inline-block';
    const graph = document.getElementById('crash-graph');
    graph.className = 'counting';
    
    currentMultiplier = 1.0;
    const crashPoint = (Math.random() * 5 + 1.1).toFixed(2);
    
    crashInterval = setInterval(async () => {
        currentMultiplier = (parseFloat(currentMultiplier) + 0.1).toFixed(1);
        document.getElementById('crash-multiplier').innerText = currentMultiplier + "x";
        
        if (currentMultiplier >= crashPoint) {
            clearInterval(crashInterval);
            graph.className = 'crashed';
            alert("BOOM! Crash bei " + currentMultiplier + "x");
            await changeCredits(-100);
            resetCrashUI();
        }
    }, 200);
}

async function cashOutCrash() {
    clearInterval(crashInterval);
    const win = Math.floor(100 * currentMultiplier) - 100;
    alert(`Cashout bei ${currentMultiplier}x! Gewinn: ${win} Credits`);
    await changeCredits(win);
    resetCrashUI();
}

function resetCrashUI() {
    document.getElementById('crash-start-btn').style.display = 'inline-block';
    document.getElementById('crash-cashout-btn').style.display = 'none';
    setTimeout(() => {
        document.getElementById('crash-multiplier').innerText = "1.0x";
        document.getElementById('crash-graph').className = '';
    }, 2000);
}

// 4. ROULETTE
async function spinRoulette(betColor) {
    if (parseInt(document.getElementById('balance').innerText) < 100) return alert("Zu wenig Credits!");
    
    const wheel = document.getElementById('roulette-wheel');
    const randomDeg = Math.floor(Math.random() * 360) + 1440; // Mind. 4 Umdrehungen
    wheel.style.transform = `rotate(${randomDeg}deg)`;
    
    setTimeout(async () => {
        const winNum = Math.floor(Math.random() * 37);
        const winColor = winNum === 0 ? 'green' : (winNum % 2 === 0 ? 'red' : 'black');
        
        let win = -100;
        if (betColor === winColor) {
            win = (betColor === 'green') ? 1400 : 100;
        }
        
        alert(`Nummer ${winNum} (${winColor})! ${win > 0 ? 'Gewonnen!' : 'Verloren!'}`);
        await changeCredits(win);
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        setTimeout(() => wheel.style.transition = 'transform 3s cubic-bezier(0.1, 0, 0.1, 1)', 50);
    }, 3000);
}

// 5. HI-LO
let currentCardVal = 5;
async function playHiLo(type) {
    if (parseInt(document.getElementById('balance').innerText) < 100) return alert("Zu wenig Credits!");
    
    const nextCard = Math.floor(Math.random() * 10) + 1;
    const isHigher = nextCard > currentCardVal;
    const win = (type === 'higher' && isHigher) || (type === 'lower' && !isHigher && nextCard !== currentCardVal);
    
    document.getElementById('hilo-card-display').innerHTML = `<span>${nextCard}</span>`;
    
    const amount = win ? 100 : -100;
    alert(`Die Karte ist eine ${nextCard}! ${win ? 'Richtig!' : 'Falsch!'}`);
    await changeCredits(amount);
    currentCardVal = nextCard;
}

// INITIALISIERUNG
_supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') checkUser();
});

checkUser();
