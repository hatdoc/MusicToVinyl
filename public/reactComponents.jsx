const { useState, useEffect } = React;

// --- Supabase Mock Config ---
// To be populated by CI/CD during build
const SUPABASE_URL = "https://hwtbojjsuisbxzjtmswo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NjBgOV9I2YpplsLP1eKlXw_30yMzzLZ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Gate Component ---
function AuthGate() {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        const handleAuthRequest = () => setIsVisible(true);
        window.addEventListener('requestAuth', handleAuthRequest);
        return () => window.removeEventListener('requestAuth', handleAuthRequest);
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (email) {
            // supabase.auth.signInWithOtp({ email })
            window.appState.isLoggedIn = true;
            setIsVisible(false);
            window.dispatchEvent(new Event('authSuccess'));
        }
    };

    if (!isVisible) return null;

    return (
        <div className="modal">
            <div className="modal-content wooden-frame" style={{position: 'relative'}}>
                <button 
                    onClick={() => setIsVisible(false)} 
                    style={{position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', outline: 'none'}}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 style={{color: '#C5A059'}}>Unlock PRO Fidelity</h2>
                <p style={{color: '#d4c5b0', lineHeight: '1.5'}}>Login to add tracks to your Crate and enable 1950s Tube Amp emulation.</p>
                <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="audiophile@example.com" 
                        required 
                        style={{padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #C5A059', color: '#fff'}}
                    />
                    <button type="submit" style={{padding: '12px', background: 'linear-gradient(145deg, #C5A059, #8c6e33)', color: '#000', cursor: 'pointer', border: '1px solid #000', fontWeight: 'bold'}}>
                        Authenticate via Magic Link
                    </button>
                </form>
                <p style={{fontSize: '0.7rem', color: '#888', marginTop: '10px'}}>Acquisition Data: Your vinyl intent helps labels know what to press next.</p>
            </div>
        </div>
    );
}

// --- Virtual Crate Component ---
function VirtualCrate() {
    const [items, setItems] = useState([
        { id: 1, title: 'Miles Davis - So What', youtube_id: 'zqNTltOGh5c' },
        { id: 2, title: 'Lofi Hip Hop Radio', youtube_id: 'jfKfPfyJRdk' }
    ]);

    const [isPro, setIsPro] = useState(window.appState ? window.appState.isLoggedIn : false);

    useEffect(() => {
        const handleAuth = () => setIsPro(true);
        window.addEventListener('authSuccess', handleAuth);
        
        const handleCrateAdd = (e) => {
            if (!isPro) {
                window.dispatchEvent(new Event('requestAuth'));
                return;
            }
            setItems(prev => [{ id: Date.now(), title: e.detail.title, youtube_id: e.detail.id }, ...prev]);
            
            // Render post-conversion Ad popup
            alert("Added to Crate! \n[AdSense Zone: Post-Conversion Record Store Receipt Ad]");
        };
        
        window.addEventListener('addToCrate', handleCrateAdd);
        return () => {
             window.removeEventListener('authSuccess', handleAuth);
             window.removeEventListener('addToCrate', handleCrateAdd);
        };
    }, [isPro]);

    return (
        <div style={{padding: '20px', color: '#e0e0e0', height: '100%', borderLeft: '1px solid #333', background: '#0a0a0a', display: 'flex', flexDirection: 'column'}}>
            <h3 style={{color: '#C5A059', borderBottom: '1px solid #333', paddingBottom: '10px', fontFamily: 'var(--font-heading)'}}>Virtual Crate</h3>
            <p style={{fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px'}}>High Intent Tracker</p>
            
            {/* Sidebar AdSense placeholder */}
            <div style={{margin: '15px 0', padding: '30px', background: '#111', textAlign: 'center', border: '1px dashed #444', fontSize: '0.8rem', color: '#666'}}>
                AdSense Zone (Square)
            </div>
            
            <div style={{flex: 1, overflowY: 'auto'}}>
                {items.map(item => (
                    <div key={item.id} style={{padding: '12px 0', borderBottom: '1px solid #1a1a1a'}}>
                        <div style={{fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.title}</div>
                        <div style={{fontSize: '0.7rem', color: '#666', marginTop: '4px'}}>ID: {item.youtube_id}</div>
                    </div>
                ))}
            </div>
            {!isPro && (
                <button onClick={() => window.dispatchEvent(new Event('requestAuth'))} style={{marginTop: '10px', padding: '12px', background: 'transparent', border: '1px solid #C5A059', color: '#C5A059', cursor: 'pointer', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '2px'}}>
                    Login to Build Crate
                </button>
            )}
        </div>
    );
}

const authRoot = ReactDOM.createRoot(document.getElementById('react-auth-root'));
authRoot.render(<AuthGate />);

const crateRoot = ReactDOM.createRoot(document.getElementById('react-crate-root'));
crateRoot.render(<VirtualCrate />);
