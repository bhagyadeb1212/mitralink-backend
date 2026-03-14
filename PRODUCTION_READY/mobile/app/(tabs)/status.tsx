import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Modal, Dimensions, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Camera, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore from '../../store';

const { width, height } = Dimensions.get('window');

export default function StatusScreen() {
    const { user, statuses, fetchStatuses, postStatus } = useStore();
    const insets = useSafeAreaInsets();
    const [viewerVisible, setViewerVisible] = useState(false);
    const [activeStatus, setActiveStatus] = useState<any>(null);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleAddStatus = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
            base64: true,
        });

        if (!res.canceled && res.assets[0].base64) {
            const content = `data:image/jpeg;base64,${res.assets[0].base64}`;
            await postStatus(content, 'image');
            Alert.alert('Success', 'Status updated successfully!');
        }
    };

    const myStatuses = statuses.filter(s => s.user_id === user?.id);
    const othersStatuses = statuses.filter(s => s.user_id !== user?.id);

    // Group othersStatuses by user
    const groupedStatuses = othersStatuses.reduce((acc: any, status: any) => {
        if (!acc[status.user_id]) {
            acc[status.user_id] = {
                username: status.username,
                avatar: status.avatar_url,
                items: []
            };
        }
        acc[status.user_id].items.push(status);
        return acc;
    }, {});

    const otherUserIds = Object.keys(groupedStatuses);

    const openViewer = (status: any) => {
        setActiveStatus(status);
        setViewerVisible(true);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" />
            <Text style={styles.title}>Status</Text>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* My Status */}
                <TouchableOpacity style={styles.myStatusContainer} onPress={handleAddStatus}>
                    <View style={styles.avatarWrapper}>
                        {user?.default_avatar ? (
                            <Image source={{ uri: user.default_avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.placeholderAvatar]}>
                                <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={styles.plusIcon}>
                            <Plus size={14} color="#fff" strokeWidth={3} />
                        </View>
                    </View>
                    <View style={styles.statusInfo}>
                        <Text style={styles.statusName}>My Status</Text>
                        <Text style={styles.statusTime}>Tap to add status update</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.sectionDivider}>
                    <Text style={styles.sectionTitle}>Recent updates</Text>
                </View>

                {otherUserIds.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No status updates to show</Text>
                    </View>
                ) : (
                    otherUserIds.map(userId => {
                        const group = groupedStatuses[userId];
                        const lastStatus = group.items[group.items.length - 1];
                        return (
                            <TouchableOpacity
                                key={userId}
                                style={styles.statusItem}
                                onPress={() => openViewer(lastStatus)}
                            >
                                <View style={styles.statusCircle}>
                                    {group.avatar ? (
                                        <Image source={{ uri: group.avatar }} style={styles.statusAvatar} />
                                    ) : (
                                        <View style={[styles.statusAvatar, styles.placeholderAvatar]}>
                                            <Text style={styles.avatarText}>{group.username?.charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.statusInfo}>
                                    <Text style={styles.statusName}>{group.username}</Text>
                                    <Text style={styles.statusTime}>
                                        {new Date(lastStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Banner Ad placeholder */}
            <View style={styles.bottomAdBanner}>
                <View style={styles.adBannerContent}>
                    <View style={styles.adBadgeSmall}><Text style={styles.adBadgeTextSmall}>Sponsored</Text></View>
                    <Text style={styles.adBannerText}>Unlock Premium Emojis by watching a short video!</Text>
                </View>
            </View>

            {/* Status Viewer Modal */}
            <Modal visible={viewerVisible} transparent animationType="fade">
                <View style={styles.viewerContainer}>
                    <StatusBar hidden />
                    {activeStatus?.content && (
                        <Image source={{ uri: activeStatus.content }} style={styles.fullImage} resizeMode="contain" />
                    )}

                    <View style={[styles.viewerHeader, { top: insets.top }]}>
                        <View style={styles.viewerUserInfo}>
                            <Text style={styles.viewerName}>{activeStatus?.username}</Text>
                            <Text style={styles.viewerTime}>
                                {activeStatus && new Date(activeStatus.created_at).toLocaleTimeString()}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeBtn}>
                            <X size={28} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Ad Overlay Placeholder (Simulated inter-story ad) */}
                    {activeStatus?.isAd && (
                        <View style={styles.adOverlay}>
                            <View style={styles.adOverlayContent}>
                                <Sparkles size={60} color="#f59e0b" />
                                <Text style={styles.adOverlayTitle}>Special Offer</Text>
                                <Text style={styles.adOverlayText}>Upgrade to Premium for an ad-free experience and exclusive features!</Text>
                                <TouchableOpacity style={styles.adOverlayBtn} onPress={() => Alert.alert("Premium", "Redirecting to subscription...")}>
                                    <Text style={styles.adOverlayBtnText}>Learn More</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    myStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#4ade80',
    },
    placeholderAvatar: {
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    plusIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4ade80',
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusInfo: {
        marginLeft: 15,
        flex: 1,
    },
    statusName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#f8fafc',
    },
    statusTime: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 2,
    },
    sectionDivider: {
        backgroundColor: '#1e293b',
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    statusCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#6366f1',
        padding: 2,
    },
    statusAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    fullImage: {
        width: width,
        height: height,
    },
    viewerHeader: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    viewerUserInfo: {
        flex: 1,
    },
    viewerName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewerTime: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
    },
    closeBtn: {
        padding: 5,
    },
    bottomAdBanner: {
        backgroundColor: '#1e293b',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    adBannerContent: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    adBadgeSmall: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 3,
        marginRight: 10,
    },
    adBadgeTextSmall: {
        fontSize: 9,
        color: '#fff',
        fontWeight: 'bold',
    },
    adBannerText: {
        flex: 1,
        fontSize: 12,
        color: '#e2e8f0',
        fontWeight: '500',
    },
    adOverlay: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 25,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    adOverlayContent: {
        alignItems: 'center',
    },
    adOverlayTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f59e0b',
        marginTop: 15,
    },
    adOverlayText: {
        fontSize: 16,
        color: '#f8fafc',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    adOverlayBtn: {
        backgroundColor: '#f59e0b',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 20,
    },
    adOverlayBtnText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
