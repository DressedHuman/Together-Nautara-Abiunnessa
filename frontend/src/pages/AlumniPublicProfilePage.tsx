import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { directoryService } from '../services';
import { parseError } from '../lib/api';
import { useAppSelector } from '../hooks/useRedux';
import type { PublicProfile } from '../types';
import ProfileView from '../components/ProfileView';
import { ButtonLink, EmptyState, PageSpinner, StatusBadge } from '../components/ui';
import Icon from '../components/ui/Icon';

export default function AlumniPublicProfilePage() {
    const { id = '' } = useParams();
    const user = useAppSelector((s) => s.auth.user);
    const [result, setResult] = useState<{ id: string; profile?: PublicProfile; error?: string; status?: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        directoryService
            .profile(id)
            .then((profile) => !cancelled && setResult({ id, profile }))
            .catch((e) => {
                if (cancelled) return;
                const parsed = parseError(e);
                setResult({ id, error: parsed.message, status: parsed.status });
            });
        return () => { cancelled = true; };
    }, [id, user?.id]);

    useEffect(() => {
        if (result?.profile) document.title = `${result.profile.full_name_en} · Together`;
        return () => { document.title = 'Together — Nautara Abiunnessa Alumni'; };
    }, [result]);

    if (!result || result.id !== id) return <PageSpinner />;

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
            <Link to="/directory" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink-900">
                <Icon name="arrowLeft" /> Back to directory
            </Link>
            {result.profile ? (
                <ProfileView
                    profile={result.profile}
                    badge={<StatusBadge status="approved" />}
                    membersOnlyHidden={result.profile.members_only_hidden && !user}
                />
            ) : (
                <EmptyState icon="user" title={result.status === 404 ? 'Profile not found' : 'Could not load this profile'} action={<ButtonLink to="/directory">Browse the directory</ButtonLink>}>
                    {result.status === 404 ? 'This profile doesn’t exist or isn’t verified yet.' : result.error}
                </EmptyState>
            )}
            {result.profile?.members_only_hidden && user && (
                <p className="mt-4 text-center text-sm text-muted">Contact links appear once your own profile is verified.</p>
            )}
        </div>
    );
}
