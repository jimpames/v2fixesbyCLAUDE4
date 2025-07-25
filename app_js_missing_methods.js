// App.js - Complete missing method implementations
export class RentAHalApp {
    // ... existing constructor and methods ...
    
    // Complete the initialize method
    async initialize() {
        console.log('[App] Initializing RENT A HAL application...');
        
        try {
            // Initialize WebSocket connection first
            await this.websocket.connect();
            
            // Set up periodic updates for system stats
            this.initializePeriodicUpdates();
            
            // Initialize wake word if user preferences indicate it should be enabled
            await this.initializeWakeWordIfEnabled();
            
            // Set up window event listeners
            this.setupWindowListeners();
            
            // Request initial data from server
            this.requestInitialData();
            
            console.log('[App] Application initialization completed');
            
        } catch (error) {
            console.error('[App] Application initialization failed:', error);
            this.ui?.displayError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    // Complete the WebSocket message handlers
    initializeWebSocket() {
        // Register error handler
        this.websocket.registerHandler('error', (error) => {
            console.error('[App] WebSocket error:', error);
            this.ui?.displayError(error.message || error);
        });
        
        // Register connection status handler
        this.websocket.setStatusCallback((status, isConnected) => {
            this.ui?.displayStatus(status);
            
            if (isConnected) {
                this.onWebSocketConnected();
            } else {
                this.onWebSocketDisconnected();
            }
        });

        // Register system message handlers
        this.websocket.registerHandler('system_stats', (data) => {
            if (this.currentUser?.is_sysop) {
                this.ui?.updateSystemStats(data);
            }
        });
        
        this.websocket.registerHandler('user_update', (data) => {
            console.log('[App] User update received:', data);
            this.currentUser = data.user;
            this.ui?.updateUserInfo(data.user);
            
            if (data.user?.is_sysop) {
                this.ui?.showSysopPanel();
                this.initializePeriodicUpdates();
            }
        });
        
        this.websocket.registerHandler('worker_update', (data) => {
            console.log('[App] Worker update received:', data);
            this.aiWorkers = data.workers || {};
            this.ui?.updateWorkerList(this.aiWorkers);
        });
        
        this.websocket.registerHandler('huggingface_models', (data) => {
            console.log('[App] HuggingFace models received:', data);
            this.huggingFaceModels = data.models || {};
            this.ui?.updateHuggingFaceModels(this.huggingFaceModels);
        });
        
        this.websocket.registerHandler('query_result', async (data) => {
            console.log('[App] Query result received:', data);
            await this.handleQueryResult(data.result, data.processing_time, data.cost, data.result_type);
        });
        
        this.websocket.registerHandler('transcription_result', (data) => {
            console.log('[App] Transcription result received:', data);
            this.handleTranscriptionResult(data.text);
        });
        
        this.websocket.registerHandler('gmail_auth_required', (data) => {
            console.log('[App] Gmail auth required');
            this.ui?.showGmailAuthPrompt();
        });
    }
    
    // Handle WebSocket connection events
    onWebSocketConnected() {
        console.log('[App] WebSocket connected');
        this.requestInitialData();
    }
    
    onWebSocketDisconnected() {
        console.log('[App] WebSocket disconnected');
        // Disable wake word mode if connection is lost
        if (this.speech && this.speech.wakeWordState !== 'inactive') {
            this.speech.deactivateWakeWordMode();
        }
    }
    
    // Request initial data from server
    requestInitialData() {
        if (this.websocket.isHealthy()) {
            this.websocket.send({ type: 'get_user_info' });
            this.websocket.send({ type: 'get_workers' });
            this.websocket.send({ type: 'get_huggingface_models' });
        }
    }
    
    // Complete the handleQueryResult method
    async handleQueryResult(result, processing_time, cost, result_type) {
        this.isProcessing = false;
        this.ui?.enableInterface();
        
        try {
            // Handle different result types
            if (result_type === 'audio') {
                await this.handleAudioResult(result);
            } else if (result_type === 'image') {
                await this.handleImageResult(result);
            } else {
                // Text result
                if (this.speech && this.speech.wakeWordState !== 'inactive') {
                    // In wake word mode, speak the result and return to listening
                    await this.speech.speakFeedback(result);
                    
                    // If we're in a specific mode, return to listening for that mode
                    if (['vision', 'weather', 'gmail'].includes(this.currentQueryType)) {
                        setTimeout(() => this.speech.deactivateWakeWordMode(), 2000);
                    }
                } else {
                    // Normal mode, just display result
                    await this.speech?.speakFeedback(result);
                }
            }

            // Display result in UI
            this.ui?.displayQueryResult(result, processing_time, cost, result_type);
            
            // Update cumulative costs
            if (this.currentUser) {
                this.ui?.updateCumulativeCosts(this.currentUser);
            }
            
        } catch (error) {
            console.error('[App] Error handling query result:', error);
            this.ui?.displayError('Error processing query result');
        }
    }
    
    async handleAudioResult(result) {
        try {
            // Create audio element and play
            const audio = new Audio();
            audio.src = `data:audio/wav;base64,${result}`;
            await audio.play();
        } catch (error) {
            console.error('[App] Error playing audio result:', error);
            this.ui?.displayError('Error playing audio result');
        }
    }
    
    async handleImageResult(result) {
        try {
            // Display image result
            this.ui?.displayImageResult(result);
        } catch (error) {
            console.error('[App] Error displaying image result:', error);
            this.ui?.displayError('Error displaying image result');
        }
    }
    
    // Complete the handleTranscriptionResult method
    handleTranscriptionResult(text) {
        if (this.ui?.elements.promptInput) {
            this.ui.elements.promptInput.value = text;
            this.ui.displayStatus('Voice input transcribed. You can now submit the query.');
        }
    }
    
    // Complete the submitQuery method
    async submitQuery(event) {
        if (event) {
            event.preventDefault();
        }
        
        try {
            if (this.ui?.validateForm()) {
                this.currentQueryType = this.ui.elements.queryType.value;
                this.isProcessing = true;
                this.ui.disableInterface();
                
                await this.ui.submitQuery();
            }
        } catch (error) {
            console.error('[App] Error submitting query:', error);
            this.ui?.displayError('Error submitting query');
            this.isProcessing = false;
            this.ui?.enableInterface();
        }
    }
    
    // Initialize wake word if enabled in preferences
    async initializeWakeWordIfEnabled() {
        try {
            const preferences = this.storage.loadPreferences();
            if (preferences.wakeWordEnabled && this.speech) {
                // Wait a bit for UI to be ready
                setTimeout(async () => {
                    try {
                        await this.speech.activateWakeWordMode();
                        console.log('[App] Wake word mode activated from preferences');
                    } catch (error) {
                        console.error('[App] Failed to activate wake word mode:', error);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('[App] Error initializing wake word from preferences:', error);
        }
    }
    
    // Complete the periodic updates method
    initializePeriodicUpdates() {
        if (this.currentUser?.is_sysop) {
            if (this.statsUpdateInterval) {
                clearInterval(this.statsUpdateInterval);
            }
            
            this.statsUpdateInterval = setInterval(() => {
                if (this.websocket?.isHealthy()) {
                    this.websocket.send({ type: 'get_stats' });
                }
            }, 30000); // Update every 30 seconds
            
            console.log('[App] Periodic updates initialized for sysop');
        }
    }
    
    // Complete the cleanup method
    cleanup() {
        console.log('[App] Cleaning up application...');
        
        try {
            // Clean up WebSocket
            if (this.websocket) {
                this.websocket.destroy();
            }
            
            // Clear intervals
            if (this.statsUpdateInterval) {
                clearInterval(this.statsUpdateInterval);
                this.statsUpdateInterval = null;
            }
            
            // Clean up speech
            if (this.speech && this.speech.wakeWordState !== 'inactive') {
                this.speech.deactivateWakeWordMode();
            }
            if (this.speech?.cleanup) {
                this.speech.cleanup();
            }
            
            // Clean up other managers
            if (this.vision?.cleanup) {
                this.vision.cleanup();
            }
            if (this.weather?.cleanup) {
                this.weather.cleanup();
            }
            if (this.gmail?.cleanup) {
                this.gmail.cleanup();
            }
            
            // Save preferences
            if (this.ui?.savePreferences) {
                this.ui.savePreferences();
            }
            
            console.log('[App] Application cleanup completed');
            
        } catch (error) {
            console.error('[App] Error during cleanup:', error);
        }
    }
    
    // Utility methods
    isWebSocketHealthy() {
        return this.websocket?.isHealthy() || false;
    }

    isWakeWordEnabled() {
        return this.speech && this.speech.wakeWordState !== 'inactive';
    }
}