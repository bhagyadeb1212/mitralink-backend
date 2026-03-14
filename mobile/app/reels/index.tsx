import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import useStore from '../../store';
import { ArrowLeft, Heart, MessageCircle, Share2, Plus, User, MoreVertical, Sparkles, ExternalLink, Bell } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { UserPlus, MapPin as MapPinIcon, Users } from 'lucide-react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function ReelsFeedScreen() {
    const { reels, fetchReels, likeReel, commentReel, followUser, blockUser, user } = useStore();
    const router = useRouter();
    const [activeReelIndex, setActiveReelIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [currentReelComments, setCurrentReelComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [selectedReelId, setSelectedReelId] = useState<number | null>(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [sharingContent, setSharingContent] = useState<any>(null);
    const { contacts, groups, shareReel, shareCreator, fetchContacts, fetchGroups, suggestions, fetchSuggestions, updateUserLocation } = useStore();

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);

            // Location Permission & Update
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                await updateUserLocation(loc.coords.latitude, loc.coords.longitude);
            }

            await Promise.all([
                fetchReels(),
                fetchContacts(),
                fetchGroups(),
                fetchSuggestions()
            ]);
            setIsLoading(false);
        };
        load();
    }, []);

    const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveReelIndex(viewableItems[0].index);
        }
    }).current;

    const toggleLike = async (reelId: number) => {
        await likeReel(reelId);
    };

    const toggleFollow = async (followingId: number) => {
        await followUser(followingId);
    };

    const openComments = (reelId: number) => {
        setSelectedReelId(reelId);
        setCommentModalVisible(true);
    };

    const openShare = (reel: any) => {
        setSharingContent({ type: 'reel', data: reel });
        setShareModalVisible(true);
    };

    const openShareCreator = (creator: any) => {
        setSharingContent({ type: 'profile', data: creator });
        setShareModalVisible(true);
    };

    const handleShareToRecipient = (recipientId: number | string) => {
        if (!sharingContent) return;
        if (sharingContent.type === 'reel') {
            shareReel(sharingContent.data, recipientId);
        } else {
            shareCreator(sharingContent.data, recipientId);
        }
        setShareModalVisible(false);
        Alert.alert('Shared', 'Successfully shared with recipient');
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !selectedReelId) return;
        const success = await commentReel(selectedReelId, newComment.trim());
        if (success) {
            setNewComment('');
            // Refresh comments if needed
        }
    };

    const handleMoreOptions = (creatorId: number, isFollowing: boolean) => {
        Alert.alert(
            "Creator Options",
            "What would you like to do?",
            [
                {
                    text: isFollowing ? "Unfollow" : "Follow",
                    onPress: () => toggleFollow(creatorId)
                },
                {
                    text: "Block Creator",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "Block Creator?",
                            "You will no longer see their reels or profiles.",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Block",
                                    style: "destructive",
                                    onPress: async () => {
                                        await blockUser(creatorId);
                                        Alert.alert("Blocked", "You have blocked this creator.");
                                    }
                                }
                            ]
                        );
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const reelsWithAds = (reels || []).flatMap((reel, index) => {
        const result = [];

        // Inject Suggestions after the first reel if we have any
        if (index === 1 && suggestions.creators.length > 0) {
            result.push({
                id: 'suggestions-section',
                isSuggestions: true,
                data: suggestions.creators
            });
        }

        if (index > 0 && index % 3 === 0) {
            result.push({
                id: `ad - ${index} `,
                isAd: true,
                type: 'image',
                content_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800', // Mock ad image
                caption: 'Upgrade to Premium for an ad-free experience and exclusive features!',
                profile_name: 'Sponsored Content',
            });
        }

        result.push(reel);
        return result;
    });

    const renderReelItem = ({ item, index }: { item: any, index: number }) => {
        const isActive = index === activeReelIndex;

        if (item.isAd) {
            return (
                <View style={[styles.reelContainer, { backgroundColor: '#1e1b4b' }]}>
                    <Image
                        source={{ uri: item.content_url }}
                        style={styles.fullScreenMedia}
                        resizeMode="cover"
                        blurRadius={10}
                    />
                    <View style={styles.adOverlay}>
                        <View style={styles.adBadge}><Text style={styles.adBadgeText}>Sponsored</Text></View>
                        <View style={styles.adContent}>
                            <Sparkles color="#fbbf24" size={48} />
                            <Text style={styles.adTitle}>Go Premium</Text>
                            <Text style={styles.adDescription}>{item.caption}</Text>
                            <TouchableOpacity style={styles.adButton} onPress={() => router.push('/premium' as any)}>
                                <Text style={styles.adButtonText}>Try Premium</Text>
                                <ExternalLink size={18} color="#0f172a" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.topBarContainer}>
                        <SafeAreaView style={styles.topBar}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <ArrowLeft color="#fff" size={28} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Reels</Text>
                            <View style={{ width: 40 }} />
                        </SafeAreaView>
                    </View>
                </View>
            );
        }

        if (item.isSuggestions) {
            return (
                <View style={[styles.reelContainer, { backgroundColor: '#0f172a', justifyContent: 'center' }]}>
                    <View style={styles.suggestionsHeader}>
                        <Sparkles color="#6366f1" size={24} />
                        <Text style={styles.suggestionsTitle}>Suggested for You</Text>
                    </View>
                    <Text style={styles.suggestionsSubtitle}>Discovery based on mutual friends & location</Text>

                    <FlatList
                        horizontal
                        data={item.data}
                        keyExtractor={(c) => c.id.toString()}
                        contentContainerStyle={styles.suggestionsList}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item: creator }) => (
                            <View style={styles.suggestionCard}>
                                <Image
                                    source={{ uri: creator.default_avatar || `https://ui-avatars.com/api/?name=${creator.username}&background=6366f1&color=fff` }}
                                    style={styles.suggestionAvatar}
                                />
                                <Text style={styles.suggestionName} numberOfLines={1}>{creator.profile_name || creator.username}</Text>
                                <View style={styles.followersBadge}>
                                    <Text style={styles.followersCountText}>{creator.followers_count || 0} Followers</Text>
                                </View>
                                <View style={styles.suggestionReason}>
                                    {creator.reason === 'Near you' ? (
                                        <MapPinIcon size={12} color="#94a3b8" />
                                    ) : (
                                        <Users size={12} color="#94a3b8" />
                                    )}
                                    <Text style={styles.suggestionReasonText} numberOfLines={1}>{creator.reason}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.suggestionFollowBtn}
                                    onPress={() => toggleFollow(creator.id)}
                                >
                                    <UserPlus size={16} color="#fff" />
                                    <Text style={styles.suggestionFollowText}>Follow</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionViewBtn}
                                    onPress={() => router.push(`/reels/profile?user_id=${creator.id}` as any)}
                                >
                                    <Text style={styles.suggestionViewText}>View Profile</Text>
                                </TouchableOpacity>
                            </View >
                        )}
                    />

                    < View style={styles.topBarContainer} >
                        <SafeAreaView style={styles.topBar}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <ArrowLeft color="#fff" size={28} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Suggestions</Text>
                            <View style={{ width: 40 }} />
                        </SafeAreaView>
                    </View >
                </View >
            );
        }

        return (
            <View style={styles.reelContainer}>
                {item.type === 'video' ? (
                    <Video
                        source={{ uri: item.content_url }}
                        style={styles.fullScreenMedia}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={isActive}
                        isLooping
                        isMuted={false}
                    />
                ) : (
                    <Image
                        source={{ uri: item.content_url }}
                        style={styles.fullScreenMedia}
                        resizeMode="cover"
                    />
                )}

                {/* Overlays */}
                <View style={[styles.overlay, { paddingBottom: 60 }]}>
                    {/* Top Bar */}
                    <SafeAreaView style={styles.topBar}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <ArrowLeft color="#fff" size={28} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/reels/notifications' as any)} style={[styles.backButton, { marginLeft: 15 }]}>
                                <Bell color="#fff" size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.headerTitle}>Reels</Text>
                        <TouchableOpacity onPress={() => router.push('/reels/create' as any)} style={styles.createButton}>
                            <Plus color="#fff" size={28} />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {/* Bottom Info */}
                    <View style={styles.bottomInfo}>
                        <View style={styles.authorSection}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => router.push(`/reels/profile?user_id=${item.user_id}` as any)}
                            >
                                <View style={styles.miniAvatar}>
                                    <User color="#fff" size={12} />
                                </View>
                                <Text style={styles.authorName}>{item.profile_name || item.username}</Text>
                            </TouchableOpacity>

                            {item.user_id !== user?.id && (
                                <TouchableOpacity
                                    style={[styles.followButton, item.is_following && styles.followedButton]}
                                    onPress={() => toggleFollow(item.user_id)}
                                >
                                    <Text style={styles.followText}>{item.is_following ? 'Following' : 'Follow'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.caption} numberOfLines={2}>
                            {item.caption}
                        </Text>
                    </View>

                    {/* Side Actions */}
                    <View style={styles.sideActions}>
                        <TouchableOpacity style={styles.actionItem} onPress={() => toggleLike(item.id)}>
                            <Heart color={item.is_liked ? "#ef4444" : "#fff"} fill={item.is_liked ? "#ef4444" : "transparent"} size={32} />
                            <Text style={styles.actionText}>{item.likes_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => openComments(item.id)}>
                            <MessageCircle color="#fff" size={32} />
                            <Text style={styles.actionText}>{item.comments_count || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => openShare(item)}>
                            <Share2 color="#fff" size={32} />
                            <Text style={styles.actionText}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => handleMoreOptions(item.user_id, !!item.is_following)}>
                            <MoreVertical color="#fff" size={32} />
                            <Text style={styles.actionText}>More</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={reelsWithAds}
                renderItem={renderReelItem}
                keyExtractor={(item) => item.id.toString()}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                snapToAlignment="start"
                decelerationRate="fast"
                snapToInterval={WINDOW_HEIGHT}
                removeClippedSubviews
            />

            {/* Comments Modal */}
            <Modal
                visible={commentModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCommentModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalCloseArea}
                        onPress={() => setCommentModalVisible(false)}
                    />
                    <BlurView intensity={80} tint="dark" style={styles.commentModal}>
                        <View style={styles.commentHeader}>
                            <View style={styles.dragHandle} />
                            <Text style={styles.commentHeaderText}>Comments</Text>
                        </View>

                        <FlatList
                            data={currentReelComments}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <View style={styles.commentAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.commentAuthor}>{item.username}</Text>
                                        <Text style={styles.commentText}>{item.content}</Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyComments}>No comments yet. Be the first to comment!</Text>
                            }
                        />

                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : undefined}
                            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
                        >
                            <View style={styles.commentInputContainer}>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Add a comment..."
                                    placeholderTextColor="#94a3b8"
                                    value={newComment}
                                    onChangeText={setNewComment}
                                />
                                <TouchableOpacity onPress={handleSendComment}>
                                    <Send color="#6366f1" size={24} />
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </BlurView>
                </View>
            </Modal>

            {/* Share Modal */}
            <Modal
                visible={shareModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShareModalVisible(false)}
            >
                <View style={styles.shareModalOverlay}>
                    <BlurView intensity={90} tint="dark" style={styles.shareContent}>
                        <View style={styles.shareHeader}>
                            <Text style={styles.shareTitle}>Share to...</Text>
                            <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                <Text style={styles.closeText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={[...groups.map(g => ({ ...g, isGroup: true })), ...contacts]}
                            keyExtractor={(item, index) => (item.isGroup ? `g-${item.id}` : `c-${item.id}`) || index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.recipientItem}
                                    onPress={() => handleShareToRecipient(item.isGroup ? `group_${item.id}` : item.id)}
                                >
                                    <View style={styles.recipientAvatar}>
                                        <User color="#fff" size={20} />
                                    </View>
                                    <Text style={styles.recipientName}>{item.name || item.username}</Text>
                                    <Send size={18} color="#0062E3" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No contacts found to share with</Text>}
                        />
                    </BlurView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelContainer: {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        backgroundColor: '#000',
    },
    fullScreenMedia: {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        position: 'absolute',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    backButton: {
        padding: 8,
    },
    createButton: {
        padding: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    bottomInfo: {
        maxWidth: '80%',
        marginBottom: 20,
    },
    authorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    authorName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 10,
    },
    followButton: {
        borderWidth: 1,
        borderColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    followText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    followedButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderColor: 'transparent',
    },
    caption: {
        color: '#f8fafc',
        fontSize: 14,
        lineHeight: 20,
    },
    sideActions: {
        position: 'absolute',
        bottom: 100,
        right: 15,
        alignItems: 'center',
    },
    actionItem: {
        alignItems: 'center',
        marginBottom: 20,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalCloseArea: {
        flex: 1,
    },
    commentModal: {
        height: '60%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        overflow: 'hidden',
    },
    commentHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginBottom: 10,
    },
    commentHeaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#334155',
        marginRight: 12,
    },
    commentAuthor: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
    },
    commentText: {
        color: '#fff',
        fontSize: 14,
    },
    emptyComments: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 10,
    },
    commentInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        marginRight: 10,
    },
    adOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    adContent: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 30,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    adTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        marginTop: 20,
        textAlign: 'center',
    },
    adDescription: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 24,
    },
    adButton: {
        backgroundColor: '#fbbf24',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 20,
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    adButtonText: {
        color: '#0f172a',
        fontSize: 18,
        fontWeight: '700',
    },
    adBadge: {
        position: 'absolute',
        top: 120,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    adBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    topBarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    shareModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    shareContent: {
        width: '100%',
        maxHeight: '70%',
        borderRadius: 32,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    shareHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    shareTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    closeText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    recipientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    recipientAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    recipientName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    suggestionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
        gap: 10,
    },
    suggestionsTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    suggestionsSubtitle: {
        color: '#94a3b8',
        fontSize: 14,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    suggestionsList: {
        paddingHorizontal: 15,
        gap: 15,
    },
    suggestionCard: {
        width: WINDOW_WIDTH * 0.65,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    suggestionAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
        borderWidth: 3,
        borderColor: '#6366f1',
    },
    suggestionName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    followersBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    followersCountText: {
        color: '#6366f1',
        fontSize: 12,
        fontWeight: '700',
    },
    suggestionReason: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    suggestionReasonText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    suggestionFollowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366f1',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        width: '100%',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 10,
    },
    suggestionFollowText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    suggestionViewBtn: {
        paddingVertical: 8,
        width: '100%',
        alignItems: 'center',
    },
    suggestionViewText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    }
});
