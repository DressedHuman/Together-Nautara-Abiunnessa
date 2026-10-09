import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile } from '../features/alumni/alumniSlice';
import ProfileView from '../components/ProfileView';
import { Alert, ButtonLink, PageSpinner, StatusBadge } from '../components/ui';

export default function ProfilePage() {
    const dispatch = useAppDispatch();
    const { profile, status } = useAppSelector((s) => s.alumni);

    useEffect(() => {
        dispatch(fetchMyProfile());
    }, [dispatch]);

    if (status === 'missing') return <Navigate to="/profile/edit" replace />;
    if (status === 'error') {
        return <div className="mx-auto max-w-4xl px-4 py-12"><Alert type="error">We couldn’t load your profile. Refresh to try again.</Alert></div>;
    }
    if (!profile) return <PageSpinner />;

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
            {profile.status !== 'approved' && (
                <Alert type={profile.status === 'rejected' ? 'error' : 'warning'} className="mb-5">
                    {profile.status === 'pending'
                        ? 'Only you can see this profile until the committee verifies it.'
                        : <>Your profile needs changes{profile.review_note ? `: “${profile.review_note}”` : '.'} Edit it to resubmit.</>}
                </Alert>
            )}
            <ProfileView
                profile={profile}
                badge={<StatusBadge status={profile.status} />}
                actions={
                    <>
                        <ButtonLink to="/profile/edit" size="sm" variant="secondary">Edit profile</ButtonLink>
                        {profile.status === 'approved' && <ButtonLink to={`/alumni/${profile.id}`} size="sm" variant="ghost">Public view</ButtonLink>}
                    </>
                }
            />
        </div>
    );
}
