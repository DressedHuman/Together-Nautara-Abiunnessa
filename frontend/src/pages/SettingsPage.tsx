import { useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { signedIn } from '../features/auth/authSlice';
import { authService } from '../services';
import { parseError } from '../lib/api';
import { Alert, Button, PageHeader, PasswordInput } from '../components/ui';
import { formatDate } from '../lib/utils';

export default function SettingsPage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user)!;
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        const found: Record<string, string> = {};
        if (!current) found.current_password = 'Enter your current password.';
        if (next.length < 8) found.new_password = 'Use at least 8 characters.';
        if (next !== confirm) found.confirm = 'Passwords do not match.';
        setErrors(found);
        if (Object.keys(found).length) return;
        setSaving(true);
        try {
            dispatch(signedIn(await authService.changePassword(current, next)));
            setCurrent(''); setNext(''); setConfirm('');
            setMessage({ type: 'success', text: 'Password changed. Other devices have been signed out.' });
        } catch (err) {
            const parsed = parseError(err);
            setErrors(parsed.fields);
            setMessage({ type: 'error', text: parsed.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <PageHeader eyebrow="Account" title="Settings" />

            <section className="card p-6 sm:p-8">
                <h2 className="font-sans text-lg font-semibold">Sign-in details</h2>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                    <div><dt className="text-muted">Email</dt><dd className="mt-1 break-all font-medium">{user.email}</dd></div>
                    <div><dt className="text-muted">Phone</dt><dd className="mt-1 font-medium">{user.phone}</dd></div>
                    <div><dt className="text-muted">Member since</dt><dd className="mt-1 font-medium">{formatDate(user.created_at)}</dd></div>
                </dl>
                <p className="mt-5 text-xs text-muted">To change your email or phone, contact the alumni committee.</p>
            </section>

            <form onSubmit={submit} noValidate className="card mt-6 space-y-5 p-6 sm:p-8">
                <h2 className="font-sans text-lg font-semibold">Change password</h2>
                {message && <Alert type={message.type}>{message.text}</Alert>}
                <PasswordInput label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current_password} />
                <div className="grid gap-5 sm:grid-cols-2">
                    <PasswordInput label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.new_password} />
                    <PasswordInput label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" loading={saving}>Update password</Button>
                </div>
            </form>
        </div>
    );
}
