import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, SafeAreaView, Platform, PanResponder, Animated, AppState, AppStateStatus, Dimensions } from 'react-native';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, RefreshCw, Volume2, VolumeX, ChevronDown, Maximize2 } from 'lucide-react-native';
import useStore from '../store';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';

export default function CallOverlay() {
    const { isCallActive, isCallAccepted, callData, endCall, acceptCall, requestSwitchCallType, acceptSwitchCallType, declineSwitchCallType, isOpponentMuted, isOpponentMutedByMe, toggleCallMute, isVideoTransferring, isCameraPaused, isOpponentCameraPaused, toggleCamera, isCallMinimized, setIsCallMinimized, incomingVideoRequest, setIncomingVideoRequest } = useStore();
    const [timer, setTimer] = useState(0);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<'front' | 'back'>('front');
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [sound, setSound] = useState<Audio.Sound>();

    // PiP Tap & Size Animation Logic
    const pipScale = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(0);
    const tapTimeout = useRef<any>(null);

    const handlePiPTap = () => {
        const now = Date.now();
        if (now - lastTap.current < 1000) {
            // Double Tap -> Restore full screen
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
            setIsCallMinimized(false);
            Animated.timing(pipScale, { toValue: 0, duration: 100, useNativeDriver: false }).start();
        } else {
            // Single Tap -> Expand slightly
            lastTap.current = now;
            Animated.spring(pipScale, { toValue: 1, useNativeDriver: false }).start();

            // Auto shrink after 1.5 seconds if no second tap happens
            if (tapTimeout.current) clearTimeout(tapTimeout.current);
            tapTimeout.current = setTimeout(() => {
                if (Date.now() - lastTap.current >= 1000) {
                    Animated.spring(pipScale, { toValue: 0, useNativeDriver: false }).start();
                }
            }, 1500);
        }
    };

    const pipTransformScale = pipScale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

    // PanResponder for Draggable Floating Window
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
            },
            onPanResponderMove: Animated.event(
                [
                    null,
                    { dx: pan.x, dy: pan.y }
                ],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();

                // Keep within bounds roughly
                const { width, height } = Dimensions.get('window');
                let boundedX = (pan.x as any)._value;
                let boundedY = (pan.y as any)._value;

                // Restrict X bounds (assuming window is ~160px wide)
                if (boundedX < -width + 180) boundedX = -width + 180;
                if (boundedX > 20) boundedX = 20;

                // Restrict Y bounds
                if (boundedY < -20) boundedY = -20;
                if (boundedY > height - 150) boundedY = height - 150;

                Animated.spring(pan, {
                    toValue: { x: boundedX, y: boundedY },
                    useNativeDriver: false,
                    friction: 5
                }).start();
            }
        })
    ).current;

    const isVideo = callData?.callType === 'video';

    useEffect(() => {
        if (isVideo && !isSpeaker) {
            setIsSpeaker(true);
        }
    }, [isVideo]);

    useEffect(() => {
        let interval: any;
        if (isCallActive && isCallAccepted) {
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        } else if (!isCallActive) {
            setTimer(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCallActive, isCallAccepted]);

    useEffect(() => {
        if (isCallActive && isVideo && !permission?.granted) {
            requestPermission();
        }
    }, [isCallActive, isVideo, permission]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState !== 'active' && isCallActive) {
                setIsCallMinimized(true);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isCallActive, setIsCallMinimized]);

    async function playSound() {
        try {
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                allowsRecordingIOS: false,
                playThroughEarpieceAndroid: false,
            });
            const { sound } = await Audio.Sound.createAsync(
                require('../assets/ringtone.wav'),
                { isLooping: true }
            );
            setSound(sound);
            await sound.playAsync();
        } catch (error) {
            console.log('Error playing ringtone', error);
        }
    }

    async function stopSound() {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(undefined);

            // Restore microphone access for the active call
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                playThroughEarpieceAndroid: !isSpeaker,
            });
        }
    }

    useEffect(() => {
        if (isCallActive && !isCallAccepted) {
            playSound();
        } else {
            stopSound();
        }
    }, [isCallActive, isCallAccepted]);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    if (!isCallActive) return null;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFacing = () => {
        setFacing(current => (current === 'front' ? 'back' : 'front'));
    };

    const toggleSpeaker = async () => {
        const newState = !isSpeaker;
        setIsSpeaker(newState);
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                playThroughEarpieceAndroid: !newState,
            });
        } catch (error) {
            console.log("Failed to toggle speaker", error);
        }
    };

    const toggleMute = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        toggleCallMute(newMuteState);
    };

    return (
        <Animated.View
            style={[
                isCallMinimized ? [styles.minimizedContainer, pan.getLayout()] : StyleSheet.absoluteFill,
                { zIndex: 99999, elevation: 99999 }
            ]}
            pointerEvents={isCallMinimized ? 'box-none' : 'auto'}
            {...(isCallMinimized ? panResponder.panHandlers : {})}
        >
            {/* 1. PERSISTENT CAMERA OR AVATAR */}
            <TouchableOpacity
                style={isCallMinimized ? styles.minimizedBubble : StyleSheet.absoluteFill}
                onPress={isCallMinimized ? handlePiPTap : undefined}
                activeOpacity={isCallMinimized ? 0.9 : 1}
                disabled={!isCallMinimized}
            >
                <Animated.View
                    style={[
                        isCallMinimized
                            ? (isVideo && permission?.granted ? [styles.minimizedVideoContainer, { transform: [{ scale: pipTransformScale }] }] : [styles.minimizedAvatarContainer, { transform: [{ scale: pipTransformScale }] }])
                            : styles.cameraContainer
                    ]}
                    renderToHardwareTextureAndroid
                >
                    {isVideo && permission?.granted ? (
                        <>
                            {!isCameraPaused ? (
                                <CameraView style={[StyleSheet.absoluteFill, isCallMinimized && { borderRadius: 12 }]} facing={facing}>
                                    {!isCallMinimized && <View style={styles.cameraOverlay} />}
                                </CameraView>
                            ) : (
                                <View style={[StyleSheet.absoluteFill, styles.pausedContainer, isCallMinimized && { borderRadius: 12 }]}>
                                    <VideoOff size={isCallMinimized ? 24 : 48} color="#94a3b8" />
                                    {!isCallMinimized && <Text style={styles.pausedText}>Camera Paused</Text>}
                                </View>
                            )}
                        </>
                    ) : (
                        isCallMinimized ? (
                            <Text style={styles.minimizedAvatarText}>{callData?.callerName ? callData.callerName.substring(0, 1).toUpperCase() : 'U'}</Text>
                        ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020617' }]} />
                        )
                    )}
                </Animated.View>
            </TouchableOpacity>

            {/* 2. FULL SCREEN UI (Only rendered when maximized) */}
            {!isCallMinimized && (
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    {(isVideo || isVideoTransferring) && permission?.granted ? (
                        <>
                            {isOpponentCameraPaused && isCallAccepted && !isVideoTransferring && (
                                <View style={[StyleSheet.absoluteFill, styles.opponentPausedOverlay]}>
                                    <User size={64} color="#6366f1" />
                                    <Text style={styles.transferringText}>{callData?.callerName} paused their video</Text>
                                </View>
                            )}

                            {isVideoTransferring && (
                                <View style={[StyleSheet.absoluteFill, styles.transferringOverlay]}>
                                    <RefreshCw size={48} color="#fff" style={styles.spinningIcon} />
                                    <Text style={styles.transferringText}>Waiting for {callData?.callerName || 'opponent'}...</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {Platform.OS === 'ios' ? (
                                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                            ) : (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.98)' }]} />
                            )}
                        </>
                    )}

                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.minimizeBtn} onPress={() => setIsCallMinimized(true)}>
                                <ChevronDown size={32} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.status}>
                                    {!isCallAccepted
                                        ? callData?.isIncoming
                                            ? `Incoming ${isVideo ? 'Video' : 'Audio'} Call...`
                                            : `Calling...`
                                        : `Active ${isVideo ? 'Video' : 'Audio'} Call`}
                                </Text>
                                {isCallAccepted && (
                                    <Text style={styles.timer}>{formatTime(timer)}</Text>
                                )}
                            </View>
                        </View>

                        {(!isVideo || !permission?.granted || !isCallAccepted) && (
                            <View style={styles.main}>
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatar}>
                                        <User size={64} color="#6366f1" />
                                    </View>
                                    <View style={styles.pulseContainer}>
                                        <View style={styles.pulse} />
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                                    <Text style={styles.name}>{callData?.callerName || 'Unknown User'}</Text>
                                    {(isOpponentMuted || isOpponentMutedByMe) && <MicOff size={20} color="#ef4444" style={{ marginLeft: 8 }} />}
                                </View>
                                <Text style={styles.subtext}>
                                    {callData?.isIncoming && !isCallAccepted ? 'is calling you' : 'In-App Call'}
                                </Text>
                            </View>
                        )}

                        {isVideo && permission?.granted && isCallAccepted && (
                            <View style={styles.miniInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.miniName}>{callData?.callerName || 'Unknown User'}</Text>
                                    {(isOpponentMuted || isOpponentMutedByMe) && <MicOff size={20} color="#ef4444" style={{ marginLeft: 8 }} />}
                                </View>
                            </View>
                        )}

                        <View style={styles.footer}>
                            {callData?.isIncoming && !isCallAccepted ? (
                                <View style={styles.incomingActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.declineButton]}
                                        onPress={endCall}
                                    >
                                        <PhoneOff size={32} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.acceptButton]}
                                        onPress={acceptCall}
                                    >
                                        {isVideo ? <Video size={32} color="#fff" /> : <Phone size={32} color="#fff" />}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.activeActions}>
                                    <TouchableOpacity style={styles.secondaryAction} onPress={toggleSpeaker}>
                                        {isSpeaker ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color="#fff" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.secondaryAction} onPress={toggleMute}>
                                        {isMuted ? <MicOff size={24} color="#ef4444" /> : <Mic size={24} color="#fff" />}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.declineButton]}
                                        onPress={endCall}
                                    >
                                        <PhoneOff size={32} color="#fff" />
                                    </TouchableOpacity>

                                    {isCallAccepted && (
                                        isVideo ? (
                                            <>
                                                <TouchableOpacity style={styles.secondaryAction} onPress={() => toggleCamera(!isCameraPaused)}>
                                                    {isCameraPaused ? <VideoOff size={24} color="#ef4444" /> : <Video size={24} color="#fff" />}
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.secondaryAction} onPress={toggleFacing}>
                                                    <RefreshCw size={24} color="#fff" />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.secondaryAction, isVideoTransferring && { opacity: 0.5 }]}
                                                onPress={() => !isVideoTransferring && requestSwitchCallType('video')}
                                                disabled={isVideoTransferring}
                                            >
                                                <Video size={24} color="#fff" />
                                            </TouchableOpacity>
                                        )
                                    )}
                                </View>
                            )}
                        </View>

                        {incomingVideoRequest && (
                            <View style={styles.videoRequestOverlay}>
                                <View style={styles.videoRequestBox}>
                                    <Text style={styles.videoRequestTitle}>Video Call Request</Text>
                                    <Text style={styles.videoRequestText}>{callData?.callerName || 'The other person'} wants to switch to Video Call. Accept?</Text>
                                    <View style={styles.videoRequestActions}>
                                        <TouchableOpacity style={styles.videoRequestDecline} onPress={declineSwitchCallType}>
                                            <Text style={styles.videoRequestDeclineText}>DECLINE</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.videoRequestAccept} onPress={() => acceptSwitchCallType('video')}>
                                            <Text style={styles.videoRequestAcceptText}>ACCEPT</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </SafeAreaView>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    transferringOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    cameraContainer: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    pausedContainer: {
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    opponentPausedOverlay: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 4,
    },
    pausedText: {
        color: '#94a3b8',
        fontSize: 16,
        marginTop: 12,
    },
    transferringText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 16,
        fontWeight: '500',
    },
    spinningIcon: {
        // We'll rely on a basic icon here since it's an overlay
    },
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        ...StyleSheet.absoluteFillObject,
    },
    cameraOverlay: {
        flex: 1,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 140,
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 40,
    },
    minimizeBtn: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 10,
        zIndex: 20,
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    status: {
        color: '#6366f1',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    timer: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '700',
        marginTop: 10,
    },
    main: {
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    pulseContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    pulse: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
    },
    name: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
    },
    subtext: {
        color: '#94a3b8',
        fontSize: 16,
        marginTop: 8,
    },
    miniInfo: {
        position: 'absolute',
        top: 150,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    miniName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    footer: {
        marginBottom: 40,
    },
    incomingActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    activeActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    actionButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    acceptButton: {
        backgroundColor: '#10b981',
    },
    declineButton: {
        backgroundColor: '#ef4444',
    },
    secondaryAction: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Minimized UI Styles
    minimizedContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 9999,
        elevation: 9999,
    },
    minimizedBubble: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    minimizedAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#6366f1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    minimizedVideoContainer: {
        width: 100,
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        position: 'relative',
    },
    minimizedAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    videoRequestOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        elevation: 50,
    },
    videoRequestBox: {
        backgroundColor: '#1e293b',
        width: '85%',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    videoRequestTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    videoRequestText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    videoRequestActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        gap: 16,
    },
    videoRequestDecline: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    videoRequestDeclineText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    videoRequestAccept: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    videoRequestAcceptText: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
