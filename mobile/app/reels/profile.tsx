import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import useStore from '../../store';
import { User, Edit3, ArrowLeft, Check, Camera, LogOut } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReelsProfileScreen() {
    const { user, reelProfile, fetchReelProfile, updateReelProfile, getFollowStatus, followUser } = useStore();
    const router = useRouter();
    const { user_id } = useLocalSearchParams();

    const isMyProfile = !user_id || parseInt(user_id as string) === user?.id;

    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [followStats, setFollowStats] = useState({ is_following: 0, followers_count: 0, following_count: 0 });

    useEffect(() => {
        const load = async () => {
            if (isMyProfile && user?.id) {
                await fetchReelProfile();
                const stats = await getFollowStatus(user.id);
                if (stats) setFollowStats(stats);
            } else if (user_id) {
                const stats = await getFollowStatus(parseInt(user_id as string));
                if (stats) setFollowStats(stats);
            }
        };
        load();
    }, [isMyProfile, user_id]);

    useEffect(() => {
        if (reelProfile && isMyProfile) {
            setName(reelProfile.name || '');
            setBio(reelProfile.bio || '');
        }
    }, [reelProfile, isMyProfile]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name is required");
            return;
        }
        setIsLoading(true);
        const success = await updateReelProfile(name.trim(), bio.trim());
        setIsLoading(false);
        if (success) {
            setIsEditing(false);
        } else {
            Alert.alert("Error", "Failed to update Reels profile");
        }
    };

    const handleToggleFollow = async () => {
        if (isMyProfile || !user_id) return;
        setIsLoading(true);
        await followUser(parseInt(user_id as string));
        const stats = await getFollowStatus(parseInt(user_id as string));
        if (stats) setFollowStats(stats);
        setIsLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft color="#fff" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isMyProfile ? "My Reels Profile" : "Profile"}</Text>
                {isMyProfile ? (
                    <TouchableOpacity onPress={isEditing ? handleSave : () => setIsEditing(true)}>
                        {isLoading ? <ActivityIndicator color="#6366f1" /> : (
                            isEditing ? <Check color="#6366f1" size={28} /> : <Edit3 color="#94a3b8" size={24} />
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.miniFollowBtn, followStats.is_following ? styles.miniFollowedBtn : null]}
                        onPress={handleToggleFollow}
                        disabled={isLoading}
                    >
                        {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                            <Text style={styles.miniFollowText}>{followStats.is_following ? 'Following' : 'Follow'}</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarMain}>
                            <User color="#fff" size={48} />
                        </View>
                        {isMyProfile && isEditing && (
                            <TouchableOpacity style={styles.cameraIcon}>
                                <Camera color="#fff" size={16} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {!isEditing ? (
                        <>
                            <Text style={styles.displayName}>{name || user?.username || "Anonymous"}</Text>
                            <Text style={styles.bioText}>{bio || "No bio yet."}</Text>
                        </>
                    ) : (
                        <View style={styles.editSection}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Display Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your public name"
                                    placeholderTextColor="#64748b"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Bio</Text>
                                <TextInput
                                    style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder="Tell the world about yourself..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Reels Stats Simulation */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Reels</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{followStats.followers_count}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{followStats.following_count}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>

                {/* Reels Grid Simulation */}
                <View style={styles.gridHeader}>
                    <Text style={styles.gridTitle}>Recent Reels</Text>
                </View>
                <View style={styles.reelsGrid}>
                    <View style={styles.emptyGrid}>
                        <Film color="#1e293b" size={64} />
                        <Text style={styles.emptyGridText}>No reels posted yet</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const Film = ({ color, size }: { color: string, size: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size / 2 }}>🎞️</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        padding: 30,
    },
    avatarWrapper: {
        marginBottom: 20,
        position: 'relative',
    },
    avatarMain: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#6366f1',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    displayName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    bioText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    editSection: {
        width: '100%',
        marginTop: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        backgroundColor: 'rgba(30, 41, 59, 0.4)',
        marginHorizontal: 20,
        borderRadius: 24,
        marginBottom: 30,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 4,
    },
    gridHeader: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    gridTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    reelsGrid: {
        paddingHorizontal: 20,
    },
    emptyGrid: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyGridText: {
        color: '#475569',
        marginTop: 10,
        fontSize: 14,
    },
    miniFollowBtn: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    miniFollowedBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    miniFollowText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    }
});
