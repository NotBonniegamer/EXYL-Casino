// --- INITIALISIERUNG ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- NAVIGATION & UI LOGIK ---
function showGamePage(pageId, sectionId = null) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    if (sectionId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const sect = document.getElementById(sectionId + '-section');
        if (sect) sect.classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`[data-target="${sectionId}"]`);
        if (btn) btn.classList.add('active');
    }
    updateBalance();
}

// Event Listener für Dashboard Tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        showGamePage('dashboard-page', target);
    });
});

// --- CUSTOM OVERLAY (Ersatz für Alerts) ---
function showMsg(title, message) {
    const overlay = document.getElementById('overlay-system') || document.getElementById('custom-alert');
    const titleEl = document.getElementById('overlay-title') || document.getElementById('alert-title');
    const msgEl = document.getElementById('overlay-text') || document.getElementById('alert-msg');
    
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    
    overlay.style.display = 'flex'; 
    overlay.classList.remove('overlay-hidden');
    overlay.classList.add('overlay-visible');
}

function closeOverlay() {
    const overlay = document.getElementById('overlay-system') || document.getElementById('custom-alert');
    overlay.classList.add('overlay-hidden');
    overlay.classList.remove('overlay-visible');
    overlay.style.display = 'none';
}
// Alias für Abwärtskompatibilität
window.showAlert = showMsg;
window.closeAlert = closeOverlay;

// --- THEME SWITCH ---
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('casino-theme', newTheme);
}

// --- CORE AUTH ---
window.login = async function() {
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if(error) showMsg("Error", error.message);
};

window.logout = async function() {
    await _supabase.auth.signOut();
    location.reload();
};

async function updateBalance() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    let { data, error } = await _supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    if (!data && !error) {
        const { data: newData } = await _supabase.from('profiles')
            .insert([{ id: user.id, username: user.user_metadata.full_name, credits: 1000 }])
            .select().single();
        data = newData;
    }

    if (data) {
        const balElements = ['balance', 'slots-balance', 'coinflip-balance', 'crash-balance', 'roulette-balance', 'hilo-balance', 'daily-balance', 'profile-balance'];
        balElements.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerText = data.credits;
        });
        if(document.getElementById('username')) document.getElementById('username').innerText = data.username;
        if(document.getElementById('profile-user')) document.getElementById('profile-user').innerText = data.username;
    }
}

async function changeCredits(amount) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;
    const current = parseInt(document.getElementById('balance').innerText);
    const { error } = await _supabase.from('profiles').update({ credits: current + amount }).eq('id', user.id);
    if (!error) await updateBalance();
}

// --- SPIEL-LOGIKEN (MIT OVERLAYS) ---

// 1. SLOTS
async function playSlots() {
    const bal = parseInt(document.getElementById('balance').innerText);
    if (bal < 100) return showMsg("Ouch!", "Zu wenig Credits!");

    const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
    document.getElementById('slots-display').innerText = "🔄 | 🔄 | 🔄";
    
    setTimeout(async () => {
        const s1 = symbols[Math.floor(Math.random() * symbols.length)];
        const s2 = symbols[Math.floor(Math.random() * symbols.length)];
        const s3 = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('slots-display').innerText = `${s1} | ${s2} | ${s3}`;

        if (s1 === s2 && s2 === s3) {
            showMsg("JACKPOT!", "Drei gleiche! +1000 Credits gewonnen!");
            await changeCredits(1000);
        } else {
            await changeCredits(-100);
        }
    }, 1000);
}

// 2. CRASH
let crashInterval;
let currentMultiplier = 1.0;
let isRacing = false;

async function startCrash() {
    if (isRacing) return;
    const bal = parseInt(document.getElementById('balance').innerText);
    if (bal < 100) return showMsg("Fehler", "Mindesteinsatz 100 Credits!");

    isRacing = true;
    currentMultiplier = 1.0;
    const crashPoint = (Math.random() * 5 + 1.1).toFixed(2);
    
    document.getElementById('crash-start-btn').style.display = 'none';
    document.getElementById('crash-cashout-btn').style.display = 'inline-block';
    
    crashInterval = setInterval(async () => {
        currentMultiplier = (parseFloat(currentMultiplier) + 0.05).toFixed(2);
        document.getElementById('crash-multiplier').innerText = currentMultiplier + "x";

        if (currentMultiplier >= crashPoint) {
            clearInterval(crashInterval);
            showMsg("CRASHED!", `Der Multiplikator ist bei ${currentMultiplier}x gecrasht! -100 Credits.`);
            await changeCredits(-100);
            resetCrash();
        }
    }, 100);
}

async function cashOutCrash() {
    if (!isRacing) return;
    clearInterval(crashInterval);
    const win = Math.floor(100 * currentMultiplier) - 100;
    showMsg("Sieg!", `Du bist bei ${currentMultiplier}x ausgestiegen und hast ${win} Credits gewonnen!`);
    await changeCredits(win);
    resetCrash();
}

function resetCrash() {
    isRacing = false;
    document.getElementById('crash-start-btn').style.display = 'inline-block';
    document.getElementById('crash-cashout-btn').style.display = 'none';
}

// 3. DAILY BONUS
async function claimDailyBonus() {
    const { data: { user } } = await _supabase.auth.getUser();
    const { data } = await _supabase.from('profiles').select('last_claim').eq('id', user.id).single();
    
    const now = new Date();
    const lastClaim = data.last_claim ? new Date(data.last_claim) : new Date(0);
    const diff = now - lastClaim;

    if (diff > 24 * 60 * 60 * 1000) {
        await _supabase.from('profiles').update({ last_claim: now.toISOString() }).eq('id', user.id);
        await changeCredits(1000);
        showMsg("Bonus", "1.000 Credits wurden deinem Konto gutgeschrieben!");
    } else {
        const remaining = new Date(24 * 60 * 60 * 1000 - diff);
        showMsg("Geduld!", `Du kannst deinen nächsten Bonus in ${remaining.getUTCHours()}h ${remaining.getUTCMinutes()}m abholen.`);
    }
}

// --- INITIALISIERUNG BEIM LADEN ---
(async () => {
    // Theme laden
    const savedTheme = localStorage.getItem('casino-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Login Check
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        showGamePage('dashboard-page', 'games');
        updateBalance();
    }
    
    // Loader verstecken
    setTimeout(() => {
        if(document.getElementById('loading-overlay')) 
            document.getElementById('loading-overlay').classList.add('hidden');
    }, 1000);
})();

_supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
        showGamePage('dashboard-page', 'games');
        updateBalance();
    }
});
