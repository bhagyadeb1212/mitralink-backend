import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useStore from '../../store';

export default function CreateGroupScreen() {
    const { contacts, createGroup } = useStore();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [groupName, setGroupName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleMember = (id: number) => {
        if (selectedMemberIds.includes(id)) {
            setSelectedMemberIds(prev => prev.filter(mid => mid !== id));
        } else {
            setSelectedMemberIds(prev => [...prev, id]);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }
        if (selectedMemberIds.length === 0) {
            Alert.alert('Error', 'Please select at least one member');
            return;
        }

        setLoading(true);
        try {
            const newGroup = await createGroup(groupName, selectedMemberIds);
            Alert.alert('Success', 'Group created successfully!');
            router.replace(`/chat/group_${newGroup.id}` as any);
        } catch (err) {
            Alert.alert('Error', 'Could not create group. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderContactItem = ({ item }: { item: any }) => {
        const isSelected = selectedMemberIds.includes(item.id);
        return (
            <TouchableOpacity
                style={[styles.contactItem, isSelected && styles.contactItemSelected]}
                onPress={() => toggleMember(item.id)}
            >
                <View style={styles.avatar}>
                    {item.default_avatar ? (
                        <Image source={{ uri: item.default_avatar }} style={styles.avatarImage} />
                    ) : (
                        <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                <Text style={styles.username}>{item.username}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={14} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>New Group</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading || !groupName.trim() || selectedMemberIds.length === 0}
                    style={[styles.doneBtn, (loading || !groupName.trim() || selectedMemberIds.length === 0) && { opacity: 0.5 }]}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.doneText}>Create</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
                <View style={styles.iconCircle}>
                    <Users size={32} color="#94a3b8" />
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Group Name"
                    placeholderTextColor="#64748b"
                    value={groupName}
                    onChangeText={setGroupName}
                    autoFocus
                />
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>SELECT MEMBERS ({selectedMemberIds.length})</Text>
            </View>

            <FlatList
                data={contacts.filter(c => c.phone_number !== 'Groq')}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderContactItem}
                contentContainerStyle={styles.listContent}
            />
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        height: 56,
    },
    backBtn: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    doneBtn: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    doneText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        paddingVertical: 10,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 40,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    contactItemSelected: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    username: {
        flex: 1,
        fontSize: 16,
        color: '#f8fafc',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },
});
