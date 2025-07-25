// SpeechManager.js - Enhanced with better error recovery and platform handling
export class SpeechManager {
    static CONFIG = {
        RECOGNITION_TIMEOUT: 20000,
        INACTIVITY_TIMEOUT: 15000,
        MAX_RECOGNITION_RESETS: 3,
        RECOGNITION_RESET_INTERVAL: 60000,
        RETRY_DELAY: 1000,
        AUDIO_FFT_SIZE: 2048,
        SMOOTHING_TIME_CONSTANT: 0.8,
        MIN_DECIBELS: -90,
        MAX_DECIBELS: -10,
        WAKE_WORD_CONFIDENCE_THRESHOLD: 0.7
    };
    
    constructor(websocketManager) {
        this.websocket = websocketManager;
        
        // Enhanced platform detection
        this.platformCapabilities = this.detectPlatformCapabilities();
        
        // Recognition state with better error tracking
        this.recognitionErrors = {
            count: 0,
            lastError: null,
            consecutiveErrors: 0
        };
        
        // Audio context management
        this.audioResources = new Set();
        
        // Initialize with platform-appropriate settings
        this.initializePlatformOptimizations();
    }
    
    detectPlatformCapabilities() {
        const userAgent = navigator.userAgent;
        const capabilities = {
            isIOS: /iPad|iPhone|iPod/.test(userAgent),
            isSafari: /^((?!chrome|android).)*safari/i.test(userAgent),
            isFirefox: /firefox/i.test(userAgent),
            isChrome: /chrome/i.test(userAgent),
            supportsWebkitSpeech: 'webkitSpeechRecognition' in window,
            supportsSpeechSynthesis: 'speechSynthesis' in window,
            supportsAudioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };
        
        // Platform-specific limitations
        capabilities.hasLimitations = capabilities.isIOS || capabilities.isSafari;
        capabilities.requiresUserGesture = capabilities.isIOS || capabilities.isSafari;
        
        return capabilities;
    }
    
    initializePlatformOptimizations() {
        if (this.platformCapabilities.isIOS) {
            // iOS requires shorter timeouts
            SpeechManager.CONFIG.RECOGNITION_TIMEOUT = 10000;
            SpeechManager.CONFIG.INACTIVITY_TIMEOUT = 8000;
        }
        
        if (this.platformCapabilities.isSafari) {
            // Safari has different synthesis behavior
            this.synthesisBehavior = 'safari';
        }
    }
    
    // Enhanced recognition initialization with better error handling
    async initializeRecognition() {
        try {
            if (!this.platformCapabilities.supportsWebkitSpeech) {
                throw new Error('Speech recognition not supported on this platform');
            }
            
            if (this.recognition) {
                this.recognition.abort();
                this.recognition = null;
            }
            
            this.recognition = new webkitSpeechRecognition();
            this.setupRecognitionSettings();
            this.attachRecognitionEventHandlers();
            
            console.log('[Speech] Recognition initialized successfully');
            this.recognitionErrors.count = 0;
            this.recognitionErrors.consecutiveErrors = 0;
            
        } catch (error) {
            this.recognitionErrors.count++;
            this.recognitionErrors.lastError = error;
            this.recognitionErrors.consecutiveErrors++;
            
            console.error('[Speech] Recognition initialization failed:', error);
            
            if (this.recognitionErrors.consecutiveErrors >= SpeechManager.CONFIG.MAX_RECOGNITION_RESETS) {
                throw new Error('Speech recognition initialization failed permanently');
            }
            
            throw error;
        }
    }
    
    setupRecognitionSettings() {
        if (!this.recognition) return;
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';
        
        // Platform-specific adjustments
        if (this.platformCapabilities.hasLimitations) {
            this.recognition.continuous = false; // More stable on iOS/Safari
        }
    }
    
    // Enhanced error recovery
    async handleRecovery(errorType) {
        console.log(`[Speech] Attempting recovery for ${errorType}`);
        
        try {
            switch (errorType) {
                case 'recognition':
                    await this.recoveryRecognition();
                    break;
                case 'synthesis':
                    await this.recoverySynthesis();
                    break;
                case 'audio':
                    await this.recoveryAudio();
                    break;
                default:
                    console.warn(`[Speech] Unknown error type: ${errorType}`);
            }
        } catch (recoveryError) {
            console.error(`[Speech] Recovery failed for ${errorType}:`, recoveryError);
            this.handleCriticalFailure(errorType);
        }
    }
    
    async recoveryRecognition() {
        // Stop current recognition
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {
                console.warn('[Speech] Error aborting recognition:', e);
            }
        }
        
        // Wait before reinitializing
        await new Promise(resolve => setTimeout(resolve, SpeechManager.CONFIG.RETRY_DELAY));
        
        // Reinitialize
        await this.initializeRecognition();
        
        console.log('[Speech] Recognition recovery completed');
    }
    
    async recoverySynthesis() {
        // Cancel any ongoing synthesis
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Wait for synthesis to clear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset synthesis state
        this.isSystemSpeaking = false;
        
        console.log('[Speech] Synthesis recovery completed');
    }
    
    async recoveryAudio() {
        // Clean up audio resources
        this.audioResources.forEach(resource => {
            try {
                if (resource.close) resource.close();
                if (resource.disconnect) resource.disconnect();
            } catch (e) {
                console.warn('[Speech] Error cleaning audio resource:', e);
            }
        });
        this.audioResources.clear();
        
        // Reinitialize audio context if needed
        if (this.audioContext && this.audioContext.state === 'closed') {
            this.audioContext = null;
        }
        
        console.log('[Speech] Audio recovery completed');
    }
    
    handleCriticalFailure(errorType) {
        console.error(`[Speech] Critical failure in ${errorType}, disabling wake word mode`);
        
        if (this.wakeWordState !== 'inactive') {
            this.deactivateWakeWordMode();
        }
        
        // Notify user through websocket
        this.websocket?.send({
            type: 'speech_error',
            error: `Critical speech system failure: ${errorType}`,
            action: 'wake_word_disabled'
        });
    }
    
    // Enhanced cleanup
    cleanup() {
        console.log('[Speech] Cleaning up speech resources...');
        
        // Stop recognition
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (e) {
                console.warn('[Speech] Error stopping recognition:', e);
            }
            this.recognition = null;
        }
        
        // Stop synthesis
        if (window.speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Clean up audio resources
        this.audioResources.forEach(resource => {
            try {
                if (resource.close) resource.close();
                if (resource.disconnect) resource.disconnect();
            } catch (e) {
                console.warn('[Speech] Error cleaning resource:', e);
            }
        });
        this.audioResources.clear();
        
        // Clear timers
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
        }
        
        // Reset state
        this.wakeWordState = 'inactive';
        this.isListening = false;
        this.isSystemSpeaking = false;
        
        console.log('[Speech] Speech cleanup completed');
    }
}