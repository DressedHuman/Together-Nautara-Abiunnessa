import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { parseError } from '../lib/api';
import AuthShell from '../components/layout/AuthShell';
import { Alert, Button, Input, PasswordInput } from '../components/ui';

const EMPTY = { email: '', phone: '', password: '', password_confirm: '' };

function validate(form: typeof EMPTY) {
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (!/^\+?[\d\s\-()]{10,18}$/.test(form.phone.trim())) errors.phone = 'Enter a valid phone number.';
    if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
    else if (/^\d+$/.test(form.password)) errors.password = 'Mix in some letters, not only numbers.';
    if (form.password !== form.password_confirm) errors.password_confirm = 'Passwords do not match.';
    return errors;
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) return;
        setLoading(true);
        try {
            const res = await authService.register({ ...form, email: form.email.trim(), phone: form.phone.trim() });
            navigate('/verify', { state: { email: res.email, sent: true } });
        } catch (err) {
            const parsed = parseError(err);
            setErrors(parsed.fields);
            setError(parsed.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Join the alumni network"
            subtitle="Create your account, confirm your email, then tell us your batch. The committee verifies every member."
            footer={<>Already a member? <Link to="/login" className="link">Sign in</Link></>}
        >
            <form onSubmit={submit} className="space-y-5" noValidate>
                {error && <Alert type="error">{error}</Alert>}
                <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
                <Input label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="01XXXXXXXXX" hint="Used only by the committee. Never shown publicly." />
                <div className="grid gap-5 sm:grid-cols-2">
                    <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
                    <PasswordInput label="Confirm password" autoComplete="new-password" value={form.password_confirm} onChange={set('password_confirm')} error={errors.password_confirm} />
                </div>
                <Button type="submit" loading={loading} className="w-full" size="lg">Create account</Button>
            </form>
        </AuthShell>
    );
}
