import { create } from 'zustand';
import { io } from 'socket.io-client';

// Use the local proxy defined in vite.config.js
const API_URL = '/api';

const useStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('chat_token') || null,
    socket: null,
    contacts: [],
    messages: {}, // Map of contactId -> array of messages
    isPremium: false,

    // Auth actions
    login: async (phoneNumber, username) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber, username })
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            localStorage.setItem('chat_token', data.token);
            set({ user: data.user, token: data.token });
            get().connectSocket(data.token);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    logout: () => {
        localStorage.removeItem('chat_token');
        const { socket } = get();
        if (socket) socket.disconnect();
        set({ user: null, token: null, socket: null });
    },

    // Socket actions
    connectSocket: (token) => {
        // Use relative path for socket.io to work through the Vite proxy
        const socket = io('/', {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        socket.on('receive_message', (msg) => {
            set((state) => {
                const currentUser = state.user;
                if (!currentUser) return state;

                // Determine which contact thread this message belongs to
                const contactId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;

                const currentMessages = state.messages[contactId] || [];
                return {
                    messages: {
                        ...state.messages,
                        [contactId]: [...currentMessages, msg]
                    }
                };
            });
        });

        set({ socket });
    },

    fetchUserProfile: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                set({ user });
            } else {
                get().logout();
            }
        } catch (err) {
            console.error('Fetch profile err:', err);
        }
    },

    fetchContacts: async () => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/contacts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const contacts = await res.json();
                set({ contacts });
            }
        } catch (err) {
            console.error('Fetch contacts err:', err);
        }
    },

    searchUsers: async (phone) => {
        if (!phone) return [];
        const { token } = get();
        try {
            const res = await fetch(`${API_URL}/users/search?phone=${encodeURIComponent(phone)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                return await res.json();
            }
            return [];
        } catch (err) {
            console.error(err);
            return [];
        }
    },

    addContact: async (contactId) => {
        const { token } = get();
        if (!token) return { success: false };
        try {
            const res = await fetch(`${API_URL}/contacts/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ contact_id: contactId })
            });
            if (res.ok) {
                get().fetchContacts();
                return await res.json();
            }
            return { success: false };
        } catch (err) {
            console.error(err);
            return { success: false };
        }
    },

    fetchMessages: async (contactId) => {
        const { token } = get();
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/messages/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const fetchedMessages = await res.json();
                set((state) => ({
                    messages: {
                        ...state.messages,
                        [contactId]: fetchedMessages
                    }
                }));
            }
        } catch (err) {
            console.error('Fetch msgs err:', err);
        }
    },

    earnCoins: async () => {
        const { token } = get();
        if (!token) return { success: false };
        try {
            const res = await fetch(`${API_URL}/coins/claim-ad`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                get().fetchUserProfile(); // Refresh balance
                return data;
            }
            return { success: false };
        } catch (err) {
            console.error(err);
            return { success: false };
        }
    }
}));

export default useStore;
