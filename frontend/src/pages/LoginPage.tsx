import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useRedux';
import { signedIn } from '../features/auth/authSlice';
import { authService } from '../services';
import { parseError } from '../lib/api';
import AuthShell from '../components/layout/AuthShell';
import { Alert, Button, Input, PasswordInput } from '../components/ui';
import { cx } from '../lib/utils';

export default function LoginPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [method, setMethod] = useState<'email' | 'phone'>('email');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const notice = (location.state as { notice?: string } | null)?.notice;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!identifier.trim() || !password) {
            setError(`Enter your ${method} and password.`);
            return;
        }
        setLoading(true);
        try {
            const data = method === 'email'
                ? await authService.loginEmail(identifier.trim(), password)
                : await authService.loginPhone(identifier.trim(), password);
            dispatch(signedIn(data));
        } catch (err) {
            const { message, data } = parseError(err);
            if (data.code === 'unverified') {
                navigate('/verify', { state: { email: data.email, sent: true } });
                return;
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to update your profile and connect with your batchmates."
            footer={<>New here? <Link to="/register" className="link">Create an account</Link></>}
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                {notice && <Alert type="success">{notice}</Alert>}
                {error && <Alert type="error">{error}</Alert>}

                <div className="grid grid-cols-2 rounded-xl bg-ink-50 p-1 text-sm font-medium" role="tablist" aria-label="Sign in with">
                    {(['email', 'phone'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            role="tab"
                            aria-selected={method === m}
                            onClick={() => { setMethod(m); setIdentifier(''); setError(''); }}
                            className={cx('rounded-lg py-2 transition', method === m ? 'bg-white text-ink-950 shadow-sm' : 'text-muted hover:text-ink-900')}
                        >
                            {m === 'email' ? 'Email' : 'Phone'}
                        </button>
                    ))}
                </div>

                {method === 'email' ? (
                    <Input label="Email" type="email" autoComplete="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" autoFocus />
                ) : (
                    <Input label="Phone number" type="tel" autoComplete="tel" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="01XXXXXXXXX" autoFocus />
                )}
                <div>
                    <PasswordInput label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="mt-2 text-right">
                        <Link to="/forgot-password" className="text-sm text-muted hover:text-ink-900">Forgot password?</Link>
                    </div>
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
            </form>
        </AuthShell>
    );
}
