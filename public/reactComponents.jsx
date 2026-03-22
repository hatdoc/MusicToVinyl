const { useState, useEffect } = React;

// --- Supabase Mock Config ---
// To be populated by CI/CD during build
const SUPABASE_URL = "https://hwtbojjsuisbxzjtmswo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NjBgOV9I2YpplsLP1eKlXw_30yMzzLZ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Gate Component ---
function AuthGate() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleAuthRequest = () => setIsVisible(true);
        window.addEventListener('requestAuth', handleAuthRequest);
        return () => window.removeEventListener('requestAuth', handleAuthRequest);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        if (isLoginMode) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert("Login Error: " + error.message);
                setLoading(false);
                return;
            }
            alert("Welcome back to PRO!");
            finalizeLogin();
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                alert("Sign Up Error: " + error.message);
                setLoading(false);
                return;
            }
            alert("Account created! Verify your email to complete setup (or enjoy immediate demo access).");
            finalizeLogin();
        }
    };

    const finalizeLogin = () => {
        window.appState.isLoggedIn = true;
        setIsVisible(false);
        setLoading(false);
        window.dispatchEvent(new Event('authSuccess'));
    };

    if (!isVisible) return null;

    return (
        <div className="modal">
            <div className="modal-content wooden-frame" style={{position: 'relative', width: '350px'}}>
                <button 
                    onClick={() => setIsVisible(false)} 
                    style={{position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', outline: 'none'}}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 style={{color: '#C5A059', marginBottom: '5px', marginTop: '10px'}}>
                    {isLoginMode ? 'Welcome Back' : 'Unlock PRO'}
                </h2>
                <p style={{color: '#d4c5b0', lineHeight: '1.5', fontSize: '0.9rem', marginBottom: '20px'}}>
                    {isLoginMode ? 'Enter your credentials to access your Crate.' : 'Create an account to build your Crate and enable Tube Amp emulation.'}
                </p>
                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email (e.g. audiophile@example.com)" 
                        required 
                        style={{padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid #C5A059', color: '#fff', borderRadius: '4px'}}
                    />
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password" 
                        required 
                        minLength={!isLoginMode ? 6 : undefined}
                        style={{padding: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid #C5A059', color: '#fff', borderRadius: '4px'}}
                    />
                    <button type="submit" disabled={loading} style={{padding: '12px', background: 'linear-gradient(145deg, #C5A059, #8c6e33)', color: '#000', cursor: loading ? 'wait' : 'pointer', border: '1px solid #000', fontWeight: 'bold', borderRadius: '4px'}}>
                        {loading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Account')}
                    </button>
                </form>
                
                <div style={{marginTop: '20px', fontSize: '0.85rem', color: '#888'}}>
                    {isLoginMode ? "Don't have an account? " : "Already a member? "}
                    <button 
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        style={{background: 'none', border: 'none', color: '#C5A059', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem', padding: '0'}}
                    >
                        {isLoginMode ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- LP Storage Component (History) ---
function VirtualCrate() {
    const [items, setItems] = useState([]); // Start empty
    const [isPro, setIsPro] = useState(window.appState ? window.appState.isLoggedIn : false);

    // Fetch history from Supabase if logged in
    useEffect(() => {
        const fetchHistory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('crate_items')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('added_at', { ascending: false })
                    .limit(10);
                
                if (!error && data) {
                    const unique = [];
                    const filtered = [];
                    data.forEach(d => {
                        if (!unique.includes(d.youtube_id)) {
                            unique.push(d.youtube_id);
                            filtered.push({ id: d.id, title: d.video_title, youtube_id: d.youtube_id });
                        }
                    });
                    setItems(filtered.slice(0, 10)); // Ensure max 10 even after strict duplicate reduction
                }
            }
        };
        if (isPro) fetchHistory();
    }, [isPro]);

    useEffect(() => {
        const handleAuth = () => setIsPro(true);
        window.addEventListener('authSuccess', handleAuth);
        
        // Listen for new tracks loaded in the player to add to history automatically
        const handleTrackLoaded = async (e) => {
            if (!isPro) return; // "If they are using free feature, it should not save anything"
            
            const newTrack = { id: Date.now(), title: e.detail.title, youtube_id: e.detail.id };
            setItems(prev => {
                const updated = [newTrack, ...prev.filter(t => t.youtube_id !== newTrack.youtube_id)];
                return updated.slice(0, 10); // Keep only 10
            });
            
            // Save exactly 10 URLs remotely for PRO members
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('crate_items').insert([{
                    user_id: user.id,
                    youtube_id: newTrack.youtube_id,
                    video_title: newTrack.title
                }]);
            }
        };
        
        const handleCrateAdd = async (e) => {
            if (!isPro) {
                window.dispatchEvent(new Event('requestAuth'));
                return;
            }
            
            // Intent Logging (Affiliate click)
            try {
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('intent_logs').insert([{ 
                    user_id: user ? user.id : null,
                    youtube_id: e.detail.id,
                    genre: 'Vinyl Conversion',
                    geo_location: navigator.language || 'Unknown', 
                    vinyl_compatibility_score: Math.floor(Math.random() * 20) + 80,
                    clicked_affiliate: true
                }]);
                console.log("Vinyl intent successfully written to Supabase.");
            } catch (err) {
                console.error("Supabase API error: ", err);
            }
            alert("Added to Crate & Logged Intent! \n[AdSense Zone: Post-Conversion Record Store Receipt Ad]\n\nCheck your Supabase Table Editor!");
        };
        
        window.addEventListener('trackLoaded', handleTrackLoaded);
        window.addEventListener('addToCrate', handleCrateAdd);
        
        return () => {
             window.removeEventListener('authSuccess', handleAuth);
             window.removeEventListener('addToCrate', handleCrateAdd);
             window.removeEventListener('trackLoaded', handleTrackLoaded);
        };
    }, [isPro]);

    const playHistoryTrack = (track) => {
        window.dispatchEvent(new CustomEvent('playHistoryTrack', { detail: track }));
    };

    return (
        <div style={{padding: '20px', color: '#e0e0e0', height: '100%', borderLeft: '1px solid #333', background: '#0a0a0a', display: 'flex', flexDirection: 'column'}}>
            <h3 style={{color: '#C5A059', borderBottom: '1px solid #333', paddingBottom: '10px', fontFamily: 'var(--font-heading)'}}>LP Storage</h3>
            <p style={{fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px'}}>Listening History</p>
            
            {/* Sidebar AdSense placeholder */}
            <div style={{margin: '15px 0', padding: '30px', background: '#111', textAlign: 'center', border: '1px dashed #444', fontSize: '0.8rem', color: '#666'}}>
                AdSense Zone (Square)
            </div>
            
            <div style={{flex: 1, overflowY: 'auto'}}>
                {items.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => playHistoryTrack(item)}
                        style={{padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s'}}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Click to play this LP"
                    >
                        <img 
                            src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`} 
                            alt="Cover" 
                            style={{width: '90px', height: '65px', minWidth: '90px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333'}}
                        />
                        <div style={{flex: 1, overflow: 'hidden'}}>
                            <div style={{fontSize: '0.9rem', lineHeight: '1.4', color: '#e0e0e0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{item.title}</div>
                        </div>
                    </div>
                ))}
            </div>
            {!isPro && (
                <button onClick={() => window.dispatchEvent(new Event('requestAuth'))} style={{marginTop: '10px', padding: '12px', background: 'transparent', border: '1px solid #C5A059', color: '#C5A059', cursor: 'pointer', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '2px'}}>
                    Sign Up for PRO Analytics
                </button>
            )}
        </div>
    );
}

const authRoot = ReactDOM.createRoot(document.getElementById('react-auth-root'));
authRoot.render(<AuthGate />);

const crateRoot = ReactDOM.createRoot(document.getElementById('react-crate-root'));
crateRoot.render(<VirtualCrate />);

// --- Auto-Login / Session Restoration ---
window.addEventListener('DOMContentLoaded', async () => {
    window.appState = window.appState || { isLoggedIn: false };
    
    // Supabase automatically stores the auth token in localStorage.
    // We check if a valid session exists without requiring them to re-enter credentials.
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        window.appState.isLoggedIn = true;
        
        // Dispatch the global success event with a tiny delay to ensure all listeners 
        // (including Vanilla JS audio engine) are fully mounted and ready to react.
        setTimeout(() => {
            window.dispatchEvent(new Event('authSuccess'));
        }, 150);
    }
});
