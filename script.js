// YouTube Player API and FocusLoop Logic
let player;
let isLooping = false;
let startTime = 0;
let endTime = 0;
let loopInterval;
let isFullVideoLoop = false;

// DOM Elements
const videoUrlInput = document.getElementById('videoUrl');
const loadVideoBtn = document.getElementById('loadVideo');
const errorMessage = document.getElementById('errorMessage');
const videoContainer = document.getElementById('videoContainer');
const controls = document.getElementById('controls');
const notesSection = document.getElementById('notesSection');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const toggleLoopBtn = document.getElementById('toggleLoop');
const fullVideoLoopBtn = document.getElementById('fullVideoLoop');
const resetLoopBtn = document.getElementById('resetLoop');
const playPauseBtn = document.getElementById('playPause');
const resetVideoBtn = document.getElementById('resetVideo');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');

// Load YouTube IFrame Player API
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// YouTube API Ready Callback
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Ready');
}

// Parse Time Input (supports both seconds and mm:ss format)
function parseTimeInput(input) {
    if (!input || input.trim() === '') return 0;
    
    const value = input.trim();
    
    // Check if it's in mm:ss format
    if (value.includes(':')) {
        const parts = value.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
    }
    
    // Otherwise treat as seconds
    return parseFloat(value) || 0;
}

// Extract Video ID from YouTube URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Show Error Message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
}

// Format Time (seconds to mm:ss)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update Time Display
function updateTimeDisplay() {
    if (player && player.getCurrentTime) {
        const current = player.getCurrentTime();
        const duration = player.getDuration();
        currentTimeSpan.textContent = formatTime(current);
        durationSpan.textContent = formatTime(duration);
    }
}

// Load Video
function loadVideo() {
    const url = videoUrlInput.value.trim();
    if (!url) {
        showError('Please enter a YouTube video URL');
        return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        showError('Invalid YouTube URL. Please check the URL and try again.');
        return;
    }

    // Destroy existing player if any
    if (player) {
        player.destroy();
    }

    // Create new player
    player = new YT.Player('player', {
        height: '400',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

// Player Ready Event
function onPlayerReady(event) {
    videoContainer.classList.remove('hidden');
    controls.classList.remove('hidden');
    notesSection.classList.remove('hidden');
    
    // Set end time to video duration
    const duration = player.getDuration();
    endTimeInput.placeholder = Math.floor(duration);
    
    // Start time display update
    setInterval(updateTimeDisplay, 1000);
    
    console.log('Player ready');
}

// Player State Change Event
function onPlayerStateChange(event) {
    // Update play/pause button text
    if (event.data === YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = 'Pause';
        startLoopCheck();
    } else {
        playPauseBtn.textContent = 'Play';
        stopLoopCheck();
    }
}

// Player Error Event
function onPlayerError(event) {
    showError('Error loading video. Please check the URL and try again.');
}

// Start Loop Checking
function startLoopCheck() {
    if (isLooping && !loopInterval) {
        loopInterval = setInterval(checkLoop, 500);
    }
}

// Stop Loop Checking
function stopLoopCheck() {
    if (loopInterval) {
        clearInterval(loopInterval);
        loopInterval = null;
    }
}

// Check Loop Condition
function checkLoop() {
    if (!player || !isLooping) return;
    
    const currentTime = player.getCurrentTime();
    const videoDuration = player.getDuration();
    
    if (isFullVideoLoop) {
        // Loop full video
        if (currentTime >= videoDuration - 0.5) {
            player.seekTo(0);
        }
    } else {
        // Loop between A and B points
        const end = endTime || videoDuration;
        if (currentTime >= end - 0.2) {
            player.seekTo(startTime);
        }
        // Also check if current time is before start time
        if (currentTime < startTime) {
            player.seekTo(startTime);
        }
    }
}

// Toggle Loop
function toggleLoop() {
    if (!player) {
        showError('Please load a video first');
        return;
    }

    isLooping = !isLooping;
    isFullVideoLoop = false;
    
    if (isLooping) {
        // Validate and set times using new parser
        const start = parseTimeInput(startTimeInput.value);
        const end = parseTimeInput(endTimeInput.value) || player.getDuration();
        
        if (start >= end) {
            showError('Start time must be less than end time');
            isLooping = false;
            return;
        }
        
        if (start >= player.getDuration()) {
            showError('Start time cannot exceed video duration');
            isLooping = false;
            return;
        }
        
        startTime = start;
        endTime = end;
        
        toggleLoopBtn.textContent = 'Disable Loop';
        toggleLoopBtn.style.background = '#dc3545';
        
        // Always jump to start time when enabling loop
        player.seekTo(startTime);
        
        // Start loop checking immediately
        startLoopCheck();
    } else {
        toggleLoopBtn.textContent = 'Enable Loop';
        toggleLoopBtn.style.background = '#3498db';
        stopLoopCheck();
    }
}

// Full Video Loop
function fullVideoLoop() {
    if (!player) {
        showError('Please load a video first');
        return;
    }

    isLooping = true;
    isFullVideoLoop = true;
    
    toggleLoopBtn.textContent = 'Disable Loop';
    toggleLoopBtn.style.background = '#dc3545';
    
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        startLoopCheck();
    }
}

// Reset Loop
function resetLoop() {
    isLooping = false;
    isFullVideoLoop = false;
    stopLoopCheck();
    
    toggleLoopBtn.textContent = 'Enable Loop';
    toggleLoopBtn.style.background = '#3498db';
    
    startTimeInput.value = '';
    endTimeInput.value = '';
    
    if (player) {
        player.seekTo(0);
    }
}

// Play/Pause Toggle
function togglePlayPause() {
    if (!player) return;
    
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

// Reset Video
function resetVideo() {
    if (player) {
        player.seekTo(0);
        player.pauseVideo();
    }
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(e.code) {
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'KeyL':
            e.preventDefault();
            toggleLoop();
            break;
        case 'KeyR':
            e.preventDefault();
            resetLoop();
            break;
    }
});

// Event Listeners
loadVideoBtn.addEventListener('click', loadVideo);
videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadVideo();
});

toggleLoopBtn.addEventListener('click', toggleLoop);
fullVideoLoopBtn.addEventListener('click', fullVideoLoop);
resetLoopBtn.addEventListener('click', resetLoop);
playPauseBtn.addEventListener('click', togglePlayPause);
resetVideoBtn.addEventListener('click', resetVideo);

// Initialize
loadYouTubeAPI();