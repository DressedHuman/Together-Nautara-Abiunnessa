import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile } from '../features/alumni/alumniSlice';
import { refreshUser } from '../features/auth/authSlice';
import { approvalService } from '../services';
import type { AlumniProfile } from '../types';
import { Alert, Avatar, ButtonLink, PageSpinner, StatusBadge } from '../components/ui';
import Icon, { type IconName } from '../components/ui/Icon';

const COMPLETION_FIELDS: Array<[keyof AlumniProfile, string]> = [
    ['photo', 'a photo'], ['roll', 'your roll'], ['section', 'your section'], ['profession', 'your profession'],
    ['company', 'your workplace'], ['university', 'your university'], ['city', 'your city'], ['country', 'your country'],
    ['bio', 'a short bio'], ['linkedin', 'a LinkedIn link'],
];

function NextStep({ profile }: { profile: AlumniProfile | null }) {
    if (!profile) {
        return (
            <Alert type="info" title="One step left: create your alumni profile">
                Tell us your batch and a little about yourself so the committee can verify you.
                <div className="mt-3"><ButtonLink to="/profile/edit" size="sm" icon="arrowRight">Create profile</ButtonLink></div>
            </Alert>
        );
    }
    if (profile.status === 'pending') {
        return (
            <Alert type="warning" title="Your profile is being reviewed">
                {profile.recommended
                    ? 'Your batch coordinator has vouched for you. The committee will approve you soon.'
                    : 'The alumni committee checks every profile, usually within a few days. We’ll email you when it’s done.'}
            </Alert>
        );
    }
    if (profile.status === 'rejected') {
        return (
            <Alert type="error" title="The committee couldn’t verify your profile yet">
                {profile.review_note ? <>Their note: “{profile.review_note}”</> : 'Please check your batch, roll and name.'}
                <div className="mt-3"><ButtonLink to="/profile/edit" size="sm" variant="secondary">Update and resubmit</ButtonLink></div>
            </Alert>
        );
    }
    return (
        <Alert type="success" title="You’re verified">
            You appear in the directory, and you can see other members’ contact links.
        </Alert>
    );
}

function Tile({ to, icon, title, body }: { to: string; icon: IconName; title: string; body: string }) {
    return (
        <Link to={to} className="card group flex items-start gap-4 p-5 transition hover:border-ink-200">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-700 group-hover:bg-ink-900 group-hover:text-gold-300">
                <Icon name={icon} />
            </div>
            <div>
                <p className="font-semibold text-ink-950">{title}</p>
                <p className="mt-0.5 text-sm text-muted">{body}</p>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user)!;
    const { profile, status } = useAppSelector((s) => s.alumni);
    const [pending, setPending] = useState<number | null>(null);

    useEffect(() => {
        dispatch(fetchMyProfile());
        dispatch(refreshUser());
    }, [dispatch]);

    useEffect(() => {
        if (user.role === 'committee') approvalService.stats().then((s) => setPending(s.pending)).catch(() => setPending(null));
    }, [user.role]);

    if (status === 'idle' || status === 'loading') return <PageSpinner />;

    const missing = profile ? COMPLETION_FIELDS.filter(([k]) => !profile[k]) : COMPLETION_FIELDS;
    const completion = profile ? Math.round(((COMPLETION_FIELDS.length - missing.length) / COMPLETION_FIELDS.length) * 100) : 0;
    const name = profile?.full_name_en.split(' ')[0] || user.email.split('@')[0];

    return (
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex flex-wrap items-center gap-5">
                <Avatar name={profile?.full_name_en || user.email} src={profile?.photo} size="lg" />
                <div>
                    <p className="eyebrow">Dashboard</p>
                    <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Hello, {name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                        {profile && <StatusBadge status={profile.status} />}
                        {profile && <span>SSC {profile.batch_year}</span>}
                        {user.role !== 'alumni' && <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold capitalize text-gold-300">{user.role}</span>}
                    </div>
                </div>
            </div>

            {status === 'error' && <Alert type="error" className="mb-6">We couldn’t load your profile. Refresh to try again.</Alert>}
            <NextStep profile={profile} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <section className="card p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-sans text-lg font-semibold">Profile strength</h2>
                        <span className="font-display text-2xl font-semibold text-ink-900">{completion}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-50" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-gradient-to-r from-ink-700 to-gold-400 transition-all duration-700" style={{ width: `${completion}%` }} />
                    </div>
                    {missing.length > 0 ? (
                        <p className="mt-4 text-sm text-muted">
                            Add {missing.slice(0, 3).map(([, label]) => label).join(', ')}
                            {missing.length > 3 ? ` and ${missing.length - 3} more` : ''} to help classmates recognise you.
                        </p>
                    ) : (
                        <p className="mt-4 text-sm text-muted">Your profile is complete. Nice work.</p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <ButtonLink to="/profile/edit" size="sm">{profile ? 'Edit profile' : 'Create profile'}</ButtonLink>
                        {profile && <ButtonLink to="/profile" size="sm" variant="secondary">View profile</ButtonLink>}
                    </div>
                </section>

                <section className="space-y-3">
                    {user.role === 'committee' && (
                        <Tile to="/admin/approvals" icon="shield" title="Committee desk" body={pending === null ? 'Review and manage alumni.' : `${pending} profile${pending === 1 ? '' : 's'} waiting for review.`} />
                    )}
                    {user.role !== 'alumni' && <Tile to="/coordinator" icon="users" title="My batch" body="See your batchmates and vouch for the ones you know." />}
                    <Tile to="/directory" icon="search" title="Alumni directory" body="Search by name, batch, profession or country." />
                    <Tile to="/settings" icon="settings" title="Account settings" body="Change your password and see your sign-in details." />
                </section>
            </div>
        </div>
    );
}
