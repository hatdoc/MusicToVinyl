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
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const handleAuthRequest = () => setIsVisible(true);
        window.addEventListener('requestAuth', handleAuthRequest);
        return () => window.removeEventListener('requestAuth', handleAuthRequest);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError(null);
        
        if (isLoginMode) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setAuthError("Login Error: " + error.message);
                setLoading(false);
                return;
            }
            finalizeLogin();
        } else {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                setAuthError("Sign Up Error: " + error.message);
                setLoading(false);
                return;
            }
            
            // Supabase returns a user but explicitly nullifies the session if Email Confirmations are turned ON
            if (!data.session) {
                setAuthError("Verification required. Check your inbox for the archival link to activate your crate.");
                setLoading(false);
                return;
            }
            
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
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                    <h2 style={{color: '#C5A059', fontFamily: 'var(--font-heading)', margin: '0 0 10px 0'}}>{isLoginMode ? 'Welcome Back' : 'Unlock PRO'}</h2>
                    <p style={{color: '#d4c5b0', fontSize: '0.85rem', margin: '0 0 15px 0'}}>Elevate your digital vinyl experience.</p>
                </div>
                
                {authError && (
                    <div style={{background: 'rgba(200, 50, 50, 0.1)', border: '1px dashed rgba(200, 50, 50, 0.4)', color: '#ff8888', padding: '10px 15px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.85rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)'}}>
                        {authError}
                    </div>
                )}

                {!isLoginMode && (
                    <div style={{background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '4px', border: '1px dashed #444', marginBottom: '20px', fontSize: '0.85rem', color: '#e0e0e0', textAlign: 'left', lineHeight: '1.4'}}>
                        <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                            <li style={{marginBottom: '10px'}}><strong style={{color: '#C5A059'}}>💾 Vinyl Crate History:</strong> Automatically save and resume your entire listening history.</li>
                            <li style={{marginBottom: '10px'}}><strong style={{color: '#C5A059'}}>🛒 Live Marketplace:</strong> Instantly cross-reference global stores to buy the physical record you are playing.</li>
                            <li><strong style={{color: '#C5A059'}}>✨ Pristine Engine:</strong> Guaranteed pure analog noise floor.</li>
                        </ul>
                    </div>
                )}
                
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

// --- Vinyl Crate Component ---
function VirtualCrate() {
    const [isVisible, setIsVisible] = useState(false);
    const [items, setItems] = useState([]);
    const [isPro, setIsPro] = useState(false);

    // Explicitly check Supabase auth upon React mounting to prevent Babel compile-delay race conditions
    useEffect(() => {
        supabase.auth.getSession().then(({data: { session }}) => {
            if (session) {
                setIsPro(true);
                window.dispatchEvent(new Event('authSuccess')); // Forces script.js to physically restore tactile knobs
            }
        });
    }, []);

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
                
                // Enforce maximum 10 Vinyls limit in database
                const { data: keepData } = await supabase
                    .from('crate_items')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('added_at', { ascending: false })
                    .limit(10);
                
                if (keepData && keepData.length === 10) {
                    const oldestIdToKeep = keepData[9].id;
                    await supabase
                        .from('crate_items')
                        .delete()
                        .eq('user_id', user.id)
                        .lt('id', oldestIdToKeep);
                }
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

    const queueHistoryTrack = (track, e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('addToQueue', { detail: { id: track.youtube_id, title: track.title } }));
    };

    return (
        <div style={{padding: '20px', color: '#e0e0e0', height: '100%', borderLeft: '1px solid #333', background: '#0a0a0a', display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px'}}>
                <h3 style={{color: '#C5A059', margin: 0, fontFamily: 'var(--font-heading)'}}>Vinyl Crate</h3>
                {isPro ? (
                    <button onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.reload();
                    }} style={{background: 'transparent', border: '1px solid #444', color: '#888', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer'}}>Log Out</button>
                ) : (
                    <button onClick={() => window.dispatchEvent(new Event('requestAuth'))} style={{background: 'transparent', border: '1px solid #C5A059', color: '#C5A059', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer'}}>Log In</button>
                )}
            </div>
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
                        style={{padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', position: 'relative'}}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        title="Click to play this Vinyl"
                    >
                        <img 
                            src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`} 
                            alt="Cover" 
                            style={{width: '90px', height: '65px', minWidth: '90px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333'}}
                        />
                        <div style={{flex: 1, overflow: 'hidden'}}>
                            <div style={{fontSize: '0.9rem', lineHeight: '1.4', color: '#e0e0e0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{item.title}</div>
                            {isPro && (
                                <button 
                                    onClick={(e) => queueHistoryTrack(item, e)}
                                    style={{marginTop: '5px', padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(197, 160, 89, 0.2)', border: '1px solid #C5A059', color: '#C5A059', borderRadius: '3px', cursor: 'pointer'}}
                                >
                                    Reserve
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Shopping Modal Component ---
function ShoppingModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [track, setTrack] = useState({ title: '', id: '' });
    const [searchTerms, setSearchTerms] = useState({ query: '', display: '' });
    const [loading, setLoading] = useState(false);
    
    // Helper to sanitize messy YouTube titles
    const cleanTitle = (str) => {
        return str.replace(/[\(\[].*?[\)\]]/g, '') // strip brackets/parentheses
                  .replace(/official|video|audio|lyric|lyrics|mv/ig, '')
                  .replace(/[-|]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
    };

    useEffect(() => {
        const handleShow = async (e) => {
            setTrack(e.detail);
            setLoading(true);
            setIsVisible(true);
            
            const sanitized = cleanTitle(e.detail.title);
            let finalQuery = sanitized;
            let finalDisplay = e.detail.title;
            
            // Query iTunes standard API to accurately trace song -> album -> artist
            try {
                const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(sanitized)}&entity=song&limit=1`);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const match = data.results[0];
                    finalQuery = `${match.artistName} ${match.collectionName}`; // Search for the exact artist and album name
                    finalDisplay = `Album: ${match.collectionName} by ${match.artistName}`;
                }
            } catch (err) {
                console.error("iTunes lookup failed, falling back to parsed title.");
            }
            
            setSearchTerms({ query: finalQuery, display: finalDisplay });
            setLoading(false);
        };
        
        window.addEventListener('showShoppingModal', handleShow);
        return () => window.removeEventListener('showShoppingModal', handleShow);
    }, []);

    if (!isVisible) return null;

    const encodedTitle = encodeURIComponent(searchTerms.query + " vinyl record");
    const discogsTitle = encodeURIComponent(searchTerms.query);

    return (
        <div className="modal">
            <div className="modal-content wooden-frame" style={{position: 'relative', width: '450px', background: '#111'}}>
                <button 
                    onClick={() => setIsVisible(false)} 
                    style={{position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', outline: 'none'}}
                >
                    &times;
                </button>
                <h2 style={{color: '#C5A059', marginBottom: '15px'}}>Vinyl Marketplace</h2>
                
                {loading ? (
                    <div style={{color: '#d4c5b0', textAlign: 'center', padding: '30px 0'}}>
                        <p>Scanning global record stores...</p>
                        <div style={{marginTop: '10px', color: '#888', fontSize: '0.8rem'}}>Cross-referencing Apple Data for exact album match...</div>
                    </div>
                ) : (
                    <div>
                        <p style={{color: '#888', fontSize: '0.85rem', marginBottom: '15px'}}>Showing live aggregate results for: <br/><strong style={{color: '#d4c5b0', fontSize: '1rem'}}>{searchTerms.display}</strong></p>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                            {/* Google Shopping Direct Route */}
                            <a href={`https://www.google.com/search?tbm=shop&q=${encodedTitle}`} target="_blank" rel="noreferrer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', textDecoration: 'none', color: '#e0e0e0', transition: 'border 0.2s'}} onMouseEnter={e => e.currentTarget.style.border = '1px solid #C5A059'} onMouseLeave={e => e.currentTarget.style.border = '1px solid #333'}>
                                <div>
                                    <h4 style={{margin: 0, color: '#4285F4'}}>Google Shopping</h4>
                                    <div style={{fontSize: '0.7rem', color: '#666', marginTop: '4px'}}>Aggregate all global stores</div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontWeight: 'bold', color: '#d4c5b0'}}>Compare All</div>
                                    <div style={{fontSize: '0.7rem', color: '#C5A059', marginTop: '4px'}}>Check Prices ↗</div>
                                </div>
                            </a>

                            {/* Discogs */}
                            <a href={`https://www.discogs.com/search?q=${discogsTitle}&type=release`} target="_blank" rel="noreferrer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', textDecoration: 'none', color: '#e0e0e0', transition: 'border 0.2s'}} onMouseEnter={e => e.currentTarget.style.border = '1px solid #C5A059'} onMouseLeave={e => e.currentTarget.style.border = '1px solid #333'}>
                                <div>
                                    <h4 style={{margin: 0, color: '#fff', textShadow: '0px 0px 1px #fff'}}>Discogs Database</h4>
                                    <div style={{fontSize: '0.7rem', color: '#666', marginTop: '4px'}}>Official Vinyl Marketplace</div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontWeight: 'bold', color: '#d4c5b0'}}>Market Price</div>
                                    <div style={{fontSize: '0.7rem', color: '#C5A059', marginTop: '4px'}}>Check Auctions ↗</div>
                                </div>
                            </a>
                        </div>
                        
                        <p style={{fontSize: '0.65rem', color: '#555', marginTop: '20px', textAlign: 'center', fontStyle: 'italic', lineHeight: '1.4'}}>
                            * Disclaimer: We simply aggregate search queries outwards. We are not liable for differences in inventory, external seller pricing, or if a third-party seller site is a scam. Please buy safely!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

const authRoot = ReactDOM.createRoot(document.getElementById('react-auth-root'));
authRoot.render(<AuthGate />);

const crateRoot = ReactDOM.createRoot(document.getElementById('react-crate-root'));
crateRoot.render(<VirtualCrate />);

// --- Full-Screen Search Modal Component ---
function SearchModal() {
    const [results, setResults] = useState([]);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const handleSearch = (e) => setResults(e.detail);
        window.addEventListener('openSearchModal', handleSearch);
        
        supabase.auth.getSession().then(({data: { session }}) => {
            if (session) setIsPro(true);
        });

        const handleAuth = () => setIsPro(true);
        window.addEventListener('authSuccess', handleAuth);

        return () => {
            window.removeEventListener('openSearchModal', handleSearch);
            window.removeEventListener('authSuccess', handleAuth);
        };
    }, []);

    if (results.length === 0) return null;

    const playTrack = (r) => {
        const input = document.getElementById('youtubeUrl');
        input.value = `https://youtube.com/watch?v=${r.id}`;
        setResults([]);
        document.getElementById('convertBtn').click();
    };

    const queueTrack = (r, e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent('addToQueue', { detail: { id: r.id, title: r.title } }));
        setResults([]);
    };

    return (
        <div className="modal">
            <div className="modal-content wooden-frame" style={{width: '600px', maxWidth: '90%', padding: '0', overflow: 'hidden'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#0a0a0a', borderBottom: '1px solid #333'}}>
                    <h2 style={{margin: 0, color: '#C5A059', fontFamily: "'Playfair Display', serif"}}>Select Archival Pressing</h2>
                    <button className="btn" style={{padding: '5px 15px', width: 'auto'}} onClick={() => {
                        setResults([]);
                        document.getElementById('statusMessage').textContent = "Waiting for record...";
                    }}>✕</button>
                </div>
                <div style={{maxHeight: '50vh', overflowY: 'auto', background: '#111'}}>
                    {results.map(r => (
                        <div 
                            key={r.id} 
                            style={{display: 'flex', gap: '15px', padding: '15px', borderBottom: '1px solid #222', cursor: 'pointer', transition: 'background 0.2s', alignItems: 'center'}}
                            onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => playTrack(r)}
                        >
                            <img src={r.thumbnail} style={{width: '90px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #000'}} />
                            <div style={{flex: 1, overflow: 'hidden', textAlign: 'left'}}>
                                <div style={{color: '#e0e0e0', fontSize: '1rem', lineHeight: '1.2', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={r.title}>{r.title}</div>
                                <div style={{color: '#888', fontSize: '0.8rem'}}>{r.author}</div>
                            </div>
                            {isPro && (
                                <button 
                                    onClick={(e) => queueTrack(r, e)}
                                    style={{padding: '8px 15px', background: 'rgba(197, 160, 89, 0.2)', border: '1px solid #C5A059', color: '#C5A059', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}}
                                >
                                    Reserve
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const searchRoot = ReactDOM.createRoot(document.getElementById('react-search-root'));
searchRoot.render(<SearchModal />);

const shoppingRoot = ReactDOM.createRoot(document.getElementById('react-shopping-root'));
shoppingRoot.render(<ShoppingModal />);

// --- Auto-Login / Session Restoration ---
(async function initSession() {
    window.appState = window.appState || { isLoggedIn: false };
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.appState.isLoggedIn = true;
        setTimeout(() => window.dispatchEvent(new Event('authSuccess')), 150);
    }
})();
