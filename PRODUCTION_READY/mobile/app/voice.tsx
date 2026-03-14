import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, SafeAreaView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { X, Mic, MicOff } from 'lucide-react-native';
import useStore from '../store';

export default function VoiceAssistantScreen() {
    const { socket, user, contacts } = useStore();
    const router = useRouter();
    const [isRecording, setIsRecording] = useState(false);
    const [aiState, setAiState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const recordingInstanceRef = useRef<Audio.Recording | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const silenceTimeoutRef = useRef<any>(null);
    const audioLevelRef = useRef<number>(-160);
    const [currentDb, setCurrentDb] = useState<number>(-160);
    const [transcript, setTranscript] = useState('Hi there! Tap the orb and start talking.');

    // Animation values
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const aiContact = contacts.find(c => c.phone_number === 'AI' || c.username === 'AI Assistant');

    useEffect(() => {
        console.log("VOICE MOUNTED. All Contact Usernames:", contacts.map(c => c.username));
        console.log("DID WE FIND AI?", !!aiContact);
        // Handle incoming messages from AI Assistant
        if (socket) {
            const handleMessage = async (data: any) => {
                if (data.sender_id === aiContact?.id) {
                    if (data.type === 'audio') {
                        setAiState('speaking');
                        setTranscript("Playing response...");
                        // Play the audio
                        try {
                            await Audio.setAudioModeAsync({
                                allowsRecordingIOS: false,
                                playsInSilentModeIOS: true,
                                staysActiveInBackground: true,
                            });
                            const { sound } = await Audio.Sound.createAsync(
                                { uri: data.content },
                                { shouldPlay: true }
                            );
                            sound.setOnPlaybackStatusUpdate((status) => {
                                if (status.isLoaded && status.didJustFinish) {
                                    setAiState('idle');
                                    setTranscript("Tap to talk again.");
                                }
                            });
                        } catch (error) {
                            console.error("Failed to play AI audio:", error);
                            setAiState('idle');
                        }
                    } else {
                        setAiState('idle');
                        setTranscript(data.content);
                    }
                }
            };

            socket.on('receive_message', handleMessage);
            return () => {
                socket.off('receive_message', handleMessage);
            };
        }
    }, [socket, aiContact]);

    // Animations based on state
    useEffect(() => {
        if (aiState === 'listening') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else if (aiState === 'thinking') {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true
                })
            ).start();
        } else if (aiState === 'speaking') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.9, duration: 400, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
        }
    }, [aiState]);

    const startRecording = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                setTranscript("Microphone permission denied.");
                setIsProcessing(false);
                return;
            }

            // Explicitly set the audio mode for recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
            });

            // CRITICAL: Cleanup any previous instance explicitly
            if (recordingInstanceRef.current) {
                try {
                    await recordingInstanceRef.current.stopAndUnloadAsync();
                } catch (e) { }
                recordingInstanceRef.current = null;
            }

            const options = {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                isMeteringEnabled: true,
            };

            const { recording: newRecording } = await Audio.Recording.createAsync(options);
            recordingInstanceRef.current = newRecording;

            newRecording.setProgressUpdateInterval(100);

            // Enable metering to detect DB levels strictly into the REF so it never triggers infinite React renders
            newRecording.setOnRecordingStatusUpdate((status) => {
                if (status.isRecording && status.metering !== undefined) {
                    audioLevelRef.current = status.metering;
                }
            });

            setIsRecording(true);
            setAiState('listening');
            setTranscript("I'm listening...");
        } catch (err) {
            console.error('Failed to start recording', err);
            setTranscript("Failed to start mic.");
        } finally {
            setIsProcessing(false);
        }
    };

    const stopRecordingRef = useRef<() => void>(async () => { });

    stopRecordingRef.current = async () => {
        if (!recordingInstanceRef.current || isProcessing) return;

        setIsProcessing(true);
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }

        setAiState('thinking');
        setTranscript("Thinking...");
        setIsRecording(false);

        const currentRecording = recordingInstanceRef.current;
        recordingInstanceRef.current = null; // Clear it immediately to prevent overlaps

        try {
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();

            if (uri && socket && aiContact) {
                const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

                // Send as audio_chat so the backend Whisper transcriber catches it
                socket.emit('send_message', {
                    receiverId: aiContact.id,
                    content: `data:audio/m4a;base64,${base64Audio}`,
                    type: 'audio_chat'
                });
            } else {
                setAiState('idle');
                setTranscript("Tap the orb to start speaking.");
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            setAiState('idle');
            setTranscript("Failed to process audio.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Separate VAD Monitor Loop that safely reads the REF without staleness
    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => {
                const level = audioLevelRef.current;
                setCurrentDb(level);

                if (level > -45) {
                    // User is speaking! Reset the silence timer
                    if (silenceTimeoutRef.current) {
                        clearTimeout(silenceTimeoutRef.current);
                        silenceTimeoutRef.current = null;
                    }
                } else if (level <= -45 && !silenceTimeoutRef.current) {
                    // User has stopped speaking. Start a 1.5 second silence timer
                    silenceTimeoutRef.current = setTimeout(() => {
                        stopRecordingRef.current();
                    }, 1200); // 1.2 seconds of silence is more responsive
                }
            }, 100);
        } else {
            if (interval) clearInterval(interval);
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
        }
        return () => {
            if (interval) clearInterval(interval);
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, [isRecording]);

    const stopRecording = () => stopRecordingRef.current();

    const toggleVoice = () => {
        if (isProcessing) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recordingInstanceRef.current) {
                recordingInstanceRef.current.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <X color="#fff" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Main Content */}
            <View style={styles.mainArea}>

                {/* Visualizer / Orb */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={toggleVoice}
                    style={styles.orbContainer}
                >
                    <Animated.View style={[
                        styles.orbGlow,
                        { transform: [{ scale: pulseAnim }, { rotate: spin }] }
                    ]} />
                    <View style={styles.orbCenter}>
                        {aiState === 'listening' ? (
                            <Mic size={40} color="#fff" />
                        ) : aiState === 'thinking' ? (
                            <View style={styles.thinkingDot} />
                        ) : (
                            <MicOff size={40} color="#fff" />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Status / Transcript Text */}
                <Text style={styles.statusText}>{transcript}</Text>

                {/* Instructions */}
                {aiState === 'idle' && (
                    <Text style={styles.subText}>Tap the orb to start speaking.</Text>
                )}

                {/* Debug Meter */}
                {aiState === 'listening' && (
                    <Text style={[styles.subText, { marginTop: 20, color: '#f59e0b' }]}>
                        Mic Level: {currentDb.toFixed(1)} dB
                    </Text>
                )}
            </View>
        </SafeAreaView>
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
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    mainArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    orbContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
    },
    orbGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 100,
        backgroundColor: '#6366f1',
        opacity: 0.4,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
        elevation: 10,
    },
    orbCenter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    thinkingDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    statusText: {
        color: '#f8fafc',
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 32,
    },
    subText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
    }
});
