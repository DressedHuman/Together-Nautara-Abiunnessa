import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useRedux';
import { signedIn } from '../features/auth/authSlice';
import { authService } from '../services';
import { parseError } from '../lib/api';
import AuthShell from '../components/layout/AuthShell';
import { Alert, Button, Input } from '../components/ui';
import { CodeInput, ResendButton } from '../components/ui/CodeInput';

export default function VerifyPage() {
    const dispatch = useAppDispatch();
    const state = useLocation().state as { email?: string; sent?: boolean } | null;
    const [email, setEmail] = useState(state?.email ?? '');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState(state?.sent ? `We sent a 6-digit code to ${state.email}. It expires in 10 minutes.` : '');
    const [loading, setLoading] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (code.length !== 6) {
            setError('Enter all 6 digits.');
            return;
        }
        setLoading(true);
        try {
            dispatch(signedIn(await authService.verifyOtp(email.trim(), code)));
        } catch (err) {
            setError(parseError(err).message);
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setError('');
        try {
            await authService.requestOtp(email.trim());
            setInfo(`If ${email.trim()} has an unverified account, a new code is on its way.`);
        } catch (err) {
            setError(parseError(err).message);
        }
    };

    return (
        <AuthShell
            title="Check your email"
            subtitle="Enter the code we emailed you to confirm the address is yours. Look in spam if it hasn't arrived."
            footer={<>Wrong address? <Link to="/register" className="link">Register again</Link></>}
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                {info && !error && <Alert type="info">{info}</Alert>}
                {error && <Alert type="error">{error}</Alert>}
                {!state?.email && (
                    <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                )}
                <CodeInput value={code} onChange={setCode} />
                <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!email}>
                    Verify and continue
                </Button>
                <div className="text-center">
                    <ResendButton onResend={resend} initialWait={state?.sent ? 60 : 0} />
                </div>
            </form>
        </AuthShell>
    );
}
