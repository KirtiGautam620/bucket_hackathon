import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Phone, Mail, Building2, Mic, CheckCircle2, Clock, Calendar } from 'lucide-react-native';
import { Lead } from '../services/leadService';

interface LeadCardProps {
    lead: Lead;
    onPress?: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.nameContainer}>
                    <User size={18} color="#1976D2" />
                    <Text style={styles.name}>{lead.name || 'Unknown'}</Text>
                </View>
                <View style={[styles.badge, lead.synced ? styles.syncedBadge : styles.unsyncedBadge]}>
                    {lead.synced ? (
                        <CheckCircle2 size={12} color="#2E7D32" />
                    ) : (
                        <Clock size={12} color="#F57C00" />
                    )}
                    <Text style={[styles.badgeText, lead.synced ? styles.syncedText : styles.unsyncedText]}>
                        {lead.synced ? 'Synced' : 'Pending'}
                    </Text>
                </View>
            </View>

            {lead.company && (
                <View style={styles.infoRow}>
                    <Building2 size={14} color="#666" />
                    <Text style={styles.company}>{lead.company}</Text>
                </View>
            )}

            <View style={styles.contactInfo}>
                {lead.phone && (
                    <View style={styles.infoRow}>
                        <Phone size={14} color="#666" />
                        <Text style={styles.contact}>{lead.phone}</Text>
                    </View>
                )}
                {lead.email && (
                    <View style={styles.infoRow}>
                        <Mail size={14} color="#666" />
                        <Text style={styles.contact}>{lead.email}</Text>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                {lead.audioPath && (
                    <View style={styles.audioIndicatorContainer}>
                        <Mic size={12} color="#1976D2" />
                        <Text style={styles.audioIndicator}>Audio note</Text>
                    </View>
                )}
                <View style={styles.timestampContainer}>
                    <Calendar size={12} color="#999" />
                    <Text style={styles.timestamp}>
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    syncedBadge: {
        backgroundColor: '#E8F5E9',
    },
    unsyncedBadge: {
        backgroundColor: '#FFF3E0',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    syncedText: {
        color: '#2E7D32',
    },
    unsyncedText: {
        color: '#F57C00',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    company: {
        fontSize: 14,
        color: '#666',
    },
    contactInfo: {
        marginTop: 4,
    },
    contact: {
        fontSize: 14,
        color: '#444',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    audioIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    audioIndicator: {
        fontSize: 12,
        color: '#1976D2',
        fontWeight: '500',
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
    },
});
