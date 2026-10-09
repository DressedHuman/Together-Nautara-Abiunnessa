import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { batchService, directoryService } from '../services';
import { useAppSelector } from '../hooks/useRedux';
import type { AlumniCard as Card, Batch, SiteStats } from '../types';
import AlumniCard, { AlumniCardSkeleton } from '../components/AlumniCard';
import { ButtonLink } from '../components/ui';
import Icon, { type IconName } from '../components/ui/Icon';

const STEPS: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: 'mail', title: 'Create an account', body: 'Sign up with your email and phone, then confirm the code we send you.' },
    { icon: 'user', title: 'Tell us your batch', body: 'Add your SSC year, roll, section and what you do today. A photo helps friends find you.' },
    { icon: 'shield', title: 'Get verified', body: 'Your batch coordinator and the alumni committee confirm you studied with us.' },
];

export default function HomePage() {
    const user = useAppSelector((s) => s.auth.user);
    const [stats, setStats] = useState<SiteStats | null>(null);
    const [recent, setRecent] = useState<Card[] | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        directoryService.stats().then(setStats).catch(() => setStats(null));
        directoryService.search({ ordering: 'recent', page_size: 4 }).then((r) => setRecent(r.results)).catch(() => setRecent([]));
        batchService.list().then((b) => setBatches(b.filter((x) => x.alumni_count > 0))).catch(() => setBatches([]));
    }, []);

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgba(212,162,59,0.16),transparent_60%),radial-gradient(40rem_24rem_at_0%_120%,rgba(43,58,110,0.05),transparent_60%)]" />
                <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-20">
                    <div className="animate-rise">
                        <p className="eyebrow">Nautara Abiunnessa B.L. High School</p>
                        <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl">
                            Every batch.<br />
                            <span className="italic text-ink-700">One family.</span>
                        </h1>
                        <p className="bn mt-4 text-xl text-ink-700">প্রতিটি ব্যাচ, এক পরিবার।</p>
                        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
                            Together is the verified home of our school’s alumni. Find old friends, see where
                            classmates have gone, and help the next generation from the same benches.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <ButtonLink to="/directory" size="lg" icon="arrowRight">Explore the directory</ButtonLink>
                            {!user && <ButtonLink to="/register" size="lg" variant="secondary">Join as an alumnus</ButtonLink>}
                            {user && <ButtonLink to="/dashboard" size="lg" variant="secondary">Go to your dashboard</ButtonLink>}
                        </div>
                    </div>

                    <div className="relative hidden lg:block" aria-hidden="true">
                        <div className="absolute -inset-6 rounded-[2.5rem] border border-dashed border-gold-300/60" />
                        <div className="card relative space-y-3 rounded-[2rem] p-6">
                            {['SSC 2008', 'SSC 2015', 'SSC 2021'].map((b, i) => (
                                <div key={b} className="flex items-center gap-4 rounded-2xl bg-paper p-4" style={{ marginLeft: i * 18 }}>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 font-display text-gold-300">{b.slice(-2)}</div>
                                    <div className="flex-1">
                                        <div className="h-2.5 w-28 rounded bg-ink-100" />
                                        <div className="mt-2 h-2 w-20 rounded bg-ink-50" />
                                    </div>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Verified</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="border-y border-line bg-white">
                <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-line px-4 sm:px-6 md:grid-cols-4 md:divide-x">
                    {[
                        { label: 'Verified alumni', value: stats?.alumni },
                        { label: 'Batches represented', value: stats?.batches },
                        { label: 'Countries', value: stats?.countries },
                        { label: 'Professions', value: stats?.professions },
                    ].map((s) => (
                        <div key={s.label} className="px-2 py-7 text-center md:px-6">
                            <dd className="font-display text-4xl font-semibold text-ink-900">{s.value ?? '—'}</dd>
                            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
                        </div>
                    ))}
                </dl>
            </section>

            {/* How it works */}
            <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                <div className="max-w-2xl">
                    <p className="eyebrow">How it works</p>
                    <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A directory you can trust</h2>
                    <p className="mt-3 text-muted">Only people who really studied here appear in the directory, and you decide how much of your profile to share.</p>
                </div>
                <ol className="mt-10 grid gap-5 md:grid-cols-3">
                    {STEPS.map((s, i) => (
                        <li key={s.title} className="card relative p-6">
                            <span className="absolute right-5 top-4 font-display text-5xl font-semibold text-ink-50">{i + 1}</span>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 text-gold-300">
                                <Icon name={s.icon} className="h-5 w-5" />
                            </div>
                            <h3 className="mt-5 font-sans text-lg font-semibold">{s.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Recently joined */}
            {(recent === null || recent.length > 0) && (
                <section className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-6 flex items-end justify-between gap-4">
                        <div>
                            <p className="eyebrow">Recently verified</p>
                            <h2 className="mt-2 text-3xl font-semibold">Faces from the corridor</h2>
                        </div>
                        <Link to="/directory" className="link hidden text-sm sm:inline">See everyone</Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {recent === null
                            ? Array.from({ length: 4 }, (_, i) => <AlumniCardSkeleton key={i} />)
                            : recent.map((a) => <AlumniCard key={a.id} alumni={a} />)}
                    </div>
                </section>
            )}

            {/* Batches */}
            {batches.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
                    <p className="eyebrow">Browse by batch</p>
                    <h2 className="mt-2 text-3xl font-semibold">Find your year</h2>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {batches.map((b) => (
                            <Link
                                key={b.id}
                                to={`/directory?batch=${b.year}`}
                                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-800 transition hover:border-ink-300 hover:bg-ink-50"
                            >
                                SSC {b.year} <span className="ml-1 text-muted">· {b.alumni_count}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* CTA */}
            {!user && (
                <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
                    <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-center sm:px-12">
                        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[24px] border-gold-400/20" />
                        <h2 className="relative text-3xl font-semibold text-white sm:text-4xl">Is your batch here yet?</h2>
                        <p className="relative mx-auto mt-3 max-w-lg text-ink-200">
                            It takes two minutes to join. Bring your batchmates along. The more of us there are, the more useful this becomes.
                        </p>
                        <div className="relative mt-7 flex justify-center">
                            <ButtonLink to="/register" variant="gold" size="lg" icon="arrowRight">Create your profile</ButtonLink>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
