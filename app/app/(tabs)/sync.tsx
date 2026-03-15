import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Cloud,
    CloudOff,
    RefreshCw,
    Database,
    CheckCircle2,
    AlertCircle,
    Server,
    Wifi,
    WifiOff
} from 'lucide-react-native';
import {
    getSyncStatus,
    syncLeads,
    addSyncListener,
    removeSyncListener,
    SyncStatus as SyncStatusType,
    checkBackendHealth,
} from '@/services/syncService';
import {
    getNetworkState,
    addNetworkListener,
    removeNetworkListener,
    NetworkState,
} from '@/services/networkService';
import { getLeadStats } from '@/services/leadService';


export default function SyncScreen() {
    const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null);
    const [networkState, setNetworkState] = useState<NetworkState | null>(null);
    const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
    const [stats, setStats] = useState({ total: 0, synced: 0, unsynced: 0 });
    const [refreshing, setRefreshing] = useState(false);

    const loadInitialData = useCallback(async () => {
        const [status, netState, health, leadStats] = await Promise.all([
            getSyncStatus(),
            getNetworkState(),
            checkBackendHealth(),
            getLeadStats()
        ]);
        setSyncStatus(status);
        setNetworkState(netState);
        setBackendHealthy(health);
        setStats(leadStats);
    }, []);

    useEffect(() => {
        loadInitialData();

        const handleSyncChange = (status: SyncStatusType) => {
            setSyncStatus(status);
            loadStats(); // Reload stats when sync updates
        };

        const handleNetworkChange = (state: NetworkState) => {
            setNetworkState(state);
        };

        addSyncListener(handleSyncChange);
        addNetworkListener(handleNetworkChange);

        return () => {
            removeSyncListener(handleSyncChange);
            removeNetworkListener(handleNetworkChange);
        };
    }, [loadInitialData]);



    const loadStats = async () => {
        const leadStats = await getLeadStats();
        setStats(leadStats);
    };

    const checkHealth = async () => {
        const healthy = await checkBackendHealth();
        setBackendHealthy(healthy);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await checkHealth();
        await loadStats();
        setRefreshing(false);
    };

    const handleManualSync = async () => {
        if (!isOnline && !backendHealthy) return;
        try {
            await syncLeads();
            await loadStats();
        } catch (error) {
            console.error(error);
        }
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };
        return date.toLocaleString('en-US', options);
    };

    const isOnline = networkState?.isConnected && networkState?.isInternetReachable;
    const isSyncing = syncStatus?.isSyncing;

    const syncProgress =
        syncStatus && syncStatus.total > 0
            ? (syncStatus.progress / syncStatus.total)
            : 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Sync Status</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Main Status Card */}
                <View style={[styles.mainCard, isOnline ? styles.cardOnline : styles.cardOffline]}>
                    <View style={styles.statusIconContainer}>
                        {isSyncing ? (
                            <RefreshCw size={48} color="#fff" style={styles.spinIcon} />
                        ) : isOnline ? (
                            <Cloud size={48} color="#fff" />
                        ) : (
                            <CloudOff size={48} color="#fff" />
                        )}
                    </View>
                    <Text style={styles.mainStatusTitle}>
                        {isSyncing ? 'Syncing in Progress...' : isOnline ? 'All Systems Operational' : 'Offline Mode'}
                    </Text>
                    <Text style={styles.mainStatusSubtitle}>
                        {isSyncing
                            ? `Uploading ${syncStatus?.progress} of ${syncStatus?.total} items`
                            : isOnline
                                ? 'Your device is connected and ready to sync.'
                                : 'Changes are saved locally and will sync later.'}
                    </Text>

                    {isSyncing && (
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${syncProgress * 100}%` }]} />
                        </View>
                    )}
                </View>

                {/* Connection Details Grid */}
                <View style={styles.gridContainer}>
                    {/* Network Status */}
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, isOnline ? styles.iconBgGreen : styles.iconBgRed]}>
                            {isOnline ? <Wifi size={24} color="#155724" /> : <WifiOff size={24} color="#721c24" />}
                        </View>
                        <View>
                            <Text style={styles.gridLabel}>Network</Text>
                            <Text style={[styles.gridValue, isOnline ? styles.textGreen : styles.textRed]}>
                                {isOnline ? 'Connected' : 'Disconnected'}
                            </Text>
                        </View>
                    </View>

                    {/* Server Health */}
                    <View style={styles.gridItem}>
                        <View style={[
                            styles.gridIcon,
                            backendHealthy === null ? styles.iconBgGray : backendHealthy ? styles.iconBgGreen : styles.iconBgRed
                        ]}>
                            <Server size={24} color={backendHealthy === null ? '#666' : backendHealthy ? '#155724' : '#721c24'} />
                        </View>
                        <View>
                            <Text style={styles.gridLabel}>Server</Text>
                            <Text style={[
                                styles.gridValue,
                                backendHealthy === null ? styles.textGray : backendHealthy ? styles.textGreen : styles.textRed
                            ]}>
                                {backendHealthy === null ? 'Checking...' : backendHealthy ? 'Healthy' : 'Unreachable'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Data Stats */}
                <Text style={styles.sectionTitle}>Data Overview</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.synced}</Text>
                        <View style={styles.statLabelRow}>
                            <CheckCircle2 size={14} color="#4CAF50" />
                            <Text style={styles.statLabel}>Synced</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.unsynced}</Text>
                        <View style={styles.statLabelRow}>
                            <AlertCircle size={14} color="#FFA000" />
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.total}</Text>
                        <View style={styles.statLabelRow}>
                            <Database size={14} color="#1976D2" />
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                    </View>
                </View>

                {/* Manual Sync Button */}
                <TouchableOpacity
                    style={[
                        styles.syncButton,
                        (isSyncing || !isOnline) && styles.syncButtonDisabled
                    ]}
                    onPress={handleManualSync}
                    disabled={isSyncing || !isOnline}
                >
                    <RefreshCw size={20} color={isSyncing || !isOnline ? '#999' : '#fff'} />
                    <Text style={[styles.syncButtonText, (isSyncing || !isOnline) && styles.syncButtonTextDisabled]}>
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Text>
                </TouchableOpacity>

                {!isOnline && (
                    <Text style={styles.offlineHint}>
                        Connect to the internet to sync your pending leads.
                    </Text>
                )}

                {/* Activity Log Section */}
                <View style={styles.logSection}>
                    <Text style={styles.sectionTitle}>Sync Activity</Text>

                    {syncStatus?.items && syncStatus.items.length > 0 ? (
                        <>
                            {/* Completion Summary */}
                            {syncStatus.items.every(item => item.status === 'completed') && (
                                <View style={styles.completionSummary}>
                                    <CheckCircle2 size={20} color="#2E7D32" />
                                    <Text style={styles.completionText}>
                                        All Completed {syncStatus.lastSyncTime && `on ${formatDate(syncStatus.lastSyncTime)}`}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.activityList}>
                                {syncStatus.items.map((item) => (
                                    <View key={item.id} style={styles.activityCard}>
                                        <View style={styles.activityIconContainer}>
                                            <View style={[styles.typeIcon, { backgroundColor: '#E3F2FD' }]}>
                                                <Database size={20} color="#1976D2" />
                                            </View>
                                        </View>

                                        <View style={styles.activityContent}>
                                            <View style={styles.activityHeader}>
                                                <Text style={styles.activityName} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <View style={[
                                                    styles.statusBadge,
                                                    item.status === 'completed' ? styles.badgeSuccess :
                                                        item.status === 'syncing' ? styles.badgeSyncing :
                                                            item.status === 'error' ? styles.badgeError :
                                                                styles.badgePending
                                                ]}>
                                                    <Text style={[
                                                        styles.statusText,
                                                        item.status === 'completed' ? styles.textSuccess :
                                                            item.status === 'syncing' ? styles.textSyncing :
                                                                item.status === 'error' ? styles.textError :
                                                                    styles.textPending
                                                    ]}>
                                                        {item.status.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.activityFooter}>
                                                <Text style={styles.activityDetails} numberOfLines={1}>
                                                    {item.details}
                                                </Text>
                                                {item.completedAt && (
                                                    <Text style={styles.activityTime}>
                                                        {formatDate(item.completedAt)}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.logPlaceholder}>No recent activity</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: '#F8F9FA',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
    },
    mainCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    cardOnline: {
        backgroundColor: '#1976D2',
    },
    cardOffline: {
        backgroundColor: '#D32F2F',
    },
    statusIconContainer: {
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 16,
        borderRadius: 40,
    },
    spinIcon: {
        // Add animation logic if needed, simple replacement for now
    },
    mainStatusTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    mainStatusSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: '90%', // Increased max width
        marginTop: 4,
    },
    progressBarContainer: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        marginTop: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    gridItem: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    gridIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconBgGreen: { backgroundColor: '#D4EDDA' },
    iconBgRed: { backgroundColor: '#F8D7DA' },
    iconBgGray: { backgroundColor: '#F5F5F5' },
    gridLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    textGreen: { color: '#155724' },
    textRed: { color: '#721c24' },
    textGray: { color: '#666' },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    syncButton: {
        backgroundColor: '#1A1A1A',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 5,
        gap: 8,
    },
    syncButtonDisabled: {
        backgroundColor: '#F5F5F5',
        shadowOpacity: 0,
        elevation: 0,
    },
    syncButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    syncButtonTextDisabled: {
        color: '#999',
    },
    offlineHint: {
        textAlign: 'center',
        color: '#8E8E93',
        marginTop: 16,
        fontSize: 13,
    },
    logSection: {
        marginTop: 32,
        paddingBottom: 40,
    },
    activityList: {
        gap: 12,
    },
    activityCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F5F5F5',
    },
    activityIconContainer: {
        marginRight: 16,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityContent: {
        flex: 1,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    activityName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeSuccess: { backgroundColor: '#E8F5E9' },
    badgeSyncing: { backgroundColor: '#E3F2FD' },
    badgeError: { backgroundColor: '#FFEBEE' },
    badgePending: { backgroundColor: '#F5F5F5' },

    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textSuccess: { color: '#2E7D32' },
    textSyncing: { color: '#1565C0' },
    textError: { color: '#C62828' },
    textPending: { color: '#757575' },

    activityFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityDetails: {
        fontSize: 13,
        color: '#666',
        flex: 1,
    },
    activityTime: {
        fontSize: 12,
        color: '#999',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        borderStyle: 'dashed',
    },
    logPlaceholder: {
        fontSize: 14,
        color: '#999',
    },
    completionSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
    },
    completionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2E7D32',
        flex: 1,
    },
});
