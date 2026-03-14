import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import useStore from '../store';
import { Smartphone, ShieldCheck, User, ArrowRight, ChevronLeft, Search, MessageCircle } from 'lucide-react-native';
import { countries, Country } from '../constants/countries';
import { OtplessModule } from 'otpless-react-native';

export default function LoginScreen() {
    const { requestOtp, verifyOtp, updateProfile, setAuth, loginWithOtpless, testLogin } = useStore();
    const router = useRouter();

    const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Name
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<Country>(
        countries.find(c => c.code === '+91') || countries[0] // Default to India or first in list
    );
    const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [receivedOtp, setReceivedOtp] = useState('');
    const [tempAuth, setTempAuth] = useState<{ token: string, user: any } | null>(null);

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery)
    );

    useEffect(() => {
        // Initialize OTPless
        OtplessModule.showOtplessLoginPage((event) => {
          if (event && event.token) {
            handleOtplessLogin(event.token);
          }
        });

        // Event listener for OTPless callbacks
        const listener = (event: any) => {
            console.log("OTPless event:", event);
            if (event && event.token) {
                handleOtplessLogin(event.token);
            }
        };

        // For newer versions of the SDK, you might use different methods
        // but showOtplessLoginPage callback is common.
        
        return () => {
            // Clean up if necessary
        };
    }, []);

    const handleOtplessLogin = async (token: string) => {
        setIsLoading(true);
        const result = await loginWithOtpless(token);
        setIsLoading(false);

        if (result.success && result.token && result.user) {
            setTempAuth({ token: result.token, user: result.user });
            if (result.user.username) {
                setUsername(result.user.username);
                // If user already has a name, finish setup automatically
                await setAuth(result.token, result.user);
                router.replace('/(tabs)');
            } else {
                setStep(3); // Go to name step for new users
            }
        } else {
            Alert.alert('Login Failed', result.error || 'Something went wrong with OTPless');
        }
    };

    const handleRequestOtp = async () => {
        if (!phoneNumber || phoneNumber.length < 5) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        const fullPhone = `${selectedCountry.code}${phoneNumber}`;
        setIsLoading(true);
        
        // Skip OTP for testing - Direct Login
        const result = await testLogin(fullPhone);
        setIsLoading(false);

        if (result.success && result.token && result.user) {
            setTempAuth({ token: result.token, user: result.user });
            
            // Pre-fill username if exists
            if (result.user.username) {
                setUsername(result.user.username);
                // If they have a username, just go to home
                await setAuth(result.token, result.user);
                router.replace('/(tabs)');
            } else {
                setStep(3); // Go to name step for new users
            }
        } else {
            Alert.alert('Error', result.error || 'Test Login Failed');
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length < 6) {
            Alert.alert('Error', 'Please enter a 6-digit OTP');
            return;
        }

        const fullPhone = `${selectedCountry.code}${phoneNumber}`;
        setIsLoading(true);
        const result = await verifyOtp(fullPhone, otp);
        setIsLoading(false);

        if (result.success && result.token && result.user) {
            setTempAuth({ token: result.token, user: result.user });
            // Pre-fill username if exists
            if (result.user.username) {
                setUsername(result.user.username);
            }
            setStep(3);
        } else {
            Alert.alert('Error', result.error || 'Invalid OTP');
        }
    };

    const handleSetProfile = async () => {
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter something for your profile name');
            return;
        }

        if (!tempAuth) return;

        setIsLoading(true);
        const success = await updateProfile(username.trim(), tempAuth.token);
        setIsLoading(false);

        if (success) {
            const updatedUser = { ...tempAuth.user, username: username.trim() };
            await setAuth(tempAuth.token, updatedUser);
            router.replace('/(tabs)');
        } else {
            Alert.alert('Error', 'Failed to update profile. Redirecting anyway...');
            await setAuth(tempAuth.token, tempAuth.user);
            router.replace('/(tabs)');
        }
    };

    const reset = () => {
        if (step === 3) {
            setStep(2);
        } else {
            setStep(1);
            setOtp('');
            setReceivedOtp('');
            setTempAuth(null);
        }
    };

    const renderCountryItem = ({ item }: { item: Country }) => (
        <TouchableOpacity
            style={styles.countryItem}
            onPress={() => {
                setSelectedCountry(item);
                setIsCountryModalVisible(false);
                setSearchQuery('');
            }}
        >
            <Text style={styles.countryFlag}>{item.flag}</Text>
            <Text style={styles.countryName}>{item.name}</Text>
            <Text style={styles.countryCode}>{item.code}</Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.glass}>
                {step > 1 && (
                    <TouchableOpacity onPress={reset} style={styles.backButton}>
                        <ChevronLeft size={24} color="#94a3b8" />
                    </TouchableOpacity>
                )}

                <Text style={styles.title}>
                    {step === 1 && "MitraLink"}
                    {step === 2 && "Verification"}
                    {step === 3 && "Profile Name"}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 1 && "Enter your phone number to continue"}
                    {step === 2 && `Enter the 6-digit code sent to ${selectedCountry.code}${phoneNumber}`}
                    {step === 3 && "Type anything for your profile name"}
                </Text>

                {step === 1 && (
                    <View style={styles.inputGroup}>
                        <TouchableOpacity
                            style={styles.countrySelector}
                            onPress={() => setIsCountryModalVisible(true)}
                        >
                            <Text style={styles.selectedFlag}>{selectedCountry.flag}</Text>
                            <Text style={styles.selectedCode}>{selectedCountry.code}</Text>
                        </TouchableOpacity>

                        <View style={[styles.inputContainer, { flex: 1, marginBottom: 0 }]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                placeholderTextColor="#64748b"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <View style={styles.inputContainer}>
                            <ShieldCheck size={20} color="#94a3b8" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="6-digit OTP"
                                placeholderTextColor="#64748b"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                        {receivedOtp !== '' && (
                            <Text style={styles.devOtp}>Dev Note: OTP is {receivedOtp}</Text>
                        )}
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.inputContainer}>
                        <User size={20} color="#94a3b8" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Type anything..."
                            placeholderTextColor="#64748b"
                            value={username}
                            onChangeText={setUsername}
                            autoFocus
                        />
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={
                        step === 1 ? handleRequestOtp :
                            step === 2 ? handleVerifyOtp :
                                handleSetProfile
                    }
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>
                                {step === 1 && "Login"}
                                {step === 2 && "Verify Code"}
                                {step === 3 && "Finish Setup"}
                            </Text>
                            <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>

                {step === 1 && (
                    <TouchableOpacity
                        style={[styles.whatsappButton, isLoading && styles.buttonDisabled]}
                        onPress={() => {
                            // This opens the OTPless login page
                            OtplessModule.showOtplessLoginPage((event) => {
                                if (event && event.token) {
                                    handleOtplessLogin(event.token);
                                }
                            });
                        }}
                        disabled={isLoading}
                    >
                        <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Login with WhatsApp</Text>
                    </TouchableOpacity>
                )}

                {step === 1 && __DEV__ && (
                    <View style={styles.devButtonsContainer}>
                        <Text style={styles.devLabel}>Dev Shortcuts:</Text>
                        <View style={styles.devButtonsRow}>
                            <TouchableOpacity style={styles.devButton} onPress={() => { setPhoneNumber('111'); setSelectedCountry(countries.find(c => c.code === '+91')!); }}>
                                <Text style={styles.devButtonText}>Kanika</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.devButton} onPress={() => { setPhoneNumber('222'); setSelectedCountry(countries.find(c => c.code === '+91')!); }}>
                                <Text style={styles.devButtonText}>Bhagya</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.devButton} onPress={() => { setPhoneNumber('333'); setSelectedCountry(countries.find(c => c.code === '+91')!); }}>
                                <Text style={styles.devButtonText}>Ppp</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <Modal
                visible={isCountryModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCountryModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Country</Text>
                            <TouchableOpacity onPress={() => setIsCountryModalVisible(false)}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Search size={18} color="#94a3b8" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search country or code"
                                placeholderTextColor="#64748b"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={false}
                            />
                        </View>

                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.name + item.code}
                            renderItem={renderCountryItem}
                            style={styles.countryList}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        padding: 20,
    },
    glass: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
        marginTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 32,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    countrySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectedFlag: {
        fontSize: 20,
        marginRight: 8,
    },
    selectedCode: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        marginBottom: 20,
        paddingHorizontal: 16,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#ffffff',
        fontSize: 18,
    },
    button: {
        backgroundColor: '#0062E3',
        borderRadius: 16,
        height: 60,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#0062E3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    whatsappButton: {
        backgroundColor: '#25D366',
        borderRadius: 16,
        height: 60,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    devOtp: {
        color: '#0062E3',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
        fontWeight: 'bold',
    },
    devButtonsContainer: {
        marginTop: 30,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    devLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 10,
        textAlign: 'center',
    },
    devButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    devButton: {
        flex: 1,
        backgroundColor: 'rgba(0, 98, 227, 0.2)',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 98, 227, 0.4)',
        alignItems: 'center',
    },
    devButtonText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '500',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '700',
    },
    closeText: {
        color: '#0062E3',
        fontSize: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
    },
    countryList: {
        flex: 1,
    },
    countryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    countryFlag: {
        fontSize: 24,
        marginRight: 16,
    },
    countryName: {
        flex: 1,
        color: '#ffffff',
        fontSize: 16,
    },
    countryCode: {
        color: '#94a3b8',
        fontSize: 16,
    }
});
