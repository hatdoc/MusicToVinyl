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
        playerReady: false
    };

    // --- DOM Elements ---
    const vinylRecord = document.getElementById('vinylRecord');
    const tonearm = document.getElementById('tonearm');
    const albumArt = document.getElementById('albumArt');
    const convertBtn = document.getElementById('convertBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const youtubeUrlInput = document.getElementById('youtubeUrl');
    const statusMessage = document.getElementById('statusMessage');
    const authGate = document.getElementById('authGate');
    const signupForm = document.getElementById('signupForm');
    const userEmailInput = document.getElementById('userEmail');

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
            stopPlayback();
        } else if (event.data == YT.PlayerState.PLAYING) {
            statusMessage.textContent = "Now Playing: Analog Stream";
            vinylRecord.classList.add('spinning');
            document.querySelector('.turntable-hero').classList.add('playing');
        } else if (event.data == YT.PlayerState.PAUSED) {
            vinylRecord.classList.remove('spinning');
            document.querySelector('.turntable-hero').classList.remove('playing');
        }
    }

    // --- Audio Engine ---
    function initAudioEngine() {
        if (state.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioContext = new AudioContext();

        const bufferSize = state.audioContext.sampleRate * 2;
        const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            const click = Math.random() < 0.0005 ? (Math.random() * 2 - 1) * 0.3 : 0;
            data[i] = (white * 0.02) + click;
        }

        state.nodes.noiseBuffer = buffer;
    }

    function playVinylNoise() {
        if (!state.audioContext) initAudioEngine();
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }
        
        const source = state.audioContext.createBufferSource();
        source.buffer = state.nodes.noiseBuffer;
        source.loop = true;

        const gainNode = state.audioContext.createGain();
        gainNode.gain.value = 0.1;

        source.connect(gainNode);
        gainNode.connect(state.audioContext.destination);
        
        state.nodes.noiseSource = source;
        state.nodes.noiseGain = gainNode;
        
        source.start();
    }

    function stopVinylNoise() {
        if (state.nodes.noiseSource) {
            try {
                state.nodes.noiseSource.stop();
            } catch(e) {}
            state.nodes.noiseSource = null;
        }
    }

    // --- UI Interactions ---

    convertBtn.addEventListener('click', () => {
        if (state.isPlaying && !state.isPaused) {
            // If already playing a video, allow stopping/starting new one
            handleConversion();
        } else if (state.isPaused) {
            resumePlayback();
        } else {
            handleConversion();
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (state.isPlaying && !state.isPaused) {
            pausePlayback();
        }
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = userEmailInput.value;
        if (email) {
            state.isLoggedIn = true;
            authGate.classList.add('hidden');
            alert("Welcome to the club. Unlimited access granted.");
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

        if (state.plays >= 1 && !state.isLoggedIn) {
            authGate.classList.remove('hidden');
            return;
        }

        if (!state.playerReady) {
            statusMessage.textContent = "Player is initializing... please wait.";
            return;
        }

        state.youtubeVideoId = videoId;
        const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        albumArt.src = thumbnail;
        statusMessage.textContent = "Dropping the needle...";

        startPlayback(videoId);
    }

    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function startPlayback(videoId) {
        stopPlayback(); // Clean up existing

        state.isPlaying = true;
        state.isPaused = false;
        state.plays++;
        
        initAudioEngine();
        playVinylNoise();
        
        if (state.youtubePlayer && state.youtubePlayer.loadVideoById) {
            state.youtubePlayer.loadVideoById(videoId);
            state.youtubePlayer.playVideo();
        }

        pauseBtn.classList.remove('hidden');
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
        pauseBtn.textContent = "Stopped";
        convertBtn.textContent = "Resume";
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
        convertBtn.textContent = "Change Record";
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
