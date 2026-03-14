import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store';
import { useNavigate } from 'react-router-dom';
import { LogOut, Send, User, Coins, Settings, Phone, Video, ShieldAlert, MessageCircle, PhoneCall, PhoneOff, Shield, Mic, Square } from 'lucide-react';
import Peer from 'simple-peer';

const ChatDashboard = () => {
    const user = useStore(state => state.user);
    const logout = useStore(state => state.logout);
    const socket = useStore(state => state.socket);
    const messages = useStore(state => state.messages);
    const contacts = useStore(state => state.contacts);
    const fetchContacts = useStore(state => state.fetchContacts);
    const fetchMessages = useStore(state => state.fetchMessages);
    const searchUsers = useStore(state => state.searchUsers);
    const addContact = useStore(state => state.addContact);
    const navigate = useNavigate();

    const [activeContact, setActiveContact] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const earnCoins = useStore(state => state.earnCoins);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // WebRTC State
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerName, setCallerName] = useState('');
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(true);
    const [callType, setCallType] = useState('video'); // video or audio

    // Refs for video elements
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    // Voice Recording State (Premium Feature during calls)
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Standard Chat Voice Recording State
    const [isChatRecording, setIsChatRecording] = useState(false);
    const chatMediaRecorderRef = useRef(null);
    const chatAudioChunksRef = useRef([]);

    // Initial load & Socket signaling setup
    useEffect(() => {
        if (user) {
            fetchContacts();
        }

        if (socket) {
            socket.on('call_user', (data) => {
                setReceivingCall(true);
                setCaller(data.from);
                setCallerName(data.name);
                setCallerSignal(data.signal);
            });
        }
    }, [user, fetchContacts, socket]);

    // Handle Call
    const callUser = async (baseContact, type) => {
        setCallType(type);
        setCallEnded(false);
        setCallAccepted(false);

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
            setStream(currentStream);
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }

            const peer = new Peer({
                initiator: true,
                trickle: false,
                stream: currentStream
            });

            peer.on('signal', (data) => {
                socket.emit('call_user', {
                    userToCall: baseContact.id,
                    signalData: data,
                    from: user.id,
                    name: user.username
                });
            });

            peer.on('stream', (remoteStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                }
            });

            socket.on('call_accepted', (signal) => {
                setCallAccepted(true);
                peer.signal(signal);
            });

            connectionRef.current = peer;
        } catch (err) {
            console.error('Call initialization failed', err);
            setCallEnded(true);
        }
    };

    const answerCall = async () => {
        setCallAccepted(true);
        setCallEnded(false);

        try {
            // we assume video for simplistic answer
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(currentStream);
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }

            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: currentStream
            });

            peer.on('signal', (data) => {
                socket.emit('answer_call', { signal: data, to: caller });
            });

            peer.on('stream', (remoteStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = remoteStream;
                }
            });

            peer.signal(callerSignal);
            connectionRef.current = peer;
        } catch (err) {
            console.error('Failed to answer call', err);
        }
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setReceivingCall(false);
        setCallAccepted(false);
    };

    const toggleRecording = () => {
        if (!isRecording) {
            // Start recording
            if (user.coin_balance < 50) {
                alert("You need at least 50 coins to send a premium voice message!");
                return;
            }

            navigator.mediaDevices.getUserMedia({ audio: true }).then(audioStream => {
                const mediaRecorder = new MediaRecorder(audioStream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                    // We will emit the base64 encoded audio buffer via websocket
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64AudioMessage = reader.result;
                        socket.emit('send_message', {
                            receiverId: activeContact.id,
                            content: base64AudioMessage,
                            type: 'audio' // Indicate it's premium audio
                        });

                        // Deduct coins locally for fast UI update, assuming server will validate
                        useStore.setState((state) => ({
                            user: { ...state.user, coin_balance: state.user.coin_balance - 50 }
                        }));
                    };

                    audioStream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setIsRecording(true);
            }).catch(err => {
                console.error("Microphone access denied for recording", err);
                alert("Microphone access is required to record voice messages.");
            });

        } else {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        }
    };

    const toggleChatRecording = () => {
        if (!isChatRecording) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(audioStream => {
                const mediaRecorder = new MediaRecorder(audioStream);
                chatMediaRecorderRef.current = mediaRecorder;
                chatAudioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chatAudioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(chatAudioChunksRef.current, { type: 'audio/webm' });

                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64AudioMessage = reader.result;
                        socket.emit('send_message', {
                            receiverId: activeContact.id,
                            content: base64AudioMessage,
                            type: 'audio_chat' // Not premium, distinct from 'audio'
                        });
                    };

                    audioStream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setIsChatRecording(true);
            }).catch(err => {
                console.error("Microphone access denied for chat recording", err);
                alert("Microphone access is required to record voice messages.");
            });

        } else {
            if (chatMediaRecorderRef.current && chatMediaRecorderRef.current.state === "recording") {
                chatMediaRecorderRef.current.stop();
            }
            setIsChatRecording(false);
        }
    };

    // When changing contact, fetch their chat history
    useEffect(() => {
        if (activeContact) {
            fetchMessages(activeContact.id);
        }
    }, [activeContact, fetchMessages]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length >= 3) {
            const results = await searchUsers(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleAddContact = async (id) => {
        await addContact(id);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeContact || !socket) return;

        socket.emit('send_message', {
            receiverId: activeContact.id,
            content: messageInput,
            type: 'text'
        });

        setMessageInput('');
    };

    if (!user) return <div className="center-flex" style={{ height: '100vh', color: 'white' }}>Loading Profile...</div>;

    return (
        <div className="app-container" style={{ background: 'var(--bg-darker)' }}>
            {/* Sidebar / Contacts List */}
            <div className="glass" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', zIndex: 10 }}>

                {/* Profile Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="center-flex" style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {user.username}
                                {user.is_admin === 1 && <Shield size={16} color="var(--primary)" title="Admin Status" />}
                            </h3>
                            <button
                                onClick={async () => {
                                    if (isWatchingAd) return;
                                    setIsWatchingAd(true);
                                    setTimeout(async () => {
                                        await earnCoins();
                                        setIsWatchingAd(false);
                                    }, 2000); // Simulate 2-second ad
                                }}
                                disabled={isWatchingAd}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isWatchingAd ? 'var(--text-tertiary)' : 'var(--warning)', fontSize: '0.875rem', marginTop: '0.25rem', background: 'transparent', border: 'none', cursor: isWatchingAd ? 'wait' : 'pointer', padding: 0 }}
                                title="Watch an Ad to Earn Coins"
                            >
                                <Coins size={14} /> {isWatchingAd ? 'Watching Ad...' : `${user.coin_balance} Coins (Earn)`}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {user.is_admin === 1 && (
                            <button className="btn-icon" onClick={() => navigate('/admin')} title="Admin Panel" style={{ color: 'var(--primary)' }}>
                                <Shield size={20} />
                            </button>
                        )}
                        <button className="btn-icon" title="Settings">
                            <Settings size={20} />
                        </button>
                        <button className="btn-icon" onClick={handleLogout} title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Contacts Search */}
                <div style={{ padding: '1rem', position: 'relative' }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Search users by phone..."
                        style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-full)' }}
                        value={searchQuery}
                        onChange={handleSearch}
                    />

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="glass animate-fade-in" style={{ position: 'absolute', top: '100%', left: '1rem', right: '1rem', zIndex: 20, borderRadius: 'var(--radius-md)', padding: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {searchResults.map(res => (
                                <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{res.username}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{res.phone_number}</div>
                                    </div>
                                    <button onClick={() => handleAddContact(res.id)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Add</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contacts List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {contacts.length === 0 && !searchQuery ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            No contacts found. Search by phone number to add someone.
                        </div>
                    ) : null}

                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            onClick={() => setActiveContact(contact)}
                            style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                background: activeContact?.id === contact.id ? 'var(--bg-card-hover)' : 'transparent',
                                transition: 'var(--transition)'
                            }}
                        >
                            <div className="center-flex" style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                                {contact.specific_avatar ? (
                                    <img src={contact.specific_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }} />
                                ) : (
                                    <User size={24} />
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {contact.username}
                                    {contact.bypass_privacy_rules ? <ShieldAlert size={14} color="var(--accent)" title="Premium Privacy Exemption" /> : null}
                                </h4>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{contact.phone_number}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Background glow for aesthetics */}
                <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}></div>

                {activeContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="glass" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="center-flex" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3>{activeContact.username}</h3>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Online</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn-icon" onClick={() => callUser(activeContact, 'audio')} disabled={!callEnded && !callAccepted}>
                                    <Phone size={18} />
                                </button>
                                <button className="btn-icon" onClick={() => callUser(activeContact, 'video')} disabled={!callEnded && !callAccepted}>
                                    <Video size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Call Active UI Overlay */}
                        {(!callEnded || receivingCall) && (
                            <div className="glass-premium animate-fade-in" style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 100, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(15, 23, 42, 0.95)'
                            }}>
                                <h2>{callAccepted ? `In Call with ${activeContact?.username || callerName}` : (receivingCall && !callAccepted ? `Incoming Call from ${callerName}` : 'Calling...')}</h2>

                                <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
                                    {/* Local Video */}
                                    {stream && (
                                        <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px', borderRadius: 'var(--radius-lg)', border: '2px solid var(--primary)' }} />
                                    )}
                                    {/* Remote Video */}
                                    {callAccepted && !callEnded && (
                                        <video playsInline ref={userVideo} autoPlay style={{ width: '300px', borderRadius: 'var(--radius-lg)', border: '2px solid var(--secondary)' }} />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '3rem' }}>
                                    {receivingCall && !callAccepted && (
                                        <button className="btn btn-primary" onClick={answerCall} style={{ background: 'var(--success)', padding: '1rem 2rem' }}>
                                            <PhoneCall size={20} /> Answer
                                        </button>
                                    )}

                                    <button className="btn btn-primary" onClick={leaveCall} style={{ background: 'var(--danger)', padding: '1rem 2rem' }}>
                                        <PhoneOff size={20} /> {receivingCall && !callAccepted ? 'Decline' : 'End Call'}
                                    </button>
                                </div>

                                {/* Premium Action: Voice Message during call */}
                                {callAccepted && !callEnded && (
                                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <p style={{ color: 'var(--warning)', fontSize: '0.875rem' }}><Coins size={12} /> Premium Action: Send Voice Msg (50 Coins)</p>
                                        <button
                                            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                                            onClick={toggleRecording}
                                            style={{
                                                background: isRecording ? 'var(--danger)' : 'var(--accent)',
                                                border: 'none',
                                                padding: '0.75rem 1.5rem',
                                                animation: isRecording ? 'pulse 2s infinite' : 'none'
                                            }}
                                        >
                                            {isRecording ? '■ Stop & Send Voice Msg' : '● Record Voice Msg'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chat History */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1 }}>
                            <div style={{ alignSelf: 'center', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Today
                            </div>

                            {/* Messages Rendered Here */}
                            {(messages[activeContact.id] || []).map((msg, idx) => {
                                const isMine = msg.sender_id === user.id;
                                return (
                                    <div key={idx} className="animate-fade-in" style={{
                                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%',
                                        padding: '0.875rem 1.25rem',
                                        borderRadius: 'var(--radius-lg)',
                                        borderBottomRightRadius: isMine ? '4px' : 'var(--radius-lg)',
                                        borderBottomLeftRadius: !isMine ? '4px' : 'var(--radius-lg)',
                                        background: isMine ? 'linear-gradient(135deg, var(--primary), var(--primary-hover))' : 'var(--bg-card)',
                                        color: isMine ? 'white' : 'var(--text-primary)',
                                        boxShadow: isMine ? '0 4px 14px var(--primary-glow)' : '0 2px 8px rgba(0,0,0,0.2)',
                                    }}>
                                        {msg.type === 'audio' || msg.type === 'audio_chat' ? (
                                            <audio src={msg.content} controls style={{ height: '36px', width: '250px' }} />
                                        ) : (
                                            msg.content
                                        )}
                                        <div style={{ fontSize: '0.65rem', color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)', marginTop: '0.25rem', textAlign: 'right' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat Input */}
                        <div className="glass" style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)' }}>
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={toggleChatRecording}
                                    style={{
                                        color: isChatRecording ? 'var(--danger)' : 'var(--text-secondary)',
                                        animation: isChatRecording ? 'pulse 2s infinite' : 'none',
                                        background: isChatRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                        borderRadius: '50%',
                                        padding: '0.5rem'
                                    }}
                                    title={isChatRecording ? "Stop Recording" : "Record Voice Message"}
                                >
                                    {isChatRecording ? <Square size={20} /> : <Mic size={20} />}
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    className="input-field"
                                    placeholder="Type a message..."
                                    style={{ flex: 1, background: 'var(--bg-dark)' }}
                                />
                                <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', height: '48px', borderRadius: 'var(--radius-full)' }} disabled={!messageInput.trim()}>
                                    <Send size={18} /> Send
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="center-flex" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-tertiary)', gap: '1rem', opacity: 0.6 }}>
                        <MessageCircle size={64} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ fontWeight: 400 }}>Select a contact to start chatting</h2>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ChatDashboard;
