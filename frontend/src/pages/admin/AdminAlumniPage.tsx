import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { approvalService } from '../../services';
import { parseError } from '../../lib/api';
import type { Paginated, ReviewProfile } from '../../types';
import { Alert, Button, EmptyState, PageSpinner, Pagination } from '../../components/ui';
import { DecisionDialog, ReviewCard, type Decision } from '../../components/review';
import { cx } from '../../lib/utils';
import type { AdminContext } from './AdminLayout';

const STATUSES = [
    { key: '', label: 'All' },
    { key: 'approved', label: 'Verified' },
    { key: 'pending', label: 'Waiting' },
    { key: 'rejected', label: 'Rejected' },
];

export default function AdminAlumniPage() {
    const { refreshStats } = useOutletContext<AdminContext>();
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<Paginated<ReviewProfile> | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [decision, setDecision] = useState<Decision | null>(null);

    const load = useCallback(() => {
        approvalService.alumni({ status, search, page })
            .then((d) => { setData(d); setError(''); })
            .catch((e) => setError(parseError(e).message));
    }, [status, search, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    const decide = async (note: string) => {
        if (!decision) return;
        const { profile, kind } = decision;
        try {
            if (kind === 'approve') await approvalService.approve(profile.id, note);
            else await approvalService.reject(profile.id, note);
            setNotice(`${profile.full_name_en} is now ${kind === 'approve' ? 'verified' : 'rejected'}.`);
            load();
            refreshStats();
        } catch (e) {
            setError(parseError(e).message);
        }
        setDecision(null);
    };

    return (
        <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1" role="tablist">
                    {STATUSES.map((s) => (
                        <button key={s.key} role="tab" aria-selected={status === s.key} onClick={() => { setStatus(s.key); setPage(1); }}
                            className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', status === s.key ? 'bg-white shadow-sm' : 'text-muted hover:text-ink-900')}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <input type="search" placeholder="Name, email, phone or roll" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    aria-label="Search alumni" className="h-10 rounded-xl border border-line bg-white px-3 text-sm focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100 sm:w-72" />
            </div>

            {notice && <Alert type="success" className="mb-4">{notice}</Alert>}
            {error && <Alert type="error" className="mb-4">{error}</Alert>}

            {!data ? <PageSpinner /> : data.results.length === 0 ? (
                <EmptyState icon="users" title="No profiles found">Try another filter or search.</EmptyState>
            ) : (
                <>
                    <p className="mb-3 text-sm text-muted">{data.total} profile{data.total === 1 ? '' : 's'} · most recently updated first</p>
                    <div className="space-y-3">
                        {data.results.map((p) => (
                            <ReviewCard key={p.id} profile={p} actions={
                                <>
                                    {p.status !== 'approved' && <Button size="sm" icon="check" onClick={() => setDecision({ profile: p, kind: 'approve' })}>Approve</Button>}
                                    {p.status === 'pending' && <Button size="sm" variant="danger" icon="x" onClick={() => setDecision({ profile: p, kind: 'reject' })}>Reject</Button>}
                                    {p.status === 'approved' && <Button size="sm" variant="danger" onClick={() => setDecision({ profile: p, kind: 'reject' })}>Revoke</Button>}
                                </>
                            } />
                        ))}
                    </div>
                    <Pagination page={data.current_page} pages={data.pages} onPage={setPage} />
                </>
            )}
            <DecisionDialog decision={decision} onClose={() => setDecision(null)} onConfirm={decide} />
        </div>
    );
}
