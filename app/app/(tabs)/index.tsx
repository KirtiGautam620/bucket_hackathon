import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Database, Cloud, ChevronRight, Scan, Wifi, WifiOff } from 'lucide-react-native';
import { getAllLeads, getUnsyncedLeads, Lead } from '@/services/leadService';
import { getNetworkState } from '@/services/networkService';
import { NetworkControlModal } from '@/components/NetworkControlModal';

export default function DashboardScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const allLeads = await getAllLeads();
      const unsynced = await getUnsyncedLeads();

      const network = await getNetworkState();
      setIsOnline(network.isConnected && network.isInternetReachable);

      // Sort by created_at desc
      const sortedLeads = [...allLeads].sort((a, b) => b.createdAt - a.createdAt);

      setLeads(sortedLeads);
      setUnsyncedCount(unsynced.length);
      setSyncedCount(allLeads.length - unsynced.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <NetworkControlModal
        visible={showNetworkModal}
        onClose={() => {
          setShowNetworkModal(false);
          loadData(); // Reload state when modal closes
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>Welcome back</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>

          <TouchableOpacity
            style={[styles.networkBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}
            onPress={() => setShowNetworkModal(true)}
          >
            {isOnline ? <Wifi size={16} color="#006400" /> : <WifiOff size={16} color="#8B0000" />}
            <Text style={[styles.networkText, isOnline ? styles.textOnline : styles.textOffline]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Overview */}
        <View style={styles.statusSection}>
          {isOnline ? (
            <View style={[styles.statusBanner, styles.bannerOnline]}>
              <Wifi size={20} color="#155724" />
              <Text style={styles.statusBannerTextOnline}>System Online • Cloud Sync Active</Text>
            </View>
          ) : (
            <View style={[styles.statusBanner, styles.bannerOffline]}>
              <WifiOff size={20} color="#721c24" />
              <Text style={styles.statusBannerTextOffline}>Offline Mode • Saving Locally</Text>
            </View>
          )}
        </View>

        {/* Main Action Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/capture')}
          activeOpacity={0.9}
        >
          <View style={styles.actionIconCircle}>
            <Scan size={32} color="#1976D2" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Capture New Lead</Text>
            <Text style={styles.actionSubtitle}>Scan business card with OCR</Text>
          </View>
          <View style={styles.actionArrow}>
            <ChevronRight size={20} color="#1976D2" />
          </View>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Database size={24} color="#F57C00" />
            </View>
            <Text style={styles.statNumber}>{unsyncedCount}</Text>
            <Text style={styles.statLabel}>PENDING SYNC</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E1F5FE' }]}>
              <Cloud size={24} color="#0288D1" />
            </View>
            <Text style={styles.statNumber}>{syncedCount}</Text>
            <Text style={styles.statLabel}>SYNCED</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Leads</Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/leads')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {leads.slice(0, 5).map((lead) => (
            <TouchableOpacity
              key={lead.id}
              style={styles.activityItem}
              onPress={() => router.push(`/lead-detail?id=${lead.id}`)}
            >
              <View style={styles.activityAvatar}>
                <Text style={styles.activityInitials}>
                  {(lead.name || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{lead.name || 'Unknown Lead'}</Text>
                <Text style={styles.activityCompany}>{lead.company || 'No Company'}</Text>
              </View>
              <View style={styles.activityMeta}>
                <Text style={styles.activityTime}>{getTimeAgo(lead.createdAt)}</Text>
                <View style={[
                  styles.activityStatusPill,
                  { backgroundColor: lead.synced ? '#E8F5E9' : '#FFF3E0' }
                ]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: lead.synced ? '#2E7D32' : '#EF6C00' }}>
                    {lead.synced ? 'SYNCED' : 'LOCAL'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {leads.length === 0 && (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeOnline: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  badgeOffline: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  networkText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  textOnline: {
    color: '#006400',
  },
  textOffline: {
    color: '#8B0000',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  bannerOnline: {
    backgroundColor: '#D4EDDA',
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  bannerOffline: {
    backgroundColor: '#F8D7DA',
    borderWidth: 1,
    borderColor: '#F5C6CB',
  },
  statusBannerTextOnline: {
    marginLeft: 8,
    color: '#155724',
    fontWeight: '600',
    fontSize: 13,
  },
  statusBannerTextOffline: {
    marginLeft: 8,
    color: '#721c24',
    fontWeight: '600',
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  actionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9E9E9E',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  seeAllButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seeAllText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  activityCompany: {
    fontSize: 13,
    color: '#888',
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  activityStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 24,
  },
});
