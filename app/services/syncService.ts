import { getUnsyncedLeads, markAsSynced, updateLeadLocal, Lead } from './leadService';
import { isOnline, addNetworkListener, NetworkState } from './networkService';
import * as FileSystem from 'expo-file-system/legacy';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get the backend API URL dynamically
 */
const getApiUrl = () => {
    // 1. Check environment variable
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. In development, try to use the host URI from Expo Constants
    if (__DEV__ && Constants.expoConfig?.hostUri) {
        const host = Constants.expoConfig.hostUri.split(':')[0];
        return `http://${host}:3000/api`;
    }

    // 3. Fallback for Android Emulator
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000/api';
    }

    // 4. Fallback for Local Network (Mobile Devices/Simulators)
    return 'http://10.92.220.230:3000/api';
};

// Configure your backend URL here
const BACKEND_URL = getApiUrl();

export interface SyncItem {
    id: string;
    type: 'lead'; // Only lead type now
    name: string;
    status: 'pending' | 'syncing' | 'completed' | 'error';
    details?: string;
    timestamp: number;
    completedAt?: number; // Completion timestamp
}

export interface SyncStatus {
    isSyncing: boolean;
    progress: number;
    total: number;
    errors: string[];
    lastSyncTime: number | null;
    currentActivity?: string;
    logs: string[];
    items: SyncItem[]; // New: Structured items for UI
}

let syncStatus: SyncStatus = {
    isSyncing: false,
    progress: 0,
    total: 0,
    errors: [],
    lastSyncTime: null,
    currentActivity: 'Idle',
    logs: [],
    items: [],
};

const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    syncStatus.logs = [`[${timestamp}] ${message}`, ...syncStatus.logs];
    syncStatus.currentActivity = message;
    notifySyncListeners();
};

// Helper: Add or update a sync item
const updateSyncItem = (item: SyncItem) => {
    const existingIndex = syncStatus.items.findIndex(i => i.id === item.id);
    if (existingIndex >= 0) {
        syncStatus.items[existingIndex] = item;
    } else {
        syncStatus.items = [item, ...syncStatus.items]; // Newest first
    }
    notifySyncListeners();
};

const clearSyncItems = () => {
    syncStatus.items = [];
    notifySyncListeners();
}

let syncListeners: Array<(status: SyncStatus) => void> = [];
let autoSyncEnabled = true;

/**
 * Initialize sync service with network monitoring
 */
export const initSyncService = (): void => {
    // Listen for network changes and auto-sync when online
    addNetworkListener(async (state: NetworkState) => {
        if (state.isConnected && state.isInternetReachable && autoSyncEnabled) {
            console.log('Network connected - triggering auto-sync');
            await syncLeads();
        }
    });
};

/**
 * Upload a single lead to backend
 */
export const uploadLead = async (lead: Lead): Promise<boolean> => {
    try {
        const response = await fetch(`${BACKEND_URL}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: lead.id,
                name: lead.name,
                phone: lead.phone,
                email: lead.email,
                company: lead.company,
                createdAt: lead.createdAt,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        console.log('Lead uploaded successfully:', lead.id);
        return true;
    } catch (error) {
        console.error('Error uploading lead:', error);
        return false;
    }
};

/**
 * Upload audio file to backend
 */
const uploadAudio = async (leadId: string, audioPath: string): Promise<{ transcription?: string; summary?: string } | null> => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(audioPath);
        if (!fileInfo.exists) {
            console.warn('Audio file does not exist:', audioPath);
            return null;
        }

        const formData = new FormData();
        formData.append('leadId', leadId);
        formData.append('audio', {
            uri: audioPath,
            type: 'audio/m4a',
            name: `${leadId}.m4a`,
        } as any);

        const response = await fetch(`${BACKEND_URL}/upload-audio`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            throw new Error(`Audio upload failed with ${response.status}`);
        }

        const data = await response.json();
        console.log('Audio uploaded successfully:', leadId);
        return {
            transcription: data.transcription,
            summary: data.summary
        };
    } catch (error) {
        console.error('Error uploading audio:', error);
        return null;
    }
};

/**
 * Upload image file to backend
 */
const uploadImage = async (leadId: string, imagePath: string): Promise<boolean> => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(imagePath);
        if (!fileInfo.exists) {
            console.warn('Image file does not exist:', imagePath);
            return false;
        }

        const formData = new FormData();
        formData.append('leadId', leadId);
        formData.append('image', {
            uri: imagePath,
            type: 'image/jpeg', // Assuming JPEG from camera
            name: `${leadId}.jpg`,
        } as any);

        const response = await fetch(`${BACKEND_URL}/upload-image`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            throw new Error(`Image upload failed with ${response.status}`);
        }

        console.log('Image uploaded successfully:', leadId);
        return true;
    } catch (error) {
        console.error('Error uploading image:', error);
        return false;
    }
};

// ... (listeners and initSyncService remain same)

/**
 * Sync all unsynced leads to backend
 */
export const syncLeads = async (): Promise<void> => {
    // Check if already syncing
    if (syncStatus.isSyncing) {
        console.log('Sync already in progress');
        return;
    }

    // Check network connectivity
    const online = await isOnline();
    if (!online) {
        console.log('No internet connection - skipping sync');
        return;
    }

    try {
        const unsyncedLeads = await getUnsyncedLeads();

        if (unsyncedLeads.length === 0) {
            console.log('No leads to sync');
            return;
        }

        // Reset status for new sync
        syncStatus = {
            isSyncing: true,
            progress: 0,
            total: unsyncedLeads.length,
            errors: [],
            lastSyncTime: syncStatus.lastSyncTime,
            currentActivity: 'Starting sync...',
            logs: [],
            items: [], // Clear items for new sync session
        };
        addLog(`Found ${unsyncedLeads.length} leads to sync`);

        console.log(`Starting sync for ${unsyncedLeads.length} leads`);

        // Sync each lead
        for (let i = 0; i < unsyncedLeads.length; i++) {
            const lead = unsyncedLeads[i];

            try {
                // Tracking Lead
                const leadItemId = `lead-${lead.id}`;
                updateSyncItem({
                    id: leadItemId,
                    type: 'lead',
                    name: lead.name || 'Unknown Lead',
                    status: 'syncing',
                    details: 'Uploading lead data...',
                    timestamp: Date.now(),
                });

                addLog(`Syncing lead: ${lead.name || 'Unknown'}`);

                // Upload lead data
                const leadSuccess = await uploadLead(lead);

                if (!leadSuccess) {
                    const errorMsg = `Failed to upload lead ${lead.id}`;
                    syncStatus.errors.push(errorMsg);
                    addLog(`Error: ${errorMsg}`);

                    updateSyncItem({
                        id: leadItemId,
                        type: 'lead',
                        name: lead.name || 'Unknown Lead',
                        status: 'error',
                        details: 'Failed to upload',
                        timestamp: Date.now(),
                    });
                    continue;
                }

                // Upload audio if exists (update lead item, don't create new item)
                if (lead.audioPath) {
                    updateSyncItem({
                        id: leadItemId,
                        type: 'lead',
                        name: lead.name || 'Unknown Lead',
                        status: 'syncing',
                        details: 'Uploading audio...',
                        timestamp: Date.now(),
                    });

                    addLog(`Uploading audio for: ${lead.name}`);
                    const audioResult = await uploadAudio(lead.id, lead.audioPath);

                    if (!audioResult) {
                        const errorMsg = `Failed to upload audio for lead ${lead.id}`;
                        syncStatus.errors.push(errorMsg);
                        addLog(`Error: ${errorMsg}`);
                        updateSyncItem({
                            id: leadItemId,
                            type: 'lead',
                            name: lead.name || 'Unknown Lead',
                            status: 'error',
                            details: 'Failed to upload audio',
                            timestamp: Date.now(),
                        });
                        continue;
                    }

                    // Update local lead with AI results if available
                    if (audioResult.transcription || audioResult.summary) {
                        await updateLeadLocal(lead.id, {
                            transcription: audioResult.transcription,
                            summary: audioResult.summary
                        });
                        addLog(`AI processing complete for: ${lead.name}`);
                    }
                }

                // Upload image if exists (update lead item)
                if (lead.imagePath) {
                    updateSyncItem({
                        id: leadItemId,
                        type: 'lead',
                        name: lead.name || 'Unknown Lead',
                        status: 'syncing',
                        details: 'Uploading image...',
                        timestamp: Date.now(),
                    });

                    addLog(`Uploading image for: ${lead.name}`);
                    const imageSuccess = await uploadImage(lead.id, lead.imagePath);

                    if (!imageSuccess) {
                        const errorMsg = `Failed to upload image for lead ${lead.id}`;
                        // We log error but don't stop sync (non-critical?)
                        // Or maybe we should retry? For now let's log it.
                        syncStatus.errors.push(errorMsg);
                        addLog(`Error: ${errorMsg}`);
                        updateSyncItem({
                            id: leadItemId,
                            type: 'lead',
                            name: lead.name || 'Unknown Lead',
                            status: 'error',
                            details: 'Failed to upload image',
                            timestamp: Date.now(),
                        });
                        // Depending on requirements, we might want to continue or retry
                        // Let's continue to audio
                    }
                }

                // Mark as completed with timestamp
                updateSyncItem({
                    id: leadItemId,
                    type: 'lead',
                    name: lead.name || 'Unknown Lead',
                    status: 'completed',
                    details: 'Saved to cloud',
                    timestamp: Date.now(),
                    completedAt: Date.now(),
                });

                // Mark as synced in local database
                await markAsSynced(lead.id);
                addLog(`Successfully synced: ${lead.name}`);

                // Update progress
                syncStatus.progress = i + 1;
                notifySyncListeners();

            } catch (error) {
                console.error(`Error syncing lead ${lead.id}:`, error);
                const errorMsg = `Error syncing lead ${lead.id}: ${error}`;
                syncStatus.errors.push(errorMsg);
                addLog(`Critical Error: ${errorMsg}`);
            }
        }

        // Update final status
        syncStatus.isSyncing = false;
        syncStatus.lastSyncTime = Date.now();
        syncStatus.currentActivity = 'Sync completed';
        addLog('Sync completed successfully');

        console.log(`Sync completed - ${syncStatus.progress}/${syncStatus.total} synced`);
        if (syncStatus.errors.length > 0) {
            console.warn('Sync errors:', syncStatus.errors);
            addLog(`Completed with ${syncStatus.errors.length} errors`);
        }

    } catch (error) {
        console.error('Sync error:', error);
        syncStatus.isSyncing = false;
        syncStatus.errors.push(`Sync failed: ${error}`);
        addLog(`Sync process failed: ${error}`);
        notifySyncListeners();
    }
};

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
    return { ...syncStatus };
};

/**
 * Add listener for sync status changes
 */
export const addSyncListener = (listener: (status: SyncStatus) => void): void => {
    syncListeners.push(listener);
};

/**
 * Remove sync status listener
 */
export const removeSyncListener = (listener: (status: SyncStatus) => void): void => {
    syncListeners = syncListeners.filter(l => l !== listener);
};

/**
 * Notify all sync listeners
 */
const notifySyncListeners = (): void => {
    syncListeners.forEach(listener => listener(syncStatus));
};

/**
 * Enable/disable auto-sync
 */
export const setAutoSync = (enabled: boolean): void => {
    autoSyncEnabled = enabled;
    console.log(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Check backend health
 */
export const checkBackendHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${BACKEND_URL.replace('/api', '')}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        return response.ok;
    } catch (error) {
        console.error('Backend health check failed:', error);
        return false;
    }
};
