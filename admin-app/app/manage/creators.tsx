import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Shield, ShieldAlert, Lock, Unlock, Users, Film } from 'lucide-react-native';
import useAdminStore from '../../store';

export default function CreatorsManagement() {
    const { adminCreators, fetchAdminCreators, toggleUserAdmin, toggleUserBan } = useAdminStore();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadCreators();
    }, []);

    const loadCreators = async () => {
        setLoading(true);
        await fetchAdminCreators();
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAdminCreators();
        setRefreshing(false);
    };

    const handleToggleAdmin = (userId: number, currentStatus: number) => {
        Alert.alert(
            currentStatus ? 'Remove Admin' : 'Make Admin',
            `Are you sure you want to ${currentStatus ? 'remove administrative privileges from' : 'grant administrative privileges to'} this user?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await toggleUserAdmin(userId);
                        if (!success) Alert.alert('Error', 'Failed to update admin status');
                    }
                }
            ]
        );
    };

    const handleToggleBan = (userId: number, isBanned: number) => {
        Alert.alert(
            isBanned ? 'Unban User' : 'Ban User',
            `Are you sure you want to ${isBanned ? 'unban' : 'permanently ban'} this user? They will ${isBanned ? 'regain' : 'lose'} access to all chat features.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await toggleUserBan(userId);
                        if (!success) Alert.alert('Error', 'Failed to update ban status');
                    }
                }
            ]
        );
    };

    const renderCreatorItem = ({ item }: { item: any }) => (
        <View style={[styles.card, item.is_banned === 1 && styles.bannedCard]}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.avatarPlaceholder}>
                        {item.default_avatar ? (
                            <Image source={{ uri: item.default_avatar }} style={styles.avatar} />
                        ) : (
                            <Text style={styles.avatarInitial}>{item.username?.[0]?.toUpperCase() || 'U'}</Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.username}>{item.username || 'Anonymous'}</Text>
                        <Text style={styles.phone}>{item.phone_number}</Text>
                        {item.is_banned === 1 && (
                            <View style={styles.bannedBadge}>
                                <Text style={styles.bannedBadgeText}>BANNED</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.badgeRow}>
                    {item.is_admin === 1 && (
                        <View style={styles.adminBadge}>
                            <Shield size={12} color="#fff" />
                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Film size={16} color="#94a3b8" />
                    <Text style={styles.statText}>{item.reels_count || 0} Reels</Text>
                </View>
                <View style={styles.statItem}>
                    <Users size={16} color="#94a3b8" />
                    <Text style={styles.statText}>{item.followers_count || 0} Followers</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.adminButton]}
                    onPress={() => handleToggleAdmin(item.id, item.is_admin)}
                >
                    <ShieldAlert size={18} color={item.is_admin ? "#f43f5e" : "#0062E3"} />
                    <Text style={[styles.actionText, { color: item.is_admin ? "#f43f5e" : "#0062E3" }]}>
                        {item.is_admin ? 'Demote' : 'Promote'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.banButton]}
                    onPress={() => handleToggleBan(item.id, item.is_banned)}
                >
                    {item.is_banned ? (
                        <Unlock size={18} color="#10b981" />
                    ) : (
                        <Lock size={18} color="#f43f5e" />
                    )}
                    <Text style={[styles.actionText, { color: item.is_banned ? "#10b981" : "#f43f5e" }]}>
                        {item.is_banned ? 'Unban' : 'Ban User'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0062E3" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={adminCreators}
                renderItem={renderCreatorItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0062E3" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Users size={48} color="#334155" />
                        <Text style={styles.emptyText}>No creators found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    bannedCard: {
        borderColor: '#f43f5e40',
        opacity: 0.9,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarInitial: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#94a3b8',
    },
    username: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    phone: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0062E3',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    adminBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#fff',
    },
    bannedBadge: {
        backgroundColor: '#f43f5e20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#f43f5e40',
    },
    bannedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#f43f5e',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    adminButton: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    banButton: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        gap: 12,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    }
});
