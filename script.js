// --- DEINE DATEN ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';

// Wir nennen die Variable "_supabase", damit es keinen Konflikt gibt
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function login() {
    console.log("Login wird gestartet...");
    const { error } = await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: {
            // Leitet den User exakt auf die aktuelle Seite zurück
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) alert("Login Fehler: " + error.message);
}

async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('game-section').style.display = 'block';
        document.getElementById('username').innerText = user.user_metadata.full_name || user.email;
        updateBalance();
    }
}

async function updateBalance() {
    const { data, error } = await _supabase.from('profiles').select('credits').single();
    if (data) {
        document.getElementById('balance').innerText = data.credits;
    }
}

async function claim() {
    const { data, error } = await _supabase.rpc('claim_daily_credits');
    if (error) alert("Fehler: " + error.message);
    else if (data && data.error) alert(data.error);
    else {
        alert("🎁 1.000 Credits erhalten!");
        updateBalance();
    }
}

async function playSlots() {
    const symbols = ['🍎', '🍒', '💎', '7️⃣', '🌟'];
    let balance = parseInt(document.getElementById('balance').innerText);
    
    if (balance < 100) return alert("Zu wenig Credits!");

    document.getElementById('slots').innerText = "🔄 | 🔄 | 🔄";
    
    setTimeout(async () => {
        const s1 = symbols[Math.floor(Math.random() * symbols.length)];
        const s2 = symbols[Math.floor(Math.random() * symbols.length)];
        const s3 = symbols[Math.floor(Math.random() * symbols.length)];
        document.getElementById('slots').innerText = `${s1} | ${s2} | ${s3}`;

        let win = -100;
        if (s1 === s2 && s2 === s3) {
            win = 1000;
            alert("JACKPOT! +1000 Credits");
        }

        const { data: userData } = await _supabase.auth.getUser();
        const { data } = await _supabase.from('profiles')
            .update({ credits: balance + win })
            .eq('id', userData.user.id)
            .select().single();
            
        if (data) document.getElementById('balance').innerText = data.credits;
    }, 1000);
}

function requestPayout() {
    const wallet = document.getElementById('wallet').value;
    if (wallet.length < 10) return alert("Bitte gültige Wallet eingeben!");
    alert("Auszahlungsanfrage für EXYL-Coins wurde an den Admin gesendet!");
}

// Startet die Prüfung, ob man bereits eingeloggt ist
checkUser();
