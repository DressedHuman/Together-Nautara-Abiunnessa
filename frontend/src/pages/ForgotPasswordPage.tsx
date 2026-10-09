import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { parseError } from '../lib/api';
import AuthShell from '../components/layout/AuthShell';
import { Alert, Button, Input, PasswordInput } from '../components/ui';
import { CodeInput, ResendButton } from '../components/ui/CodeInput';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [fields, setFields] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const requestCode = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError('Enter the email you registered with.');
            return;
        }
        setLoading(true);
        try {
            await authService.requestReset(email.trim());
            setStep('reset');
        } catch (err) {
            setError(parseError(err).message);
        } finally {
            setLoading(false);
        }
    };

    const reset = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setFields({});
        if (code.length !== 6) return setError('Enter the 6-digit code from the email.');
        if (password.length < 8) return setFields({ new_password: 'Use at least 8 characters.' });
        setLoading(true);
        try {
            await authService.confirmReset(email.trim(), code, password);
            navigate('/login', { state: { notice: 'Password updated. Sign in with your new password.' } });
        } catch (err) {
            const parsed = parseError(err);
            setFields(parsed.fields);
            setError(parsed.fields.new_password ? '' : parsed.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={step === 'email' ? 'Reset your password' : 'Choose a new password'}
            subtitle={step === 'email'
                ? 'We’ll email you a 6-digit code.'
                : <>If <strong className="text-ink-900">{email}</strong> has an account, a code is on its way. It expires in 10 minutes.</>}
            footer={<Link to="/login" className="link">Back to sign in</Link>}
        >
            {step === 'email' ? (
                <form onSubmit={requestCode} className="space-y-5" noValidate>
                    {error && <Alert type="error">{error}</Alert>}
                    <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                    <Button type="submit" loading={loading} className="w-full" size="lg">Send code</Button>
                </form>
            ) : (
                <form onSubmit={reset} className="space-y-5" noValidate>
                    {error && <Alert type="error">{error}</Alert>}
                    <CodeInput value={code} onChange={setCode} />
                    <PasswordInput label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.new_password} hint="At least 8 characters, not only numbers." />
                    <Button type="submit" loading={loading} className="w-full" size="lg">Update password</Button>
                    <div className="text-center">
                        <ResendButton onResend={async () => { await authService.requestReset(email.trim()); }} />
                    </div>
                </form>
            )}
        </AuthShell>
    );
}
