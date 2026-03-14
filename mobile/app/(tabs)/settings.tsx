import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
    ScrollView, Image, Modal, ActivityIndicator, Switch, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Shield, ChevronRight, ChevronLeft, Crown, LogOut, HelpCircle,
    Phone, Camera, Lock, Star, ChevronDown, ChevronUp, MoreVertical, Coins, Play
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import useStore from '../../store';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useRouter } from 'expo-router';

const BASE_URL = 'http://192.168.1.33:4000';

const PRIVACY_OPTIONS = ['Everyone', 'My Contacts', 'Nobody'] as const;
type PrivacyOption = typeof PRIVACY_OPTIONS[number];

const FAQ = [
    { q: 'How do I add a contact?', a: 'Tap the + button on the Chats screen, or search by phone number in the search bar.' },
    { q: 'What are Coins?', a: 'Coins are the in-app currency. You earn them by watching ads and spend them on premium features like sending voice messages to AI or buying premium subscriptions.' },
    { q: 'What is the Mutual Non-Blocking Lock?', a: 'It is a system where two users agree to lock their connection so neither can block the other. Both must exchange a 6-digit OTP to activate it.' },
    { q: 'How do I change my profile photo?', a: 'On this Settings page, tap your profile photo at the top and choose from camera or gallery.' },
    { q: 'How does the premium avatar work?', a: 'With an active premium subscription for a specific contact, you can set a custom photo that only YOU see for that contact.' },
];

export default function SettingsScreen() {
    const { user, contacts, token, fetchUserProfile, fetchContacts, logout } = useStore();
    const { showActionSheetWithOptions } = useActionSheet();
    const router = useRouter();

    // Privacy state
    const [onlineVis, setOnlineVis] = useState<PrivacyOption>('Everyone');
    const [lastSeenVis, setLastSeenVis] = useState<PrivacyOption>('Everyone');
    const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

    // Phone change state
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [isChangingPhone, setIsChangingPhone] = useState(false);

    // Help FAQ state
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Privacy picker state
    const [showOnlinePicker, setShowOnlinePicker] = useState(false);
    const [showLastSeenPicker, setShowLastSeenPicker] = useState(false);
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const handleEarnCoins = async () => {
        if (isWatchingAd) return;
        setIsWatchingAd(true);
        try {
            await useStore.getState().earnCoins();
            Alert.alert("Success", "You've earned 10 coins!");
        } catch (e) {
            Alert.alert("Error", "Could not reward coins.");
        } finally {
            setIsWatchingAd(false);
        }
    };

    // Premium summary
    const lockedContacts = contacts.filter(c => c.is_locked).length;
    const premiumContacts = contacts.filter(c => c.outbound_premium_expires_at && c.outbound_premium_expires_at > Date.now()).length;
    const customAvatarContacts = contacts.filter(c => c.specific_avatar).length;

    const handleChangeAvatar = () => {
        const options = ['Take Photo', 'Choose from Gallery', 'Remove Picture', 'Cancel'];
        showActionSheetWithOptions({ options, cancelButtonIndex: 3, title: 'Change Profile Photo' }, async (idx) => {
            if (idx === 0) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission Denied'); return; }
                const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true });
                if (!res.canceled && res.assets[0].base64) await uploadAvatar(`data:image/jpeg;base64,${res.assets[0].base64}`);
            } else if (idx === 1) {
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true });
                if (!res.canceled && res.assets[0].base64) await uploadAvatar(`data:image/jpeg;base64,${res.assets[0].base64}`);
            } else if (idx === 2) {
                await uploadAvatar('');
            }
        });
    };

    const uploadAvatar = async (url: string) => {
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/users/avatar`, { avatar_url: url || null }, { headers: { Authorization: `Bearer ${token}` } });
            fetchUserProfile();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed');
        }
    };

    const savePrivacy = async (field: 'online' | 'lastSeen', value: PrivacyOption) => {
        if (!token) return;
        setIsSavingPrivacy(true);
        try {
            await axios.post(`${BASE_URL}/users/privacy`, {
                hide_last_seen: lastSeenVis === 'Nobody',
                who_can_see_online: field === 'online' ? value.toLowerCase().replace(' ', '_') : onlineVis.toLowerCase().replace(' ', '_'),
                who_can_see_last_seen: field === 'lastSeen' ? value.toLowerCase().replace(' ', '_') : lastSeenVis.toLowerCase().replace(' ', '_'),
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) { }
        setIsSavingPrivacy(false);
    };

    const handleChangePhone = async () => {
        if (!newPhone.trim()) { Alert.alert('Error', 'Enter a phone number.'); return; }
        if (newPhone.trim() === user?.phone_number) { Alert.alert('Error', 'This is already your number.'); return; }
        setIsChangingPhone(true);
        try {
            await axios.post(`${BASE_URL}/users/change-phone`, { new_phone: newPhone.trim() }, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('✅ Done!', 'Your phone number has been updated. Please log in again.', [{ text: 'OK', onPress: logout }]);
            setShowPhoneModal(false);
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to change number.');
        } finally {
            setIsChangingPhone(false);
        }
    };

    const PrivacyPicker = ({ visible, onSelect, current }: { visible: boolean; onSelect: (v: PrivacyOption) => void; current: PrivacyOption }) => (
        <Modal visible={visible} transparent animationType="slide">
            <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => { setShowOnlinePicker(false); setShowLastSeenPicker(false); }}>
                <View style={styles.pickerCard}>
                    <Text style={styles.pickerTitle}>Who can see this?</Text>
                    {PRIVACY_OPTIONS.map(opt => (
                        <TouchableOpacity key={opt} style={[styles.pickerOption, current === opt && styles.pickerOptionActive]} onPress={() => onSelect(opt)}>
                            <Text style={[styles.pickerOptionText, current === opt && { color: '#6366f1' }]}>{opt}</Text>
                            {current === opt && <Shield size={16} color="#6366f1" />}
                        </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    if (!user) return null;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* ── Profile Header ─────────────────────────────────────────── */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity onPress={handleChangeAvatar} style={styles.avatarWrapper} activeOpacity={0.85}>
                        {user.default_avatar ? (
                            <Image source={{ uri: user.default_avatar }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>{user.username?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={styles.cameraOverlay}>
                            <Camera size={18} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{user.username}</Text>
                    <Text style={styles.profilePhone}>{user.phone_number}</Text>
                </View>

                {/* ── Earn Coins Section ─────────────────────────────────────── */}
                <View style={styles.rewardCard}>
                    <View style={styles.rewardInfo}>
                        <View style={styles.coinIconBg}>
                            <Coins size={24} color="#f59e0b" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.rewardTitle}>Earn Free Coins</Text>
                            <Text style={styles.rewardSub}>Watch a short ad to get 10 coins instantly!</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.watchAdBtn, isWatchingAd && { opacity: 0.7 }]}
                        onPress={handleEarnCoins}
                        disabled={isWatchingAd}
                    >
                        {isWatchingAd ? (
                            <ActivityIndicator size="small" color="#0f172a" />
                        ) : (
                            <>
                                <Play size={16} color="#0f172a" strokeWidth={3} />
                                <Text style={styles.watchAdText}>Watch Now</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Account Section ────────────────────────────────────────── */}
                <SectionHeader title="Account" icon={<Phone size={18} color="#6366f1" />} />
                <View style={styles.card}>
                    <SettingsRow
                        label="Change Phone Number"
                        sub={user.phone_number}
                        icon={<Phone size={18} color="#94a3b8" />}
                        onPress={() => setShowPhoneModal(true)}
                    />
                </View>

                {/* ── Privacy Section ────────────────────────────────────────── */}
                <SectionHeader title="Privacy" icon={<Shield size={18} color="#6366f1" />} />
                <View style={styles.card}>
                    <SettingsRow
                        label="Who can see Online status"
                        sub={onlineVis}
                        icon={<Shield size={18} color="#94a3b8" />}
                        onPress={() => setShowOnlinePicker(true)}
                    />
                    <View style={styles.rowDivider} />
                    <SettingsRow
                        label="Who can see Last Seen"
                        sub={lastSeenVis}
                        icon={<Shield size={18} color="#94a3b8" />}
                        onPress={() => setShowLastSeenPicker(true)}
                    />
                </View>

                {/* ── Premium Summary ───────────────────────────────────────── */}
                <SectionHeader title="My Premium" icon={<Crown size={18} color="#f59e0b" />} />
                <View style={styles.card}>
                    <View style={styles.premiumRow}>
                        <Lock size={18} color="#10b981" />
                        <Text style={styles.premiumLabel}>Locked Connections</Text>
                        <Text style={styles.premiumBadge}>{lockedContacts}</Text>
                    </View>
                    <View style={styles.rowDivider} />
                    <View style={styles.premiumRow}>
                        <Star size={18} color="#f59e0b" />
                        <Text style={styles.premiumLabel}>Active Premium Contacts</Text>
                        <Text style={styles.premiumBadge}>{premiumContacts}</Text>
                    </View>
                    <View style={styles.rowDivider} />
                    <View style={styles.premiumRow}>
                        <Camera size={18} color="#6366f1" />
                        <Text style={styles.premiumLabel}>Custom Avatars Set</Text>
                        <Text style={styles.premiumBadge}>{customAvatarContacts}</Text>
                    </View>
                    <View style={styles.rowDivider} />
                    <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/premium')}>
                        <Crown size={16} color="#fff" />
                        <Text style={styles.upgradeBtnText}>Upgrade Premium</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Help / FAQ ─────────────────────────────────────────────── */}
                <SectionHeader title="Help" icon={<HelpCircle size={18} color="#6366f1" />} />
                <View style={styles.card}>
                    {FAQ.map((item, i) => (
                        <View key={i}>
                            <TouchableOpacity style={styles.faqRow} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
                                <Text style={styles.faqQ}>{item.q}</Text>
                                {openFaq === i ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                            </TouchableOpacity>
                            {openFaq === i && <Text style={styles.faqA}>{item.a}</Text>}
                            {i < FAQ.length - 1 && <View style={styles.rowDivider} />}
                        </View>
                    ))}
                </View>

                {/* ── Logout ─────────────────────────────────────────────────── */}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <LogOut size={18} color="#ef4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* ── Online Privacy Picker ──────────────────────────────────────── */}
            <PrivacyPicker
                visible={showOnlinePicker}
                current={onlineVis}
                onSelect={(v) => { setOnlineVis(v); setShowOnlinePicker(false); savePrivacy('online', v); }}
            />
            <PrivacyPicker
                visible={showLastSeenPicker}
                current={lastSeenVis}
                onSelect={(v) => { setLastSeenVis(v); setShowLastSeenPicker(false); savePrivacy('lastSeen', v); }}
            />

            {/* ── Change Phone Modal ─────────────────────────────────────────── */}
            <Modal visible={showPhoneModal} transparent animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
                <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPhoneModal(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Change Phone Number</Text>
                        <Text style={styles.modalSubtitle}>
                            Your contacts and messages will stay the same. You'll need to log in with your new number.
                        </Text>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="New phone number"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={newPhone}
                            onChangeText={setNewPhone}
                        />
                        <TouchableOpacity
                            style={[styles.upgradeBtn, { marginTop: 0 }, newPhone.length < 3 && { opacity: 0.4 }]}
                            onPress={handleChangePhone}
                            disabled={isChangingPhone || newPhone.length < 3}
                        >
                            {isChangingPhone ? <ActivityIndicator color="#fff" /> : <Text style={styles.upgradeBtnText}>Confirm Change</Text>}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
        <View style={styles.sectionHeader}>
            {icon}
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

function SettingsRow({ label, sub, icon, onPress }: { label: string; sub?: string; icon: React.ReactNode; onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rowIcon}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {sub && <Text style={styles.rowSub}>{sub}</Text>}
            </View>
            <ChevronRight size={16} color="#334155" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 28 },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
    avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#6366f1' },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#6366f1',
    },
    avatarInitial: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
    cameraOverlay: {
        position: 'absolute', bottom: 2, right: 2,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#0f172a',
    },
    profileName: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
    profilePhone: { color: '#64748b', fontSize: 15, marginTop: 3 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 8 },
    sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

    card: { marginHorizontal: 16, backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden' },
    settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    rowIcon: { width: 36, alignItems: 'center' },
    rowLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '500' },
    rowSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
    rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 52 },

    premiumRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    premiumLabel: { color: '#f8fafc', fontSize: 15, flex: 1 },
    premiumBadge: {
        backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1',
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
        fontWeight: '700', fontSize: 14,
    },
    upgradeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#6366f1', margin: 16, borderRadius: 12,
        paddingVertical: 13, gap: 8,
    },
    upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    faqRow: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
    faqQ: { color: '#f8fafc', fontSize: 15, flex: 1, marginRight: 8 },
    faqA: { color: '#94a3b8', fontSize: 14, paddingHorizontal: 16, paddingBottom: 12, lineHeight: 20 },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        margin: 20, marginTop: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
        backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 14, paddingVertical: 14, gap: 8,
    },
    logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },

    rewardCard: {
        backgroundColor: '#1e293b',
        marginTop: 10,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    rewardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    coinIconBg: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    rewardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    rewardSub: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
    },
    watchAdBtn: {
        backgroundColor: '#f59e0b',
        flexDirection: 'row',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    watchAdText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: 'bold',
    },

    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    pickerCard: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    pickerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    pickerOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, borderRadius: 10, paddingHorizontal: 4,
    },
    pickerOptionActive: { backgroundColor: 'rgba(99,102,241,0.1)' },
    pickerOptionText: { color: '#f8fafc', fontSize: 16 },
    modalSubtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 16, lineHeight: 20 },
    phoneInput: {
        backgroundColor: '#0f172a', color: '#fff', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 13, fontSize: 16,
        borderWidth: 1, borderColor: '#334155', marginBottom: 16,
    },
});
