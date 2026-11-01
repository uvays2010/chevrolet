import React, { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '../../services/api';

export function AdminGate({ children }) {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    apiRequest('/api/admin/session')
      .then(result => setStatus(result.authenticated ? 'allowed' : 'denied'))
      .catch(() => setStatus('denied'));
  }, []);
  if (status === 'checking') return <div className="admin-gate-loading">Checking administrator access…</div>;
  return status === 'allowed' ? children : <Navigate to="/admin-login" replace />;
}

export function AdminLogin({ notify = () => {} }) {
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await apiRequest('/api/auth/admin', { method: 'POST', body: JSON.stringify({ password }) });
      if (!result?.ok) throw new Error('Admin login failed');
      notify('Server orqali admin tizimiga kirildi');
      navigate('/admin-center', { replace: true });
    } catch (apiError) {
      setError(apiError.status ? apiError.message : 'API serverga ulanib bo‘lmadi. Serverni ishga tushiring.');
    } finally { setBusy(false); }
  };
  return <div className="login-wrap admin-login-wrap"><form className="login-card" onSubmit={submit}>
    <div className="bowtie large">◆</div><div className="eyebrow dark-eye">RESTRICTED AREA</div>
    <h1>Admin <em>access.</em></h1><p>Enterprise boshqaruv paneliga kirish uchun parolni kiriting.</p>
    <label htmlFor="admin-password">Admin paroli</label>
    <div className="admin-password-field"><input id="admin-password" autoFocus required type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Parolni kiriting"/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff/> : <Eye/>}</button></div>
    {error && <div className="admin-login-error" role="alert">{error}</div>}
    <button className="gold-btn full" type="submit" disabled={busy}><LockKeyhole size={16}/> {busy ? 'Tekshirilmoqda…' : 'Admin paneliga kirish'} <ArrowRight size={15}/></button>
    <small><ShieldCheck size={13}/> Admin kirishi server orqali tekshiriladi; sessiya HttpOnly cookie bilan himoyalanadi.</small>
    <Link to="/">← Asosiy sahifaga qaytish</Link>
  </form></div>;
}

export function AdminLogoutButton({ className = '', children = 'Chiqish' }) {
  const navigate = useNavigate();
  return <button className={className} onClick={async () => { try { await apiRequest('/api/auth/logout', { method: 'POST' }); } catch {} navigate('/admin-login', { replace: true }); }}>{children}</button>;
}
