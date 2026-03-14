import React, { useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, MessageCircle, UserPlus, Share2, Sparkles, UserCheck, Trash2 } from 'lucide-react-native';
import useStore from '../../store';

export default function NotificationsScreen() {
    const { notifications, fetchNotifications, markNotificationsRead, followUser, deleteNotification, clearNotifications } = useStore();
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
        markNotificationsRead();
    }, []);

    const renderNotification = ({ item }: { item: any }) => {
        const getIcon = () => {
            switch (item.type) {
                case 'follow': return <UserPlus size={16} color="#6366f1" />;
                case 'like': return <Heart size={16} color="#ef4444" fill="#ef4444" />;
                case 'comment': return <MessageCircle size={16} color="#10b981" fill="#10b981" />;
                default: return <Sparkles size={16} color="#fbbf24" />;
            }
        };

        const getMessage = () => {
            const name = item.sender_profile_name || item.sender_username;
            switch (item.type) {
                case 'follow': return `${name} started following you.`;
                case 'like': return `${name} liked your reel.`;
                case 'comment': return `${name} commented: "${item.content}"`;
                default: return `${name} interacted with your content.`;
            }
        };

        return (
            <View style={[styles.notiItem, !item.is_read && styles.unreadItem]}>
                <TouchableOpacity onPress={() => router.push(`/reels/profile?user_id=${item.sender_id}` as any)}>
                    <Image
                        source={{ uri: item.sender_avatar || `https://ui-avatars.com/api/?name=${item.sender_username}&background=6366f1&color=fff` }}
                        style={styles.avatar}
                    />
                </TouchableOpacity>
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        {getIcon()}
                        <View style={styles.rowRight}>
                            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                            <TouchableOpacity onPress={() => deleteNotification(item.id)} style={styles.deleteBtn}>
                                <Trash2 color="#ef4444" size={16} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.message}>{getMessage()}</Text>

                    {item.type === 'follow' && !item.is_following_back && (
                        <TouchableOpacity
                            style={styles.followBackBtn}
                            onPress={() => followUser(item.sender_id)}
                        >
                            <Text style={styles.followBackText}>Follow Back</Text>
                        </TouchableOpacity>
                    )}
                    {item.type === 'follow' && item.is_following_back && (
                        <View style={styles.followingBadge}>
                            <UserCheck size={12} color="#94a3b8" />
                            <Text style={styles.followingText}>Following</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => fetchNotifications()} style={styles.refreshBtn}>
                        <Sparkles color="#6366f1" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => clearNotifications()} style={styles.clearBtn}>
                        <Trash2 color="#ef4444" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MessageCircle size={64} color="#334155" />
                        <Text style={styles.emptyText}>No notifications yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    refreshBtn: {
        padding: 4,
    },
    clearBtn: {
        padding: 4,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteBtn: {
        padding: 2,
    },
    backBtn: {
        padding: 5,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    list: {
        padding: 15,
    },
    notiItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    unreadItem: {
        borderColor: 'rgba(99, 102, 241, 0.3)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#1e293b',
    },
    content: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    timestamp: {
        color: '#475569',
        fontSize: 12,
    },
    message: {
        color: '#f8fafc',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    followBackBtn: {
        backgroundColor: '#6366f1',
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    followBackText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    followingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#1e293b',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 6,
    },
    followingText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: '#475569',
        fontSize: 16,
        marginTop: 15,
    }
});
