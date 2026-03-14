import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { Search, MessageSquare, ShieldAlert, User, Shield, Lock } from 'lucide-react-native';
import useAdminStore from '../../store';

export default function ChatOversight() {
    const { searchAllUsers, fetchUserMessages, toggleUserBan } = useAdminStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [msgLoading, setMsgLoading] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery) return;
        Keyboard.dismiss();
        setLoading(true);
        const results = await searchAllUsers(searchQuery);
        setUsers(results);
        setLoading(false);
    };

    const handleSelectUser = async (user: any) => {
        setSelectedUser(user);
        setMsgLoading(true);
        const history = await fetchUserMessages(user.id);
        setMessages(history);
        setMsgLoading(false);
    };

    const handleBanUser = (user: any) => {
        Alert.alert(
            'Global Ban',
            `Are you sure you want to permanently BAN ${user.username || 'this user'}? They will be immediateley logged out and lose all access.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'BAN USER',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await toggleUserBan(user.id);
                        if (success) {
                            Alert.alert('Success', 'User has been banned.');
                            // Update local state
                            setUsers(users.map(u => u.id === user.id ? { ...u, is_banned: 1 } : u));
                            if (selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, is_banned: 1 });
                        } else {
                            Alert.alert('Error', 'Failed to ban user.');
                        }
                    }
                }
            ]
        );
    };

    const renderMessageItem = ({ item }: { item: any }) => (
        <View style={[
            styles.messageBubble,
            item.sender_id === selectedUser?.id ? styles.sentBubble : styles.receivedBubble
        ]}>
            <View style={styles.msgHeader}>
                <Text style={styles.msgAuthor}>
                    {item.sender_id === selectedUser?.id ? 'USER' : `TO: ${item.receiver_name || 'Group'}`}
                </Text>
                <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.msgText}>{item.content}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Search Header */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Admin Phone..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                    {loading && <ActivityIndicator size="small" color="#0062E3" />}
                </View>
            </View>

            <View style={styles.content}>
                {/* User List (Left sidebar on large screens, scrollable list here) */}
                {!selectedUser ? (
                    <FlatList
                        data={users}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.userCard} onPress={() => handleSelectUser(item)}>
                                <View style={styles.userAvatar}>
                                    <User size={20} color="#94a3b8" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{item.username || 'Anonymous'}</Text>
                                    <Text style={styles.userPhone}>{item.phone_number}</Text>
                                </View>
                                {item.is_banned === 1 && <Lock size={16} color="#f43f5e" />}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContent}>
                                <Search size={48} color="#334155" />
                                <Text style={styles.emptyText}>{searchQuery ? 'No users found' : 'Search for a user to monitor'}</Text>
                            </View>
                        }
                        contentContainerStyle={styles.listPadding}
                    />
                ) : (
                    <View style={styles.oversightPanel}>
                        {/* Header for selected user */}
                        <View style={styles.panelHeader}>
                            <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backButton}>
                                <Text style={styles.backText}>← Back</Text>
                            </TouchableOpacity>
                            <View style={styles.panelUserInfo}>
                                <Text style={styles.panelUserName}>{selectedUser.username}</Text>
                                <Text style={styles.panelUserPhone}>{selectedUser.phone_number}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.banButton, selectedUser.is_banned && styles.bannedButton]}
                                onPress={() => handleBanUser(selectedUser)}
                                disabled={selectedUser.is_banned}
                            >
                                <ShieldAlert size={18} color="#fff" />
                                <Text style={styles.banButtonText}>{selectedUser.is_banned ? 'BANNED' : 'BAN'}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Message Log */}
                        <Text style={styles.logTitle}>Recent Chat Activity</Text>
                        {msgLoading ? (
                            <View style={styles.center}>
                                <ActivityIndicator size="large" color="#0062E3" />
                            </View>
                        ) : (
                            <FlatList
                                data={messages}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderMessageItem}
                                inverted
                                ListEmptyComponent={
                                    <View style={styles.emptyContent}>
                                        <MessageSquare size={32} color="#334155" />
                                        <Text style={styles.emptyText}>No recent chat activity found</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#334155',
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        marginLeft: 10,
        fontSize: 15,
    },
    content: {
        flex: 1,
    },
    listPadding: {
        padding: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    userPhone: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 2,
    },
    emptyContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 15,
    },
    oversightPanel: {
        flex: 1,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        backgroundColor: '#1e293b',
    },
    backButton: {
        paddingRight: 16,
    },
    backText: {
        color: '#0062E3',
        fontWeight: '700',
    },
    panelUserInfo: {
        flex: 1,
    },
    panelUserName: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    panelUserPhone: {
        color: '#94a3b8',
        fontSize: 12,
    },
    banButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f43f5e',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    bannedButton: {
        backgroundColor: '#334155',
    },
    banButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    logTitle: {
        color: '#94a3b8',
        padding: 16,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    messageBubble: {
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        maxWidth: '85%',
    },
    sentBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#334155',
        borderBottomLeftRadius: 0,
    },
    receivedBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#1e293b',
        borderBottomRightRadius: 0,
        borderWidth: 1,
        borderColor: '#334155',
    },
    msgHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 12,
    },
    msgAuthor: {
        color: '#0062E3',
        fontSize: 10,
        fontWeight: '800',
    },
    msgTime: {
        color: '#64748b',
        fontSize: 10,
    },
    msgText: {
        color: '#e2e8f0',
        fontSize: 14,
        lineHeight: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
