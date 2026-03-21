document.addEventListener('DOMContentLoaded', () => {
    // --- State & Config ---
    const state = {
        plays: 0,
        isLoggedIn: false, // In a real app, check localStorage or cookie
        isPlaying: false,
        audioContext: null,
        nodes: {},
        youtubePlayer: null,
        youtubeVideoId: null
    };

    // --- DOM Elements ---
    const vinylRecord = document.getElementById('vinylRecord');
    const tonearm = document.getElementById('tonearm');
    const albumArt = document.getElementById('albumArt');
    const convertBtn = document.getElementById('convertBtn');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const statusMessage = document.getElementById('statusMessage');
    const authGate = document.getElementById('authGate');
    const signupForm = document.getElementById('signupForm');
    const userEmailInput = document.getElementById('userEmail');

    // --- Initialization ---
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
        state.youtubePlayer = new YT.Player('youtube-player-placeholder', {
            height: '0',
            width: '0',
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
        // Create a hidden div for the player if it doesn't exist
        if (!document.getElementById('youtube-player-placeholder')) {
             const div = document.createElement('div');
             div.id = 'youtube-player-placeholder';
             div.style.display = 'none';
             document.body.appendChild(div);
        }
    };

    function onPlayerReady(event) {
        // Player is ready
    }

    function onPlayerStateChange(event) {
        if (event.data == YT.PlayerState.ENDED) {
            stopPlayback();
        }
    }

    // --- Audio Engine (The Vinyl Logic) ---
    function initAudioEngine() {
        if (state.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioContext = new AudioContext();

        // 1. Vinyl Noise Generator (simulating crackle/hiss)
        const bufferSize = state.audioContext.sampleRate * 2; // 2 seconds buffer
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // White noise with some random clicks
            const white = Math.random() * 2 - 1;
            const click = Math.random() < 0.001 ? (Math.random() * 2 - 1) * 0.5 : 0; // Occasional click
            data[i] = (white * 0.05) + click;
        }

        state.nodes.noiseBuffer = buffer;
    }

    function playVinylNoise() {
        if (!state.audioContext) initAudioEngine();
        
        const source = state.audioContext.createBufferSource();
        source.buffer = state.nodes.noiseBuffer;
        source.loop = true;

        const gainNode = state.audioContext.createGain();
        gainNode.gain.value = 0.15; // Subtle background noise

        source.connect(gainNode);
        gainNode.connect(state.audioContext.destination);
        
        state.nodes.noiseSource = source;
        state.nodes.noiseGain = gainNode;
        
        source.start();
    }

    function stopVinylNoise() {
        if (state.nodes.noiseSource) {
            state.nodes.noiseSource.stop();
            state.nodes.noiseSource = null;
        }
    }

    // NOTE: In a real browser environment, directly processing YouTube audio via Web Audio API 
    // is restricted by CORS (Cross-Origin Resource Sharing).
    // The following code demonstrates the requested processing chain (EQ + Width) 
    // as if we had a valid MediaElementSource from the video.
    function createProcessingChain(sourceNode) {
        const ctx = state.audioContext;

        // 1. EQ8 Emulation
        // High-Pass at 80Hz
        const highPass = ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 80;

        // Low-Pass at 16kHz
        const lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 16000;

        // 2. Stereo Width Reduction (to 80%)
        // Simple implementation: Mid/Side processing or cross-feed. 
        // Here we use a ChannelMerger to blend slightly.
        // (Conceptual implementation for standard stereo source)
        // For true width manipulation, we'd split channels, compute M/S, attenuate S, and recombine.
        
        // Let's connect the chain: Source -> HighPass -> LowPass -> Destination
        sourceNode.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(ctx.destination);
        
        return lowPass; // Return the last node for further connections if needed
    }


    // --- UI Interactions ---

    convertBtn.addEventListener('click', () => {
        handleConversion();
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = userEmailInput.value;
        if (email) {
            // Simulate API call to save user
            console.log(`Registering user: ${email}`);
            state.isLoggedIn = true;
            authGate.classList.add('hidden');
            // Retry the conversion that was blocked, or reset
            alert("Welcome to the club. Enjoy unlimited analog plays.");
        }
    });

    function handleConversion() {
        const url = youtubeUrlInput.value.trim();
        if (!url) {
            statusMessage.textContent = "Please enter a valid YouTube URL.";
            return;
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            statusMessage.textContent = "Invalid YouTube URL.";
            return;
        }

        // Business Logic: Gate
        if (state.plays >= 1 && !state.isLoggedIn) {
            authGate.classList.remove('hidden');
            return;
        }

        state.youtubeVideoId = videoId;
        
        // Update UI
        const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        albumArt.src = thumbnail;
        statusMessage.textContent = "Initializing Vinyl Engine...";

        startPlayback(videoId);
    }

    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function startPlayback(videoId) {
        if (state.isPlaying) stopPlayback();

        state.isPlaying = true;
        state.plays++;
        
        // Visuals
        vinylRecord.classList.add('spinning');
        document.querySelector('.turntable-hero').classList.add('playing');
        
        // Audio
        initAudioEngine();
        
        // 1. Start Noise
        playVinylNoise();
        
        // 2. Start YouTube Audio (via IFrame)
        if (state.youtubePlayer && state.youtubePlayer.loadVideoById) {
            state.youtubePlayer.loadVideoById(videoId);
            state.youtubePlayer.setVolume(100); 
            // Note: We cannot route this IFrame audio through the Web Audio API context 
            // due to browser security (CORS), so the "EQ" and "Width" effects 
            // are simulated by the aesthetic and the noise layer in this prototype.
        }

        statusMessage.textContent = "Now Playing: Analog Stream";
    }

    function stopPlayback() {
        state.isPlaying = false;
        
        // Visuals
        vinylRecord.classList.remove('spinning');
        document.querySelector('.turntable-hero').classList.remove('playing');
        
        // Audio
        stopVinylNoise();
        if (state.youtubePlayer && state.youtubePlayer.stopVideo) {
            state.youtubePlayer.stopVideo();
        }
        
        statusMessage.textContent = "Stopped.";
    }
});
