document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const state = {
        plays: 0,
        isLoggedIn: false,
        isPlaying: false,
        isPaused: false,
        audioContext: null,
        nodes: {},
        youtubePlayer: null,
        youtubeVideoId: null,
        playerReady: false,
        knobs: { volume: 0.8, warmth: 0.5, crackle: 0.5 },
        queue: []
    };

    // Mount global state for React components
    window.appState = state;

    // --- DOM Elements ---
    const vinylRecord = document.getElementById('vinylRecord');
    const tonearm = document.getElementById('tonearm');
    const albumArt = document.getElementById('albumArt');
    const convertBtn = document.getElementById('convertBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const statusMessage = document.getElementById('statusMessage');
    const turntableHero = document.getElementById('turntableHero');
    const themeDots = document.querySelectorAll('.theme-dot');
    const sleeveTitle = document.getElementById('sleeveTitle');
    const sleeveArtist = document.getElementById('sleeveArtist');
    const affiliateBtn = document.getElementById('affiliateBtn');
    const proModeCheckbox = document.getElementById('proModeCheckbox');

    // --- Theme Logic ---
    themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');

            // Remove all themes from body
            document.body.classList.remove('theme-obsidian', 'theme-walnut', 'theme-warm', 'theme-alabaster');
            // Add selected theme to body
            document.body.classList.add(theme);

            // Update active dot
            themeDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
        });
    });

    // Initialize with Walnut (Espresso Brown) as requested
    document.body.classList.add('theme-walnut');

    // --- Initialization ---
    // Load YouTube IFrame API
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
        state.youtubePlayer = new YT.Player('youtube-player-placeholder', {
            height: '0',
            width: '0',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'fs': 0,
                'rel': 0,
                'showinfo': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    function onPlayerReady(event) {
        state.playerReady = true;
        console.log("YouTube Player Ready");
    }

    function onPlayerError(event) {
        console.error("YouTube Player Error:", event.data);
        statusMessage.textContent = "Error: This video may not be available for embedding.";
        stopPlayback();
    }

    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.ENDED) {
            if (state.isLoggedIn && state.queue.length > 0) {
                const nextTrack = state.queue.shift();
                statusMessage.textContent = `Playing next from queue: ${nextTrack.title}`;
                handleConversion(nextTrack.id);
            } else {
                stopPlayback();
            }
        } else if (event.data == YT.PlayerState.PLAYING) {
            statusMessage.textContent = "Now Playing: Analog Stream";
        } else if (event.data == YT.PlayerState.PAUSED) {
            vinylRecord.classList.remove('spinning');
            document.querySelector('.turntable-hero').classList.remove('playing');
        }
    }

    // --- Queue Management ---
    window.addEventListener('addToQueue', (e) => {
        if (!state.isLoggedIn) {
            window.dispatchEvent(new Event('requestAuth'));
            return;
        }
        state.queue.push(e.detail);
        statusMessage.textContent = `Queued: ${e.detail.title} (${state.queue.length} in crate)`;
    });

    // --- Audio Engine ---
    function initAudioEngine() {
        if (state.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioContext = new AudioContext();

        // 1. Vinyl Noise Buffer (Enhanced Crackles, Hiss, and Rumble)
        const bufferSize = state.audioContext.sampleRate * 6; // 6 seconds for less repetition
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const white = (Math.random() * 2 - 1) * 0.025;
            let crackle = 0;
            if (Math.random() < 0.0015) { crackle = (Math.random() * 2 - 1) * 0.45; }
            let pop = 0;
            if (Math.random() < 0.0002) { pop = (Math.random() * 2 - 1) * 0.6; }
            const rumble = Math.sin(i * 0.002) * 0.008;

            data[i] = white + crackle + pop + rumble;
        }
        state.nodes.noiseBuffer = buffer;

        // 2. Global Noise Filter (Controlled by Warmth)
        const noiseFilter = state.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 10000 - (state.knobs.warmth * 8000); // 10k down to 2k
        
        state.nodes.noiseFilter = noiseFilter;

        // 3. Continuous Low Frequency Hum
        const humOsc = state.audioContext.createOscillator();
        humOsc.type = 'sine'; // Smooth subtle sine
        humOsc.frequency.value = 50; // Deep 50Hz hum
        
        const humGain = state.audioContext.createGain();
        humGain.gain.value = state.knobs.warmth * 0.08; // Softer max amplitude

        humOsc.connect(humGain);
        
        state.nodes.humOsc = humOsc;
        state.nodes.humGain = humGain;
        
        // Always route directly to destination for clean LP sound
        noiseFilter.connect(state.audioContext.destination);
        humGain.connect(state.audioContext.destination);
        
        humOsc.start();
    }

    function playNeedleDrop() {
        if (!state.audioContext) initAudioEngine();
        const ctx = state.audioContext;

        // A short burst of loud crackle and a thump
        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(150, ctx.currentTime);
        thump.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0.6, ctx.currentTime);
        thumpGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

        thump.connect(thumpGain);
        thumpGain.connect(ctx.destination);
        thump.start();
        thump.stop(ctx.currentTime + 0.2);

        // Buzzing/Crackle burst - Extended to 2 seconds - Louder initial burst
        const burstSource = ctx.createBufferSource();
        burstSource.buffer = state.nodes.noiseBuffer;
        const burstGain = ctx.createGain();

        burstGain.gain.setValueAtTime(0.4, ctx.currentTime);
        burstGain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 2.0);

        burstSource.connect(burstGain);
        burstGain.connect(state.nodes.noiseFilter); // Route through warmth filter
        burstSource.start();
    }

    function playVinylNoise() {
        if (!state.audioContext) initAudioEngine();
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }

        // Loop the character noise
        const source = state.audioContext.createBufferSource();
        source.buffer = state.nodes.noiseBuffer;
        source.loop = true;

        const gainNode = state.audioContext.createGain();
        gainNode.gain.value = Math.pow(state.knobs.crackle, 0.5) * 0.8;

        source.connect(gainNode);
        gainNode.connect(state.nodes.noiseFilter); // Route through warmth filter

        state.nodes.noiseSource = source;
        state.nodes.noiseGain = gainNode;
        source.start();

        // Ensure hum is active
        if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(state.knobs.warmth, 0.5) * 0.25;
    }

    function stopVinylNoise() {
        if (state.nodes.noiseSource) {
            try { state.nodes.noiseSource.stop(); } catch (e) { }
            state.nodes.noiseSource = null;
        }
        if (state.nodes.humGain) {
            state.nodes.humGain.gain.value = 0;
        }
    }

    // --- UI Interactions ---

    // --- Knobs Logic ---
    const knobs = document.querySelectorAll('.knob');
    knobs.forEach(knob => {
        const controlType = knob.getAttribute('data-control');
        const indicator = knob.querySelector('.indicator');

        let isDragging = false;
        let startY = 0;
        let startVal = state.knobs[controlType];

        function updateVisual(val) {
            // -135deg to +135deg coverage
            const degrees = -135 + (val * 270);
            indicator.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
        }
        updateVisual(startVal);

        function setAudioParameter(type, val) {
            state.knobs[type] = val;
            if (type === 'volume' && state.youtubePlayer && state.youtubePlayer.setVolume) {
                state.youtubePlayer.setVolume(val * 100);
            }
            if (type === 'warmth') {
                if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(val, 0.5) * 0.25; 
                if (state.nodes.noiseFilter) state.nodes.noiseFilter.frequency.value = 10000 - (val * 9600); // Drastically muffle high-end to 400Hz
            }
            if (type === 'crackle' && state.nodes.noiseGain) {
                state.nodes.noiseGain.gain.value = Math.pow(val, 0.5) * 0.8; 
            }
            
        }

        knob.addEventListener('mousedown', (e) => {
            if (!state.isLoggedIn) {
                statusMessage.textContent = "Sign up for PRO to customize the tactile audio mix.";
                window.dispatchEvent(new Event('requestAuth')); // Trigger Login Modal
                return;
            }
            isDragging = true;
            startY = e.clientY;
            startVal = state.knobs[controlType];
            document.body.style.cursor = 'ns-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY;
            let newVal = startVal + (deltaY / 150); // 150px drag for full sweep
            newVal = Math.max(0, Math.min(1, newVal));
            updateVisual(newVal);
            setAudioParameter(controlType, newVal);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
            }
        });
    });

    convertBtn.addEventListener('click', () => {
        handleConversion();
    });

    pauseBtn.addEventListener('click', () => {
        if (state.isPlaying && !state.isPaused) {
            pausePlayback();
        } else if (state.isPaused) {
            resumePlayback();
        }
    });

    // Listen for Auth Success from React
    window.addEventListener('authSuccess', () => {
        state.isLoggedIn = true;
        statusMessage.textContent = "Welcome PRO User. Premium Features Unlocked.";
    });

    affiliateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Log intent (In React Crate or natively)
        window.dispatchEvent(new CustomEvent('addToCrate', { 
            detail: { title: sleeveTitle.textContent, id: state.youtubeVideoId }
        }));
        // Show shopping modal
        window.dispatchEvent(new CustomEvent('showShoppingModal', {
            detail: { title: sleeveTitle.textContent, id: state.youtubeVideoId }
        }));
    });

    async function fetchVideoMetadata(videoId) {
        try {
            const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await res.json();
            if (data.title) {
                sleeveTitle.textContent = data.title;
                sleeveArtist.textContent = data.author_name || 'Unknown Artist';

                affiliateBtn.href = "#";
                affiliateBtn.classList.remove('hidden');

                // Inform React Vinyl Crate that a track successfully loaded
                window.dispatchEvent(new CustomEvent('trackLoaded', {
                    detail: { title: data.title, id: videoId }
                }));
            }
        } catch (e) {
            sleeveTitle.textContent = "Analog Track";
            sleeveArtist.textContent = "Unknown Artist";
            affiliateBtn.classList.remove('hidden');
        }
    }

    // --- Vinyl Crate Click-to-Play ---
    window.addEventListener('playHistoryTrack', (e) => {
        const track = e.detail;

        // Update input visually
        youtubeUrlInput.value = `https://youtube.com/watch?v=${track.youtube_id}`;
        statusMessage.textContent = "Pulling vinyl from the crate...";

        if (state.plays >= 1 && !state.isLoggedIn) {
            window.dispatchEvent(new Event('requestAuth')); // Trigger React Modal
            return;
        }

        state.youtubeVideoId = track.youtube_id;
        const thumbnail = `https://img.youtube.com/vi/${track.youtube_id}/0.jpg`;
        if (albumArt) {
            albumArt.src = thumbnail;
            albumArt.classList.remove('hidden');
        }

        startPlayback(track.youtube_id);
    });

    async function handleConversion(explicitId = null) {
        let videoId = explicitId;
        const url = youtubeUrlInput.value.trim();
        
        if (!videoId) {
            if (!url) {
                statusMessage.textContent = "Please enter a valid YouTube URL or song name.";
                return;
            }

            videoId = extractVideoId(url);
            
            if (!videoId) {
                statusMessage.textContent = "Searching global vinyl archives...";
                try {
                    const res = await fetch('/api/search?q=' + encodeURIComponent(url));
                    if (!res.ok) throw new Error("Search failed");
                    const data = await res.json();
                    
                    if (data && data.length > 0) {
                        statusMessage.textContent = "Select a pressing from the archives.";
                        window.dispatchEvent(new CustomEvent('openSearchModal', { detail: data }));
                    } else {
                        statusMessage.textContent = "Error: No recordings found.";
                    }
                } catch(e) {
                    console.error(e);
                    statusMessage.textContent = "Search Error. Try pasting a direct URL.";
                }
                return;
            }
        }

        if (!state.playerReady) {
            statusMessage.textContent = "Player is initializing... please wait.";
            return;
        }

        state.youtubeVideoId = videoId;
        const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        if (albumArt) {
            albumArt.src = thumbnail;
            albumArt.classList.remove('hidden');
        }
        statusMessage.textContent = "Dropping the needle...";

        startPlayback(videoId);
    }

    function extractVideoId(url) {
        if (url.length === 11 && !url.includes(' ') && !url.includes('/')) return url;
        const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regExp);
        return match ? match[1] : null;
    }

    function startPlayback(videoId) {
        stopPlayback(); // Clean up existing

        state.isPlaying = true;
        state.isPaused = false;
        state.plays++;

        // Fetch Metadata & Slide Out Sleeve
        fetchVideoMetadata(videoId);

        // Immediately Swing the Arm & Spin the Vinyl
        document.querySelector('.turntable-hero').classList.add('playing');
        vinylRecord.classList.add('spinning');

        initAudioEngine();
        playNeedleDrop(); // Trigger the initial "buzzing" and needle drop thump

        // Wait 2 seconds for the needle drop and buzzing to complete before starting the music
        setTimeout(() => {
            if (state.isPlaying && !state.isPaused) {
                playVinylNoise();
                if (state.youtubePlayer && state.youtubePlayer.loadVideoById) {
                    state.youtubePlayer.loadVideoById(videoId);
                    state.youtubePlayer.setVolume(state.knobs.volume * 100);
                    state.youtubePlayer.playVideo();
                }
            }
        }, 2000);

        pauseBtn.classList.remove('hidden');
        pauseBtn.textContent = "Pause";
        convertBtn.textContent = "Change Record";
    }

    function pausePlayback() {
        state.isPaused = true;
        if (state.youtubePlayer) {
            state.youtubePlayer.pauseVideo();
        }
        if (state.audioContext) {
            state.audioContext.suspend();
        }
        pauseBtn.textContent = "Resume";
        statusMessage.textContent = "Playback Paused.";
    }

    function resumePlayback() {
        state.isPaused = false;
        if (state.youtubePlayer) {
            state.youtubePlayer.playVideo();
        }
        if (state.audioContext) {
            state.audioContext.resume();
        }
        pauseBtn.textContent = "Pause";
        statusMessage.textContent = "Resuming warmth...";
    }

    function stopPlayback() {
        state.isPlaying = false;
        state.isPaused = false;

        vinylRecord.classList.remove('spinning');
        document.querySelector('.turntable-hero').classList.remove('playing');

        stopVinylNoise();
        if (state.youtubePlayer && state.youtubePlayer.stopVideo) {
            state.youtubePlayer.stopVideo();
        }

        pauseBtn.classList.add('hidden');
        pauseBtn.textContent = "Pause";
        convertBtn.textContent = "Play on Vinyl";
    }
});
