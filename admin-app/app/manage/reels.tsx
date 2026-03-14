import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { Film, Trash2, User, Calendar } from 'lucide-react-native';
import useAdminStore from '../../store';

export default function ReelsModeration() {
    const { adminReels, fetchAdminReels, deleteReelAdmin } = useAdminStore();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadReels();
    }, []);

    const loadReels = async () => {
        setLoading(true);
        await fetchAdminReels();
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAdminReels();
        setRefreshing(false);
    };

    const handleDeleteReel = (reelId: number) => {
        Alert.alert(
            'Delete Reel',
            'Are you sure you want to permanently remove this reel? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deleteReelAdmin(reelId);
                        if (!success) Alert.alert('Error', 'Failed to delete reel');
                    }
                }
            ]
        );
    };

    const renderReelItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.thumbnailContainer}>
                {item.type === 'video' ? (
                    <View style={styles.videoPlaceholder}>
                        <Film size={24} color="#94a3b8" />
                        <Text style={styles.videoLabel}>VIDEO</Text>
                    </View>
                ) : (
                    <Image source={{ uri: item.content_url }} style={styles.thumbnail} />
                )}
            </View>
            <View style={styles.reelInfo}>
                <View style={styles.authorRow}>
                    <User size={14} color="#94a3b8" />
                    <Text style={styles.author}>{item.username || 'Unknown'}</Text>
                </View>
                <Text style={styles.caption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
                <View style={styles.dateRow}>
                    <Calendar size={12} color="#64748b" />
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteReel(item.id)}
                >
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.deleteText}>Remove Content</Text>
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
                data={adminReels}
                renderItem={renderReelItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0062E3" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Film size={48} color="#334155" />
                        <Text style={styles.emptyText}>No reels to moderate</Text>
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
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
    },
    thumbnailContainer: {
        width: 120,
        height: 160,
        backgroundColor: '#334155',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    videoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
    },
    reelInfo: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    author: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0062E3',
    },
    caption: {
        fontSize: 14,
        color: '#e2e8f0',
        lineHeight: 20,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
    },
    date: {
        fontSize: 12,
        color: '#64748b',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f43f5e',
        height: 40,
        borderRadius: 10,
        marginTop: 12,
        gap: 8,
    },
    deleteText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
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
