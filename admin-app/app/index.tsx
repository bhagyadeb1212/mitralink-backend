import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Smartphone, Key } from 'lucide-react-native';
import useAdminStore from '../store';

export default function AdminLogin() {
    const router = useRouter();
    const { requestOtp, verifyOtp, setAuth } = useAdminStore();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async () => {
        if (!phone) return Alert.alert('Error', 'Please enter your phone number');
        setLoading(true);
        const res = await requestOtp(phone);
        setLoading(false);
        if (res.success) {
            setStep(2);
            if (res.otp) Alert.alert('Demo OTP', `Your OTP is: ${res.otp}`);
        } else {
            Alert.alert('Error', res.error);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) return Alert.alert('Error', 'Please enter the OTP');
        setLoading(true);
        const res = await verifyOtp(phone, otp);
        setLoading(false);

        if (res.success && res.token && res.user) {
            await setAuth(res.token, res.user);
            router.replace('/(tabs)');
        } else {
            Alert.alert('Access Denied', res.error || 'Login failed');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Shield size={48} color="#0062E3" />
                    </View>
                    <Text style={styles.title}>MitraLink Admin</Text>
                    <Text style={styles.subtitle}>Secure Oversight Hub</Text>
                </View>

                {step === 1 ? (
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Smartphone size={20} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Admin Phone Number"
                                placeholderTextColor="#64748b"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRequestOtp}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Access Code</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Key size={20} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-Digit Code"
                                placeholderTextColor="#64748b"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={otp}
                                onChangeText={setOtp}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Enter</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Wrong number? Go back</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 56,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#0062E3',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0062E3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#94a3b8',
        fontSize: 14,
    }
});
