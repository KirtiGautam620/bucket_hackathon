import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, StatusBar, Share, Linking, Dimensions, Modal } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { Paths } from 'expo-file-system';
import { getLeadById, deleteLead, Lead, fetchLeadFromBackend } from '@/services/leadService';
import {
    Phone,
    Mail,
    Trash2,
    Share2,
    Edit2,
    Play,
    Pause,
    Calendar,
    Briefcase,
    Hash,
    Sparkles,
    FileText,
    ChevronDown,
    ChevronUp
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LeadDetailScreen() {
    const params = useLocalSearchParams();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [showTranscription, setShowTranscription] = useState(false);
    const id = params.id as string;

    // Reload when screen comes into focus (e.g. back from edit)
    useFocusEffect(
        useCallback(() => {
            loadLead();
        }, [id])
    );

    const loadLead = async () => {
        try {
            const leadData = await getLeadById(id);
            setLead(leadData);

            // If online/synced, try to fetch fresh data (interests, chat history) from backend
            if (leadData) {
                const remoteData = await fetchLeadFromBackend(id);
                if (remoteData) {
                    setLead(prev => ({ ...prev, ...remoteData }));
                }
            }
        } catch (error) {
            console.error('Error loading lead:', error);
            // Don't show alert for remote fetch failure, just log it
            if (!lead) Alert.alert('Error', 'Failed to load lead details');
        } finally {
            setLoading(false);
        }
    };

    // Fix for iOS sandbox path changing: Reconstruct URI from filename
    const audioSource = useMemo(() => {
        if (!lead?.audioPath) return null;

        try {
            // If it's already a file URI, extract the filename and append to current doc dir
            const filename = lead.audioPath.split('/').pop();
            // Paths.document is the trusted current path. 
            // We blindly force it to be in the document directory if it looks like a local file.
            if (filename && (lead.audioPath.startsWith('file://') || lead.audioPath.startsWith('/'))) {
                return { uri: `${Paths.document.uri}/${filename}` };
            }
            return { uri: lead.audioPath };
        } catch (e) {
            console.error("Error parsing audio path:", e);
            return { uri: lead.audioPath };
        }
    }, [lead?.audioPath]);

    const player = useAudioPlayer(audioSource);
    const playerStatus = useAudioPlayerStatus(player);

    const isPlaying = playerStatus.playing;
    const duration = playerStatus.duration;
    const currentTime = playerStatus.currentTime;

    const formatTime = (seconds: number): string => {
        if (!seconds && seconds !== 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = async () => {
        if (!audioSource) return;

        if (isPlaying) {
            player.pause();
        } else {
            try {
                await setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true,
                });
            } catch (e) {
                console.error('Failed to set playback mode:', e);
            }

            if (playerStatus.didJustFinish) {
                // @ts-ignore
                await player.seekTo(0);
            }
            player.play();
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Lead',
            'Are you sure you want to delete this lead? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (lead) {
                                await deleteLead(lead.id);
                                router.back();
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete lead');
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async () => {
        if (!lead) return;
        try {
            const message = `Contact: ${lead.name}\n${lead.company ? `Company: ${lead.company}\n` : ''}${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.email ? `Email: ${lead.email}` : ''}`;
            await Share.share({ message });
        } catch (error) {
            console.error(error);
        }
    };

    const handleCall = () => {
        if (lead?.phone) {
            Linking.openURL(`tel:${lead.phone}`);
        } else {
            Alert.alert('No Phone', 'This lead does not have a phone number.');
        }
    };

    const handleEmail = () => {
        if (lead?.email) {
            Linking.openURL(`mailto:${lead.email}`);
        } else {
            Alert.alert('No Email', 'This lead does not have an email address.');
        }
    };

    const handleEdit = () => {
        router.push(`/lead-edit?id=${lead?.id}`);
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (!lead) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Lead not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const initials = (lead.name || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const hasImage = !!lead.imagePath;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: 'Lead Details',
                    headerBackTitle: '', // Hide back button text
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTintColor: '#007AFF', // Standard iOS blue for back button
                    headerTitleStyle: { color: '#000000', fontWeight: '600' },
                    headerShadowVisible: true,
                    headerRight: () => null, // Remove buttons from header
                }}
            />
            <StatusBar barStyle="dark-content" />

            {/* Image Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalCloseButton}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                    {hasImage && (
                        <Image
                            source={{ uri: lead.imagePath! }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <ScrollView style={styles.scrollView} bounces={true} contentContainerStyle={styles.scrollContent}>
                {/* Header Image or Placeholder */}
                <View style={styles.imageContainer}>
                    {hasImage ? (
                        <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.9} style={styles.imageWrapper}>
                            <Image
                                source={{ uri: lead.imagePath! }}
                                style={styles.leadImage}
                                resizeMode="cover"
                            />
                            <View style={styles.expandHint}>
                                <Text style={styles.expandHintText}>Tap to view</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Text style={styles.placeholderInitials}>{initials}</Text>
                        </View>
                    )}
                </View>

                {/* Content Body */}
                <View style={styles.bodyContent}>
                    {/* Main Title Block */}
                    <View style={styles.titleBlock}>
                        <View style={styles.titleRow}>
                            <Text style={styles.nameText}>{lead.name || 'Unknown Lead'}</Text>
                            {lead.synced && (
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedText}>SYNCED</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.jobText}>
                            {lead.jobTitle ? `${lead.jobTitle}` : 'No Job Title'}
                            {lead.company ? ` at ${lead.company}` : ''}
                        </Text>
                    </View>

                    {/* Interests Tags */}
                    {lead.interests && lead.interests.length > 0 && (
                        <View style={styles.interestsContainer}>
                            {lead.interests.map((tag, i) => (
                                <View key={i} style={styles.interestTag}>
                                    <Text style={styles.interestText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Quick Action Grid */}
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionItem} onPress={handleCall}>
                            <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
                                <Phone size={24} color="#007AFF" />
                            </View>
                            <Text style={styles.actionLabel}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleEmail}>
                            <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
                                <Mail size={24} color="#007AFF" />
                            </View>
                            <Text style={styles.actionLabel}>Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
                            <View style={[styles.actionIconBox, { backgroundColor: '#F5F5F5' }]}>
                                <Edit2 size={24} color="#333" />
                            </View>
                            <Text style={styles.actionLabel}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
                            <View style={[styles.actionIconBox, { backgroundColor: '#F5F5F5' }]}>
                                <Share2 size={24} color="#333" />
                            </View>
                            <Text style={styles.actionLabel}>Share</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* Contact Details Section */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>CONTACT DETAILS</Text>

                        <TouchableOpacity style={styles.detailRow} onPress={handleCall} disabled={!lead.phone}>
                            <View style={styles.rowIcon}>
                                <Phone size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Mobile</Text>
                                <Text style={[styles.rowValue, lead.phone && styles.linkText]}>
                                    {lead.phone || 'Add phone number'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.detailRow} onPress={handleEmail} disabled={!lead.email}>
                            <View style={styles.rowIcon}>
                                <Mail size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Email</Text>
                                <Text style={[styles.rowValue, lead.email && styles.linkText]}>
                                    {lead.email || 'Add email address'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.detailRow}>
                            <View style={styles.rowIcon}>
                                <Briefcase size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Company</Text>
                                <Text style={styles.rowValue}>{lead.company || 'Add company'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Audio Note Section */}
                    {lead.audioPath && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionHeader}>AUDIO NOTE</Text>
                            <View style={styles.audioPlayerCard}>
                                <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                                    {isPlaying ? <Pause size={20} color="#fff" fill="#fff" /> : <Play size={20} color="#fff" fill="#fff" />}
                                </TouchableOpacity>
                                <View style={styles.audioInfo}>
                                    <Text style={styles.audioLabel}>Voice Memo</Text>
                                    <Text style={styles.audioTimer}>{formatTime(currentTime)} / {formatTime(duration)}</Text>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${(currentTime / (duration || 1)) * 100}%` }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* AI Summary Section */}
                    {lead.summary && (
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeaderRow}>
                                <Sparkles size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                                <Text style={styles.sectionHeader}>AI SUMMARY</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryText}>{lead.summary}</Text>
                            </View>
                        </View>
                    )}

                    {/* Transcription Section */}
                    {lead.transcription && (
                        <View style={styles.sectionContainer}>
                            <TouchableOpacity
                                style={styles.sectionHeaderRow}
                                onPress={() => setShowTranscription(!showTranscription)}
                                activeOpacity={0.7}
                            >
                                <FileText size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                                <Text style={styles.sectionHeader}>TRANSCRIPTION</Text>
                                <View style={{ flex: 1 }} />
                                {showTranscription ? <ChevronUp size={20} color="#8E8E93" /> : <ChevronDown size={20} color="#8E8E93" />}
                            </TouchableOpacity>

                            {showTranscription && (
                                <View style={styles.transcriptionCard}>
                                    <Text style={styles.transcriptionText}>{lead.transcription}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* WhatsApp Chat History */}
                    {lead.interactionHistory && lead.interactionHistory.length > 0 && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionHeader}>WHATSAPP HISTORY</Text>
                            <View style={styles.chatContainer}>
                                {lead.interactionHistory.map((msg, i) => (
                                    <View key={i} style={[
                                        styles.chatBubble,
                                        msg.role === 'user' ? styles.chatUser : styles.chatAssistant
                                    ]}>
                                        <Text style={styles.chatText}>{msg.content}</Text>
                                        <Text style={styles.chatRole}>{msg.role === 'user' ? 'Lead' : 'AI'}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* History / Meta */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>HISTORY</Text>
                        <View style={styles.detailRow}>
                            <View style={styles.rowIcon}>
                                <Calendar size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Captured On</Text>
                                <Text style={styles.rowValue}>
                                    {new Date(lead.createdAt).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <View style={styles.rowIcon}>
                                <Hash size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Lead ID</Text>
                                <Text style={[styles.rowValue, { fontSize: 13, fontFamily: 'Menlo' }]}>{lead.id}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionContainer}>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Trash2 size={20} color="#FF3B30" style={{ marginRight: 8 }} />
                            <Text style={styles.deleteButtonText}>Delete Lead</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#666',
        marginTop: 10,
    },
    errorText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBtn: {
        padding: 8,
        marginLeft: 8,
    },
    imageContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 24,
    },
    imageWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    leadImage: {
        width: width - 48,
        height: 300,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    expandHint: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    expandHintText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    placeholderImage: {
        width: width - 48,
        height: 250,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderInitials: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#C7C7CC',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        padding: 8,
        zIndex: 10,
        backgroundColor: 'rgba(50,50,50,0.5)',
        borderRadius: 20,
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 8,
    },
    modalImage: {
        width: '100%',
        height: '100%',
    },
    bodyContent: {
        paddingHorizontal: 20,
    },
    titleBlock: {
        marginBottom: 24,
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    nameText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1C1C1E',
        textAlign: 'center',
    },
    verifiedBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        alignSelf: 'center',
    },
    verifiedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2E7D32',
    },
    jobText: {
        fontSize: 17,
        color: '#8E8E93',
        textAlign: 'center',
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 32,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginHorizontal: 4,
    },
    actionItem: {
        alignItems: 'center',
        width: 70, // Slightly reduced to fit 4 items
    },
    actionIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF0F0',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontSize: 17,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginBottom: 24,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
    },
    rowIcon: {
        width: 32,
        alignItems: 'center',
        marginRight: 16,
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 2,
    },
    rowValue: {
        fontSize: 17,
        color: '#1C1C1E',
    },
    linkText: {
        color: '#007AFF',
    },
    audioPlayerCard: {
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    audioInfo: {
        flex: 1,
    },
    audioLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    audioTimer: {
        fontSize: 12,
        color: '#8E8E93',
        marginBottom: 8,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#D1D1D6',
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    interestTag: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    interestText: {
        color: '#1976D2',
        fontSize: 12,
        fontWeight: '600',
    },
    chatContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    chatBubble: {
        padding: 12,
        borderRadius: 12,
        maxWidth: '85%',
    },
    chatUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCF8C6', // WhatsApp green-ish
        borderTopRightRadius: 2,
    },
    chatAssistant: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 2,
    },
    chatText: {
        fontSize: 14,
        color: '#000',
        lineHeight: 20,
    },
    chatRole: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryCard: {
        backgroundColor: '#F0F7FF',
        borderRadius: 16,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    summaryText: {
        fontSize: 15,
        color: '#1C1C1E',
        lineHeight: 22,
    },
    transcriptionCard: {
        backgroundColor: '#F2F2F7',
        borderRadius: 16,
        padding: 16,
        marginTop: 4,
    },
    transcriptionText: {
        fontSize: 14,
        color: '#48484A',
        lineHeight: 20,
        fontStyle: 'italic',
    },
});
