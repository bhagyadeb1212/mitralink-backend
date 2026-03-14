import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Film, MessageSquare, ChevronRight, LogOut, Activity } from 'lucide-react-native';
import useAdminStore from '../../store';

export default function AdminDashboard() {
    const router = useRouter();
    const { adminStats, fetchAdminStats, logout, user } = useAdminStore();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchAdminStats();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAdminStats();
        setRefreshing(false);
    };

    const handleLogout = () => {
        logout();
        router.replace('/');
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0062E3" />}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Welcome back,</Text>
                    <Text style={styles.adminName}>{user?.username || 'Admin'}</Text>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut size={20} color="#f43f5e" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Users size={24} color="#0062E3" style={styles.statIcon} />
                    <Text style={styles.statValue}>{adminStats.totalUsers}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statCard}>
                    <Film size={24} color="#10b981" style={styles.statIcon} />
                    <Text style={styles.statValue}>{adminStats.totalReels}</Text>
                    <Text style={styles.statLabel}>Total Reels</Text>
                </View>
                <View style={styles.statCard}>
                    <MessageSquare size={24} color="#8b5cf6" style={styles.statIcon} />
                    <Text style={styles.statValue}>{adminStats.totalGroups}</Text>
                    <Text style={styles.statLabel}>Total Groups</Text>
                </View>
                <View style={styles.statCard}>
                    <Activity size={24} color="#f59e0b" style={styles.statIcon} />
                    <Text style={styles.statValue}>Active</Text>
                    <Text style={styles.statLabel}>Platform Status</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Management Console</Text>

            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/manage/creators')}
            >
                <View style={[styles.menuIconContainer, { backgroundColor: '#0062E320' }]}>
                    <Users size={24} color="#0062E3" />
                </View>
                <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Creators Management</Text>
                    <Text style={styles.menuSubtitle}>Verify, promote or ban users</Text>
                </View>
                <ChevronRight size={20} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/manage/reels')}
            >
                <View style={[styles.menuIconContainer, { backgroundColor: '#10b98120' }]}>
                    <Film size={24} color="#10b981" />
                </View>
                <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Reel Moderation</Text>
                    <Text style={styles.menuSubtitle}>Review and remove content</Text>
                </View>
                <ChevronRight size={20} color="#475569" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/manage/chat')}
            >
                <View style={[styles.menuIconContainer, { backgroundColor: '#8b5cf620' }]}>
                    <MessageSquare size={24} color="#8b5cf6" />
                </View>
                <View style={styles.menuTextContainer}>
                    <Text style={styles.menuTitle}>Chat Oversight</Text>
                    <Text style={styles.menuSubtitle}>Monitor reports and chat activity</Text>
                </View>
                <ChevronRight size={20} color="#475569" />
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>System Alert</Text>
                <Text style={styles.infoText}>Platform is running smoothly. All services are operational.</Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 20,
    },
    welcome: {
        fontSize: 14,
        color: '#94a3b8',
    },
    adminName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        width: '48%',
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    statIcon: {
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    infoBox: {
        backgroundColor: '#0062E310',
        borderRadius: 20,
        padding: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#0062E330',
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0062E3',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 18,
    }
});
