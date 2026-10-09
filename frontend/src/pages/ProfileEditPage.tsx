import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile, profileSaved } from '../features/alumni/alumniSlice';
import { refreshUser } from '../features/auth/authSlice';
import { alumniService } from '../services';
import { parseError } from '../lib/api';
import type { AlumniProfile } from '../types';
import { Alert, Avatar, Button, Input, PageHeader, PageSpinner, Textarea } from '../components/ui';
import Icon from '../components/ui/Icon';

const TEXT_FIELDS = [
    'full_name_en', 'full_name_bn', 'roll', 'section', 'profession', 'company',
    'university', 'city', 'country', 'bio', 'facebook', 'linkedin',
] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type FormState = Record<TextField, string> & { batch_year: string };

const MAX_PHOTO = 5 * 1024 * 1024;
const THIS_YEAR = new Date().getFullYear();

function toForm(p: AlumniProfile | null): FormState {
    const base = Object.fromEntries(TEXT_FIELDS.map((k) => [k, p?.[k] ?? ''])) as Record<TextField, string>;
    return { ...base, batch_year: p ? String(p.batch_year) : '' };
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section className="grid gap-6 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr]">
            <div>
                <h2 className="font-sans text-base font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            </div>
            <div className="space-y-5">{children}</div>
        </section>
    );
}

function ProfileForm({ initial }: { initial: AlumniProfile | null }) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>(() => toForm(initial));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [preview, setPreview] = useState<string | null>(initial?.photo ?? null);
    const fileRef = useRef<HTMLInputElement>(null);
    const creating = !initial;

    useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
    };

    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setErrors((x) => ({ ...x, photo: 'Choose a JPEG, PNG or WebP image.' }));
            return;
        }
        if (file.size > MAX_PHOTO) {
            setErrors((x) => ({ ...x, photo: 'Photo must be smaller than 5 MB.' }));
            return;
        }
        setErrors((x) => ({ ...x, photo: '' }));
        setPhoto(file);
        setRemovePhoto(false);
        setPreview(URL.createObjectURL(file));
    };

    const validate = () => {
        const found: Record<string, string> = {};
        const year = Number(form.batch_year);
        if (!form.batch_year || !Number.isInteger(year) || year < 1950 || year > THIS_YEAR + 1) found.batch_year = `Enter your SSC year (1950–${THIS_YEAR + 1}).`;
        if (form.full_name_en.trim().length < 2) found.full_name_en = 'Enter your name in English.';
        if (form.full_name_bn.trim().length < 2) found.full_name_bn = 'Enter your name in Bangla.';
        if (form.facebook && !/facebook\.com|fb\.com|fb\.me/i.test(form.facebook)) found.facebook = 'Paste a facebook.com profile link.';
        if (form.linkedin && !/linkedin\.com/i.test(form.linkedin)) found.linkedin = 'Paste a linkedin.com profile link.';
        return found;
    };

    const identityChanged = !!initial && initial.status === 'approved' && (
        String(initial.batch_year) !== form.batch_year || initial.full_name_en !== form.full_name_en.trim() ||
        initial.full_name_bn !== form.full_name_bn.trim() || initial.roll !== form.roll.trim() || initial.section !== form.section.trim()
    );

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length) {
            setError('Please fix the highlighted fields.');
            return;
        }
        const data = new FormData();
        for (const [k, v] of Object.entries(form)) data.append(k, v.trim());
        if (photo) data.append('photo', photo);
        if (removePhoto) data.append('remove_photo', 'true');
        setSaving(true);
        try {
            const saved = creating ? await alumniService.create(data) : await alumniService.update(data);
            dispatch(profileSaved(saved));
            dispatch(refreshUser());
            navigate(creating ? '/dashboard' : '/profile');
        } catch (err) {
            const parsed = parseError(err);
            setErrors(parsed.fields);
            setError(parsed.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} noValidate className="card p-6 sm:p-8">
            {error && <Alert type="error" className="mb-6">{error}</Alert>}
            {initial?.status === 'rejected' && (
                <Alert type="warning" className="mb-6" title="Resubmitting">
                    {initial.review_note ? <>The committee said: “{initial.review_note}”. </> : null}
                    Saving sends your profile back for review.
                </Alert>
            )}

            <Section title="Photo" description="A clear face photo helps classmates recognise you. We remove location data from it.">
                <div className="flex flex-wrap items-center gap-5">
                    <Avatar name={form.full_name_en || 'You'} src={removePhoto ? null : preview} size="lg" />
                    <div className="flex flex-wrap gap-2">
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} id="photo" />
                        <Button type="button" variant="secondary" size="sm" icon="camera" onClick={() => fileRef.current?.click()}>
                            {preview && !removePhoto ? 'Change photo' : 'Upload photo'}
                        </Button>
                        {preview && !removePhoto && (
                            <Button type="button" variant="ghost" size="sm" icon="trash" onClick={() => { setPhoto(null); setRemovePhoto(!!initial?.photo); setPreview(null); }}>
                                Remove
                            </Button>
                        )}
                    </div>
                </div>
                {errors.photo && <p className="text-sm text-rose-700">{errors.photo}</p>}
                <p className="text-xs text-muted">JPEG, PNG or WebP, up to 5 MB.</p>
            </Section>

            <Section title="School identity" description="This is what the committee checks. Use the details from your SSC year.">
                {identityChanged && (
                    <Alert type="warning">Changing these details sends your verified profile back for a quick re-check.</Alert>
                )}
                <div className="grid gap-5 sm:grid-cols-3">
                    <Input label="SSC year" type="number" inputMode="numeric" min={1950} max={THIS_YEAR + 1} value={form.batch_year} onChange={set('batch_year')} error={errors.batch_year} placeholder={String(THIS_YEAR - 5)} />
                    <Input label="Roll" value={form.roll} onChange={set('roll')} error={errors.roll} optional maxLength={50} />
                    <Input label="Section" value={form.section} onChange={set('section')} error={errors.section} optional maxLength={20} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="Full name (English)" value={form.full_name_en} onChange={set('full_name_en')} error={errors.full_name_en} autoComplete="name" maxLength={200} />
                    <Input label="পূর্ণ নাম (বাংলা)" value={form.full_name_bn} onChange={set('full_name_bn')} error={errors.full_name_bn} className="bn" maxLength={200} />
                </div>
            </Section>

            <Section title="Today" description="Where life has taken you. All optional, but it makes the directory useful.">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="Profession" value={form.profession} onChange={set('profession')} error={errors.profession} optional placeholder="e.g. Physician" maxLength={200} />
                    <Input label="Workplace" value={form.company} onChange={set('company')} error={errors.company} optional maxLength={200} />
                </div>
                <Input label="University / college" value={form.university} onChange={set('university')} error={errors.university} optional maxLength={200} />
                <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="City" value={form.city} onChange={set('city')} error={errors.city} optional autoComplete="address-level2" maxLength={100} />
                    <Input label="Country" value={form.country} onChange={set('country')} error={errors.country} optional autoComplete="country-name" placeholder="Bangladesh" maxLength={100} />
                </div>
                <Textarea label="Short bio" rows={4} maxLength={1000} value={form.bio} onChange={set('bio')} error={errors.bio} optional hint={`${form.bio.length}/1000. A line or two: memories, what you do, how you can help juniors.`} />
            </Section>

            <Section title="Links" description="Shown only to verified alumni, never to the public.">
                <Input label="Facebook profile" type="url" value={form.facebook} onChange={set('facebook')} error={errors.facebook} optional placeholder="https://facebook.com/your.name" />
                <Input label="LinkedIn profile" type="url" value={form.linkedin} onChange={set('linkedin')} error={errors.linkedin} optional placeholder="https://linkedin.com/in/your-name" />
            </Section>

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
                <Link to={creating ? '/dashboard' : '/profile'} className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Cancel</Link>
                <Button type="submit" loading={saving} size="lg">
                    {creating ? 'Submit for verification' : 'Save changes'} <Icon name="check" />
                </Button>
            </div>
        </form>
    );
}

export default function ProfileEditPage() {
    const dispatch = useAppDispatch();
    const { profile, status } = useAppSelector((s) => s.alumni);

    useEffect(() => {
        dispatch(fetchMyProfile());
    }, [dispatch]);

    if (status === 'idle' || status === 'loading') return <PageSpinner />;
    if (status === 'error') {
        return <div className="mx-auto max-w-4xl px-4 py-12"><Alert type="error">We couldn’t load your profile. Refresh to try again.</Alert></div>;
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <PageHeader
                eyebrow={profile ? 'Edit profile' : 'Welcome'}
                title={profile ? 'Your alumni profile' : 'Create your alumni profile'}
                description={profile ? 'Keep your details current so classmates can find you.' : 'Tell us your batch and a little about yourself. The alumni committee will verify it.'}
            />
            <ProfileForm key={profile?.id ?? 'new'} initial={profile} />
        </div>
    );
}
