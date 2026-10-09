import { useState, type ReactNode } from 'react';
import type { ReviewProfile } from '../types';
import { Avatar, Badge, Button, Dialog, StatusBadge, Textarea } from './ui';
import Icon from './ui/Icon';
import { formatDate } from '../lib/utils';

/** A profile laid out for verification: identity first, contact details visible. */
export function ReviewCard({ profile, actions }: { profile: ReviewProfile; actions?: ReactNode }) {
    const [open, setOpen] = useState(false);
    const work = [profile.profession, profile.company].filter(Boolean).join(' · ');
    const place = [profile.city, profile.country].filter(Boolean).join(', ');
    return (
        <article className="card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={profile.full_name_en} src={profile.photo} size="md" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-base font-semibold text-ink-950">{profile.full_name_en}</h3>
                        <StatusBadge status={profile.status} />
                        {profile.recommended_by && profile.status === 'pending' && (
                            <Badge tone="gold"><Icon name="star" className="h-3 w-3" /> Recommended</Badge>
                        )}
                    </div>
                    <p className="bn text-sm text-muted">{profile.full_name_bn}</p>
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                        <div className="flex gap-2"><dt className="text-muted">Batch</dt><dd className="font-medium">SSC {profile.batch_year}</dd></div>
                        <div className="flex gap-2"><dt className="text-muted">Roll / Sec.</dt><dd className="font-medium">{profile.roll || '—'} / {profile.section || '—'}</dd></div>
                        <div className="flex min-w-0 gap-2"><dt className="text-muted">Email</dt><dd className="truncate"><a className="link" href={`mailto:${profile.email}`}>{profile.email}</a></dd></div>
                        <div className="flex gap-2"><dt className="text-muted">Phone</dt><dd><a className="link" href={`tel:${profile.phone}`}>{profile.phone}</a></dd></div>
                    </dl>
                    {open && (
                        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-800 animate-rise">
                            {work && <p><span className="text-muted">Work:</span> {work}</p>}
                            {profile.university && <p><span className="text-muted">Studied at:</span> {profile.university}</p>}
                            {place && <p><span className="text-muted">Lives in:</span> {place}</p>}
                            {profile.bio && <p className="whitespace-pre-line"><span className="text-muted">Bio:</span> {profile.bio}</p>}
                            {(profile.facebook || profile.linkedin) && (
                                <p className="flex gap-3">
                                    {profile.facebook && <a className="link" href={profile.facebook} target="_blank" rel="noopener noreferrer nofollow">Facebook</a>}
                                    {profile.linkedin && <a className="link" href={profile.linkedin} target="_blank" rel="noopener noreferrer nofollow">LinkedIn</a>}
                                </p>
                            )}
                            {profile.recommended_by && <p className="text-muted">Recommended by {profile.recommended_by} on {formatDate(profile.recommended_at)}</p>}
                            {profile.approved_by && profile.status === 'approved' && <p className="text-muted">Approved by {profile.approved_by}</p>}
                            {profile.review_note && <p className="text-muted">Last note: “{profile.review_note}”</p>}
                            <p className="text-xs text-muted">Submitted {formatDate(profile.created_at)} · Updated {formatDate(profile.updated_at)}</p>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                    {actions}
                    <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                        {open ? 'Less' : 'Details'}
                    </Button>
                </div>
            </div>
        </article>
    );
}

export interface Decision {
    profile: ReviewProfile;
    kind: 'approve' | 'reject' | 'recommend';
}

const COPY = {
    approve: { title: 'Approve profile', button: 'Approve', note: 'Note (optional)', variant: 'primary' as const },
    reject: { title: 'Ask for changes', button: 'Reject', note: 'What should they fix? (sent to them by email)', variant: 'danger' as const },
    recommend: { title: 'Recommend to the committee', button: 'Recommend', note: 'How do you know them? (optional)', variant: 'gold' as const },
};

export function DecisionDialog({ decision, onClose, onConfirm }: { decision: Decision | null; onClose: () => void; onConfirm: (note: string) => Promise<void> }) {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const copy = decision ? COPY[decision.kind] : COPY.approve;
    const revoking = decision?.kind === 'reject' && decision.profile.status === 'approved';

    const close = () => { setNote(''); onClose(); };

    return (
        <Dialog
            open={!!decision}
            title={revoking ? 'Revoke verification' : copy.title}
            onClose={close}
            footer={
                <>
                    <Button variant="ghost" onClick={close}>Cancel</Button>
                    <Button
                        variant={copy.variant}
                        loading={busy}
                        onClick={async () => {
                            setBusy(true);
                            try { await onConfirm(note.trim()); setNote(''); } finally { setBusy(false); }
                        }}
                    >
                        {revoking ? 'Revoke' : copy.button}
                    </Button>
                </>
            }
        >
            {decision && (
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        <strong className="text-ink-900">{decision.profile.full_name_en}</strong> · SSC {decision.profile.batch_year}
                        {revoking && ' will be removed from the public directory.'}
                    </p>
                    <Textarea label={copy.note} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
            )}
        </Dialog>
    );
}
