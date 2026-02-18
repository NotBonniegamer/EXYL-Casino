// --- DEINE DATEN ---
const SUPABASE_URL = 'https://twsiwctwvdjqiutewhbb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_z-x_IaqJyuCs7AurQ-Rs4w_YxY7LfKU';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AUTH & CORE ---
async function login() {
    await _supabase.auth.signInWithOAuth({ 
        provider: 'discord',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
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
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    let { data, error } = await _supabase.from('profiles').select('credits').single();
    
    // Auto-Profile Create
    if (error && error.code === 'PGRST116') {
        const { data: newData } = await _supabase.from('profiles')
            .insert([{ id: user.id, username: user.user_metadata.full_name, credits: 1000 }]).select().single();
        data = newData;
    }
    if (data) document.getElementById('balance').innerText = data.credits;
}

// Hilfsfunktion zum Credits abziehen/hinzufügen
async function changeCredits(amount) {
    const current = parseInt(document.getElementById('balance').innerText);
    const { data: { user } } = await _supabase.auth.getUser();
    const { data } = await _supabase.from('profiles')
        .update({ credits: current + amount })
        .eq('id', user.id).select().single();
    if (data) document.getElementById('balance').innerText = data.credits;
    return data;
}

// --- GAMES ---

// 1. SLOTS
async function playSlots() {
    const bet = 100;
    if (parseInt(document.getElementById('balance').innerText) < bet) return alert("Zu wenig Credits!");
    
    const symbols = ['🍎', '🍒', '💎', '7️⃣', '🌟'];
    document.getElementById('slots-res').innerText = "🔄 | 🔄 | 🔄";
    
    setTimeout(async () => {
        const s = [symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)], symbols[Math.floor(Math.random()*5)]];
        document.getElementById('slots-res').innerText = s.join(" | ");
        let win = (s[0] === s[1] && s[1] === s[2]) ? 1000 : -bet;
        await changeCredits(win);
        if(win > 0) alert("JACKPOT!");
    }, 800);
}

// 2. COINFLIP
async function playCoinflip(choice) {
    const bet = 100;
    if (parseInt(document.getElementById('balance').innerText) < bet) return alert("Zu wenig Credits!");
    
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const win = (choice === result) ? bet : -bet;
    
    alert(`Es ist ${result}! ${win > 0 ? 'Gewonnen!' : 'Verloren!'}`);
    await changeCredits(win);
}

// 3. CRASH (Vereinfacht)
let crashInterval;
function playCrash() {
    const bet = 100;
    if (parseInt(document.getElementById('balance').innerText) < bet) return alert("Zu wenig Credits!");
    
    let multiplier = 1.0;
    const crashAt = (Math.random() * 5 + 1).toFixed(2);
    document.getElementById('crash-btn').disabled = true;
    
    crashInterval = setInterval(async () => {
        multiplier = (parseFloat(multiplier) + 0.1).toFixed(1);
        document.getElementById('crash-display').innerText = multiplier + "x";
        
        if (multiplier >= crashAt) {
            clearInterval(crashInterval);
            document.getElementById('crash-display').innerText = "BOOM! " + multiplier + "x";
            await changeCredits(-bet);
            document.getElementById('crash-btn').disabled = false;
        }
    }, 200);
}

// 4. ROULETTE (Farbe)
async function playRoulette(color) {
    const bet = 100;
    if (parseInt(document.getElementById('balance').innerText) < bet) return alert("Zu wenig Credits!");
    
    const num = Math.floor(Math.random() * 37);
    const winColor = num === 0 ? 'green' : (num % 2 === 0 ? 'red' : 'black');
    
    const win = (color === winColor) ? (color === 'green' ? bet * 14 : bet) : -bet;
    alert(`Nummer ${num} (${winColor}). ${win > 0 ? 'Gewonnen!' : 'Verloren!'}`);
    await changeCredits(win);
}

// 5. HIGHER/LOWER
let currentCard = 5;
async function playHiLo(type) {
    const bet = 100;
    if (parseInt(document.getElementById('balance').innerText) < bet) return alert("Zu wenig Credits!");
    
    const nextCard = Math.floor(Math.random() * 10) + 1;
    let win = -bet;
    
    if (type === 'hi' && nextCard > currentCard) win = bet;
    if (type === 'lo' && nextCard < currentCard) win = bet;
    
    alert(`Karte war ${nextCard}. ${win > 0 ? 'Richtig!' : 'Falsch!'}`);
    currentCard = nextCard;
    document.getElementById('hilo-card').innerText = currentCard;
    await changeCredits(win);
}

_supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN') checkUser(); });
checkUser();
