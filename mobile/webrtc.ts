// import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';

// Expo Go Mock
export const mediaDevices: any = {
    getUserMedia: async () => null
};
export class RTCPeerConnection {
    constructor(constraints: any) { }
    addStream() { }
    createOffer() { return { type: 'offer', sdp: '' }; }
    setLocalDescription() { }
    setRemoteDescription() { }
    onicecandidate = null;
    onaddstream = null;
}

export const peerConstraints = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
            ],
        },
    ],
};

export const getMediaStream = async (isVideo: boolean): Promise<any | null> => {
    try {
        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? {
                width: 1280,
                height: 720,
                frameRate: 30,
                facingMode: 'user'
            } : false
        });
        return stream;
    } catch (err) {
        console.error("Error getting media stream", err);
        return null;
    }
};

export const createPeerConnection = () => {
    return new RTCPeerConnection(peerConstraints);
};
