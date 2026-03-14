import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, StatusBar, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, User as UserIcon, MoreVertical, Clock } from 'lucide-react-native';
import useStore from '../store';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

import { BASE_URL } from '../store';

export default function PremiumContactsScreen() {
    const router = useRouter();
    const { contacts, token, fetchContacts, fetchUserProfile } = useStore();
    const { showActionSheetWithOptions } = useActionSheet();
    const [selectedContact, setSelectedContact] = useState<any>(null);

    // Only show contacts who have an outbound custom avatar set by ME
    const premiumContacts = contacts.filter(contact => contact.specific_avatar);

    const uploadAvatar = async (contactId: number, avatarData: string) => {
        if (!token) return;
        try {
            const res = await axios.post(`${BASE_URL}/contacts/avatar`, {
                contact_id: contactId,
                avatar_url: avatarData || null
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.success) {
                fetchUserProfile();
                fetchContacts();
            }
        } catch (err: any) {
            console.error("Avatar error", err);
        }
    };

    const pickGallery = async (contactId: number) => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true });
        if (!result.canceled && result.assets[0].base64) {
            await uploadAvatar(contactId, `data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const pickCamera = async (contactId: number) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true });
        if (!result.canceled && result.assets[0].base64) {
            await uploadAvatar(contactId, `data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleUpgrade = (contactId: number) => {
        showActionSheetWithOptions(
            {
                options: ['1 Month (50 Coins)', '3 Months (100 Coins)', '1 Year (500 Coins)', 'Cancel'],
                cancelButtonIndex: 3,
                title: 'Upgrade Premium Avatar Duration',
                message: 'Extend the duration of your custom profile picture for this specific contact.',
            },
            async (selectedIndex?: number) => {
                let months = 0;
                if (selectedIndex === 0) months = 1;
                if (selectedIndex === 1) months = 3;
                if (selectedIndex === 2) months = 12;

                if (months > 0) {
                    try {
                        const res = await axios.post(`${BASE_URL}/contacts/premium`, {
                            contact_id: contactId,
                            months
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        if (res.data.success) {
                            fetchUserProfile();
                            fetchContacts();
                        }
                    } catch (err: any) {
                        console.error("Upgrade error", err);
                    }
                }
            }
        );
    };

    const getDaysLeft = (expiresAt?: number) => {
        if (!expiresAt) return 0;
        const diff = expiresAt - Date.now();
        if (diff <= 0) return 0;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleActionSheet = (contactId: number) => {
        showActionSheetWithOptions(
            {
                options: ['Take Photo', 'Choose from Gallery', 'Remove Special Avatar', 'Cancel'],
                cancelButtonIndex: 3,
                title: 'Modify Special Profile Picture',
                message: 'Update or remove the custom picture for this contact. (Free if subscription is active)',
            },
            (selectedIndex?: number) => {
                switch (selectedIndex) {
                    case 0: pickCamera(contactId); break;
                    case 1: pickGallery(contactId); break;
                    case 2: uploadAvatar(contactId, ''); break;
                }
            }
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Premium Contacts</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.container}>
                <View style={styles.infoBanner}>
                    <Shield size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
                    <Text style={styles.bannerTitle}>Your Active Overrides</Text>
                    <Text style={styles.bannerText}>
                        This is a private list of contacts for whom you have purchased and set a "Special Profile Picture". Only you can see these profile pictures.
                    </Text>
                </View>

                {premiumContacts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't set any Special Profile Pictures yet.</Text>
                        <Text style={styles.emptySubtext}>
                            Go to a contact's profile to purchase a custom avatar for them!
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={premiumContacts}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <View style={styles.contactCard}>
                                <TouchableOpacity
                                    style={styles.avatarContainer}
                                    onPress={() => setSelectedContact(item)}
                                    activeOpacity={0.7}
                                >
                                    <Image source={{ uri: item.specific_avatar }} style={styles.avatarImage} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.contactInfo}
                                    onPress={() => router.push(`/chat/${item.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.contactName}>{item.username}</Text>
                                    <Text style={styles.contactPhone}>{item.phone_number}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.upgradeBtn}
                                    onPress={() => handleUpgrade(item.id)}
                                >
                                    <Text style={[styles.daysLeft, getDaysLeft(item.outbound_premium_expires_at) <= 3 && { color: '#ef4444' }]}>
                                        {getDaysLeft(item.outbound_premium_expires_at)} days
                                    </Text>
                                    <Text style={styles.upgradeText}>Renew</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Full Screen Image Modal */}
            <Modal visible={!!selectedContact} transparent={true} animationType="fade" onRequestClose={() => setSelectedContact(null)}>
                <View style={styles.modalBackground}>
                    <TouchableOpacity style={styles.modalCloseArea} onPress={() => setSelectedContact(null)} />

                    {/* Action Header inside Modal */}
                    <SafeAreaView style={styles.modalHeader}>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectedContact(null)}>
                            <ChevronLeft size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalEditButton}
                            onPress={() => {
                                if (selectedContact) {
                                    const contactId = selectedContact.id;
                                    setSelectedContact(null);
                                    setTimeout(() => handleActionSheet(contactId), 250);
                                }
                            }}
                        >
                            <MoreVertical size={24} color="#fff" />
                        </TouchableOpacity>
                    </SafeAreaView>

                    {selectedContact?.specific_avatar && (
                        <Image source={{ uri: selectedContact.specific_avatar }} style={styles.fullScreenImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    container: {
        flex: 1,
    },
    infoBanner: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 20,
        margin: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        alignItems: 'center',
    },
    bannerTitle: {
        color: '#f59e0b',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bannerText: {
        color: '#cbd5e1',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    emptyText: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#f59e0b',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    contactPhone: {
        color: '#94a3b8',
        fontSize: 14,
    },
    upgradeBtn: {
        alignItems: 'center',
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: '#334155',
    },
    daysLeft: {
        color: '#f59e0b',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    upgradeText: {
        color: '#6366f1',
        fontSize: 12,
        fontWeight: '600',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseArea: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    fullScreenImage: {
        width: '100%',
        height: '80%',
    },
    modalHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        paddingBottom: 20,
        zIndex: 10,
    },
    modalCloseButton: {
        padding: 8,
    },
    modalEditButton: {
        padding: 8,
    }
});
