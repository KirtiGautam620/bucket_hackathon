import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Switch } from 'react-native';
import { Wifi, WifiOff, X, Globe, Signal } from 'lucide-react-native';
import {
    getNetworkState,
    addNetworkListener,
    removeNetworkListener,
    setOfflineMode,
    isOfflineModeEnabled,
    NetworkState
} from '@/services/networkService';

interface NetworkControlModalProps {
    visible: boolean;
    onClose: () => void;
}



export const NetworkControlModal: React.FC<NetworkControlModalProps> = ({ visible, onClose }) => {
    const [networkState, setNetworkState] = useState<NetworkState | null>(null);
    const [offlineEnabled, setOfflineEnabled] = useState(false);

    useEffect(() => {
        loadState();
        setOfflineEnabled(isOfflineModeEnabled());

        const handleNetworkChange = (state: NetworkState) => {
            setNetworkState(state);
            setOfflineEnabled(isOfflineModeEnabled()); // Update toggle if changed elsewhere
        };

        addNetworkListener(handleNetworkChange);
        return () => removeNetworkListener(handleNetworkChange);
    }, []);

    const loadState = async () => {
        const state = await getNetworkState();
        setNetworkState(state);
        setOfflineEnabled(isOfflineModeEnabled());
    };

    const handleToggleOffline = (value: boolean) => {
        setOfflineMode(value);
        setOfflineEnabled(value);
    };

    const isConnected = networkState?.isConnected && networkState?.isInternetReachable;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Network Settings</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statusCard}>
                        {isConnected ? (
                            <View style={styles.iconCircleOnline}>
                                <Wifi size={32} color="#fff" />
                            </View>
                        ) : (
                            <View style={styles.iconCircleOffline}>
                                <WifiOff size={32} color="#fff" />
                            </View>
                        )}
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>Current Status</Text>
                            <Text style={[styles.statusValue, isConnected ? styles.textOnline : styles.textOffline]}>
                                {isConnected ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Globe size={20} color="#666" />
                            </View>
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Network Type</Text>
                                <Text style={styles.detailValue}>{networkState?.type?.toUpperCase() || 'UNKNOWN'}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Signal size={20} color="#666" />
                            </View>
                            <View style={styles.detailText}>
                                <Text style={styles.detailLabel}>Signal Strength</Text>
                                <Text style={styles.detailValue}>{isConnected ? 'Strong' : 'None'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.controlSection}>
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>Work Offline</Text>
                                <Text style={styles.switchSubtext}>Force app to use local database only</Text>
                            </View>
                            <Switch
                                value={offlineEnabled}
                                onValueChange={handleToggleOffline}
                                trackColor={{ false: '#767577', true: '#FF3B30' }}
                                thumbColor={'#f4f3f4'}
                            />
                        </View>
                    </View>

                    <Text style={styles.hintText}>
                        When working offline, all leads are saved locally and will sync once connection is restored.
                    </Text>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 450,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    closeButton: {
        padding: 4,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    iconCircleOnline: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconCircleOffline: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    textOnline: {
        color: '#34C759',
    },
    textOffline: {
        color: '#FF3B30',
    },
    detailsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    detailRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginHorizontal: 4,
    },
    detailIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    controlSection: {
        marginBottom: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    switchSubtext: {
        fontSize: 13,
        color: '#8E8E93',
    },
    hintText: {
        fontSize: 13,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 18,
    },
});
