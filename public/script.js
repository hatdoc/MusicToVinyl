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
        knobs: { volume: 0.4, warmth: 0.65, crackle: 0.7 },
        queue: []
    };

    // Mount global state for React components
    window.appState = state;

    // --- DOM Elements ---
    const vinylRecord = document.getElementById('vinylRecord');
    const tonearm = document.getElementById('tonearm');
    const albumArt = document.getElementById('albumArt');
    const convertBtn = document.getElementById('convertBtn');
    const reserveBtn = document.getElementById('reserveBtn');
    const plinthPlayBtn = document.getElementById('plinthPlayBtn');
    const plinthSkipBtn = document.getElementById('plinthSkipBtn');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const statusMessage = document.getElementById('statusMessage');
    const turntableHero = document.getElementById('turntableHero');
    const themeDots = document.querySelectorAll('.theme-dot');
    const sleeveTitle = document.getElementById('sleeveTitle');
    const sleeveArtist = document.getElementById('sleeveArtist');
    const affiliateBtn = document.getElementById('affiliateBtn');

    // User Guide Modal Elements
    const userGuideModal = document.getElementById('userGuideModal');
    const openUserGuideNav = document.getElementById('openUserGuideNav');
    const closeUserGuide = document.getElementById('closeUserGuide');
    const gotItBtn = document.getElementById('gotItBtn');

    // --- User Guide Logic ---
    function showUserGuide() {
        if (userGuideModal) userGuideModal.classList.remove('hidden');
    }

    function hideUserGuide() {
        if (userGuideModal) userGuideModal.classList.add('hidden');
    }

    if (openUserGuideNav) {
        openUserGuideNav.addEventListener('click', (e) => {
            e.preventDefault();
            showUserGuide();
        });
    }

    if (closeUserGuide) closeUserGuide.addEventListener('click', hideUserGuide);
    if (gotItBtn) gotItBtn.addEventListener('click', hideUserGuide);

    // Show on first visit
    if (!localStorage.getItem('vinyl_guide_seen')) {
        showUserGuide();
        localStorage.setItem('vinyl_guide_seen', 'true');
    }

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

    // --- YouTube API Integration ---
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
        state.youtubePlayer = new YT.Player('youtube-player-placeholder', {
            height: '0',
            width: '0',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'modestbranding': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };

    function onPlayerReady(event) {
        state.playerReady = true;
    }

    function onPlayerStateChange(event) {
        if (state.isTransitioning) return; // Prevent YouTube events from interrupting the needle drop animation

        if (event.data == YT.PlayerState.ENDED) {
            if (state.queue.length > 0) {
                skipToNext();
            } else {
                stopPlayback();
            }
        } else if (event.data == YT.PlayerState.PLAYING) {
            statusMessage.textContent = "Now Playing: Analog Stream";
            plinthPlayBtn.textContent = "⏸";
            plinthPlayBtn.classList.add('active');
            vinylRecord.classList.add('spinning');
            turntableHero.classList.add('playing');
        } else if (event.data == YT.PlayerState.PAUSED) {
            vinylRecord.classList.remove('spinning');
            turntableHero.classList.remove('playing');
            plinthPlayBtn.textContent = "⏵";
            plinthPlayBtn.classList.remove('active');
        }
    }

    function skipToNext() {
        if (state.queue.length > 0) {
            const nextTrack = state.queue.shift();
            statusMessage.textContent = `Skipping to: ${nextTrack.title}`;
            window.dispatchEvent(new Event('queueUpdated')); // Refresh React UI
            handleConversion(nextTrack.id);
        } else {
            statusMessage.textContent = "No more reserved tracks in queue.";
        }
    }

    // --- Queue Management ---
    window.addEventListener('addToQueue', (e) => {
        if (!state.isLoggedIn) {
            window.dispatchEvent(new Event('requestAuth'));
            return;
        }
        state.queue.push(e.detail);
        window.dispatchEvent(new Event('queueUpdated')); // Inform React
        statusMessage.textContent = `Reserved: ${e.detail.title}`;
    });

    // Custom Event from React History
    window.addEventListener('playHistoryTrack', (e) => {
        const track = e.detail;

        // Anti-piracy gate: Limit free plays
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

    async function handleConversion(explicitId = null, addToQueue = false) {
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
                        // Inform search modal if we are queueing
                        window.dispatchEvent(new CustomEvent('openSearchModal', {
                            detail: data,
                            isQueueAction: addToQueue
                        }));
                    } else {
                        statusMessage.textContent = "Error: No recordings found.";
                    }
                } catch (e) {
                    console.error(e);
                    statusMessage.textContent = "Search Error. Try pasting a direct URL.";
                }
                return;
            }
        }

        if (addToQueue) {
            // Fetch title if we only have URL
            statusMessage.textContent = "Adding to archives...";
            try {
                const res = await fetch('/api/search?q=' + videoId);
                const data = await res.json();
                const title = data[0]?.title || "Unknown Track";
                state.queue.push({ id: videoId, title });
                window.dispatchEvent(new Event('queueUpdated'));
                statusMessage.textContent = `Reserved: ${title}`;
            } catch (e) {
                state.queue.push({ id: videoId, title: "Direct URL Import" });
                window.dispatchEvent(new Event('queueUpdated'));
            }
            return;
        }

        // Anti-piracy gate: Limit free plays
        if (state.plays >= 1 && !state.isLoggedIn) {
            window.dispatchEvent(new Event('requestAuth')); // Trigger React Modal
            return;
        }

        state.youtubeVideoId = videoId;
        const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        if (albumArt) {
            albumArt.src = thumbnail;
            albumArt.classList.remove('hidden');
        }

        startPlayback(videoId);
    }

    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length == 11) ? match[2] : null;
    }

    // --- Audio Engine (Reverted to Perfect Hiss Logic from 01edf1c9d) ---
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
        humGain.gain.value = Math.pow(state.knobs.warmth, 3) * 0.4; // Cubic curve for massive max limit

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
        gainNode.gain.value = Math.pow(state.knobs.crackle, 3) * 1.0; // Cubic curve for massive max limit

        source.connect(gainNode);
        gainNode.connect(state.nodes.noiseFilter); // Route through warmth filter

        state.nodes.noiseSource = source;
        state.nodes.noiseGain = gainNode;
        source.start();

        // Ensure hum is active
        if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(state.knobs.warmth, 3) * 0.4;
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

    // --- Knob & Tactile UI Logic ---
    const knobs = document.querySelectorAll('.knob');
    knobs.forEach(knob => {
        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        const controlType = knob.getAttribute('data-control');

        function updateVisual(val) {
            const rotation = (val * 270) - 135; // -135 to +135 degrees
            knob.style.transform = `translateZ(6px) rotate(${rotation}deg)`;
        }

        // Initialize positions
        updateVisual(state.knobs[controlType]);

        knob.addEventListener('mousedown', (e) => {
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

            state.knobs[controlType] = newVal;
            updateVisual(newVal);
            applyAudioParams(controlType, newVal);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
            }
        });
    });

    // Handle Plinth Play Lever
    if (plinthPlayBtn) {
        plinthPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Play lever toggled. Current state:", { isPlaying: state.isPlaying, isPaused: state.isPaused });
            
            // Add temporary active class for tactile feedback
            plinthPlayBtn.classList.add('pushed');
            setTimeout(() => plinthPlayBtn.classList.remove('pushed'), 200);

            if (state.isPlaying && !state.isPaused) {
                pausePlayback();
            } else if (state.isPaused) {
                resumePlayback();
            } else {
                // Not currently playing anything - try to load from input or resume last video
                if (state.youtubeVideoId && !youtubeUrlInput.value.trim()) {
                    // Resume previous record if it exists and input is empty
                    startPlayback(state.youtubeVideoId);
                } else {
                    handleConversion();
                }
            }
        });
    }

    // Handle Skip from Plinth
    if (plinthSkipBtn) {
        plinthSkipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log("Skip lever toggled.");
            
            // Add temporary active class for tactile feedback
            plinthSkipBtn.classList.add('pushed');
            setTimeout(() => plinthSkipBtn.classList.remove('pushed'), 200);

            if (!state.isLoggedIn) {
                statusMessage.textContent = "Log in to skip between archives.";
                window.dispatchEvent(new Event('requestAuth'));
                return;
            }
            skipToNext();
        });
    }

    convertBtn.addEventListener('click', () => {
        handleConversion();
    });

    if (reserveBtn) {
        reserveBtn.addEventListener('click', () => {
            if (!state.isLoggedIn) {
                statusMessage.textContent = "Log in to reserve this to your crate.";
                window.dispatchEvent(new Event('requestAuth'));
                return;
            }
            handleConversion(null, true);
        });
    }

    function applyAudioParams(type, val) {
        if (!state.audioContext) return;

        if (type === 'volume' && state.youtubePlayer) {
            state.youtubePlayer.setVolume(val * 100);
        } else if (type === 'warmth') {
            if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(val, 3) * 0.4;
            if (state.nodes.noiseFilter) state.nodes.noiseFilter.frequency.value = 10000 - (val * 9000); // Deeply muffle high-end
        } else if (type === 'crackle' && state.nodes.noiseGain) {
            state.nodes.noiseGain.gain.value = Math.pow(val, 3) * 1.0;
        }
    }

    // --- Playback State Machine ---
    function startPlayback(videoId) {
        state.isTransitioning = true;
        state.isPlaying = true;
        state.isPaused = false;
        state.plays++;

        // Instantly silence any currently playing track to create the 2-second drop needle gap
        if (state.youtubePlayer && state.youtubePlayer.stopVideo) {
            state.youtubePlayer.stopVideo();
        }
        stopVinylNoise();

        // Visuals
        vinylRecord.classList.add('spinning');
        turntableHero.classList.add('playing');

        plinthPlayBtn.textContent = "⏸";
        plinthPlayBtn.classList.add('active');

        statusMessage.textContent = "Dropping needle...";

        initAudioEngine();
        playNeedleDrop(); // Trigger the initial "buzzing" and needle drop thump

        // Metadata handling
        try {
            fetch('/api/search?q=' + videoId)
                .then(res => res.json())
                .then(data => {
                    const info = data[0];
                    if (info) {
                        sleeveTitle.textContent = info.title;
                        sleeveArtist.textContent = info.author;
                        affiliateBtn.classList.remove('hidden');
                        affiliateBtn.onclick = () => {
                            window.dispatchEvent(new CustomEvent('showShoppingModal', { detail: { title: info.title, id: videoId } }));
                        };
                        // Inform React
                        window.dispatchEvent(new CustomEvent('trackLoaded', { detail: { id: videoId, title: info.title } }));
                    }
                });
        } catch (e) { }

        // Wait 2 seconds for the needle drop and buzzing to complete before starting the music
        setTimeout(() => {
            state.isTransitioning = false;
            if (state.isPlaying && !state.isPaused) {
                playVinylNoise();
                if (state.youtubePlayer && state.youtubePlayer.loadVideoById) {
                    state.youtubePlayer.loadVideoById(videoId);
                    state.youtubePlayer.setVolume(state.knobs.volume * 100);
                    state.youtubePlayer.playVideo();
                }
            }
        }, 2000);

        convertBtn.textContent = "Change Record";
        if (reserveBtn) reserveBtn.classList.remove('hidden');
    }

    function pausePlayback() {
        state.isPaused = true;
        if (state.youtubePlayer) {
            state.youtubePlayer.pauseVideo();
        }
        if (state.audioContext) {
            state.audioContext.suspend();
        }
        plinthPlayBtn.textContent = "⏵";
        plinthPlayBtn.classList.remove('active');
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
        plinthPlayBtn.textContent = "⏸";
        plinthPlayBtn.classList.add('active');
        statusMessage.textContent = "Resuming warmth...";
    }

    function stopPlayback() {
        state.isPlaying = false;
        state.isPaused = false;
        if (state.youtubePlayer) {
            state.youtubePlayer.stopVideo();
        }
        vinylRecord.classList.remove('spinning');
        turntableHero.classList.remove('playing');
        plinthPlayBtn.textContent = "⏵";
        plinthPlayBtn.classList.remove('active');
        stopVinylNoise();
        statusMessage.textContent = "Waiting for record...";
    }
});