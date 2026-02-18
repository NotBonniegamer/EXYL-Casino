// --- DEINE DATEN ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';

// Wir nennen die Variable "_supabase" (mit Unterstrich), 
// damit sie sich nicht mit der Library beißt
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// AB HIER ÜBERALL "_supabase" statt "supabase" nutzen!

async function login() {
    console.log("Login wird gestartet...");
    await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('game-section').style.display = 'block';
        document.getElementById('username').innerText = user.user_metadata.full_name;
        updateBalance();
    }
}

// ... und so weiter (überall das _ vor supabase machen)
