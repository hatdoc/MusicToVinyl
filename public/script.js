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
        knobs: { volume: 0.4, warmth: 0.35, crackle: 0.4 },
        queue: [],
        listening_seconds: parseInt(localStorage.getItem('vinyl_listening_seconds')) || 0,
        statsSyncTimer: 0
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
    const randomSpinBtn = document.getElementById('randomSpinBtn');

    // --- Onboarding Tour Logic ---
    const tourContainer = document.getElementById('onboardingTour');
    const openUserGuideNav = document.getElementById('openUserGuideNav');
    const tourTitle = document.getElementById('tourTitle');
    const tourText = document.getElementById('tourText');
    const tourCounter = document.getElementById('tourStepCounter');
    const tourTooltip = document.getElementById('tourTooltip');
    const nextTourBtn = document.getElementById('nextTourBtn');
    const closeTourBtn = document.getElementById('closeTour');

    let currentTourStep = 0;

    const tourSteps = [
        {
            title: "Find & Draw Record",
            text: "Paste a YouTube link or type a song here, then click Draw Record to instantly press it to wax.",
            target: ".converter-interface",
            placement: "top",
            offsetY: -80
        },
        {
            title: "Reserve Tracks",
            text: "Instead of playing immediately, click Reserve to add the track to your Crate queue. Join for free to unlock.",
            target: "#reserveBtn",
            placement: "top",
            offsetY: -80
        },
        {
            title: "Play (⏵) Lever",
            text: "Flick this lever down to start the motor and seamlessly drop the stylus onto your record.",
            target: "#plinthPlayBtn",
            placement: "right",
            offsetX: 80
        },
        {
            title: "Skip (⏭) Lever",
            text: "Instantly skip to the next track in your crate queue without breaking the immersion.",
            target: "#plinthSkipBtn",
            placement: "right",
            offsetX: 80
        },
        {
            title: "Analog Mix Knobs",
            text: "Drag these knobs in a circle. Warmth filters out harsh digital highs. Crackle dials in true generative surface noise.",
            target: ".panel-controls",
            placement: "left",
            offsetX: -80
        },
        {
            title: "Your Vinyl Crate",
            text: "Join for free to permanently save your 10-track crate history and unlock live Discogs vinyl pricing for the tracks you hear.",
            target: "#react-crate-root",
            placement: "left",
            offsetX: -40
        },
        {
            title: "Curated Classics",
            text: "Not sure what to play? Click any cover in this right-sidebar crate to instantly spin a hand-picked analog masterpiece.",
            target: ".curated-section",
            placement: "left",
            offsetX: -40
        },
        {
            title: "Vintage Cardboard Sleeve",
            text: "When a record plays, its authentic weathered yellow cardboard sleeve slides out here, dropping handwritten track metadata directly onto your desk.",
            target: "#turntableWrapper",
            placement: "top",
            offsetY: 20
        },
        {
            title: "Listening Stats",
            text: "Keep track of your total hours spun. Play more tracks to unlock gamification badges like Vinyl Enthusiast and Analog Master.",
            target: "#react-stats-root",
            placement: "bottom",
            offsetY: -10
        }
    ];

    function showTourStep(index) {
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
            if (el.getAttribute('data-tour-pos')) {
                el.style.position = '';
                el.removeAttribute('data-tour-pos');
            }
        });

        if (index >= tourSteps.length) {
            endTour();
            return;
        }

        const step = tourSteps[index];
        const targetEl = document.querySelector(step.target);

        if (!targetEl) {
            showTourStep(index + 1);
            return;
        }

        // Ensure z-index works without breaking absolute layouts
        const compStyle = window.getComputedStyle(targetEl);
        if (compStyle.position === 'static') {
            targetEl.setAttribute('data-tour-pos', 'true');
            targetEl.style.position = 'relative';
        }

        targetEl.classList.add('tour-highlight');
        tourTitle.textContent = step.title;
        tourText.textContent = step.text;
        tourCounter.textContent = `${index + 1}/${tourSteps.length}`;
        nextTourBtn.textContent = index === tourSteps.length - 1 ? "Start Listening" : "Next ➔";

        tourTooltip.setAttribute('data-placement', step.placement);

        // Exact positional tracking
        const rect = targetEl.getBoundingClientRect();
        let top = 0, left = 0;

        // Account for current rotation/transform scaling context
        if (step.placement === 'top') {
            top = rect.top - tourTooltip.offsetHeight + (step.offsetY || -20);
            left = rect.left + (rect.width / 2) - (tourTooltip.offsetWidth / 2);
        } else if (step.placement === 'bottom') {
            top = rect.bottom + (step.offsetY || 20);
            left = rect.left + (rect.width / 2) - (tourTooltip.offsetWidth / 2);
        } else if (step.placement === 'left') {
            top = rect.top + (rect.height / 2) - (tourTooltip.offsetHeight / 2);
            left = rect.left - tourTooltip.offsetWidth + (step.offsetX || -20);
        } else if (step.placement === 'right') {
            top = rect.top + (rect.height / 2) - (tourTooltip.offsetHeight / 2);
            left = rect.right + (step.offsetX || 20);
        }

        // Window bounding collision guard
        top = Math.max(10, Math.min(top, window.innerHeight - tourTooltip.offsetHeight - 10));
        left = Math.max(10, Math.min(left, window.innerWidth - tourTooltip.offsetWidth - 10));

        tourTooltip.style.top = `${top}px`;
        tourTooltip.style.left = `${left}px`;
    }

    function startTour() {
        if (tourContainer) tourContainer.classList.remove('hidden');
        currentTourStep = 0;
        showTourStep(0);
    }

    function endTour() {
        if (tourContainer) tourContainer.classList.add('hidden');
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
            if (el.getAttribute('data-tour-pos')) {
                el.style.position = '';
                el.removeAttribute('data-tour-pos');
            }
        });
    }

    if (openUserGuideNav) {
        openUserGuideNav.addEventListener('click', (e) => {
            e.preventDefault();
            startTour();
        });
    }

    if (nextTourBtn) {
        nextTourBtn.addEventListener('click', () => {
            currentTourStep++;
            showTourStep(currentTourStep);
        });
    }

    if (closeTourBtn) closeTourBtn.addEventListener('click', endTour);

    // Show on first visit
    if (!localStorage.getItem('vinyl_tour_seen')) {
        startTour();
        localStorage.setItem('vinyl_tour_seen', 'true');
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
            const videoData = event.target.getVideoData();
            statusMessage.textContent = `Now Playing: ${videoData.title || "Analog Stream"}`;
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
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }

        // 1. Vinyl Noise Buffer (Enhanced Crackles, Hiss, and Rumble)
        const bufferSize = state.audioContext.sampleRate * 6; // 6 seconds for less repetition
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const white = (Math.random() * 2 - 1) * 0.3; // Much louder baseline internal signal before gain attenuation
            let crackle = 0;
            if (Math.random() < 0.0015) { crackle = (Math.random() * 2 - 1) * 0.5; }
            let pop = 0;
            if (Math.random() < 0.0002) { pop = (Math.random() * 2 - 1) * 2.5; }
            const rumble = Math.sin(i * 0.002) * 0.1;

            data[i] = white + crackle + pop + rumble;
        }
        state.nodes.noiseBuffer = buffer;

        // 2. Global Noise Filter (Controlled by Warmth)
        const noiseFilter = state.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        // Inverted Warmth: min val -> max warmth sound, max val -> min warmth sound.
        noiseFilter.frequency.value = 10000 - ((1 - state.knobs.warmth) * 8000);

        state.nodes.noiseFilter = noiseFilter;

        // 3. Continuous Low Frequency Hum
        const humOsc = state.audioContext.createOscillator();
        humOsc.type = 'sine'; // Smooth subtle sine
        humOsc.frequency.value = 50; // Deep 50Hz hum

        const humGain = state.audioContext.createGain();
        humGain.gain.value = Math.pow(1 - state.knobs.warmth, 3) * 0.08; // Inverted max/min mapping

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

        // Scale burst volume with user's crackle preference.
        const burstStart = Math.pow(state.knobs.crackle, 2) * 0.25;
        const burstEnd = Math.pow(state.knobs.crackle, 2) * 0.15; // Matches the continuous loop volume

        // Avoid exponentialRamp throwing if crackle is 0, use linear ramp
        burstGain.gain.setValueAtTime(burstStart, ctx.currentTime);
        burstGain.gain.linearRampToValueAtTime(burstEnd, ctx.currentTime + 2.0);

        burstSource.connect(burstGain);
        burstGain.connect(state.nodes.noiseFilter); // Route through warmth filter
        burstSource.start();
        burstSource.stop(ctx.currentTime + 2.0); // Stop right as continuous loop starts
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
        gainNode.gain.value = Math.pow(state.knobs.crackle, 2) * 0.15; // Exponential curve for detailed granular control at low values, strict 0.15 max limit

        source.connect(gainNode);
        gainNode.connect(state.nodes.noiseFilter); // Route through warmth filter

        state.nodes.noiseSource = source;
        state.nodes.noiseGain = gainNode;
        source.start();

        // Ensure hum is active using strict custom rule 0.08 profile
        if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(1 - state.knobs.warmth, 3) * 0.08; // Inverted mapping
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
        let centerX = 0;
        let centerY = 0;
        const controlType = knob.getAttribute('data-control');

        function updateVisual(val) {
            const rotation = (val * 270) - 135; // -135 to +135 degrees
            knob.style.setProperty('--knob-rot', `${rotation}deg`);
        }

        // Initialize positions
        updateVisual(state.knobs[controlType]);

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = knob.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            document.body.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
            updateRotation(e);
        });

        function updateRotation(e) {
            const x = e.clientX - centerX;
            const y = e.clientY - centerY;

            // Un-squash the Y axis to match the CSS rotateX(45deg) perspective correctly
            const unSquashedY = y / Math.cos(45 * Math.PI / 180);

            let angle = Math.atan2(unSquashedY, x) * (180 / Math.PI);

            // Map angle so Top (-90) becomes 0, Right (0) becomes 90
            let adjustedAngle = angle + 90;
            if (adjustedAngle > 180) adjustedAngle -= 360;
            if (adjustedAngle < -180) adjustedAngle += 360;

            // Physical hard stops (clamp at bottom dead zone)
            if (adjustedAngle > 135 && adjustedAngle <= 180) adjustedAngle = 135;
            if (adjustedAngle < -135 && adjustedAngle > -180) adjustedAngle = -135;

            let newVal = (adjustedAngle + 135) / 270;
            newVal = Math.max(0, Math.min(1, newVal));

            if (Math.abs(newVal - state.knobs[controlType]) > 0.5) return;

            state.knobs[controlType] = newVal;
            updateVisual(newVal);
            applyAudioParams(controlType, newVal);
        }

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateRotation(e);
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
                document.getElementById('proModal').classList.remove('hidden');
                return;
            }
            skipToNext();
        });
    }

    convertBtn.addEventListener('click', () => {
        handleConversion();
    });

    // --- Curated Track Suggestions (Randomized) ---
    const curatedMusic = {
        "R&B / Soul": [
            { id: "uQFVqltOXRg", title: "Daniel Caesar", sub: "Get You" },
            { id: "uzS3WG6__G4", title: "Frank Ocean", sub: "Pink + White" },
            { id: "U1wFjItE2y0", title: "Steve Lacy", sub: "Dark Red" },
            { id: "r9hEDhyt_Lg", title: "Mac Ayres", sub: "Easy" },
            { id: "6WzC1Pymh1Q", title: "Daniel Caesar", sub: "Japanese Denim" },
            { id: "vBgiPtoXQOA", title: "H.E.R.", sub: "Best Part" },
            { id: "-CPCs7vVzBg", title: "Erykah Badu", sub: "On & On" },
            { id: "zOyjbbt_0x4", title: "D'Angelo", sub: "Brown Sugar" },
            { id: "4TYv2PhG89A", title: "Sade", sub: "Smooth Operator" },
            { id: "tB0vD_PIfY0", title: "Bruno Major", sub: "Easily" },
            { id: "by3yR8qUP0s", title: "Khalid", sub: "Location" },
            { id: "K3Qzzggn--s", title: "Joji", sub: "Slow Dancing" }
        ],
        "Indie / Acoustic": [
            { id: "n-ccgXyAxcY", title: "The Black Skirts", sub: "Everything" },
            { id: "FrcrYQ-3SCA", title: "Phum Viphurit", sub: "La La La" },
            { id: "tO4dxvguQDk", title: "Norah Jones", sub: "Don't Know Why" },
            { id: "pXWwG91T6Jk", title: "Mac DeMarco", sub: "Chamber Of Reflection" },
            { id: "mng1GvS43Qc", title: "Clairo", sub: "Pretty Girl" },
            { id: "Z9e7kHn8uA8", title: "Rex Orange", sub: "Sunflower" },
            { id: "TWcyIpul8Cg", title: "Bon Iver", sub: "Holocene" },
            { id: "a8aPyBr-_S0", title: "Iron & Wine", sub: "Naked As We Came" },
            { id: "y8AWFf7EAc4", title: "Jeff Buckley", sub: "Hallelujah" },
            { id: "u5CVsCnxyXg", title: "Radiohead", sub: "No Surprises" },
            { id: "ImKY6TZEyrI", title: "Mazzy Star", sub: "Fade Into You" }
        ],
        "Lofi / Jazz": [
            { id: "3zsQsKjIuWM", title: "Chet Baker", sub: "I Fall In Love Too Easily" },
            { id: "Hrr3dp7zHQY", title: "Ryo Fukui", sub: "Scenery" },
            { id: "r-Z8KuwI7Gc", title: "Bill Evans", sub: "Autumn Leaves" },
            { id: "NEqH1S2L8A4", title: "Lofi Jazz", sub: "Cafe Playlist" },
            { id: "PoPL7BExSQU", title: "Miles Davis", sub: "Blue In Green" },
            { id: "sRQamHcgA1U", title: "John Coltrane", sub: "In A Sentimental Mood" },
            { id: "tT9Eh8DP7cU", title: "Dave Brubeck", sub: "Take Five" },
            { id: "g9hwjQBQFIo", title: "Nujabes", sub: "Aruarian Dance" },
            { id: "8PAOly_4XFk", title: "J Dilla", sub: "Life" },
            { id: "ZgP0aUKnmNw", title: "Mndsgn", sub: "Camelblues" },
            { id: "-wWbA-gmb4E", title: "Thelonious Monk", sub: "'Round Midnight" },
            { id: "Eeratv7ZKkU", title: "Nujabes Vibe", sub: "Lofi Jazz Playlist" }
        ]
    };

    const curatedContainer = document.getElementById('curatedLists');
    if (curatedContainer) {
        for (const [genre, tracks] of Object.entries(curatedMusic)) {
            // Shuffle and pick 2 per category
            const shuffled = [...tracks].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 2);

            let html = `<div class="curated-genre">
                <h4 class="genre-title">${genre}</h4>
                <div class="genre-list">`;

            selected.forEach(t => {
                html += `
                <div class="rec-card suggestion-tag" data-query="${t.title} - ${t.sub}" title="Play: ${t.title} - ${t.sub}">
                    <img src="https://i.ytimg.com/vi/${t.id}/0.jpg" alt="${t.title}">
                    <div class="rec-info">
                        <span class="rec-title">${t.title}</span>
                        <span class="rec-sub">${t.sub}</span>
                    </div>
                </div>
                `;
            });

            html += `</div></div>`;
            curatedContainer.insertAdjacentHTML('beforeend', html);
        }
    }

    // Mobile Accordion Logic for Curated Sidebar
    const curatedToggle = document.getElementById('curatedToggle');
    const curatedArrow = document.getElementById('curatedArrow');
    if (curatedToggle && curatedContainer && curatedArrow) {
        curatedToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                curatedContainer.classList.toggle('mobile-collapsed');
                curatedArrow.textContent = curatedContainer.classList.contains('mobile-collapsed') ? '▼' : '▲';
            }
        });
    }

    // Use event delegation so dynamic elements trigger correctly
    document.body.addEventListener('click', (e) => {
        const tag = e.target.closest('.suggestion-tag');
        if (tag) {
            youtubeUrlInput.value = tag.getAttribute('data-query');
            convertBtn.click();
        }
    });

    if (reserveBtn) {
        reserveBtn.addEventListener('click', () => {
            if (!state.isLoggedIn) {
                document.getElementById('proModal').classList.remove('hidden');
                return;
            }
            handleConversion(null, true);
        });
    }

    // Random Spin Logic
    if (randomSpinBtn) {
        randomSpinBtn.addEventListener('click', () => {
            if (!curatedMusic) return;
            const allTracks = Object.values(curatedMusic).flat();
            if (allTracks.length === 0) return;
            const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
            youtubeUrlInput.value = `${randomTrack.title} - ${randomTrack.sub}`;
            convertBtn.click();
        });
    }

    // --- Keyboard Shortcuts Engine ---
    document.addEventListener('keydown', (e) => {
        // Ignore if user is actively typing
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (plinthPlayBtn) plinthPlayBtn.click();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (plinthSkipBtn) plinthSkipBtn.click();
        } else if (e.key === '/') {
            e.preventDefault();
            if (youtubeUrlInput) youtubeUrlInput.focus();
        }
    });

    // PRO Modal Handlers
    const closeProModalBtn = document.getElementById('closeProModal');
    if (closeProModalBtn) {
        closeProModalBtn.addEventListener('click', () => {
            document.getElementById('proModal').classList.add('hidden');
        });
    }

    const proAuthBtn = document.getElementById('proAuthBtn');
    if (proAuthBtn) {
        proAuthBtn.addEventListener('click', () => {
            document.getElementById('proModal').classList.add('hidden');
            window.dispatchEvent(new Event('requestAuth'));
        });
    }

    function applyAudioParams(type, val) {
        if (!state.audioContext) return;

        if (type === 'volume' && state.youtubePlayer) {
            state.youtubePlayer.setVolume(val * 100);
        } else if (type === 'warmth') {
            const invertedVal = 1 - val;
            if (state.nodes.humGain) state.nodes.humGain.gain.value = Math.pow(invertedVal, 3) * 0.08;
            if (state.nodes.noiseFilter) state.nodes.noiseFilter.frequency.value = 10000 - (invertedVal * 8000);
        } else if (type === 'crackle' && state.nodes.noiseGain) {
            state.nodes.noiseGain.gain.value = Math.pow(val, 2) * 0.15;
        }
        if (typeof updateShareUrl === 'function') updateShareUrl();
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
            if (state.isPlaying) {
                const tryPlay = () => {
                    if (state.youtubePlayer && typeof state.youtubePlayer.loadVideoById === "function") {
                        state.youtubePlayer.loadVideoById(videoId);
                        state.youtubePlayer.setVolume(state.knobs.volume * 100);
                        if (state.isPaused) {
                            state.youtubePlayer.pauseVideo();
                        } else {
                            playVinylNoise();
                            state.youtubePlayer.playVideo();
                        }
                    } else {
                        setTimeout(tryPlay, 500);
                    }
                };
                tryPlay();
            }
        }, 2000);

        convertBtn.textContent = "Change Record";
        if (reserveBtn) reserveBtn.classList.remove('hidden');
    }

    function pausePlayback() {
        state.isPaused = true;
        if (state.youtubePlayer && typeof state.youtubePlayer.pauseVideo === "function") {
            state.youtubePlayer.pauseVideo();
        }
        if (state.audioContext) {
            state.audioContext.suspend();
        }
        plinthPlayBtn.textContent = "⏵";
        plinthPlayBtn.classList.remove('active');
        vinylRecord.classList.remove('spinning');
        turntableHero.classList.remove('playing');
        statusMessage.textContent = "Playback Paused.";
    }

    function resumePlayback() {
        state.isPaused = false;
        if (state.youtubePlayer && typeof state.youtubePlayer.playVideo === "function") {
            state.youtubePlayer.playVideo();
        }
        if (state.audioContext) {
            state.audioContext.resume();
        }
        plinthPlayBtn.textContent = "⏸";
        plinthPlayBtn.classList.add('active');
        vinylRecord.classList.add('spinning');
        turntableHero.classList.add('playing');
        statusMessage.textContent = "Resuming warmth...";
    }

    function stopPlayback() {
        state.isPlaying = false;
        state.isPaused = false;
        if (state.youtubePlayer && typeof state.youtubePlayer.stopVideo === "function") {
            state.youtubePlayer.stopVideo();
        }
        vinylRecord.classList.remove('spinning');
        turntableHero.classList.remove('playing');
        plinthPlayBtn.textContent = "⏵";
        plinthPlayBtn.classList.remove('active');
        stopVinylNoise();
        statusMessage.textContent = "Waiting for record...";
    }

    // --- Sidebar Unhide Logic ---
    const unhideSidebarBtn = document.getElementById('unhideSidebar');
    if (unhideSidebarBtn) {
        unhideSidebarBtn.addEventListener('click', () => {
            document.body.classList.remove('sidebar-hidden');
        });
    }

    // --- Deep-Linking ---
    const urlParams = new URLSearchParams(window.location.search);
    const deepLinkVideoId = urlParams.get('v');
    const parseVol = urlParams.get('vol');
    const parseWarm = urlParams.get('warm');
    const parseCrack = urlParams.get('crack');
    const parseAmb = urlParams.get('amb');

    if (parseVol) state.knobs.volume = parseFloat(parseVol);
    if (parseWarm) state.knobs.warmth = parseFloat(parseWarm);
    if (parseCrack) state.knobs.crackle = parseFloat(parseCrack);
    
    // Apply visual knob rotation immediately if DOM exists
    const updateVisual = (knobDiv, val) => {
        if (!knobDiv) return;
        const rotation = (val * 270) - 135;
        knobDiv.style.setProperty('--knob-rot', `${rotation}deg`);
    };
    updateVisual(document.querySelector('.knob[data-control="volume"]'), state.knobs.volume);
    updateVisual(document.querySelector('.knob[data-control="warmth"]'), state.knobs.warmth);
    updateVisual(document.querySelector('.knob[data-control="crackle"]'), state.knobs.crackle);

    if (parseAmb) {
        // Delay starting ambiances just slightly so audio engine doesn't trip user gesture rules too early
        setTimeout(() => {
            const ambs = parseAmb.split(',');
            if (ambs.includes('rain') && typeof startRain === 'function') startRain();
            if (ambs.includes('fire') && typeof startFire === 'function') startFire();
            if (ambs.includes('ocean') && typeof startOcean === 'function') startOcean();
            if (ambs.includes('city') && typeof startCity === 'function') startCity();
            if (ambs.includes('thunder') && typeof startThunder === 'function') startThunder();
            if (ambs.includes('wind') && typeof startWind === 'function') startWind();
        }, 1200);
    }

    if (deepLinkVideoId) {
        setTimeout(() => {
            statusMessage.textContent = "Loading deep-linked pressing...";
            handleConversion(deepLinkVideoId);
        }, 500); // Small delay to let initial animations settle
    }

    // --- Stats & Labels Integrations ---
    setInterval(() => {
        if (state.isPlaying && !state.isPaused) {
            state.listening_seconds += 1;
            state.statsSyncTimer += 1;
            
            localStorage.setItem('vinyl_listening_seconds', state.listening_seconds);
            
            if (state.statsSyncTimer >= 60) {
                state.statsSyncTimer = 0;
                if (state.isLoggedIn && window.supabase) {
                    window.supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            window.supabase.from('users').update({ listening_seconds: state.listening_seconds }).eq('id', user.id).then();
                        }
                    });
                }
            }
            window.dispatchEvent(new CustomEvent('statsUpdated', { detail: state.listening_seconds }));
        }
    }, 1000);

    // Remote Pull when logging in
    window.addEventListener('authSuccess', () => {
        if (window.supabase) {
            window.supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    window.supabase.from('users').select('listening_seconds').eq('id', user.id).single().then(({ data, error }) => {
                        if (data && !error) {
                            if (data.listening_seconds && data.listening_seconds > state.listening_seconds) {
                                state.listening_seconds = data.listening_seconds;
                                localStorage.setItem('vinyl_listening_seconds', state.listening_seconds);
                            }
                            window.dispatchEvent(new CustomEvent('statsUpdated', { detail: state.listening_seconds }));
                        }
                    });
                }
            });
        }
    });
    // --- Needle-Drop Seeking ---
    const groovesEl = document.querySelector('.grooves');
    if (groovesEl) {
        groovesEl.addEventListener('click', (e) => {
            if (!state.isPlaying || !state.youtubePlayer || typeof state.youtubePlayer.getDuration !== 'function') return;

            const rect = groovesEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            const maxRadius = rect.width / 2;
            const minRadius = maxRadius * 0.1; // inner limit
            
            if (distance > maxRadius) return;
            
            // 0% at outer edge, 100% at inner edge
            const rawPercentage = (maxRadius - distance) / (maxRadius - minRadius);
            const boundedPercentage = Math.max(0, Math.min(1, rawPercentage));

            const duration = state.youtubePlayer.getDuration();
            if (duration) {
                const seekTime = duration * boundedPercentage;
                state.youtubePlayer.seekTo(seekTime, true);
                if (typeof playNeedleDrop === 'function') playNeedleDrop();
            }
        });
    }

    // --- Room Ambiance Generator ---
    const ambNodes = {
        rain: null,
        fire: null,
        thunder: null,
        wind: null,
        rainGain: null,
        fireGain: null,
        thunderGain: null,
        windGain: null,
        rainPlaying: false,
        firePlaying: false,
        thunderPlaying: false,
        windPlaying: false
    };

    function startRain() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.rainPlaying) return;
        ambNodes.rainPlaying = true;
        
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        ambNodes.rain = state.audioContext.createBufferSource();
        ambNodes.rain.buffer = buffer;
        ambNodes.rain.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Deep rumble
        
        ambNodes.rainGain = state.audioContext.createGain();
        ambNodes.rainGain.gain.value = 0.5;
        
        ambNodes.rain.connect(filter);
        filter.connect(ambNodes.rainGain);
        ambNodes.rainGain.connect(state.audioContext.destination);
        
        ambNodes.rain.start();
        document.getElementById('toggleRainBtn')?.classList.add('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function stopRain() {
        if (ambNodes.rain) {
            ambNodes.rain.stop();
            ambNodes.rain.disconnect();
            ambNodes.rain = null;
        }
        if (ambNodes.rainGain) {
            ambNodes.rainGain.disconnect();
            ambNodes.rainGain = null;
        }
        ambNodes.rainPlaying = false;
        document.getElementById('toggleRainBtn')?.classList.remove('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function startFire() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.firePlaying) return;
        ambNodes.firePlaying = true;
        
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            if (Math.random() < 0.001) {
                data[i] = (Math.random() * 2 - 1) * 2.0;
            }
        }
        
        ambNodes.fire = state.audioContext.createBufferSource();
        ambNodes.fire.buffer = buffer;
        ambNodes.fire.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; 
        
        ambNodes.fireGain = state.audioContext.createGain();
        ambNodes.fireGain.gain.value = 0.8;
        
        ambNodes.fire.connect(filter);
        filter.connect(ambNodes.fireGain);
        ambNodes.fireGain.connect(state.audioContext.destination);
        
        ambNodes.fire.start();
        document.getElementById('toggleFireBtn')?.classList.add('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function stopFire() {
        if (ambNodes.fire) {
            ambNodes.fire.stop();
            ambNodes.fire.disconnect();
            ambNodes.fire = null;
        }
        if (ambNodes.fireGain) {
            ambNodes.fireGain.disconnect();
            ambNodes.fireGain = null;
        }
        ambNodes.firePlaying = false;
        document.getElementById('toggleFireBtn')?.classList.remove('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function startOcean() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.oceanPlaying) return;
        ambNodes.oceanPlaying = true;
        
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        ambNodes.ocean = state.audioContext.createBufferSource();
        ambNodes.ocean.buffer = buffer;
        ambNodes.ocean.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 200; 
        filter.Q.value = 0.5;

        // An LFO to sweep the frequency up and down to simulate waves crashing and receding
        const filterLfo = state.audioContext.createOscillator();
        filterLfo.type = 'sine';
        filterLfo.frequency.value = 0.12; // ~8.3 second cycle
        
        const filterLfoGain = state.audioContext.createGain();
        filterLfoGain.gain.value = 400; // Sweep up to 600Hz
        
        filterLfo.connect(filterLfoGain);
        filterLfoGain.connect(filter.frequency);

        ambNodes.oceanGain = state.audioContext.createGain();
        ambNodes.oceanGain.gain.value = 0.5;
        
        ambNodes.ocean.connect(filter);
        filter.connect(ambNodes.oceanGain);
        ambNodes.oceanGain.connect(state.audioContext.destination);
        
        ambNodes.ocean.start();
        filterLfo.start();
        
        ambNodes.oceanLfo = filterLfo;
        document.getElementById('toggleOceanBtn')?.classList.add('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function stopOcean() {
        if (ambNodes.ocean) {
            ambNodes.ocean.stop();
            ambNodes.ocean.disconnect();
            ambNodes.ocean = null;
        }
        if (ambNodes.oceanLfo) {
            ambNodes.oceanLfo.stop();
            ambNodes.oceanLfo.disconnect();
            ambNodes.oceanLfo = null;
        }
        if (ambNodes.oceanGain) {
            ambNodes.oceanGain.disconnect();
            ambNodes.oceanGain = null;
        }
        ambNodes.oceanPlaying = false;
        document.getElementById('toggleOceanBtn')?.classList.remove('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }
    function startThunder() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.thunderPlaying) return;
        ambNodes.thunderPlaying = true;
        
        // Thunder is low frequency rumble bursts on top of noise
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.01 * white)) / 1.01;
            lastOut = data[i];
        }
        
        ambNodes.thunder = state.audioContext.createBufferSource();
        ambNodes.thunder.buffer = buffer;
        ambNodes.thunder.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        
        // Random volume variations for thunder claps
        const lfo = state.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.03; // very slow
        
        const lfoGain = state.audioContext.createGain();
        lfoGain.gain.value = 80;
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        ambNodes.thunderGain = state.audioContext.createGain();
        ambNodes.thunderGain.gain.value = 0.9;
        
        ambNodes.thunder.connect(filter);
        filter.connect(ambNodes.thunderGain);
        ambNodes.thunderGain.connect(state.audioContext.destination);
        
        ambNodes.thunder.start();
        lfo.start();
        ambNodes.thunderLfo = lfo;
        document.getElementById('toggleThunderBtn')?.classList.add('active');
        updateShareUrl();
    }

    function stopThunder() {
        if (ambNodes.thunder) { ambNodes.thunder.stop(); ambNodes.thunder.disconnect(); ambNodes.thunder = null; }
        if (ambNodes.thunderLfo) { ambNodes.thunderLfo.stop(); ambNodes.thunderLfo.disconnect(); ambNodes.thunderLfo = null; }
        if (ambNodes.thunderGain) { ambNodes.thunderGain.disconnect(); ambNodes.thunderGain = null; }
        ambNodes.thunderPlaying = false;
        document.getElementById('toggleThunderBtn')?.classList.remove('active');
        updateShareUrl();
    }

    function startWind() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.windPlaying) return;
        ambNodes.windPlaying = true;
        
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // compensate gain
            b6 = white * 0.115926;
        }
        
        ambNodes.wind = state.audioContext.createBufferSource();
        ambNodes.wind.buffer = buffer;
        ambNodes.wind.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        
        const lfo = state.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08;
        
        const lfoGain = state.audioContext.createGain();
        lfoGain.gain.value = 250;
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        ambNodes.windGain = state.audioContext.createGain();
        ambNodes.windGain.gain.value = 0.5;
        
        ambNodes.wind.connect(filter);
        filter.connect(ambNodes.windGain);
        ambNodes.windGain.connect(state.audioContext.destination);
        
        ambNodes.wind.start();
        lfo.start();
        ambNodes.windLfo = lfo;
        document.getElementById('toggleWindBtn')?.classList.add('active');
        updateShareUrl();
    }

    function stopWind() {
        if (ambNodes.wind) { ambNodes.wind.stop(); ambNodes.wind.disconnect(); ambNodes.wind = null; }
        if (ambNodes.windLfo) { ambNodes.windLfo.stop(); ambNodes.windLfo.disconnect(); ambNodes.windLfo = null; }
        if (ambNodes.windGain) { ambNodes.windGain.disconnect(); ambNodes.windGain = null; }
        ambNodes.windPlaying = false;
        document.getElementById('toggleWindBtn')?.classList.remove('active');
        updateShareUrl();
    }


    function startCity() {
        if (!state.audioContext) initAudioEngine();
        if (ambNodes.cityPlaying) return;
        ambNodes.cityPlaying = true;
        
        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            // Very deep brown noise simulation for distant traffic rumble
            data[i] = (lastOut + (0.005 * white)) / 1.005;
            lastOut = data[i];
        }
        
        ambNodes.city = state.audioContext.createBufferSource();
        ambNodes.city.buffer = buffer;
        ambNodes.city.loop = true;
        
        const filter = state.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150; 
        
        const lfo = state.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // very slow subtle rumble fluctuation
        
        const lfoGain = state.audioContext.createGain();
        lfoGain.gain.value = 50;
        
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        ambNodes.cityGain = state.audioContext.createGain();
        ambNodes.cityGain.gain.value = 0.7;
        
        ambNodes.city.connect(filter);
        filter.connect(ambNodes.cityGain);
        ambNodes.cityGain.connect(state.audioContext.destination);
        
        ambNodes.city.start();
        lfo.start();
        ambNodes.cityLfo = lfo;
        document.getElementById('toggleCityBtn')?.classList.add('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    function stopCity() {
        if (ambNodes.city) {
            ambNodes.city.stop();
            ambNodes.city.disconnect();
            ambNodes.city = null;
        }
        if (ambNodes.cityLfo) {
            ambNodes.cityLfo.stop();
            ambNodes.cityLfo.disconnect();
            ambNodes.cityLfo = null;
        }
        if (ambNodes.cityGain) {
            ambNodes.cityGain.disconnect();
            ambNodes.cityGain = null;
        }
        ambNodes.cityPlaying = false;
        document.getElementById('toggleCityBtn')?.classList.remove('active');
        if(typeof updateShareUrl === 'function') updateShareUrl();
    }

    const toggleRainBtn = document.getElementById('toggleRainBtn');
    if (toggleRainBtn) {
        toggleRainBtn.addEventListener('click', () => {
            if (ambNodes.rainPlaying) stopRain();
            else startRain();
        });
    }

    const toggleFireBtn = document.getElementById('toggleFireBtn');
    if (toggleFireBtn) {
        toggleFireBtn.addEventListener('click', () => {
            if (ambNodes.firePlaying) stopFire();
            else startFire();
        });
    }

    const toggleOceanBtn = document.getElementById('toggleOceanBtn');
    if (toggleOceanBtn) {
        toggleOceanBtn.addEventListener('click', () => {
            if (ambNodes.oceanPlaying) stopOcean();
            else startOcean();
        });
    }

    const toggleCityBtn = document.getElementById('toggleCityBtn');
    if (toggleCityBtn) {
        toggleCityBtn.addEventListener('click', () => {
            if (ambNodes.cityPlaying) stopCity();
            else startCity();
        });
    }
    const toggleThunderBtn = document.getElementById('toggleThunderBtn');
    if (toggleThunderBtn) {
        toggleThunderBtn.addEventListener('click', () => {
            if (ambNodes.thunderPlaying) stopThunder();
            else startThunder();
        });
    }

    const toggleWindBtn = document.getElementById('toggleWindBtn');
    if (toggleWindBtn) {
        toggleWindBtn.addEventListener('click', () => {
            if (ambNodes.windPlaying) stopWind();
            else startWind();
        });
    }

    // --- Pomodoro Focus Timer ---
    let focusTimer = null;
    let defaultFocusMinutes = 25;
    let focusTimeRemaining = defaultFocusMinutes * 60;
    let isTimerRunning = false;
    const timerDisplay = document.getElementById('focusTimerDisplay');
    const timerToggleBtn = document.getElementById('timerToggleBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const timerWidget = document.getElementById('focusTimerWidget');
    const toggleTimerPanelBtn = document.getElementById('toggleTimerPanelBtn');
    const closeTimerWidgetBtn = document.getElementById('closeTimerWidgetBtn');

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        const m = Math.floor(focusTimeRemaining / 60);
        const s = focusTimeRemaining % 60;
        timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (timerToggleBtn && timerResetBtn) {
        timerToggleBtn.addEventListener('click', () => {
            if (isTimerRunning) {
                clearInterval(focusTimer);
                isTimerRunning = false;
                timerToggleBtn.textContent = 'Start';
            } else {
                isTimerRunning = true;
                timerToggleBtn.textContent = 'Pause';
                focusTimer = setInterval(() => {
                    if (focusTimeRemaining > 0) {
                        focusTimeRemaining--;
                        updateTimerDisplay();
                    } else {
                        clearInterval(focusTimer);
                        isTimerRunning = false;
                        timerToggleBtn.textContent = 'Start';
                        // Subtle chime
                        if (state.audioContext) {
                            const osc = state.audioContext.createOscillator();
                            const gain = state.audioContext.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(440, state.audioContext.currentTime);
                            gain.gain.setValueAtTime(0, state.audioContext.currentTime);
                            gain.gain.linearRampToValueAtTime(0.5, state.audioContext.currentTime + 0.1);
                            gain.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 3);
                            osc.connect(gain);
                            gain.connect(state.audioContext.destination);
                            osc.start();
                            osc.stop(state.audioContext.currentTime + 3);
                        }
                    }
                }, 1000);
            }
        });

        timerResetBtn.addEventListener('click', () => {
            clearInterval(focusTimer);
            isTimerRunning = false;
            focusTimeRemaining = defaultFocusMinutes * 60;
            updateTimerDisplay();
            timerToggleBtn.textContent = 'Start';
        });

        timerDisplay.addEventListener('click', () => {
            if (isTimerRunning) return; // Don't edit while running
            const currentMin = Math.floor(focusTimeRemaining / 60);
            const input = prompt("Enter focus time in minutes (1-120):", currentMin);
            if (input !== null) {
                const mins = parseInt(input, 10);
                if (!isNaN(mins) && mins > 0 && mins <= 120) {
                    defaultFocusMinutes = mins;
                    focusTimeRemaining = defaultFocusMinutes * 60;
                    updateTimerDisplay();
                } else {
                    alert("Please enter a valid number of minutes between 1 and 120.");
                }
            }
        });

        if (toggleTimerPanelBtn && timerWidget) {
            toggleTimerPanelBtn.addEventListener('click', () => {
                const isHidden = timerWidget.style.display === 'none';
                if (isHidden) {
                    timerWidget.style.display = 'flex';
                    toggleTimerPanelBtn.classList.add('active');
                } else {
                    timerWidget.style.display = 'none';
                    toggleTimerPanelBtn.classList.remove('active');
                }
            });
        }

        if (closeTimerWidgetBtn && timerWidget && toggleTimerPanelBtn) {
            closeTimerWidgetBtn.addEventListener('click', () => {
                timerWidget.style.display = 'none';
                toggleTimerPanelBtn.classList.remove('active');
            });
        }

        updateTimerDisplay();
    }

    // --- Share URL Sync (Global function used by knobs and ambiances) ---
    window.updateShareUrl = function() {
        const urlParams = new URLSearchParams(window.location.search);
        if (state.youtubeVideoId) {
            urlParams.set('v', state.youtubeVideoId);
        }
        urlParams.set('vol', state.knobs.volume.toFixed(2));
        urlParams.set('warm', state.knobs.warmth.toFixed(2));
        urlParams.set('crack', state.knobs.crackle.toFixed(2));
        
        const ambs = [];
        if (ambNodes.rainPlaying) ambs.push('rain');
        if (ambNodes.firePlaying) ambs.push('fire');
        if (ambNodes.oceanPlaying) ambs.push('ocean');
        if (ambNodes.cityPlaying) ambs.push('city');
        if (ambNodes.thunderPlaying) ambs.push('thunder');
        if (ambNodes.windPlaying) ambs.push('wind');
        
        if (ambs.length > 0) {
            urlParams.set('amb', ambs.join(','));
        } else {
            urlParams.delete('amb');
        }

        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState(null, '', newUrl);
    };

});