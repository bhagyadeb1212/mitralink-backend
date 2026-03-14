import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Plus, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useStore from '../../store';

export default function GroupsScreen() {
    const { groups, fetchGroups } = useStore();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    useEffect(() => {
        fetchGroups();
    }, []);

    const renderGroupItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.groupItem}
            onPress={() => router.push(`/chat/group_${item.id}` as any)}
        >
            <View style={styles.groupAvatar}>
                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                ) : (
                    <Users size={30} color="#94a3b8" />
                )}
            </View>
            <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.memberCount}>{item.member_count} members</Text>
            </View>
            <ChevronRight size={20} color="#475569" />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Groups</Text>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => router.push('/groups/create' as any)}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {groups.length === 0 ? (
                <View style={styles.emptyState}>
                    <Users size={80} color="#1e293b" />
                    <Text style={styles.emptyTitle}>No Groups Yet</Text>
                    <Text style={styles.emptySubtitle}>Create a group to chat with multiple friends at once.</Text>
                    <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={() => router.push('/groups/create' as any)}
                    >
                        <Text style={styles.emptyBtnText}>Create New Group</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderGroupItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    createBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
            android: { elevation: 8 },
        }),
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    groupAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    memberCount: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -50,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 10,
    },
    emptyBtn: {
        marginTop: 30,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: '#6366f1',
    },
    emptyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
