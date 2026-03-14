import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, SafeAreaView, Platform, StatusBar, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Phone, Video, Search, MoreVertical, Image as ImageIcon, Bell, Lock, ShieldCheck, ChevronRight, ShieldOff } from 'lucide-react-native';
import useStore from '../../store';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

import { BASE_URL } from '../../store';

export default function ContactProfileScreen() {
    const { id } = useLocalSearchParams();
    const contactId = Number(id);
    const router = useRouter();
    const { user, contacts, initiateCall, token, fetchUserProfile, fetchContacts } = useStore();
    const [isModalVisible, setModalVisible] = useState(false);
    const { showActionSheetWithOptions } = useActionSheet();

    // OTP / Lock State
    const [isGeneratingOTP, setIsGeneratingOTP] = useState(false);
    const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
    const [enteredOTP, setEnteredOTP] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Block / Unblock OTP Confirmation State
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockConfirmOTP, setBlockConfirmOTP] = useState('');
    const [blockOTPInput, setBlockOTPInput] = useState('');
    const [isBlocking, setIsBlocking] = useState(false);

    // Unlock State
    const [generatedUnlockOTP, setGeneratedUnlockOTP] = useState<string | null>(null);
    const [isGeneratingUnlock, setIsGeneratingUnlock] = useState(false);
    const [enteredUnlockOTP, setEnteredUnlockOTP] = useState('');
    const [isVerifyingUnlock, setIsVerifyingUnlock] = useState(false);

    const contact = contacts.find(c => c.id === contactId);

    if (!contact) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <ChevronLeft size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <View style={styles.container}>
                    <Text style={styles.errorText}>Contact not found.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const avatarUrl = contact.specific_avatar || contact.default_avatar;

    const uploadAvatar = async (avatarData: string) => {
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

    const pickGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
            await uploadAvatar(base64Url);
        }
    };

    const pickCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
            await uploadAvatar(base64Url);
        }
    };

    const handleSetCustomAvatar = () => {
        // Enforce Time-Based Premium Subscription
        const now = Date.now();
        const hasActiveSubscription = contact?.outbound_premium_expires_at && contact.outbound_premium_expires_at > now;

        if (!hasActiveSubscription) {
            Alert.alert(
                'Premium Required',
                'You do not have an active Custom Avatar subscription for this user.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Unlock Now', onPress: () => router.push('/premium') }
                ]
            );
            return;
        }

        const options = ['Take Photo', 'Choose from Gallery', contact.specific_avatar ? 'Remove Special Avatar' : 'Cancel', 'Cancel'];
        const cancelButtonIndex = 3;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                title: 'Special Profile Picture',
                message: 'Set a custom picture for this contact. (Free with active subscription)',
            },
            (selectedIndex?: number) => {
                switch (selectedIndex) {
                    case 0:
                        pickCamera();
                        break;
                    case 1:
                        pickGallery();
                        break;
                    case 2:
                        if (contact.specific_avatar) {
                            uploadAvatar('');
                        }
                        break;
                }
            }
        );
    };

    // ─── Block / Unblock with OTP Confirmation ────────────────────────────────
    const openBlockModal = () => {
        // Generate a random 4-digit OTP for confirmation
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        setBlockConfirmOTP(otp);
        setBlockOTPInput('');
        setShowBlockModal(true);
    };

    const handleConfirmBlock = async () => {
        if (blockOTPInput !== blockConfirmOTP) {
            Alert.alert('Wrong Code', 'The code you entered does not match. Please try again.');
            return;
        }

        setIsBlocking(true);
        try {
            const res = await axios.post(
                `${BASE_URL}/contacts/block`,
                { contact_id: contact.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowBlockModal(false);
            Alert.alert(
                res.data.message === 'User Blocked' ? '🚫 Blocked' : '✅ Unblocked',
                res.data.message === 'User Blocked'
                    ? `${contact.username} has been blocked. They can no longer send you messages.`
                    : `${contact.username} has been unblocked. They can now send you messages again.`
            );
            await fetchContacts();
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Could not complete action.';
            Alert.alert('Error', msg);
        } finally {
            setIsBlocking(false);
        }
    };
    // ──────────────────────────────────────────────────────────────────────────

    // ─── Mutual Unlock with OTP ───────────────────────────────────────────────
    const handleGenerateUnlock = async () => {
        setIsGeneratingUnlock(true);
        try {
            const res = await axios.post(`${BASE_URL}/contacts/unlock/generate`, {
                contact_id: contact.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            setGeneratedUnlockOTP(res.data.otp);
            Alert.alert(
                '🔓 Unlock Code Generated',
                `Share this 6-digit code with ${contact.username}. They must enter it to confirm the unlock.`
            );
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to generate unlock code.');
        } finally {
            setIsGeneratingUnlock(false);
        }
    };

    const handleVerifyUnlock = async () => {
        if (!enteredUnlockOTP || enteredUnlockOTP.length !== 6) {
            Alert.alert('Invalid input', 'Please enter the 6-digit unlock code.');
            return;
        }
        setIsVerifyingUnlock(true);
        try {
            await axios.post(`${BASE_URL}/contacts/unlock/verify`, {
                contact_id: contact.id,
                otp: enteredUnlockOTP
            }, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('✅ Unlocked!', `Your connection with ${contact.username} is now unlocked. You can block each other again.`);
            setEnteredUnlockOTP('');
            setGeneratedUnlockOTP(null);
            await fetchContacts();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Invalid unlock code.');
        } finally {
            setIsVerifyingUnlock(false);
        }
    };
    // ──────────────────────────────────────────────────────────────────────────

    const handleGenerateLock = async () => {
        setIsGeneratingOTP(true);
        try {
            const res = await axios.post(`${BASE_URL}/contacts/lock/generate`, {
                contact_id: contact.id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGeneratedOTP(res.data.otp);
            Alert.alert(
                "Lock Code Generated",
                `Give this 6-digit code to ${contact.username} in person or securely.`
            );
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Failed to generate lock.");
        } finally {
            setIsGeneratingOTP(false);
        }
    };

    const handleVerifyLock = async () => {
        if (!enteredOTP || enteredOTP.length !== 6) {
            Alert.alert("Invalid input", "Please enter a 6-digit OTP.");
            return;
        }

        setIsVerifying(true);
        try {
            const res = await axios.post(`${BASE_URL}/contacts/lock/verify`, {
                contact_id: contact.id,
                otp: enteredOTP
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Success!", "You have mutually locked your connection. Neither of you can block each other now.");
            setEnteredOTP('');

            // Refresh contacts in store to get new is_locked state
            await fetchContacts();
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.error || "Invalid Lock Code.");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={28} color="#f8fafc" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <MoreVertical size={24} color="#f8fafc" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Profile Hero Section */}
                <View style={styles.heroSection}>
                    <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8} onPress={() => setModalVisible(true)}>
                        <View style={styles.avatarGlowingRing}>
                            {contact.default_avatar ? (
                                <Image source={{ uri: contact.default_avatar }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarText}>{contact.username?.charAt(0).toUpperCase() || '?'}</Text>
                                </View>
                            )}
                        </View>
                        {/* Premium custom avatar badge indicator */}
                        {contact.specific_avatar && user?.default_avatar && (
                            <TouchableOpacity style={styles.premiumBadgeContainer} onPress={handleSetCustomAvatar} activeOpacity={0.7}>
                                <Image source={{ uri: user.default_avatar }} style={styles.premiumBadgeImage} />
                            </TouchableOpacity>
                        )}
                        {/* Status dot */}
                        <View style={styles.onlineDot} />
                    </TouchableOpacity>

                    <Text style={styles.contactName}>{contact.username || 'User'}</Text>
                    <Text style={styles.contactPhone}>{contact.phone_number || 'No Phone'}</Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => initiateCall(contactId, contact.username, 'audio')}>
                        <Phone size={24} color="#22c55e" />
                        <Text style={styles.actionText}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => initiateCall(contactId, contact.username, 'video')}>
                        <Video size={24} color="#22c55e" />
                        <Text style={styles.actionText}>Video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Search size={24} color="#22c55e" />
                        <Text style={styles.actionText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {/* Media Section Placeholder */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Media, links, and docs</Text>
                    <View style={styles.sectionHeaderRight}>
                        <Text style={styles.sectionCountText}>12</Text>
                        <ChevronRight size={16} color="#94a3b8" />
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroller} contentContainerStyle={{ paddingHorizontal: 20 }}>
                    <View style={styles.mediaPlaceholder} />
                    <View style={styles.mediaPlaceholder} />
                    <View style={styles.mediaPlaceholder} />
                </ScrollView>

                <View style={styles.divider} />

                {/* Settings Rows */}
                <View style={styles.settingsContainer}>
                    <TouchableOpacity style={styles.settingsRow}>
                        <View style={styles.settingsIcon}>
                            <ImageIcon size={22} color="#94a3b8" />
                        </View>
                        <View style={styles.settingsTextContainer}>
                            <Text style={styles.settingsTitle}>Manage Storage</Text>
                            <Text style={styles.settingsSubtitle}>83.3 MB</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsRow}>
                        <View style={styles.settingsIcon}>
                            <Bell size={22} color="#94a3b8" />
                        </View>
                        <View style={styles.settingsTextContainer}>
                            <Text style={styles.settingsTitle}>Notifications</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsRow}>
                        <View style={styles.settingsIcon}>
                            <ImageIcon size={22} color="#94a3b8" />
                        </View>
                        <View style={styles.settingsTextContainer}>
                            <Text style={styles.settingsTitle}>Media visibility</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingsRow}>
                        <View style={styles.settingsIcon}>
                            <Lock size={22} color="#94a3b8" />
                        </View>
                        <View style={styles.settingsTextContainer}>
                            <Text style={styles.settingsTitle}>Encryption</Text>
                            <Text style={styles.settingsSubtitle}>Messages and calls are end-to-end encrypted. Tap to verify.</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Mutual Non-Blocking System */}
                    <View style={[styles.settingsRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 20 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <ShieldCheck size={22} color={contact.is_locked ? "#10b981" : "#f59e0b"} />
                            <Text style={[styles.settingsTitle, { marginLeft: 15 }]}>
                                {contact.is_locked ? "Connection Locked" : "Mutual Non-Blocking Lock"}
                            </Text>
                        </View>

                        {contact.is_locked ? (
                            <View style={{ width: '100%' }}>
                                <Text style={[styles.settingsSubtitle, { marginBottom: 16 }]}>
                                    🔒 You and {contact.username} have mutually locked this connection.
                                    To unlock, generate a code and share it — or enter the code they gave you.
                                </Text>

                                {/* Generate Unlock OTP */}
                                {generatedUnlockOTP ? (
                                    <View style={styles.otpBox}>
                                        <Text style={styles.otpLabel}>Your Unlock Code:</Text>
                                        <Text style={[styles.otpValue, { color: '#ef4444' }]}>{generatedUnlockOTP}</Text>
                                        <Text style={[styles.otpLabel, { marginTop: 6 }]}>Share this with {contact.username}</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.generateBtn, { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)' }]}
                                        onPress={handleGenerateUnlock}
                                        disabled={isGeneratingUnlock}
                                    >
                                        <Text style={[styles.generateBtnText, { color: '#ef4444' }]}>
                                            {isGeneratingUnlock ? 'Generating...' : '🔓 Generate Unlock Code'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.divider} />

                                <Text style={[styles.settingsSubtitle, { marginBottom: 10 }]}>
                                    Or enter unlock code from {contact.username}:
                                </Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.otpInputContainer}>
                                        <TextInput
                                            style={styles.otpInputText}
                                            placeholder="000000"
                                            placeholderTextColor="#64748b"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={enteredUnlockOTP}
                                            onChangeText={setEnteredUnlockOTP}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.verifyBtn, { backgroundColor: '#ef4444' }, enteredUnlockOTP.length === 6 ? {} : { opacity: 0.5 }]}
                                        onPress={handleVerifyUnlock}
                                        disabled={isVerifyingUnlock || enteredUnlockOTP.length !== 6}
                                    >
                                        <Text style={styles.verifyBtnText}>{isVerifyingUnlock ? 'Verifying...' : 'Unlock'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={{ width: '100%' }}>
                                <Text style={[styles.settingsSubtitle, { marginBottom: 15 }]}>
                                    Generate a 6-digit OTP and give it to {contact.username} to securely lock your connection and prevent blocking.
                                </Text>

                                {generatedOTP ? (
                                    <View style={styles.otpBox}>
                                        <Text style={styles.otpLabel}>Your Secure Code:</Text>
                                        <Text style={styles.otpValue}>{generatedOTP}</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateLock} disabled={isGeneratingOTP}>
                                        <Text style={styles.generateBtnText}>{isGeneratingOTP ? "Generating..." : "Generate Lock Code"}</Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.divider} />

                                <Text style={[styles.settingsSubtitle, { marginBottom: 10 }]}>
                                    Or verify a code from {contact.username}:
                                </Text>
                                <View style={styles.inputRow}>
                                    <View style={styles.otpInputContainer}>
                                        <TextInput
                                            style={styles.otpInputText}
                                            placeholder="000000"
                                            placeholderTextColor="#64748b"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={enteredOTP}
                                            onChangeText={setEnteredOTP}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.verifyBtn, enteredOTP.length === 6 ? {} : { opacity: 0.5 }]}
                                        onPress={handleVerifyLock}
                                        disabled={isVerifying || enteredOTP.length !== 6}
                                    >
                                        <Text style={styles.verifyBtnText}>{isVerifying ? "Verifying..." : "Verify"}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Block / Unblock Section ───────────────────────────── */}
                    <View style={styles.divider} />

                    <View style={styles.blockSection}>
                        <View style={styles.blockHeaderRow}>
                            <ShieldOff size={22} color={contact.is_blocked ? '#ef4444' : '#94a3b8'} />
                            <Text style={[styles.settingsTitle, { marginLeft: 12 }]}>
                                {contact.is_blocked ? '🚫 Blocked' : 'Block User'}
                            </Text>
                        </View>

                        {contact.is_locked ? (
                            <Text style={styles.blockLockedNote}>
                                ⚠️ You cannot block {contact.username} — your connection is mutually locked.
                            </Text>
                        ) : (
                            <>
                                <Text style={styles.blockNote}>
                                    {contact.is_blocked
                                        ? `${contact.username} is currently blocked. Unblocking will allow them to send you messages again.`
                                        : `Blocking ${contact.username} will prevent them from sending you messages. You will need to enter a confirmation code.`}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.blockBtn, contact.is_blocked ? styles.unblockBtnStyle : styles.blockBtnStyle]}
                                    onPress={openBlockModal}
                                >
                                    <Text style={styles.blockBtnText}>
                                        {contact.is_blocked ? 'Unblock User' : '🚫 Block User'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

            </ScrollView>

            {/* ── Block/Unblock OTP Confirmation Modal ─────────────────────── */}
            <Modal
                visible={showBlockModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBlockModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowBlockModal(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.blockModalCard}>
                        {/* Header */}
                        <View style={styles.blockModalHeader}>
                            <ShieldOff size={28} color={contact.is_blocked ? '#22c55e' : '#ef4444'} />
                            <Text style={styles.blockModalTitle}>
                                {contact.is_blocked ? 'Confirm Unblock' : 'Confirm Block'}
                            </Text>
                        </View>

                        <Text style={styles.blockModalSubtitle}>
                            {contact.is_blocked
                                ? `You are about to unblock ${contact.username}.`
                                : `You are about to block ${contact.username}.`}
                        </Text>

                        {/* OTP Display */}
                        <Text style={styles.blockOTPLabel}>Enter this code to confirm:</Text>
                        <View style={styles.blockOTPDisplayBox}>
                            <Text style={styles.blockOTPDisplayText}>{blockConfirmOTP}</Text>
                        </View>

                        {/* OTP Input */}
                        <TextInput
                            style={styles.blockOTPInput}
                            placeholder="Type code here"
                            placeholderTextColor="#64748b"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={blockOTPInput}
                            onChangeText={setBlockOTPInput}
                        />

                        {/* Actions */}
                        <View style={styles.blockModalActions}>
                            <TouchableOpacity
                                style={styles.blockModalCancelBtn}
                                onPress={() => setShowBlockModal(false)}
                            >
                                <Text style={styles.blockModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.blockModalConfirmBtn,
                                    contact.is_blocked ? styles.unblockColor : styles.blockColor,
                                    blockOTPInput.length !== 4 && { opacity: 0.4 }
                                ]}
                                onPress={handleConfirmBlock}
                                disabled={isBlocking || blockOTPInput.length !== 4}
                            >
                                {isBlocking
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.blockModalConfirmText}>
                                        {contact.is_blocked ? 'Unblock' : 'Block'}
                                    </Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Full Screen Image Modal */}
            <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalBackground}>
                    <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.fullScreenImage} resizeMode="contain" />
                    ) : (
                        <View style={[styles.fullScreenImage, styles.avatarPlaceholder, { borderRadius: 0 }]}>
                            <Text style={[styles.avatarText, { fontSize: 100 }]}>{contact.username?.charAt(0).toUpperCase()}</Text>
                        </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    container: {
        flex: 1,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
        marginTop: 50,
    },
    heroSection: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarGlowingRing: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 3,
        borderColor: '#22c55e', // Glowing green ring
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    avatarPlaceholder: {
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#22c55e',
        borderWidth: 3,
        borderColor: '#0f172a',
    },
    premiumBadgeContainer: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 3,
        borderColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    premiumBadgeImage: {
        width: '100%',
        height: '100%',
    },
    contactName: {
        color: '#f8fafc',
        fontSize: 26,
        fontWeight: '600',
        marginBottom: 4,
    },
    contactPhone: {
        color: '#94a3b8',
        fontSize: 16,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    actionButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    actionText: {
        color: '#f8fafc',
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionCountText: {
        color: '#94a3b8',
        fontSize: 14,
        marginRight: 4,
    },
    mediaScroller: {
        marginBottom: 20,
    },
    mediaPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        marginRight: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    settingsContainer: {
        paddingHorizontal: 20,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    settingsIcon: {
        width: 40,
        alignItems: 'flex-start',
    },
    settingsTextContainer: {
        flex: 1,
    },
    settingsTitle: {
        color: '#f8fafc',
        fontSize: 17,
        fontWeight: '500',
        marginBottom: 2,
    },
    settingsSubtitle: {
        color: '#94a3b8',
        fontSize: 14,
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
    // OTP Lock Styles
    otpBox: {
        backgroundColor: '#0f172a',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 15,
    },
    otpLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 5,
    },
    otpValue: {
        color: '#10b981',
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 5,
    },
    generateBtn: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: '#f59e0b',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 15,
    },
    generateBtnText: {
        color: '#f59e0b',
        fontWeight: 'bold',
        fontSize: 15,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    otpInputContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#0f172a',
    },
    otpInputText: {
        color: '#fff',
        fontSize: 18,
        letterSpacing: 3,
        textAlign: 'center',
    },
    verifyBtn: {
        backgroundColor: '#10b981',
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    verifyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // ── Block Section Styles ─────────────────────────────────────────────────
    blockSection: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    blockHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    blockNote: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 14,
        lineHeight: 20,
    },
    blockLockedNote: {
        color: '#f59e0b',
        fontSize: 13,
        marginTop: 4,
        lineHeight: 20,
    },
    blockBtn: {
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
    },
    blockBtnStyle: {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    unblockBtnStyle: {
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    blockBtnText: {
        color: '#f8fafc',
        fontWeight: '700',
        fontSize: 15,
    },

    // ── Block Modal Styles ───────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    blockModalCard: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    blockModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    blockModalTitle: {
        color: '#f8fafc',
        fontSize: 20,
        fontWeight: '700',
    },
    blockModalSubtitle: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 20,
    },
    blockOTPLabel: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    blockOTPDisplayBox: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    blockOTPDisplayText: {
        color: '#f59e0b',
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: 12,
    },
    blockOTPInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        color: '#fff',
        fontSize: 22,
        textAlign: 'center',
        letterSpacing: 8,
        paddingVertical: 12,
        marginBottom: 20,
    },
    blockModalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    blockModalCancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    blockModalCancelText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 15,
    },
    blockModalConfirmBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    blockColor: {
        backgroundColor: '#ef4444',
    },
    unblockColor: {
        backgroundColor: '#22c55e',
    },
    blockModalConfirmText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});
