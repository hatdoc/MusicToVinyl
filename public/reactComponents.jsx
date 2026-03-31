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

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setAuthError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/youtube.readonly',
                redirectTo: 'https://vinylanalog.pages.dev/'
            }
        });
        if (error) {
            setAuthError("Google Sign In Error: " + error.message);
            setLoading(false);
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
                    <h2 style={{color: '#C5A059', fontFamily: 'var(--font-heading)', margin: '0 0 10px 0'}}>{isLoginMode ? 'Welcome Back' : 'Join for Free'}</h2>
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
                        {loading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Join with Email')}
                    </button>
                </form>

                <div style={{display: 'flex', alignItems: 'center', margin: '20px 0'}}>
                    <div style={{flex: 1, height: '1px', background: '#333'}}></div>
                    <div style={{color: '#888', margin: '0 10px', fontSize: '0.85rem'}}>OR</div>
                    <div style={{flex: 1, height: '1px', background: '#333'}}></div>
                </div>

                <button 
                    onClick={handleGoogleSignIn} 
                    disabled={loading}
                    style={{width: '100%', padding: '12px', background: '#e0e0e0', color: '#111', cursor: loading ? 'wait' : 'pointer', border: 'none', fontWeight: 'bold', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>
                
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
    const [queue, setQueue] = useState([]);
    const [view, setView] = useState('history'); // 'history', 'queue', 'youtube'
    const [isPro, setIsPro] = useState(false);

    // YOUTUBE INTEGRATION STATE
    const [googleToken, setGoogleToken] = useState(null);
    const [youtubePlaylists, setYoutubePlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistItems, setPlaylistItems] = useState([]);
    const [isLoadingYT, setIsLoadingYT] = useState(false);
    const [playlistPageToken, setPlaylistPageToken] = useState(null);
    const [itemsPageToken, setItemsPageToken] = useState(null);
    const [isLoadingMoreYT, setIsLoadingMoreYT] = useState(false);

    // Explicitly check Supabase auth upon React mounting to prevent Babel compile-delay race conditions
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsPro(true);
                window.dispatchEvent(new Event('authSuccess')); // Forces script.js to physically restore tactile knobs
                if (session.provider_token) {
                    setGoogleToken(session.provider_token);
                    fetchYouTubePlaylists(session.provider_token);
                }
            }
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setIsPro(true);
                if (session.provider_token) {
                    setGoogleToken(session.provider_token);
                    fetchYouTubePlaylists(session.provider_token);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchYouTubePlaylists = async (token, pageToken = '') => {
        if (pageToken) setIsLoadingMoreYT(true);
        else setIsLoadingYT(true);
        
        try {
            const url = `https://youtube.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (pageToken) {
                    setYoutubePlaylists(prev => [...prev, ...(data.items || [])]);
                } else {
                    const likedMusicPL = {
                        id: 'LM',
                        snippet: {
                            title: 'Your Liked Music ❤️',
                            thumbnails: { default: { url: 'https://i.postimg.cc/QMcXXg8W/ytm_liked.png' } }
                        }
                    };
                    setYoutubePlaylists([likedMusicPL, ...(data.items || [])]);
                }
                setPlaylistPageToken(data.nextPageToken || null);
            }
        } catch(e) { console.error("YT API Error:", e); }
        
        if (pageToken) setIsLoadingMoreYT(false);
        else setIsLoadingYT(false);
    };

    const fetchYouTubePlaylistItems = async (playlistId, token, pageToken = '') => {
        if (pageToken) setIsLoadingMoreYT(true);
        else setIsLoadingYT(true);

        try {
            const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (pageToken) {
                    setPlaylistItems(prev => [...prev, ...(data.items || [])]);
                } else {
                    setPlaylistItems(data.items || []);
                }
                setItemsPageToken(data.nextPageToken || null);
            }
        } catch(e) { console.error("YT API Error:", e); }
        
        if (pageToken) setIsLoadingMoreYT(false);
        else setIsLoadingYT(false);
    };

    const handlePlaylistClick = (pl) => {
        setSelectedPlaylist(pl);
        setPlaylistItems([]); 
        setItemsPageToken(null);
        fetchYouTubePlaylistItems(pl.id, googleToken);
    };

    // Fetch history with dual-layer cloud/local storage sync
    useEffect(() => {
        const fetchHistory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Remote Expiration: Purge entries older than 7 days
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                await supabase.from('crate_items').delete().eq('user_id', user.id).lt('added_at', oneWeekAgo);

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
                            let addedTime = d.added_at ? new Date(d.added_at).getTime() : Date.now();
                            filtered.push({ id: d.id, title: d.video_title, youtube_id: d.youtube_id, added_at: addedTime });
                        }
                    });

                    // Zero Data Loss: Merge cloud records with local caching safely 
                    let localHistory = JSON.parse(localStorage.getItem('vinyl_history')) || [];
                    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    localHistory = localHistory.filter(t => t.added_at > cutoff);

                    const merged = [...filtered, ...localHistory].filter((t, index, self) => 
                        index === self.findIndex(i => i.youtube_id === t.youtube_id)
                    ).sort((a, b) => b.added_at - a.added_at).slice(0, 10);
                    
                    localStorage.setItem('vinyl_history', JSON.stringify(merged));
                    setItems(merged);
                }
            } else {
                // Free User Caching Loader
                let localHistory = JSON.parse(localStorage.getItem('vinyl_history')) || [];
                const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                localHistory = localHistory.filter(t => t.added_at > cutoff);
                setItems(localHistory);
            }
        };
        fetchHistory(); // Triggers universally to preserve local data loss
    }, [isPro]);

    useEffect(() => {
        const handleAuth = () => setIsPro(true);
        const handleQueueUpdate = () => {
            setQueue([...window.appState.queue]);
        };

        window.addEventListener('authSuccess', handleAuth);
        window.addEventListener('queueUpdated', handleQueueUpdate);
        
        // Listen for new tracks loaded in the player to add to history automatically
        const handleTrackLoaded = async (e) => {
            const newTrack = { id: Date.now(), title: e.detail.title, youtube_id: e.detail.id, added_at: Date.now() };
            
            // Universal Local Caching Logic
            setItems(prev => {
                const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
                let validPrev = prev.filter(t => t.added_at > cutoff && t.youtube_id !== newTrack.youtube_id);
                const updated = [newTrack, ...validPrev].slice(0, 10);
                localStorage.setItem('vinyl_history', JSON.stringify(updated));
                return updated;
            });
            
            if (!isPro) return; // Prevent cloud synchronization for Free tier (local usage only)

            // Save exactly 10 URLs remotely for PRO members
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('crate_items').insert([{
                    user_id: user.id,
                    youtube_id: newTrack.youtube_id,
                    video_title: newTrack.title
                }]);
                
                // Enforce maximum 10 Vinyls limit in database remotely
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
             window.removeEventListener('queueUpdated', handleQueueUpdate);
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

    const removeFromQueue = (index, e) => {
        e.stopPropagation();
        window.appState.queue.splice(index, 1);
        window.dispatchEvent(new Event('queueUpdated'));
    };

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            const isMob = window.innerWidth <= 768;
            setIsMobile(isMob);
            if (!isMob) setIsMobileCollapsed(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{padding: '20px', color: 'var(--text-main)', height: '100%', borderLeft: '1px solid var(--border-color)', background: 'transparent', display: 'flex', flexDirection: 'column'}}>
            <div 
                style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', cursor: isMobile ? 'pointer' : 'default'}}
                onClick={() => { if (isMobile) setIsMobileCollapsed(!isMobileCollapsed); }}
            >
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <h3 style={{color: '#C5A059', margin: 0, fontFamily: 'var(--font-heading)'}}>Vinyl Crate</h3>
                    {isMobile && <span style={{marginLeft: '8px', color: '#C5A059', fontSize: '0.8rem'}}>{isMobileCollapsed ? '▼' : '▲'}</span>}
                </div>
            </div>
            
            {!isMobileCollapsed && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{display: 'flex', gap: '5px', margin: '15px 0', flexWrap: 'wrap'}}>
                <button 
                    onClick={() => { setView('history'); setSelectedPlaylist(null); }}
                    style={{flex: 1, minWidth: '30%', padding: '5px', fontSize: '0.65rem', background: view === 'history' ? '#C5A059' : 'var(--card-bg)', color: view === 'history' ? '#000' : 'var(--text-sub)', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold'}}
                >
                    History
                </button>
                <button 
                    onClick={() => { setView('queue'); setSelectedPlaylist(null); }}
                    style={{flex: 1, minWidth: '30%', padding: '5px', fontSize: '0.65rem', background: view === 'queue' ? '#C5A059' : 'var(--card-bg)', color: view === 'queue' ? '#000' : 'var(--text-sub)', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold'}}
                >
                    Reserved ({queue.length})
                </button>
                <button 
                    onClick={() => setView('youtube')}
                    style={{flex: 1, minWidth: '30%', padding: '5px', fontSize: '0.65rem', background: view === 'youtube' ? '#C5A059' : 'var(--card-bg)', color: view === 'youtube' ? '#000' : 'var(--text-sub)', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold'}}
                >
                    My YouTube
                </button>
            </div>
            
            {/* Sidebar AdSense placeholder */}
            <div style={{margin: '10px 0', padding: '20px', background: 'var(--card-bg)', textAlign: 'center', border: '1px dashed var(--border-color)', fontSize: '0.7rem', color: 'var(--text-sub)'}}>
                AdSense Zone
            </div>
            
            <div style={{flex: 1, overflowY: 'auto'}}>
                {view === 'youtube' ? (
                    !googleToken ? (
                        <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)', fontSize: '0.8rem'}}>
                            <p>Connect your YouTube account to view playlists here.</p>
                            <button onClick={() => window.dispatchEvent(new Event('requestAuth'))} style={{padding: '8px 15px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', marginTop: '10px'}}>Sign In with Google</button>
                        </div>
                    ) : isLoadingYT ? (
                        <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)', fontSize: '0.8rem'}}>Loading YouTube Data...</div>
                    ) : selectedPlaylist ? (
                        <div>
                            <button onClick={() => setSelectedPlaylist(null)} style={{background: 'none', border: 'none', color: '#C5A059', cursor: 'pointer', fontSize: '0.75rem', padding: '10px 0', textDecoration: 'underline'}}>← Back to Playlists</button>
                            <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem'}}>{selectedPlaylist.snippet.title}</h4>
                            {playlistItems.map(item => (
                                <div key={item.id} style={{padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center'}}>
                                    <img src={item.snippet.thumbnails && item.snippet.thumbnails.default && item.snippet.thumbnails.default.url} style={{width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px'}} />
                                    <div style={{flex: 1, overflow: 'hidden'}}>
                                        <div style={{fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={item.snippet.title}>{item.snippet.title}</div>
                                        <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('playHistoryTrack', { detail: { youtube_id: item.snippet.resourceId.videoId, title: item.snippet.title } }))}
                                            style={{marginTop: '5px', padding: '2px 8px', fontSize: '0.6rem', background: '#C5A059', border: 'none', color: '#000', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold'}}
                                        >
                                            Play Record
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {itemsPageToken && (
                                <button onClick={() => fetchYouTubePlaylistItems(selectedPlaylist.id, googleToken, itemsPageToken)} disabled={isLoadingMoreYT} style={{width: '100%', padding: '12px', background: 'transparent', color: '#C5A059', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '15px', marginBottom: '15px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px'}}>
                                    {isLoadingMoreYT ? 'Loading...' : 'Load More Tracks ↓'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            {youtubePlaylists.map(pl => (
                                <div key={pl.id} onClick={() => handlePlaylistClick(pl)} style={{padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <img src={pl.snippet.thumbnails && pl.snippet.thumbnails.default && pl.snippet.thumbnails.default.url} style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}} />
                                    <div>
                                        <div style={{fontSize: '0.9rem'}}>{pl.snippet.title}</div>
                                        <div style={{fontSize: '0.7rem', color: '#888'}}>Playlist</div>
                                    </div>
                                </div>
                            ))}
                            {playlistPageToken && (
                                <button onClick={() => fetchYouTubePlaylists(googleToken, playlistPageToken)} disabled={isLoadingMoreYT} style={{width: '100%', padding: '12px', background: 'transparent', color: '#C5A059', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '15px', marginBottom: '15px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px'}}>
                                    {isLoadingMoreYT ? 'Loading...' : 'Load More Playlists ↓'}
                                </button>
                            )}
                        </div>
                    )
                ) : view === 'history' ? (
                    items.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => playHistoryTrack(item)}
                            style={{padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', position: 'relative'}}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            title="Click to play this Vinyl"
                        >
                            <img 
                                src={`https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`} 
                                alt="Cover" 
                                style={{width: '80px', height: '55px', minWidth: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)'}}
                            />
                            <div style={{flex: 1, overflow: 'hidden'}}>
                                <div style={{fontSize: '0.85rem', lineHeight: '1.3', color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{item.title}</div>
                                {isPro && (
                                    <button 
                                        onClick={(e) => queueHistoryTrack(item, e)}
                                        style={{marginTop: '5px', padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(197, 160, 89, 0.1)', border: '1px solid rgba(197, 160, 89, 0.4)', color: '#C5A059', borderRadius: '3px', cursor: 'pointer'}}
                                    >
                                        Reserve
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    queue.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)', fontSize: '0.8rem'}}>No tracks reserved yet.</div>
                    ) : (
                        queue.map((item, index) => (
                            <div 
                                key={index}
                                style={{padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center'}}
                            >
                                <div style={{width: '20px', fontSize: '0.7rem', color: '#C5A059', fontWeight: 'bold'}}>{index + 1}</div>
                                <div style={{flex: 1, overflow: 'hidden'}}>
                                    <div style={{fontSize: '0.85rem', lineHeight: '1.3', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.title}</div>
                                    <button 
                                        onClick={(e) => removeFromQueue(index, e)}
                                        style={{marginTop: '5px', padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(200, 50, 50, 0.1)', border: '1px solid rgba(200, 50, 50, 0.3)', color: '#ff8888', borderRadius: '3px', cursor: 'pointer'}}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
                </div>
            )}
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

function NavAuthButton() {
    const [isPro, setIsPro] = useState(window.appState ? window.appState.isLoggedIn : false);

    useEffect(() => {
        const handleAuth = (e) => setIsPro(e.detail ? e.detail.isPro : true);
        window.addEventListener('authSuccess', handleAuth);
        return () => window.removeEventListener('authSuccess', handleAuth);
    }, []);

    if (isPro) {
        return (
            <button onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
            }} style={{background: 'transparent', border: '1px solid #C5A059', color: '#C5A059', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600}}>Log Out</button>
        );
    }

    return (
        <button onClick={() => window.dispatchEvent(new Event('requestAuth'))} style={{background: 'transparent', border: '1px solid #C5A059', color: '#C5A059', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600}}>Join for Free / Log In</button>
    );
}

const authRoot = ReactDOM.createRoot(document.getElementById('react-auth-root'));
authRoot.render(<AuthGate />);

const navAuthRoot = document.getElementById('react-nav-auth-root');
if (navAuthRoot) {
    const navRoot = ReactDOM.createRoot(navAuthRoot);
    navRoot.render(<NavAuthButton />);
}

const crateRoot = ReactDOM.createRoot(document.getElementById('react-crate-root'));
crateRoot.render(<VirtualCrate />);

// --- Full-Screen Search Modal Component ---
function SearchModal() {
    const [results, setResults] = useState([]);
    const [isQueueAction, setIsQueueAction] = useState(false);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const handleSearch = (e) => {
            setResults(e.detail);
            setIsQueueAction(e.isQueueAction || false);
        };
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
        if (e) e.stopPropagation();
        window.dispatchEvent(new CustomEvent('addToQueue', { detail: { id: r.id, title: r.title } }));
        setResults([]);
    };

    return (
        <div className="modal">
            <div className="modal-content wooden-frame" style={{width: '600px', maxWidth: '90%', padding: '0', overflow: 'hidden'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#0a0a0a', borderBottom: '1px solid #333'}}>
                    <h2 style={{margin: 0, color: '#C5A059', fontFamily: "'Playfair Display', serif"}}>{isQueueAction ? 'Queue Archive' : 'Select Archival Pressing'}</h2>
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
                            onClick={() => isQueueAction ? queueTrack(r) : playTrack(r)}
                        >
                            <img src={r.thumbnail} style={{width: '90px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #000'}} />
                            <div style={{flex: 1, overflow: 'hidden', textAlign: 'left'}}>
                                <div style={{color: '#e0e0e0', fontSize: '1rem', lineHeight: '1.2', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={r.title}>{r.title}</div>
                                <div style={{color: '#888', fontSize: '0.8rem'}}>{r.author}</div>
                            </div>
                            {isPro && !isQueueAction && (
                                <button 
                                    onClick={(e) => queueTrack(r, e)}
                                    style={{padding: '8px 15px', background: 'rgba(197, 160, 89, 0.2)', border: '1px solid #C5A059', color: '#C5A059', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}}
                                >
                                    Reserve
                                </button>
                            )}
                            {isQueueAction && (
                                <button 
                                    style={{padding: '8px 15px', background: '#C5A059', border: '1px solid #000', color: '#000', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'}}
                                >
                                    Queue ↵
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
    
    // Robustly listen for OAuth redirect hash parsing
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            window.appState.isLoggedIn = true;
            window.dispatchEvent(new Event('authSuccess'));
        } else if (event === 'SIGNED_OUT') {
            window.appState.isLoggedIn = false;
        }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.appState.isLoggedIn = true;
        setTimeout(() => window.dispatchEvent(new Event('authSuccess')), 150);
    }
})();
