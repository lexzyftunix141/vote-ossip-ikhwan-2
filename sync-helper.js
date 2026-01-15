// sync-helper.js
class DatabaseSyncManager {
    constructor() {
        this.channel = null;
        this.listeners = [];
        this.initialize();
    }
    
    initialize() {
        // Initialize BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel('ossip-database-sync');
            this.setupChannelListener();
        }
        
        // Setup storage listener
        window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
    
    setupChannelListener() {
        this.channel.onmessage = (event) => {
            const { action, payload } = event.data;
            
            if (action === 'DATABASE_UPDATE') {
                this.notifyListeners(payload);
            }
        };
    }
    
    handleStorageEvent(event) {
        if (event.key === 'lastDatabaseUpdate') {
            try {
                const data = JSON.parse(event.newValue);
                this.notifyListeners(data);
            } catch (e) {
                console.error('Error parsing storage data:', e);
            }
        }
    }
    
    notifyListeners(data) {
        this.listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in sync listener:', error);
            }
        });
    }
    
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }
    
    broadcastUpdate(type, data) {
        const message = {
            action: 'DATABASE_UPDATE',
            payload: {
                type: type,
                data: data,
                timestamp: new Date().toISOString(),
                page: window.location.pathname.split('/').pop()
            }
        };
        
        // Broadcast via channel
        if (this.channel) {
            this.channel.postMessage(message);
        }
        
        // Also update localStorage
        localStorage.setItem('lastDatabaseUpdate', JSON.stringify(message.payload));
    }
    
    // Helper untuk update spesifik
    broadcastVoterUpdate(voterId, changes) {
        this.broadcastUpdate('VOTER_UPDATED', {
            voterId: voterId,
            changes: changes
        });
    }
    
    broadcastVoteChange(voterId, oldCandidateId, newCandidateId) {
        this.broadcastUpdate('VOTE_CHANGED', {
            voterId: voterId,
            oldCandidateId: oldCandidateId,
            newCandidateId: newCandidateId
        });
    }
}

// Create global instance
window.databaseSync = new DatabaseSyncManager();

// Export untuk module (jika menggunakan ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseSyncManager };
}