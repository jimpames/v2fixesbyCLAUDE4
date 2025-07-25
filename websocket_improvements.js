// WebSocketManager.js - Enhanced error handling and monitoring
export class WebSocketManager {
    static CONFIG = {
        MAX_QUEUE_SIZE: 100,
        MESSAGE_RETENTION_PERIOD: 300000, // 5 minutes
        MAX_RATE_LIMIT_DELAY: 30000,
        MAX_RECONNECT_ATTEMPTS: 5
    };
    
    constructor() {
        // ... existing properties ...
        
        // Add these enhancements for better monitoring
        this.connectionHistory = [];
        this.performanceMetrics = {
            connectionTime: 0,
            averageLatency: 0,
            successRate: 0,
            totalMessages: 0
        };
        
        // Enhanced error tracking
        this.errorCounts = {
            connection: 0,
            message: 0,
            heartbeat: 0,
            timeout: 0
        };
    }
    
    // Enhanced connection monitoring
    trackConnectionPerformance() {
        const startTime = Date.now();
        
        this.socket.addEventListener('open', () => {
            this.performanceMetrics.connectionTime = Date.now() - startTime;
            this.connectionHistory.push({
                timestamp: Date.now(),
                event: 'connected',
                duration: this.performanceMetrics.connectionTime
            });
            this.resetErrorCounts();
        });
    }
    
    // Enhanced message validation
    validateMessage(message) {
        if (!message || typeof message !== 'object') {
            throw new Error('Invalid message format');
        }
        
        if (!message.type) {
            throw new Error('Message missing type field');
        }
        
        // Check message size
        const messageSize = new Blob([JSON.stringify(message)]).size;
        if (messageSize > 1024 * 1024) { // 1MB limit
            throw new Error('Message too large');
        }
        
        return true;
    }
    
    // Enhanced send with validation
    async send(data) {
        try {
            this.validateMessage(data);
            
            const messageId = this.generateMessageId();
            const message = { ...data, messageId, timestamp: Date.now() };

            if (this.messageQueue.length >= WebSocketManager.CONFIG.MAX_QUEUE_SIZE) {
                this.onStatusChange?.('Message queue full', false);
                return Promise.reject(new Error('Queue full'));
            }

            if (!this.isHealthy()) {
                console.log('[WS] Connection not healthy, queueing message:', message);
                this.messageQueue.push(message);
                await this.connect();
                return;
            }

            const messageStr = JSON.stringify(message);
            this.socket.send(messageStr);
            this.trackPendingMessage(messageId);
            this.updateMetrics('sent');
            
            return messageId;
        } catch (error) {
            this.handleError(error, 'send');
            throw error;
        }
    }
    
    // Performance metrics tracking
    updateMetrics(type) {
        switch(type) {
            case 'sent':
                this.performanceMetrics.totalMessages++;
                break;
            case 'received':
                this.performanceMetrics.totalMessages++;
                this.calculateSuccessRate();
                break;
        }
    }
    
    calculateSuccessRate() {
        const totalErrors = Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0);
        this.performanceMetrics.successRate = 
            ((this.performanceMetrics.totalMessages - totalErrors) / this.performanceMetrics.totalMessages) * 100;
    }
    
    resetErrorCounts() {
        Object.keys(this.errorCounts).forEach(key => {
            this.errorCounts[key] = 0;
        });
    }
    
    // Enhanced cleanup with resource management
    destroy() {
        console.log('[WS] Destroying WebSocket manager...');
        
        // Clear all timers
        clearTimeout(this.reconnectTimer);
        clearInterval(this.heartbeatInterval);
        
        // Clear message queues
        this.messageQueue.length = 0;
        this.pendingMessages.clear();
        this.acknowledgedMessages.clear();
        
        // Close socket
        if (this.socket) {
            this.socket.close(1000, 'Manager destroyed');
            this.socket = null;
        }
        
        // Reset state
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnecting = false;
        
        console.log('[WS] WebSocket manager destroyed');
    }
}