import React, { useState } from 'react';
import useStore from '../store';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Coins, CheckCircle, AlertCircle } from 'lucide-react';

const AdminPanel = () => {
    const user = useStore(state => state.user);
    const token = useStore(state => state.token);
    const navigate = useNavigate();

    // Use a consistent API URL (In a real app, this should come from an environment variable)
    const API_URL = 'http://localhost:4000';

    const [targetUserId, setTargetUserId] = useState('');
    const [coinAmount, setCoinAmount] = useState('');
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

    // Hard redirect if not admin
    if (!user || user.is_admin === 0) {
        return (
            <div className="app-container center-flex" style={{ flexDirection: 'column', gap: '1rem', background: 'var(--bg-darker)' }}>
                <Shield size={64} color="var(--danger)" />
                <h2 style={{ color: 'white' }}>Unauthorized Access</h2>
                <p style={{ color: 'var(--text-tertiary)' }}>You must be an administrator to view this page.</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    <ArrowLeft size={18} /> Return to Dashboard
                </button>
            </div>
        );
    }

    const handleGrantCoins = async (e) => {
        e.preventDefault();
        setStatus(null);

        if (!targetUserId || !coinAmount) return;

        try {
            const res = await fetch(`${API_URL}/admin/add-coins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ user_id: parseInt(targetUserId), amount: parseInt(coinAmount) })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: data.message });
                setTargetUserId('');
                setCoinAmount('');
            } else {
                setStatus({ type: 'error', message: data.error });
            }
        } catch (err) {
            setStatus({ type: 'error', message: 'Network error granting coins.' });
        }
    };

    return (
        <div className="app-container" style={{ background: 'var(--bg-darker)', padding: '2rem' }}>
            <div className="glass" style={{ maxWidth: '600px', width: '100%', margin: '0 auto', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <Shield size={32} color="var(--primary)" />
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Admin Control Panel</h1>
                        <p style={{ color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>Manage global users and settings</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid var(--border)' }}>
                        <ArrowLeft size={18} /> Back
                    </button>
                </div>

                <div className="glass-premium" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(30, 41, 59, 0.5)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Coins size={20} color="var(--warning)" /> Grant Coins to User
                    </h3>

                    {status && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${status.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                            color: status.type === 'success' ? 'var(--success)' : 'var(--danger)'
                        }}>
                            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            {status.message}
                        </div>
                    )}

                    <form onSubmit={handleGrantCoins} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Target User ID</label>
                            <input
                                type="number"
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                className="input-field"
                                placeholder="e.g. 2"
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Coin Amount</label>
                            <input
                                type="number"
                                value={coinAmount}
                                onChange={(e) => setCoinAmount(e.target.value)}
                                className="input-field"
                                placeholder="e.g. 500"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            <Coins size={18} /> Issue Grant
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
