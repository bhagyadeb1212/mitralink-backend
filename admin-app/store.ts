import { create } from 'zustand';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://7ad49bbd4641bee5-103-175-91-209.serveousercontent.com'; // Serveo Tunnel URL

interface AdminState {
    user: any | null;
    token: string | null;
    adminCreators: any[];
    adminReels: any[];
    adminStats: {
        totalUsers: number;
        totalReels: number;
        totalGroups: number;
    };

    setAuth: (token: string, user: any) => Promise<void>;
    logout: () => void;

    fetchAdminCreators: () => Promise<void>;
    toggleUserAdmin: (userId: number) => Promise<boolean>;
    toggleUserBan: (userId: number) => Promise<boolean>;

    fetchAdminReels: () => Promise<void>;
    deleteReelAdmin: (reelId: number) => Promise<boolean>;

    fetchAdminStats: () => Promise<void>;

    // Oversight
    searchAllUsers: (phone: string) => Promise<any[]>;
    fetchUserMessages: (userId: number) => Promise<any[]>;

    requestOtp: (phoneNumber: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
    verifyOtp: (phoneNumber: string, otp: string) => Promise<{ success: boolean; token?: string; user?: any; error?: string }>;
    confirmationResult: any;
    setConfirmationResult: (result: any) => void;
}

const useAdminStore = create<AdminState>((set, get) => ({
    user: null,
    token: null,
    adminCreators: [],
    adminReels: [],
    adminStats: {
        totalUsers: 0,
        totalReels: 0,
        totalGroups: 0
    },
    confirmationResult: null,
    setConfirmationResult: (result: any) => set({ confirmationResult: result }),

    setAuth: async (token, user) => {
        await AsyncStorage.setItem('admin_token', token);
        set({ token, user });
    },

    logout: async () => {
        await AsyncStorage.removeItem('admin_token');
        set({ user: null, token: null });
    },

    requestOtp: async (phone_number) => {
        const normalizedPhone = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();
        try {
            if (['+91111', '+91222', '+91333', '+916263209087'].includes(normalizedPhone)) {
                return { success: true };
            }
            const confirmation = await auth().signInWithPhoneNumber(normalizedPhone);
            get().setConfirmationResult(confirmation);
            return { success: true };
        } catch (err: any) {
            console.error('Admin request OTP error:', err);
            return { success: false, error: err.message || 'Failed to send OTP' };
        }
    },

    verifyOtp: async (phone_number, otp) => {
        const normalizedPhone = phone_number.replace(/\s+/g, '').replace(/-/g, '').trim();
        try {
            let res;
            if (['+91111', '+91222', '+91333', '+916263209087'].includes(normalizedPhone) && otp === '123456') {
                res = await axios.post(`${BASE_URL}/auth/verify-otp`, { phone_number: normalizedPhone, otp: '123456' });
            } else {
                // Real Firebase logic
                const confirmation = get().confirmationResult;
                if (!confirmation) {
                    return { success: false, error: 'No OTP request found.' };
                }
                const userCredential = await confirmation.confirm(otp);
                const uid = userCredential?.user?.uid;
                res = await axios.post(`${BASE_URL}/auth/verify-otp`, { phone_number: normalizedPhone, uid });
            }

            const { token, user } = res.data;

            // Critical check: Only allow if is_admin
            if (user.is_admin !== 1) {
                return { success: false, error: 'Access Denied: Admin only.' };
            }

            return { success: true, token, user };
        } catch (err: any) {
            console.error('Admin verify OTP error:', err);
            return { success: false, error: err.response?.data?.error || err.message || 'Invalid OTP' };
        }
    },

    fetchAdminCreators: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/admin/creators`, { headers: { Authorization: `Bearer ${token}` } });
            set({ adminCreators: res.data });
        } catch (err) { }
    },

    toggleUserAdmin: async (userId) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/admin/creators/toggle-admin`, { user_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchAdminCreators();
            return true;
        } catch (err) { return false; }
    },

    toggleUserBan: async (userId) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.post(`${BASE_URL}/admin/creators/toggle-ban`, { user_id: userId }, { headers: { Authorization: `Bearer ${token}` } });
            get().fetchAdminCreators();
            return true;
        } catch (err) { return false; }
    },

    fetchAdminReels: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/admin/reels`, { headers: { Authorization: `Bearer ${token}` } });
            set({ adminReels: res.data });
        } catch (err) { }
    },

    deleteReelAdmin: async (reelId) => {
        const { token } = get();
        if (!token) return false;
        try {
            await axios.delete(`${BASE_URL}/admin/reels/${reelId}`, { headers: { Authorization: `Bearer ${token}` } });
            set({ adminReels: get().adminReels.filter(r => r.id !== reelId) });
            return true;
        } catch (err) { return false; }
    },

    fetchAdminStats: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await axios.get(`${BASE_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
            set({ adminStats: res.data });
        } catch (err) { }
    },

    searchAllUsers: async (phone) => {
        const { token } = get();
        if (!token) return [];
        try {
            const res = await axios.get(`${BASE_URL}/admin/users/search?phone=${phone}`, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        } catch (err) { return []; }
    },

    fetchUserMessages: async (userId) => {
        const { token } = get();
        if (!token) return [];
        try {
            const res = await axios.get(`${BASE_URL}/admin/messages/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            return res.data;
        } catch (err) { return []; }
    }
}));

export default useAdminStore;
