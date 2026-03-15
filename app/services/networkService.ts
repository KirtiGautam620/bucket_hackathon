import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string;
}

let currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
};

let listeners: Array<(state: NetworkState) => void> = [];

// Manual Offline Mode (User Override)
let offlineMode = false;

// For demo mode - force offline/online (Dev Tool)
let demoMode = false;
let demoIsOnline = true;

export const initNetworkMonitoring = (): void => {
    NetInfo.addEventListener(state => {
        if (!demoMode) {
            // Store the REAL state, but listeners might get the modified state if we were to emit it here
            // However, getNetworkState() computes the effective state.
            // We should ideally notify listeners with the EFFECTIVE state.

            const realState = {
                isConnected: state.isConnected ?? false,
                isInternetReachable: state.isInternetReachable ?? false,
                type: state.type,
            };

            // Only update current state if not in a forced mode that overrides everything?
            // Actually, let's keep currentState as the REAL state, and compute effective state in getters.
            currentState = realState;
            notifyListeners();
        }
    });
};

/**
 * Get the EFFECTIVE network state (considering offline mode and demo mode)
 */
export const getNetworkState = async (): Promise<NetworkState> => {
    if (demoMode) {
        return {
            isConnected: demoIsOnline,
            isInternetReachable: demoIsOnline,
            type: demoIsOnline ? 'wifi' : 'none',
        };
    }

    if (offlineMode) {
        return {
            isConnected: false,
            isInternetReachable: false,
            type: 'none',
        };
    }

    const state = await NetInfo.fetch();
    return {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
    };
};

export const isOnline = async (): Promise<boolean> => {
    const state = await getNetworkState();
    return state.isConnected && state.isInternetReachable;
};

export const addNetworkListener = (listener: (state: NetworkState) => void): void => {
    listeners.push(listener);
};

export const removeNetworkListener = (listener: (state: NetworkState) => void): void => {
    listeners = listeners.filter(l => l !== listener);
};

const notifyListeners = async (): Promise<void> => {
    const effectiveState = await getNetworkState();
    listeners.forEach(listener => listener(effectiveState));
};

// USER CONTROL: Manual Offline Mode
export const setOfflineMode = (enabled: boolean): void => {
    offlineMode = enabled;
    notifyListeners();
    console.log(`Manual Offline Mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
};

export const isOfflineModeEnabled = (): boolean => {
    return offlineMode;
};

// Demo mode controls
export const enableDemoMode = (online: boolean = true): void => {
    demoMode = true;
    demoIsOnline = online;
    notifyListeners();
    console.log(`Demo mode enabled - Network: ${online ? 'ONLINE' : 'OFFLINE'}`);
};

export const disableDemoMode = async (): Promise<void> => {
    demoMode = false;
    const state = await NetInfo.fetch();
    currentState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
    };
    notifyListeners();
    console.log('Demo mode disabled - Using real network state');
};

export const toggleDemoNetwork = (): void => {
    if (!demoMode) {
        console.warn('Demo mode is not enabled. Call enableDemoMode() first.');
        return;
    }

    demoIsOnline = !demoIsOnline;
    notifyListeners();
    console.log(`Demo network toggled - Now: ${demoIsOnline ? 'ONLINE' : 'OFFLINE'}`);
};

export const isDemoMode = (): boolean => {
    return demoMode;
};
