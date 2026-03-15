import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud, CloudOff, Loader2 } from 'lucide-react-native';
import { getNetworkState, addNetworkListener, removeNetworkListener, NetworkState } from '../services/networkService';
import { getSyncStatus, addSyncListener, removeSyncListener, SyncStatus } from '../services/syncService';

export const SyncIndicator: React.FC = () => {
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
    });
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

    useEffect(() => {
        // Initialize network state
        getNetworkState().then(setNetworkState);

        // Initialize sync status
        setSyncStatus(getSyncStatus());

        // Add listeners
        const handleNetworkChange = (state: NetworkState) => {
            setNetworkState(state);
        };

        const handleSyncChange = (status: SyncStatus) => {
            setSyncStatus(status);
        };

        addNetworkListener(handleNetworkChange);
        addSyncListener(handleSyncChange);

        // Cleanup
        return () => {
            removeNetworkListener(handleNetworkChange);
            removeSyncListener(handleSyncChange);
        };
    }, []);

    const isOnline = networkState.isConnected && networkState.isInternetReachable;

    return (
        <View style={styles.container}>
            {syncStatus?.isSyncing ? (
                <View style={styles.syncingContainer}>
                    <Loader2 size={14} color="#fff" style={styles.spinIcon} />
                    <View>
                        <Text style={styles.syncingText}>
                            Syncing {syncStatus.progress}/{syncStatus.total}
                        </Text>
                        {syncStatus.currentActivity && (
                            <Text style={styles.activityText} numberOfLines={1} ellipsizeMode="tail">
                                {syncStatus.currentActivity}
                            </Text>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.statusContainer}>
                    {isOnline ? (
                        <Cloud size={16} color="#fff" />
                    ) : (
                        <CloudOff size={16} color="#FFB74D" />
                    )}
                    <Text style={styles.statusText}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        minWidth: 100,
    },
    syncingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: 200,
    },
    spinIcon: {
        // Optional: Add animation here if not already present in parent
    },
    syncingText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '700',
    },
    activityText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.9)',
        maxWidth: 160,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
});
