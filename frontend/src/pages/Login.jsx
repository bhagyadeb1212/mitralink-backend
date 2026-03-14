import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store';
import { MessageCircle, Sparkles } from 'lucide-react';

const Login = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const login = useStore(state => state.login);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!phoneNumber) {
            setError('Phone number is required');
            return;
        }

        setLoading(true);
        setError('');

        // Simple basic auth logic for demonstration
        const result = await login(phoneNumber, username);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Failed to login');
            setLoading(false);
        }
    };

    return (
        <div className="center-flex" style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-darker)' }}>
            {/* Background Decorative Rings */}
            <div style={{ position: 'absolute', width: '40rem', height: '40rem', borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', top: '-10rem', right: '-10rem', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', width: '30rem', height: '30rem', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)', bottom: '-5rem', left: '-5rem', zIndex: 0 }}></div>

            <div className="glass animate-slide-up" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: 'var(--radius-lg)', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="center-flex" style={{ width: '64px', height: '64px', margin: '0 auto 1.5rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white' }}>
                        <MessageCircle size={32} />
                    </div>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>NextChat</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Sign in to sync your messages.</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Phone Number / ID</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="+1 234 567 8900"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Username (Optional)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. John Doe"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn btn-premium" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }} disabled={loading}>
                        {loading ? 'Entering...' : (
                            <>
                                Continue to Chat
                                <Sparkles size={18} />
                            </>
                        )}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    By continuing, you verify that you own this device.
                </p>
            </div>
        </div>
    );
}

export default Login;
