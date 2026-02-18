// --- INITIALISIERUNG (NUR EINMAL!) ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- OVERLAY LOGIK ---
function showAlert(title, msg) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-msg').innerText = msg;
    document.getElementById('custom-alert').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('custom-alert').style.display = 'none';
}

// --- THEME SWITCH ---
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('casino-theme', target);
}

// --- NAVIGATION ---
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// --- CORE FUNCTIONS (FIX FÜR LOGIN ERROR) ---
window.login = async function() {
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: { redirectTo: window.location.origin }
    });
    if(error) showAlert("Error", error.message);
};

window.logout = async function() {
    await _supabase.auth.signOut();
    location.reload();
};

async function updateBalance() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    let { data, error } = await _supabase.from('profiles').select('credits').eq('id', user.id).maybeSingle();

    if (!data && !error) {
        // Neues Profil
        const { data: newData } = await _supabase.from('profiles')
            .insert([{ id: user.id, username: user.user_metadata.full_name, credits: 1000 }])
            .select().single();
        data = newData;
    }

    if (data) {
        document.querySelectorAll('#balance').forEach(el => el.innerText = data.credits);
    }
}

// --- BEISPIEL: CRASH GAME MIT OVERLAY ---
window.startCrash = async function() {
    const bal = parseInt(document.getElementById('balance').innerText);
    if(bal < 100) return showAlert("Upps!", "Du brauchst mindestens 100 Credits!");
    
    // ... dein Crash Code ...
    // Ersetze alle alert() durch showAlert("Titel", "Nachricht")
};

// Initialisierung
if(localStorage.getItem('casino-theme')) {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('casino-theme'));
}

_supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
        showPage('dashboard-page');
        updateBalance();
    }
});

// Check beim Start
(async () => {
    const { data: { user } } = await _supabase.auth.getUser();
    if(user) {
        showPage('dashboard-page');
        updateBalance();
    }
})();
