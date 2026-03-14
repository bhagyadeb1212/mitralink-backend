import { create } from 'zustand';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState, Alert } from 'react-native';
import { Audio } from 'expo-av';

let isAppStateListenerSet = false;
let globalSoundInstance: Audio.Sound | null = null;

export async function registerForPushNotificationsAsync() {
    let token = "mock-token-for-expo-go";
    return token;
}

const memoryStorage: Record<string, string> = {};
export const SafeStorage = {
    getItem: async (key: string) => {
        try {
            return await AsyncStorage.getItem(key);
        } catch (e) {
            return memoryStorage[key] || null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (e) {
            memoryStorage[key] = value;
        }
    },
    removeItem: async (key: string) => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            delete memoryStorage[key];
        }
    }
};

export const BASE_URL = 'https://mitralink-backend-production.up.railway.app';

interface User {
    id: number;
    username: string;
    phone_number: string;
    is_admin: number;
    coin_balance: number;
    default_avatar?: string;
    hide_last_seen?: number;
    who_can_see_online?: string;
    who_can_see_last_seen?: string;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    group_id?: number;
    content: string;
    type: string;
    timestamp: string;
    durationList?: any;
    fileName?: string;
}

interface Contact {
    id: number;
    username: string;
    phone_number: string;
    is_admin: number;
    default_avatar?: string;
    specific_avatar?: string;
    outbound_specific_avatar?: string;
    outbound_premium_expires_at?: number;
    is_locked?: boolean;
    is_blocked?: boolean;
    is_muted?: boolean;
}

interface ChatState {
    user: User | null;
    token: string | null;
    socket: any | null;
    contacts: Contact[];
    messages: { [key: string]: Message[] };
    isPremium: boolean;

    requestOtp: (phoneNumber: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
    verifyOtp: (phoneNumber: string, otp: string) => Promise<{ success: boolean; token?: string; user?: any; isNewUser?: boolean; error?: string }>;
    confirmationResult: any;
    setConfirmationResult: (result: any) => void;
    updateProfile: (username: string, token?: string) => Promise<boolean>;
    setAuth: (token: string, user: any) => Promise<void>;
    loginWithOtpless: (token: string) => Promise<{ success: boolean; token?: string; user?: any; isNewUser?: boolean; error?: string }>;
    login: (phoneNumber: string, username: string) => Promise<boolean>;
    logout: () => void;
    fetchUserProfile: () => Promise<void>;
    fetchContacts: () => Promise<void>;
    searchUsers: (query: string) => Promise<Contact[]>;
    addContact: (contactId: number) => Promise<void>;
    fetchMessages: (id: string | number) => Promise<void>;
    earnCoins: () => Promise<void>;
    connectSocket: () => void;
    isCallActive: boolean;
    isCallAccepted: boolean;
    isOpponentMuted: boolean;
    isOpponentMutedByMe: boolean;
    isCameraPaused: boolean;
    isOpponentCameraPaused: boolean;
    isVideoTransferring: boolean;
    isCallMinimized: boolean;
    incomingVideoRequest: boolean;
    setIsCallActive: (active: boolean) => void;
    setOpponentMuted: (muted: boolean) => void;
    setOpponentMutedByMe: (muted: boolean) => void;
    setIsVideoTransferring: (transferring: boolean) => void;
    setIsCallMinimized: (val: boolean) => void;
    setIncomingVideoRequest: (incoming: boolean) => void;

    playingAudioId: number | string | null;
    playAudioMessage: (messageId: number | string, uri: string, allChatMessages: Message[]) => Promise<void>;
    stopAudioMessage: () => Promise<void>;

    groups: any[];
    statuses: any[];
    fetchGroups: () => Promise<void>;
    createGroup: (name: string, memberIds: number[]) => Promise<any>;
    fetchStatuses: () => Promise<void>;
    postStatus: (content: string, type?: 'image' | 'text') => Promise<void>;

    callData: {
        isIncoming: boolean;
        callerName?: string;
        callerId?: number;
        signal?: any;
        callType?: 'audio' | 'video';
        callId?: number;
    } | null;
    initiateCall: (receiverId: number, name: string, callType?: 'audio' | 'video') => void;
    acceptCall: () => void;
    endCall: () => void;
    switchCallType: (newType: 'audio' | 'video') => void;
    requestSwitchCallType: (newType: 'audio' | 'video') => void;
    acceptSwitchCallType: (newType: 'audio' | 'video') => void;
    declineSwitchCallType: () => void;
    toggleCallMute: (muted: boolean) => void;
    toggleCamera: (paused: boolean) => void;

    // Reels
    reels: any[];
    reelProfile: any | null;
    fetchReels: () => Promise<void>;
    uploadReel: (contentUrl: string, type: 'video' | 'image', caption?: string) => Promise<boolean>;
    likeReel: (reelId: number, reactionType?: string) => Promise<any>;
    commentReel: (reelId: number, content: string) => Promise<boolean>;
    fetchReelProfile: () => Promise<void>;
    updateReelProfile: (name: string, bio: string) => Promise<boolean>;
    followUser: (followingId: number) => Promise<boolean>;
    getFollowStatus: (userId: number) => Promise<any>;
    shareReel: (reel: any, recipientId: number | string) => void;
    shareCreator: (recipientId: number | string, profile: any) => void;
    updateUserLocation: (latitude: number, longitude: number) => Promise<void>;
    fetchSuggestions: () => Promise<void>;
    blockUser: (userId: number) => Promise<void>;
    fetchNotifications: () => Promise<void>;
    markNotificationsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    clearNotifications: () => Promise<void>;
    setupCreatorProfile: (name: string, bio: string, avatar_url?: string) => Promise<boolean>;
    suggestions: { creators: any[]; reels: any[] };
    notifications: any[];
}

const useStore = create<ChatState>((set, get) => ({
    user: null,
    suggestions: { creators: [], reels: [] },
    notifications: [],
    token: null,
    socket: null,
    contacts: [],
    messages: {},
    confirmationResult: null,
    setConfirmationResult: (result: any) => set({ confirmationResult: result }),
    isPremium: false,
    isCallActive: false,
    isCallAccepted: false,
    isOpponentMuted: false,
    isOpponentMutedByMe: false,
    isCameraPaused: false,
    isOpponentCameraPaused: false,
    isVideoTransferring: false,
    isCallMinimized: false,
    incomingVideoRequest: false,
    callData: null,

    groups: [],
    statuses: [],
    fetchGroups: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ groups: res.data });
        } catch (err) {
            console.log('Fetch groups failed', err);
        }
    },
    createGroup: async (name, memberIds) => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.post(`${BASE_URL}/groups/create`, { name, memberIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            get().fetchGroups();
            return res.data;
        } catch (err) {
            console.log('Create group failed', err);
            throw err;
        }
    },
    fetchStatuses: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/statuses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ statuses: res.data });
        } catch (err) {
            console.log('Fetch statuses failed', err);
        }
    },
    postStatus: async (content, type = 'image') => {
        const { token } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/statuses`, { content, type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            get().fetchStatuses();
        } catch (err) {
            console.log('Post status failed', err);
        }
    },

    requestOtp: async (phone_number) => {
        try {
            const confirmation = await auth().signInWithPhoneNumber(phone_number);
            get().setConfirmationResult(confirmation);
            return { success: true };
        } catch (err: any) {
            console.error('Firebase request OTP error:', err);
            return { success: false, error: err.message || 'Failed to send OTP' };
        }
    },

    verifyOtp: async (phone_number, otp) => {
        try {
            const confirmation = get().confirmationResult;
            if (!confirmation) {
                return { success: false, error: 'No OTP request found. Please request OTP again.' };
            }

            // Verify with Firebase
            const userCredential = await confirmation.confirm(otp);
            const uid = userCredential?.user?.uid;
            
            if (!uid) {
                return { success: false, error: 'Failed to retrieve Firebase UID.' };
            }

            // Authenticate with our backend
            const res = await axios.post(`${BASE_URL}/auth/verify-firebase`, { phone_number, uid });
            const { token, user, isNewUser } = res.data;
            
            return { success: true, token, user, isNewUser };
        } catch (err: any) {
            console.error('Firebase verify OTP error:', err);
            
            // Handle different error formats (Firebase vs Axios)
            let errorMsg = 'Invalid OTP';
            if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else if (err.code === 'auth/invalid-verification-code') {
                errorMsg = 'Invalid verification code. Please try again.';
            } else if (err.message) {
                errorMsg = err.message;
            }

            return { success: false, error: errorMsg };
        }
    },

    loginWithOtpless: async (otplessToken) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/verify-otpless`, { token: otplessToken });
            const { token, user, isNewUser } = res.data;
            if (token && user) {
                await get().setAuth(token, user);
            }
            return { success: true, token, user, isNewUser };
        } catch (err: any) {
            console.error('OTPless login failed:', err);
            return { success: false, error: err.response?.data?.error || 'Failed to login with OTPless' };
        }
    },


    updateProfile: async (username, explicitToken) => {
        const token = explicitToken || get().token;
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/users/update-profile`, { username }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return true;
        } catch (err) {
            return false;
        }
    },

    setAuth: async (token, user) => {
        await SafeStorage.setItem('token', token);
        set({ token, user });
        get().connectSocket();
        get().fetchContacts();
    },

    setIsCallActive: (active) => set({ isCallActive: active }),
    setOpponentMuted: (muted) => set({ isOpponentMuted: muted }),
    setOpponentMutedByMe: (muted) => set({ isOpponentMutedByMe: muted }),
    setIsVideoTransferring: (transferring) => set({ isVideoTransferring: transferring }),
    setIsCallMinimized: (minimized) => set({ isCallMinimized: minimized }),
    setIncomingVideoRequest: (incoming) => set({ incomingVideoRequest: incoming }),

    playingAudioId: null,
    playAudioMessage: async (messageId, uri, chatMessages) => {
        const { stopAudioMessage } = get();
        await stopAudioMessage();
        set({ playingAudioId: messageId });
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                interruptionModeIOS: 0,
                interruptionModeAndroid: 1,
            });
            const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, isLooping: false });
            globalSoundInstance = sound;
            sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.isLoaded && status.didJustFinish) {
                    const currentIndex = chatMessages.findIndex((m) => m.id === messageId);
                    let playedNext = false;
                    if (currentIndex >= 0 && currentIndex < chatMessages.length - 1) {
                        let nextIndex = currentIndex + 1;
                        while (nextIndex < chatMessages.length) {
                            if (chatMessages[nextIndex].type === 'audio' || chatMessages[nextIndex].type === 'audio_chat') {
                                get().playAudioMessage(chatMessages[nextIndex].id, chatMessages[nextIndex].content, chatMessages);
                                playedNext = true;
                                break;
                            }
                            nextIndex++;
                        }
                    }
                    if (!playedNext) get().stopAudioMessage();
                }
            });
        } catch (err) {
            console.error('Global play error:', err);
            get().stopAudioMessage();
        }
    },
    stopAudioMessage: async () => {
        if (globalSoundInstance) {
            await globalSoundInstance.unloadAsync();
            globalSoundInstance = null;
        }
        set({ playingAudioId: null });
    },

    initiateCall: (receiverId, name, callType = 'audio') => {
        const { socket, user } = get();
        if (!socket || !user) return;
        set({ isCallActive: true, isCallAccepted: false, isCallMinimized: false, callData: { isIncoming: false, callerName: name, callerId: receiverId, callType } });
        socket.emit('call_user', { userToCall: receiverId, signalData: { type: 'offer', callType }, from: user.id, name: user.username, callType });
    },
    acceptCall: () => {
        const { socket, callData } = get();
        if (!socket || !callData) return;
        socket.emit('answer_call', { to: callData.callerId, signal: { type: 'answer' }, callId: callData.callId });
        set({ isCallActive: true, isCallAccepted: true, isCallMinimized: false });
    },
    endCall: () => {
        const { socket, callData, isCallAccepted } = get();
        if (socket && callData) {
            if (!isCallAccepted) socket.emit('reject_call', { to: callData.callerId, callId: callData.callId });
            else socket.emit('end_call', { to: callData.callerId, callId: callData.callId });
        }
        set({ isCallActive: false, isCallAccepted: false, callData: null, isOpponentMuted: false, isOpponentMutedByMe: false, isVideoTransferring: false, isCameraPaused: false, isOpponentCameraPaused: false, isCallMinimized: false, incomingVideoRequest: false });
    },
    switchCallType: (newType) => {
        const { socket, callData } = get();
        if (socket && callData) {
            set({ callData: { ...callData, callType: newType } });
            socket.emit('switch_call_type', { to: callData.callerId, callType: newType });
        }
    },
    requestSwitchCallType: (newType) => {
        const { socket, callData } = get();
        if (socket && callData) {
            set({ isVideoTransferring: true });
            socket.emit('request_switch_call_type', { to: callData.callerId, callType: newType });
        }
    },
    acceptSwitchCallType: (newType) => {
        const { socket, callData } = get();
        if (socket && callData) {
            set({ callData: { ...callData, callType: newType }, isVideoTransferring: false, incomingVideoRequest: false });
            socket.emit('accept_switch_call_type', { to: callData.callerId, callType: newType });
        }
    },
    declineSwitchCallType: () => {
        const { socket, callData } = get();
        if (socket && callData) {
            set({ incomingVideoRequest: false, isVideoTransferring: false });
            socket.emit('decline_switch_call_type', { to: callData.callerId });
        }
    },
    toggleCallMute: (muted) => {
        const { socket, callData } = get();
        if (socket && callData) socket.emit('call_mute', { to: callData.callerId, isMuted: muted });
    },
    toggleCamera: (paused) => {
        const { socket, callData } = get();
        set({ isCameraPaused: paused });
        if (socket && callData) socket.emit('camera_pause', { to: callData.callerId, isPaused: paused });
    },

    login: async (phoneNumber, username) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, { phone_number: phoneNumber, username });
            const { user, token } = res.data;
            await SafeStorage.setItem('token', token);
            set({ user, token });
            get().connectSocket();
            await get().fetchContacts();
            return true;
        } catch (err) {
            console.error('Login failed', err);
            return false;
        }
    },
    logout: async () => {
        await SafeStorage.removeItem('token');
        const { socket } = get();
        if (socket) socket.disconnect();
        set({ user: null, token: null, socket: null, contacts: [], messages: {} });
    },

    connectSocket: () => {
        const { token, socket: existingSocket } = get();
        if (!isAppStateListenerSet) {
            AppState.addEventListener('change', (nextAppState) => {
                if (nextAppState === 'active') {
                    const currentSocket = get().socket;
                    if (currentSocket && !currentSocket.connected) currentSocket.connect();
                    else if (!currentSocket && get().token) get().connectSocket();
                }
            });
            isAppStateListenerSet = true;
        }
        if (!token || existingSocket) return;
        const socket = io(BASE_URL, { auth: { token } });
        socket.on('connect', () => console.log('Mobile socket connected'));
        socket.on('receive_message', (message: Message) => {
            set(state => {
                const chatId = message.group_id ? `group_${message.group_id}` : (message.sender_id === state.user?.id ? message.receiver_id?.toString() : message.sender_id?.toString());
                if (!chatId) return state;
                const contactMessages = state.messages[chatId] || [];
                return { messages: { ...state.messages, [chatId]: [...contactMessages, message] } };
            });
        });
        socket.on('message_sent', (message: Message) => {
            set(state => {
                const chatId = message.group_id ? `group_${message.group_id}` : message.receiver_id?.toString();
                if (!chatId) return state;
                const contactMessages = state.messages[chatId] || [];
                return { messages: { ...state.messages, [chatId]: [...contactMessages, message] } };
            });
        });
        socket.on('call_user', (data: any) => {
            set({ callData: { isIncoming: true, callerName: data.name, callerId: data.from, signal: data.signal, callType: data.callType || 'audio', callId: data.callId }, isCallActive: true });
        });
        socket.on('call_initiated', (data: { callId: number }) => {
            const currentCallData = get().callData;
            if (currentCallData) set({ callData: { ...currentCallData, callId: data.callId } });
        });
        socket.on('call_accepted', () => set({ isCallAccepted: true }));
        socket.on('end_call', () => set({ isCallActive: false, isCallAccepted: false, callData: null, isOpponentMuted: false, isOpponentMutedByMe: false, incomingVideoRequest: false, isVideoTransferring: false, isCallMinimized: false, isCameraPaused: false, isOpponentCameraPaused: false }));
        socket.on('call_rejected', () => set({ isCallActive: false, isCallAccepted: false, callData: null, isOpponentMuted: false, isOpponentMutedByMe: false, incomingVideoRequest: false, isVideoTransferring: false, isCallMinimized: false, isCameraPaused: false, isOpponentCameraPaused: false }));
        socket.on('switch_call_type', (data: any) => {
            const currentCallData = get().callData;
            if (currentCallData) set({ callData: { ...currentCallData, callType: data.callType } });
        });
        socket.on('call_mute', (data: any) => set({ isOpponentMuted: data.isMuted }));
        socket.on('camera_pause', (data: any) => set({ isOpponentCameraPaused: data.isPaused }));
        socket.on('request_switch_call_type', (data: any) => { if (data.callType === 'video') set({ incomingVideoRequest: true }); });
        socket.on('accept_switch_call_type', (data: any) => {
            const currentCallData = get().callData;
            if (currentCallData) set({ callData: { ...currentCallData, callType: data.callType }, isVideoTransferring: false });
        });
        socket.on('decline_switch_call_type', () => set({ isVideoTransferring: false }));
        set({ socket });
    },

    fetchUserProfile: async () => {
        const { token, logout } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
            set({ user: res.data });
        } catch (err: any) {
            console.log('Fetch profile failed', err);
            // Only logout if token is explicitly invalid (401)
            if (err.response?.status === 401) {
                logout();
            }
        }
    },
    fetchContacts: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/contacts`, { headers: { Authorization: `Bearer ${token}` } });
            set({ contacts: res.data });
        } catch (err) { console.log('Fetch contacts failed', err); }
    },
    searchUsers: async (query) => {
        const { token } = get();
        if (!token) return [];
        try {
            const res = await axios.get(`${BASE_URL}/users/search?query=${query}`, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        } catch (err) { return []; }
    },
    addContact: async (contactId) => {
        const { token } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/contacts/add`, { contact_id: contactId }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchContacts();
        } catch (err) { }
    },
    fetchMessages: async (id) => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            set(state => ({ messages: { ...state.messages, [id]: res.data } }));
        } catch (err) { }
    },
    earnCoins: async () => {
        const { token } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/coins/claim-ad`, {}, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchUserProfile();
        } catch (err) { }
    },

    reels: [],
    reelProfile: null,
    fetchReels: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/reels/feed`, { headers: { Authorization: `Bearer ${token}` } });
            set({ reels: res.data });
        } catch (err) { console.log('Fetch reels failed', err); }
    },
    uploadReel: async (content_url, type, caption) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/reels/upload`, { content_url, type, caption }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchReels();
            return true;
        } catch (err) { return false; }
    },
    likeReel: async (reel_id, reaction_type = 'like') => {
        const { token } = get();
        if (!token) return null;
        try {
            const res = await axios.post(`${BASE_URL}/reels/like`, { reel_id, reaction_type }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchReels();
            return res.data;
        } catch (err) { return null; }
    },
    commentReel: async (reel_id, content) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/reels/comment`, { reel_id, content }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchReels();
            return true;
        } catch (err) { return false; }
    },
    fetchReelProfile: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/reels/profile`, { headers: { Authorization: `Bearer ${token}` } });
            set({ reelProfile: res.data });
        } catch (err) { console.log('Fetch reel profile failed', err); }
    },
    updateReelProfile: async (name, bio) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/reels/profile`, { name, bio }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchReelProfile();
            return true;
        } catch (err) { return false; }
    },
    followUser: async (following_id) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/reels/follow`, { following_id }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchReels(); // Refresh feed to update follow buttons
            return true;
        } catch (err) { return false; }
    },
    getFollowStatus: async (userId) => {
        const { token } = get();
        if (!token) return null;
        try {
            const res = await axios.get(`${BASE_URL}/reels/follow-status/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        } catch (err) { return null; }
    },
    shareReel: (reel, recipientId) => {
        const { socket } = get();
        if (!socket) return;
        const payload = {
            receiverId: typeof recipientId === 'string' && recipientId.startsWith('group_') ? null : (typeof recipientId === 'number' ? recipientId : parseInt(recipientId)),
            groupId: typeof recipientId === 'string' && recipientId.startsWith('group_') ? recipientId.replace('group_', '') : null,
            content: JSON.stringify(reel),
            type: 'reel_share'
        };
        socket.emit('send_message', payload);
    },
    shareCreator: (recipientId, profile) => {
        const { socket } = get();
        if (socket) {
            const isGroup = typeof recipientId === 'string' && recipientId.startsWith('group_');
            const payload = isGroup
                ? { groupId: recipientId.replace('group_', ''), content: JSON.stringify(profile), type: 'profile_share' }
                : { receiverId: recipientId, content: JSON.stringify(profile), type: 'profile_share' };
            socket.emit('send_message', payload);
        }
    },

    updateUserLocation: async (latitude, longitude) => {
        const { token } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/users/location`, { latitude, longitude }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to update location', error);
        }
    },

    fetchSuggestions: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_URL}/reels/suggestions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ suggestions: response.data });
        } catch (error) {
            console.error('Failed to fetch suggestions', error);
        }
    },

    blockUser: async (userId) => {
        const { token, fetchReels, fetchSuggestions } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/contacts/block`, { contact_id: userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh content after blocking
            await Promise.all([fetchReels(), fetchSuggestions()]);
        } catch (error) {
            console.error('Failed to block user', error);
        }
    },

    fetchNotifications: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const response = await axios.get(`${BASE_URL}/reels/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ notifications: response.data });
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    },

    markNotificationsRead: async () => {
        const { token, fetchNotifications } = get();
        if (!token) return;
        try {
            await axios.post(`${BASE_URL}/reels/notifications/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
    },

    deleteNotification: async (id: number) => {
        const { token, fetchNotifications } = get();
        if (!token) return;
        try {
            await axios.delete(`${BASE_URL}/reels/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    },

    clearNotifications: async () => {
        const { token, fetchNotifications } = get();
        if (!token) return;
        try {
            await axios.delete(`${BASE_URL}/reels/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchNotifications();
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    },

    setupCreatorProfile: async (name: string, bio: string, avatar_url?: string) => {
        const { token, fetchReelProfile } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/reels/profile`, { name, bio, avatar_url }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchReelProfile();
            return true;
        } catch (error) {
            console.error('Failed to setup creator profile', error);
            return false;
        }
    }
}));

export default useStore;
