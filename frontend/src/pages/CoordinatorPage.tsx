import { useCallback, useEffect, useState } from 'react';
import { coordinatorService } from '../services';
import { parseError } from '../lib/api';
import { useAppSelector } from '../hooks/useRedux';
import type { Paginated, ReviewProfile } from '../types';
import { Alert, Button, EmptyState, PageHeader, PageSpinner, Pagination } from '../components/ui';
import { DecisionDialog, ReviewCard, type Decision } from '../components/review';
import { cx } from '../lib/utils';

const TABS = [
    { key: 'pending', label: 'Waiting' },
    { key: 'approved', label: 'Verified' },
    { key: 'rejected', label: 'Needs changes' },
    { key: '', label: 'Everyone' },
];

export default function CoordinatorPage() {
    const user = useAppSelector((s) => s.auth.user)!;
    const [tab, setTab] = useState('pending');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [data, setData] = useState<(Paginated<ReviewProfile> & { batches: number[] }) | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [decision, setDecision] = useState<Decision | null>(null);

    const load = useCallback(() => {
        coordinatorService
            .batchAlumni({ status: tab, page, search })
            .then((d) => { setData(d); setError(''); })
            .catch((e) => setError(parseError(e).message));
    }, [tab, page, search]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    const recommend = async (note: string) => {
        if (!decision) return;
        try {
            await coordinatorService.recommend(decision.profile.id, note);
            setNotice(`You recommended ${decision.profile.full_name_en}. The committee will take it from here.`);
            setDecision(null);
            load();
        } catch (e) {
            setError(parseError(e).message);
            setDecision(null);
        }
    };

    const batchLabel = user.role === 'committee' ? 'all batches' : data?.batches.length ? data.batches.map((y) => `SSC ${y}`).join(', ') : 'your batches';

    return (
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <PageHeader
                eyebrow="Batch coordinator"
                title="My batch"
                description={<>Profiles in {batchLabel}. Recommend the people you recognise. The committee gives the final approval.</>}
            />

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1" role="tablist">
                    {TABS.map((t) => (
                        <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setPage(1); }}
                            className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', tab === t.key ? 'bg-white shadow-sm' : 'text-muted hover:text-ink-900')}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <input type="search" placeholder="Search name or roll" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    aria-label="Search batch" className="h-10 rounded-xl border border-line bg-white px-3 text-sm focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100 sm:w-64" />
            </div>

            {notice && <Alert type="success" className="mb-4">{notice}</Alert>}
            {error && <Alert type="error" className="mb-4">{error}</Alert>}

            {!data ? <PageSpinner /> : data.results.length === 0 ? (
                <EmptyState icon="users" title={tab === 'pending' ? 'No one is waiting' : 'Nobody here yet'}>
                    {tab === 'pending' ? 'When batchmates create their profiles, they’ll show up here for you to vouch for.' : 'Try another tab or search.'}
                </EmptyState>
            ) : (
                <>
                    <div className="space-y-3">
                        {data.results.map((p) => (
                            <ReviewCard
                                key={p.id}
                                profile={p}
                                actions={p.status === 'pending' && !p.recommended_by && p.email !== user.email ? (
                                    <Button size="sm" variant="gold" icon="star" onClick={() => setDecision({ profile: p, kind: 'recommend' })}>Recommend</Button>
                                ) : null}
                            />
                        ))}
                    </div>
                    <Pagination page={data.current_page} pages={data.pages} onPage={setPage} />
                </>
            )}

            <DecisionDialog decision={decision} onClose={() => setDecision(null)} onConfirm={recommend} />
        </div>
    );
}
