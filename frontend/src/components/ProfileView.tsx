import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './ui';
import Icon, { SocialIcon, type IconName } from './ui/Icon';

export interface ProfileLike {
    full_name_en: string;
    full_name_bn: string;
    batch_year: number;
    photo: string | null;
    profession: string;
    company: string;
    university: string;
    city: string;
    country: string;
    bio: string;
    roll?: string;
    section?: string;
    facebook?: string;
    linkedin?: string;
}

function Fact({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-600">
                <Icon name={icon} />
            </div>
            <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
                <dd className="mt-0.5 break-words text-[15px] text-ink-900">{children}</dd>
            </div>
        </div>
    );
}

/** The profile layout shared by the public page and "My profile". */
export default function ProfileView({ profile, badge, actions, membersOnlyHidden }: { profile: ProfileLike; badge?: ReactNode; actions?: ReactNode; membersOnlyHidden?: boolean }) {
    const work = [profile.profession, profile.company].filter(Boolean).join(' at ');
    const place = [profile.city, profile.country].filter(Boolean).join(', ');
    const classInfo = [profile.section && `Section ${profile.section}`, profile.roll && `Roll ${profile.roll}`].filter(Boolean).join(' · ');

    return (
        <article className="card overflow-hidden">
            <div className="relative h-28 bg-ink-900 sm:h-36">
                <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(30rem_12rem_at_90%_0%,rgba(212,162,59,0.35),transparent_70%)]" />
                <span aria-hidden="true" className="absolute bottom-3 right-5 font-display text-6xl font-semibold text-white/10 sm:text-7xl">{profile.batch_year}</span>
            </div>
            <div className="px-5 pb-8 sm:px-8">
                <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
                    <Avatar name={profile.full_name_en} src={profile.photo} size="xl" className="border-4 border-white" />
                    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                </div>
                <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-semibold">{profile.full_name_en}</h1>
                        {badge}
                    </div>
                    {profile.full_name_bn && <p className="bn mt-1 text-lg text-ink-700">{profile.full_name_bn}</p>}
                    <p className="mt-2 text-sm font-medium text-gold-600">SSC batch of {profile.batch_year}{classInfo && <span className="text-muted"> · {classInfo}</span>}</p>
                </div>

                {profile.bio && <p className="mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-800">{profile.bio}</p>}

                <dl className="mt-8 grid gap-5 sm:grid-cols-2">
                    {work && <Fact icon="briefcase" label="Work">{work}</Fact>}
                    {profile.university && <Fact icon="cap" label="Studied at">{profile.university}</Fact>}
                    {place && <Fact icon="pin" label="Lives in">{place}</Fact>}
                </dl>

                {(profile.facebook || profile.linkedin) && (
                    <div className="mt-8 flex flex-wrap gap-2">
                        {profile.facebook && (
                            <a href={profile.facebook} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink-50">
                                <SocialIcon network="facebook" className="h-4 w-4 text-[#1877F2]" /> Facebook
                            </a>
                        )}
                        {profile.linkedin && (
                            <a href={profile.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink-50">
                                <SocialIcon network="linkedin" className="h-4 w-4 text-[#0A66C2]" /> LinkedIn
                            </a>
                        )}
                    </div>
                )}
                {membersOnlyHidden && (
                    <p className="mt-8 flex items-center gap-2 rounded-xl bg-paper px-4 py-3 text-sm text-muted">
                        <Icon name="lock" className="h-4 w-4 shrink-0" />
                        <span>Contact links and class details are visible to verified alumni. <Link to="/login" className="link">Sign in</Link></span>
                    </p>
                )}
            </div>
        </article>
    );
}
