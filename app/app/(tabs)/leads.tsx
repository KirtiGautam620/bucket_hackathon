import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TextInput,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Search, ChevronRight, Mic } from 'lucide-react-native';
import { getAllLeads, Lead } from '@/services/leadService';

export default function LeadsScreen() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unsynced'>('all');
    const [refreshing, setRefreshing] = useState(false);


    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const allLeads = await getAllLeads();
            // Sort by new to old
            const sorted = [...allLeads].sort((a, b) => b.createdAt - a.createdAt);
            setLeads(sorted);
        } catch (error) {
            console.error('Error loading leads:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLeads();
        setRefreshing(false);
    };

    // Filter and Group Data
    const sections = useMemo(() => {
        let filtered = leads;

        if (filter === 'unsynced') {
            filtered = filtered.filter(l => !l.synced);
        }

        if (searchQuery.trim()) {
            const lowQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(l =>
                l.name?.toLowerCase().includes(lowQuery) ||
                l.company?.toLowerCase().includes(lowQuery) ||
                l.jobTitle?.toLowerCase().includes(lowQuery)
            );
        }

        const groups: { [key: string]: Lead[] } = {
            'TODAY': [],
            'YESTERDAY': [],
            'OLDER': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;

        filtered.forEach(lead => {
            if (lead.createdAt >= today) {
                groups['TODAY'].push(lead);
            } else if (lead.createdAt >= yesterday) {
                groups['YESTERDAY'].push(lead);
            } else {
                groups['OLDER'].push(lead);
            }
        });

        const result = [];
        if (groups['TODAY'].length > 0) result.push({ title: 'TODAY', data: groups['TODAY'] });
        if (groups['YESTERDAY'].length > 0) result.push({ title: 'YESTERDAY', data: groups['YESTERDAY'] });
        if (groups['OLDER'].length > 0) result.push({ title: 'OLDER', data: groups['OLDER'] });

        return result;
    }, [leads, filter, searchQuery]);

    const unsyncedCount = leads.filter(l => !l.synced).length;

    const renderItem = ({ item }: { item: Lead }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => router.push(`/lead-detail?id=${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.avatarContainer}>
                {/* Initials Avatar */}
                <Text style={styles.avatarText}>
                    {(item.name || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
            </View>

            <View style={styles.itemContent}>
                <View style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name || 'Unknown Lead'}</Text>

                    {!item.synced ? (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>SYNC PENDING</Text>
                        </View>
                    ) : (
                        <View style={styles.syncedBadge}>
                            <Text style={styles.syncedText}>SYNCED</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {item.jobTitle ? `${item.jobTitle}, ` : ''}{item.company || 'No Company'}
                </Text>

                {item.audioPath && (
                    <View style={styles.audioRow}>
                        <Mic size={12} color="#0052CC" style={{ marginRight: 4 }} />
                        <Text style={styles.audioText}>Audio Note</Text>
                    </View>
                )}
            </View>

            <ChevronRight size={20} color="#C7C7CC" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" />

                <View style={styles.headerContainer}>
                    <View style={styles.headerTop}>
                        <Text style={styles.headerTitle}>Leads</Text>
                        <TouchableOpacity>
                            <Text style={styles.editButton}>Edit</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBar}>
                        <Search size={20} color="#8E8E93" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search"
                            placeholderTextColor="#8E8E93"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                        />
                    </View>

                    <View style={styles.filterTabs}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                filter === 'all' ? styles.tabActive : styles.tabInactive
                            ]}
                            onPress={() => setFilter('all')}
                        >
                            <Text style={[
                                styles.tabText,
                                filter === 'all' ? styles.tabTextActive : styles.tabTextInactive
                            ]}>All Leads</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                filter === 'unsynced' ? styles.tabActive : styles.tabInactive
                            ]}
                            onPress={() => setFilter('unsynced')}
                        >
                            <Text style={[
                                styles.tabText,
                                filter === 'unsynced' ? styles.tabTextActive : styles.tabTextInactive
                            ]}>Unsynced Only</Text>
                            {unsyncedCount > 0 && (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{unsyncedCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    stickySectionHeadersEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#000000',
    },
    editButton: {
        fontSize: 17,
        color: '#007AFF', // iOS Blue
        fontWeight: '400',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7', // iOS System Gray 6
        borderRadius: 10,
        paddingHorizontal: 8,
        height: 36,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 6,
        fontSize: 17,
        color: '#000',
    },
    filterTabs: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    tabActive: {
        backgroundColor: '#1C1C1E', // Almost black
    },
    tabInactive: {
        backgroundColor: '#F2F2F7',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabTextInactive: {
        color: '#8E8E93',
    },
    countBadge: {
        // Actually user image has blue badge for unsynced count
        // Let's use blue if active, gray if inactive? 
        // User image: Dark tab has light blue badge "4"
        backgroundColor: '#5AC8FA',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginLeft: 6,
    },
    countText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        // paddingHorizontal: 16, 
        // Allow full width separators
        paddingBottom: 24,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
        backgroundColor: '#fff',
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2F2F7', // Gray background for avatar
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        // Optional default avatar image or initials
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#555',
    },
    itemContent: {
        flex: 1,
        marginRight: 8,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    itemName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        marginRight: 8,
    },
    itemSubtitle: {
        fontSize: 15,
        color: '#666', // Slate 500 equivalent
    },
    pendingBadge: {
        backgroundColor: '#FFF8E1', // Light Yellow
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pendingText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F57C00', // Orange
    },
    syncedBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    syncedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2E7D32',
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginLeft: 76, // Align with text start
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    audioText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '500',
    }
});
