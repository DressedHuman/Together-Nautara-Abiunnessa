import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { approvalService, batchService } from '../../services';
import { parseError } from '../../lib/api';
import type { ApprovalLogEntry, Batch, Paginated, ReviewProfile } from '../../types';
import { Alert, Button, EmptyState, PageSpinner, Pagination } from '../../components/ui';
import { DecisionDialog, ReviewCard, type Decision } from '../../components/review';
import { formatDate } from '../../lib/utils';
import type { AdminContext } from './AdminLayout';

const LOG_LABEL = { approved: 'approved', rejected: 'rejected', recommended: 'recommended' };

export default function ApprovalsPage() {
    const { refreshStats } = useOutletContext<AdminContext>();
    const [data, setData] = useState<Paginated<ReviewProfile> | null>(null);
    const [logs, setLogs] = useState<ApprovalLogEntry[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [filters, setFilters] = useState({ search: '', batch: '', recommended: '' });
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [decision, setDecision] = useState<Decision | null>(null);

    const load = useCallback(() => {
        approvalService.pending({ ...filters, page })
            .then((d) => { setData(d); setError(''); })
            .catch((e) => setError(parseError(e).message));
        approvalService.logs({ limit: 8 }).then(setLogs).catch(() => setLogs([]));
    }, [filters, page]);

    useEffect(() => {
        const t = setTimeout(load, filters.search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, filters.search]);

    useEffect(() => {
        batchService.list().then(setBatches).catch(() => setBatches([]));
    }, []);

    const decide = async (note: string) => {
        if (!decision) return;
        const { profile, kind } = decision;
        try {
            if (kind === 'approve') await approvalService.approve(profile.id, note);
            else await approvalService.reject(profile.id, note);
            setNotice(`${profile.full_name_en} was ${kind === 'approve' ? 'approved' : 'sent back for changes'}. They’ve been emailed.`);
            load();
            refreshStats();
        } catch (e) {
            setError(parseError(e).message);
        }
        setDecision(null);
    };

    const setFilter = (key: keyof typeof filters, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };
    const control = 'h-10 rounded-xl border border-line bg-white px-3 text-sm focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100';

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
            <div>
                <div className="mb-5 flex flex-wrap gap-2">
                    <input type="search" placeholder="Name, email, phone or roll" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} aria-label="Search pending" className={`${control} min-w-0 flex-1`} />
                    <select aria-label="Batch" value={filters.batch} onChange={(e) => setFilter('batch', e.target.value)} className={control}>
                        <option value="">All batches</option>
                        {batches.map((b) => <option key={b.id} value={b.year}>SSC {b.year}</option>)}
                    </select>
                    <select aria-label="Recommendation" value={filters.recommended} onChange={(e) => setFilter('recommended', e.target.value)} className={control}>
                        <option value="">Everyone waiting</option>
                        <option value="1">Recommended only</option>
                    </select>
                </div>

                {notice && <Alert type="success" className="mb-4">{notice}</Alert>}
                {error && <Alert type="error" className="mb-4">{error}</Alert>}

                {!data ? <PageSpinner /> : data.results.length === 0 ? (
                    <EmptyState icon="check" title="All caught up">No profiles are waiting for review.</EmptyState>
                ) : (
                    <>
                        <p className="mb-3 text-sm text-muted">{data.total} waiting · oldest first, recommended at the top</p>
                        <div className="space-y-3">
                            {data.results.map((p) => (
                                <ReviewCard key={p.id} profile={p} actions={
                                    <>
                                        <Button size="sm" icon="check" onClick={() => setDecision({ profile: p, kind: 'approve' })}>Approve</Button>
                                        <Button size="sm" variant="danger" icon="x" onClick={() => setDecision({ profile: p, kind: 'reject' })}>Reject</Button>
                                    </>
                                } />
                            ))}
                        </div>
                        <Pagination page={data.current_page} pages={data.pages} onPage={setPage} />
                    </>
                )}
            </div>

            <aside>
                <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-muted">Recent activity</h2>
                {logs.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
                    <ol className="space-y-3">
                        {logs.map((l) => (
                            <li key={l.id} className="border-l-2 border-line pl-3 text-sm">
                                <p><span className="font-medium">{l.actor ?? 'Someone'}</span> {LOG_LABEL[l.status]} <span className="font-medium">{l.alumni_name}</span></p>
                                {l.note && <p className="text-muted">“{l.note}”</p>}
                                <p className="text-xs text-muted">{formatDate(l.created_at)} · SSC {l.batch_year}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </aside>

            <DecisionDialog decision={decision} onClose={() => setDecision(null)} onConfirm={decide} />
        </div>
    );
}
