// UIManager.js - Complete missing method implementations
export class UIManager {
    // ... existing code ...
    
    // Complete the initialization methods
    #initializeElements() {
        this.elements = {
            // Form elements
            queryForm: document.getElementById('query-form'),
            promptInput: document.getElementById('prompt-input'),
            submitQueryButton: document.getElementById('submit-query'),
            queryType: document.getElementById('query-type'),
            modelType: document.getElementById('model-type'),
            modelSelect: document.getElementById('model-select'),
            
            // Media elements
            imageUpload: document.getElementById('image-upload'),
            imagePreview: document.getElementById('image-preview'),
            previewImg: document.getElementById('preview-img'),
            voiceInputButton: document.getElementById('voice-input'),
            audioWaveform: document.getElementById('audioWaveform'),
            
            // Control elements
            clearResultsButton: document.getElementById('clear-results'),
            speechOutputCheckbox: document.getElementById('speech-output'),
            toggleWakeWordButton: document.getElementById('toggle-wake-word'),
            
            // Display elements
            results: document.getElementById('results'),
            userInfo: document.getElementById('user-info'),
            connectionStatus: document.getElementById('connection-status'),
            
            // System elements
            sysopPanel: document.getElementById('sysop-panel'),
            gmailAuthPrompt: document.getElementById('gmailAuthPrompt'),
            systemStats: document.getElementById('system-stats'),
            workerList: document.getElementById('worker-list'),
            huggingFaceModelList: document.getElementById('huggingface-model-list'),
            userList: document.getElementById('user-list'),
            cumulativeCosts: document.getElementById('cumulative-costs'),
            
            // Admin elements
            sysopMessageInput: document.getElementById('sysop-message-input'),
            sendSysopMessageButton: document.getElementById('send-sysop-message'),
            activeUsersTable: document.getElementById('active-users-table')?.getElementsByTagName('tbody')[0],
            workerHealthDisplay: document.getElementById('worker-health')
        };

        // Validate critical elements
        this.validateElements();
    }
    
    #setupEventListeners() {
        // Form submission
        if (this.elements.submitQueryButton) {
            this.elements.submitQueryButton.addEventListener('click', this.handleSubmit.bind(this));
        }
        
        if (this.elements.queryForm) {
            this.elements.queryForm.addEventListener('submit', this.handleSubmit.bind(this));
        }
        
        // Query type changes
        if (this.elements.queryType) {
            this.elements.queryType.addEventListener('change', this.handleQueryTypeChange.bind(this));
        }
        
        if (this.elements.modelType) {
            this.elements.modelType.addEventListener('change', this.updateModelSelect.bind(this));
        }
        
        // Image upload handling
        if (this.elements.imageUpload) {
            this.elements.imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
        }
        
        // Voice input
        if (this.elements.voiceInputButton) {
            this.elements.voiceInputButton.addEventListener('click', this.toggleVoiceInput.bind(this));
        }
        
        // Wake word toggle
        if (this.elements.toggleWakeWordButton) {
            this.elements.toggleWakeWordButton.addEventListener('click', this.toggleWakeWordMode.bind(this));
        }
        
        // Clear results
        if (this.elements.clearResultsButton) {
            this.elements.clearResultsButton.addEventListener('click', this.clearResults.bind(this));
        }
        
        // Speech output toggle
        if (this.elements.speechOutputCheckbox) {
            this.elements.speechOutputCheckbox.addEventListener('change', this.toggleSpeechOutput.bind(this));
        }
        
        // Sysop message sending
        if (this.elements.sendSysopMessageButton) {
            this.elements.sendSysopMessageButton.addEventListener('click', this.sendSysopMessage.bind(this));
        }
        
        // Global event listeners
        window.addEventListener('resize', this.handleResize.bind(this));
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // File drag and drop
        this.setupDragAndDrop();
    }
    
    #initializeAccessibility() {
        // Add ARIA attributes for better accessibility
        if (this.elements.submitQueryButton) {
            this.elements.submitQueryButton.setAttribute('aria-label', 'Submit Query');
        }
        
        if (this.elements.imageUpload) {
            this.elements.imageUpload.setAttribute('aria-label', 'Upload Image for Vision Query');
        }
        
        if (this.elements.voiceInputButton) {
            this.elements.voiceInputButton.setAttribute('aria-label', 'Toggle Voice Recording');
        }
        
        if (this.elements.toggleWakeWordButton) {
            this.elements.toggleWakeWordButton.setAttribute('aria-label', 'Toggle Wake Word Mode');
        }
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
    }
    
    setupKeyboardNavigation() {
        // Tab navigation for form elements
        const focusableElements = [
            this.elements.promptInput,
            this.elements.queryType,
            this.elements.modelType,
            this.elements.modelSelect,
            this.elements.submitQueryButton,
            this.elements.voiceInputButton,
            this.elements.toggleWakeWordButton
        ].filter(el => el !== null);
        
        focusableElements.forEach((element, index) => {
            element.setAttribute('tabindex', index + 1);
        });
    }
    
    setupDragAndDrop() {
        const dropZone = this.elements.imageUpload?.parentElement;
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });

        dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            this.elements.imageUpload.files = files;
            this.handleImageUpload({ target: { files: files } });
        }
    }
    
    // Complete event handler methods
    handleSubmit(event) {
        if (event) {
            event.preventDefault();
        }
        
        if (this.validateForm()) {
            this.submitQuery();
        }
    }
    
    handleQueryTypeChange() {
        const queryType = this.elements.queryType?.value;
        
        // Show/hide relevant UI elements based on query type
        this.updateUIForQueryType(queryType);
        
        // Update model select options
        this.updateModelSelect();
    }
    
    updateUIForQueryType(queryType) {
        // Reset all UI elements first
        this.resetUIElements();
        
        switch (queryType) {
            case 'vision':
                this.setupVisionMode();
                break;
            case 'speech':
                this.setupSpeechMode();
                break;
            case 'imagine':
                this.setupImagineMode();
                break;
            default:
                this.setupChatMode();
        }
    }
    
    setupChatMode() {
        if (this.elements.promptInput) {
            this.elements.promptInput.style.display = 'block';
            this.elements.promptInput.placeholder = 'Enter your message...';
        }
    }
    
    setupVisionMode() {
        if (this.elements.promptInput) {
            this.elements.promptInput.style.display = 'block';
            this.elements.promptInput.placeholder = 'Describe what you want to know about the image...';
        }
        
        if (this.elements.imageUpload) {
            this.elements.imageUpload.style.display = 'block';
        }
    }
    
    setupSpeechMode() {
        if (this.elements.voiceInputButton) {
            this.elements.voiceInputButton.style.display = 'block';
        }
        
        if (this.elements.promptInput) {
            this.elements.promptInput.placeholder = 'Click the microphone to record your voice...';
        }
    }
    
    setupImagineMode() {
        if (this.elements.promptInput) {
            this.elements.promptInput.style.display = 'block';
            this.elements.promptInput.placeholder = 'Describe the image you want to generate...';
        }
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            // Validate file size
            if (!this.validateFileSize(file)) {
                this.displayError('File size too large. Maximum size is 5MB.');
                return;
            }
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.displayError('Please select a valid image file.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                if (this.elements.previewImg) {
                    this.elements.previewImg.src = e.target.result;
                }
                if (this.elements.imagePreview) {
                    this.elements.imagePreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    async toggleVoiceInput() {
        if (!this.speech) {
            this.displayError('Speech functionality not available');
            return;
        }
        
        try {
            if (this.speech.isRecording) {
                await this.speech.stopRecording();
                this.elements.voiceInputButton.textContent = 'Start Recording';
                this.elements.voiceInputButton.classList.remove('bg-red-500');
                this.elements.voiceInputButton.classList.add('bg-green-500');
            } else {
                await this.speech.startRecording();
                this.elements.voiceInputButton.textContent = 'Stop Recording';
                this.elements.voiceInputButton.classList.remove('bg-green-500');
                this.elements.voiceInputButton.classList.add('bg-red-500');
            }
        } catch (error) {
            console.error('Error toggling voice input:', error);
            this.displayError('Error with voice input. Please try again.');
        }
    }
    
    clearResults() {
        if (this.elements.results) {
            this.elements.results.innerHTML = '';
        }
        this.displayStatus('Results cleared');
    }
    
    toggleSpeechOutput() {
        const isEnabled = this.elements.speechOutputCheckbox?.checked || false;
        if (this.speech) {
            this.speech.speechOutputEnabled = isEnabled;
        }
        this.savePreferences();
    }
    
    sendSysopMessage() {
        const message = this.elements.sysopMessageInput?.value;
        if (message && this.websocket?.isHealthy()) {
            this.websocket.send({
                type: 'sysop_message',
                message: message
            });
            this.elements.sysopMessageInput.value = '';
        }
    }
    
    // Complete validation methods
    validateForm() {
        const queryType = this.elements.queryType?.value;
        const promptText = this.elements.promptInput?.value?.trim() || '';
        const hasImage = this.elements.imageUpload?.files?.length > 0;
        const hasAudio = this.speech?.audioChunks?.length > 0;
        
        const validation = helpers.validateForm(queryType, promptText, hasImage, hasAudio);
        
        if (!validation.isValid) {
            this.displayError(validation.error);
            return false;
        }
        
        return true;
    }
    
    validateFileSize(file) {
        return file.size <= UIManager.CONFIG.MAX_FILE_SIZE;
    }
    
    // Complete display methods
    displayImageResult(imageData) {
        const resultElement = document.createElement('div');
        resultElement.className = 'mb-4 p-4 bg-gray-100 rounded';
        
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${imageData}`;
        img.className = 'max-w-full h-auto rounded';
        img.alt = 'Generated image result';
        
        resultElement.appendChild(img);
        
        this.scheduleUpdate(() => {
            this.elements.results?.prepend(resultElement);
        });
    }
    
    updateSystemStats(stats) {
        if (!this.elements.systemStats) return;
        
        const statsHtml = `
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-100 p-3 rounded">
                    <h4 class="font-bold">CPU Usage</h4>
                    <p>${stats.cpu_usage}%</p>
                </div>
                <div class="bg-green-100 p-3 rounded">
                    <h4 class="font-bold">Memory Usage</h4>
                    <p>${stats.memory_usage}%</p>
                </div>
                <div class="bg-yellow-100 p-3 rounded">
                    <h4 class="font-bold">Active Users</h4>
                    <p>${stats.active_users}</p>
                </div>
                <div class="bg-purple-100 p-3 rounded">
                    <h4 class="font-bold">Queue Depth</h4>
                    <p>${stats.queue_depth}</p>
                </div>
            </div>
        `;
        
        this.scheduleUpdate(() => {
            this.elements.systemStats.innerHTML = statsHtml;
        });
    }
    
    updateUserInfo(user) {
        if (!this.elements.userInfo) return;
        
        this.currentUser = user;
        
        const userHtml = `
            <div class="text-sm">
                <strong>User:</strong> ${helpers.escapeHtml(user.username)} 
                ${user.is_sysop ? '<span class="bg-red-100 px-2 py-1 rounded text-xs">SYSOP</span>' : ''}
            </div>
        `;
        
        this.scheduleUpdate(() => {
            this.elements.userInfo.innerHTML = userHtml;
        });
        
        if (user.is_sysop && this.elements.sysopPanel) {
            this.elements.sysopPanel.style.display = 'block';
        }
    }
    
    updateWorkerList(workers) {
        if (!this.elements.workerList) return;
        
        const workerHtml = Object.values(workers).map(worker => `
            <div class="p-2 mb-2 rounded ${helpers.getWorkerStatusClass(worker)}">
                <strong>${helpers.escapeHtml(worker.name)}</strong> (${worker.type})
                <br>
                <small>Health: ${worker.health_score}% | Load: ${worker.current_load}</small>
            </div>
        `).join('');
        
        this.scheduleUpdate(() => {
            this.elements.workerList.innerHTML = workerHtml;
        });
    }
    
    updateHuggingFaceModels(models) {
        if (!this.elements.huggingFaceModelList) return;
        
        const modelHtml = Object.values(models).map(model => `
            <div class="p-2 mb-2 rounded bg-gray-100">
                <strong>${helpers.escapeHtml(model.name)}</strong>
                <br>
                <small>Status: ${model.status}</small>
            </div>
        `).join('');
        
        this.scheduleUpdate(() => {
            this.elements.huggingFaceModelList.innerHTML = modelHtml;
        });
    }
    
    showGmailAuthPrompt() {
        if (this.elements.gmailAuthPrompt) {
            this.elements.gmailAuthPrompt.style.display = 'block';
        }
    }
    
    hideGmailAuthPrompt() {
        if (this.elements.gmailAuthPrompt) {
            this.elements.gmailAuthPrompt.style.display = 'none';
        }
    }
    
    showSysopPanel() {
        if (this.elements.sysopPanel) {
            this.elements.sysopPanel.style.display = 'block';
        }
    }
    
    // Performance optimization methods
    setupPerformanceMonitoring() {
        // Monitor UI performance
        this.performanceObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 100) { // Log slow operations
                    console.warn(`[UI] Slow operation detected: ${entry.name} took ${entry.duration}ms`);
                }
            }
        });
        
        if (typeof PerformanceObserver !== 'undefined') {
            this.performanceObserver.observe({ entryTypes: ['measure'] });
        }
    }
    
    adjustLayout() {
        helpers.adjustLayoutForScreenSize();
    }
    
    redrawVisualizations() {
        // Redraw any canvas elements or visualizations
        if (this.elements.audioWaveform) {
            // Redraw audio waveform if needed
            this.redrawAudioWaveform();
        }
    }
    
    redrawAudioWaveform() {
        // Implementation for redrawing audio waveform
        const canvas = this.elements.audioWaveform;
        if (canvas && this.analyser) {
            const ctx = canvas.getContext('2d');
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            this.analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
    }
}