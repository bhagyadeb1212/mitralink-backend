import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Platform, Alert, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Square, X, Phone } from 'lucide-react-native';
import useStore from '../store';

// Full Mock for Expo Go compatibility
const CallKeep = {
    setup: async (...args: any[]) => true,
    addEventListener: (...args: any[]) => { },
    removeEventListener: (...args: any[]) => { },
    displayIncomingCall: (...args: any[]) => { },
    startCall: (...args: any[]) => { },
    endCall: (...args: any[]) => { },
};

const options = {
    ios: {
        appName: 'ChatApp',
    },
    android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This application needs to access your phone accounts',
        cancelButton: 'Cancel',
        okButton: 'ok',
        imageName: 'phone_account_icon',
        additionalPermissions: ['READ_CONTACTS'],
    }
};

export default function CallManager() {
    const { setIsCallActive } = useStore();

    useEffect(() => {
        const setupCallKeep = async () => {
            try {
                if (CallKeep && typeof CallKeep.setup === 'function') {
                    await CallKeep.setup(options);
                    CallKeep.addEventListener('didReceiveStartCallAction', () => setIsCallActive(true));
                    CallKeep.addEventListener('endCall', () => setIsCallActive(false));
                }
            } catch (err) {
                console.warn('CallKeep Setup error:', err);
            }
        };
        setupCallKeep();
    }, []);

    return null; // No UI here anymore
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 64,
        height: 64,
        backgroundColor: '#6366f1',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: '#1e293b',
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        color: '#fbbf24',
        fontSize: 14,
        marginTop: 4,
    },
    searchInput: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    contactList: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    contactItem: {
        alignItems: 'center',
        width: 70,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    contactName: {
        color: '#94a3b8',
        fontSize: 12,
        textAlign: 'center',
    },
    noContacts: {
        color: '#64748b',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        width: '100%',
    },
    selectedContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    sendingTo: {
        color: '#fff',
        fontSize: 16,
    },
    bold: {
        fontWeight: '700',
        color: '#818cf8',
    },
    changeLink: {
        color: '#6366f1',
        fontWeight: '600',
    },
    recordButton: {
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        borderRadius: 20,
        gap: 12,
    },
    recording: {
        backgroundColor: '#ef4444',
    },
    recordText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
