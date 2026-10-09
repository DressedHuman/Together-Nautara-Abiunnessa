import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { approvalService } from '../../services';
import { cx } from '../../lib/utils';

export type AdminContext = { refreshStats: () => void };

export default function AdminLayout() {
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; recommended: number } | null>(null);
    const refreshStats = useCallback(() => {
        approvalService.stats().then(setStats).catch(() => setStats(null));
    }, []);
    useEffect(refreshStats, [refreshStats]);

    const tabs = [
        { to: 'approvals', label: 'Approvals', count: stats?.pending },
        { to: 'alumni', label: 'All alumni' },
        { to: 'batches', label: 'Batches & coordinators' },
    ];

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="eyebrow">Alumni committee</p>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Committee desk</h1>
                </div>
                <dl className="grid grid-cols-4 gap-2 text-center">
                    {[
                        { label: 'Waiting', value: stats?.pending, tone: 'text-gold-600' },
                        { label: 'Vouched', value: stats?.recommended, tone: 'text-ink-700' },
                        { label: 'Verified', value: stats?.approved, tone: 'text-emerald-700' },
                        { label: 'Rejected', value: stats?.rejected, tone: 'text-rose-700' },
                    ].map((s) => (
                        <div key={s.label} className="card min-w-[4.75rem] px-3 py-2.5">
                            <dd className={cx('font-display text-2xl font-semibold', s.tone)}>{s.value ?? '—'}</dd>
                            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{s.label}</dt>
                        </div>
                    ))}
                </dl>
            </div>
            <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Committee sections">
                {tabs.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        className={({ isActive }) => cx('-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition', isActive ? 'border-ink-900 text-ink-950' : 'border-transparent text-muted hover:text-ink-900')}
                    >
                        {t.label}
                        {!!t.count && <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-ink-950">{t.count}</span>}
                    </NavLink>
                ))}
            </nav>
            <Outlet context={{ refreshStats } satisfies AdminContext} />
        </div>
    );
}
