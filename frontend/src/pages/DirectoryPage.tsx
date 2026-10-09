import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { directoryService } from '../services';
import { parseError } from '../lib/api';
import type { AlumniCard as Card, DirectoryFilterOptions, Paginated } from '../types';
import AlumniCard, { AlumniCardSkeleton } from '../components/AlumniCard';
import { Alert, Button, EmptyState, PageHeader, Pagination } from '../components/ui';
import Icon from '../components/ui/Icon';

const FILTER_KEYS = ['search', 'batch', 'country', 'profession', 'city', 'ordering'] as const;

export default function DirectoryPage() {
    const [params, setParams] = useSearchParams();
    const [options, setOptions] = useState<DirectoryFilterOptions | null>(null);
    const [result, setResult] = useState<Paginated<Card> | null>(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(params.get('search') ?? '');
    const query = params.toString();

    useEffect(() => {
        directoryService.filters().then(setOptions).catch(() => setOptions(null));
    }, []);

    // Debounce typing into the URL.
    useEffect(() => {
        const t = setTimeout(() => {
            if ((params.get('search') ?? '') !== search.trim()) update({ search: search.trim() });
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        const current = new URLSearchParams(query);
        directoryService
            .search({ ...Object.fromEntries(current), page_size: 12 })
            .then((r) => { if (!cancelled) { setResult(r); setError(''); } })
            .catch((e) => { if (!cancelled) setError(parseError(e).message); });
        return () => { cancelled = true; };
    }, [query]);

    function update(patch: Record<string, string>, keepPage = false) {
        const next = new URLSearchParams(params);
        for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
        }
        if (!keepPage) next.delete('page');
        setParams(next, { replace: true });
    }

    const active = FILTER_KEYS.filter((k) => k !== 'ordering' && params.get(k));
    const loading = result === null && !error;
    const select = 'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink-900 hover:border-ink-200 focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100';

    return (
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <PageHeader
                eyebrow="Alumni directory"
                title="Find your people"
                description="Search verified alumni by name, batch, profession or where they live now."
            />

            <div className="card mb-8 p-4 sm:p-5">
                <div className="relative">
                    <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name (English or বাংলা), profession, company…"
                        aria-label="Search alumni"
                        className="h-12 w-full rounded-xl border border-line bg-paper pl-12 pr-4 text-[15px] placeholder:text-ink-300 focus:border-ink-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-ink-100"
                    />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <select aria-label="Batch" className={select} value={params.get('batch') ?? ''} onChange={(e) => update({ batch: e.target.value })}>
                        <option value="">All batches</option>
                        {options?.batches.map((y) => <option key={y} value={y}>SSC {y}</option>)}
                    </select>
                    <select aria-label="Country" className={select} value={params.get('country') ?? ''} onChange={(e) => update({ country: e.target.value })}>
                        <option value="">All countries</option>
                        {options?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select aria-label="Profession" className={select} value={params.get('profession') ?? ''} onChange={(e) => update({ profession: e.target.value })}>
                        <option value="">All professions</option>
                        {options?.professions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select aria-label="Sort by" className={select} value={params.get('ordering') ?? ''} onChange={(e) => update({ ordering: e.target.value })}>
                        <option value="">Sort: Name A–Z</option>
                        <option value="-batch">Sort: Newest batch</option>
                        <option value="batch">Sort: Oldest batch</option>
                        <option value="recent">Sort: Recently updated</option>
                    </select>
                </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
                <p className="text-sm text-muted">
                    {result ? <><strong className="text-ink-900">{result.total}</strong> {result.total === 1 ? 'alumnus' : 'alumni'} found</> : ' '}
                </p>
                {active.length > 0 && (
                    <Button variant="ghost" size="sm" icon="x" onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}>
                        Clear filters
                    </Button>
                )}
            </div>

            {error && <Alert type="error" className="mb-6">{error}</Alert>}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }, (_, i) => <AlumniCardSkeleton key={i} />)}
                </div>
            ) : result && result.results.length === 0 ? (
                <EmptyState title="No one matches yet" icon="users">
                    Try a different spelling or fewer filters. If your batchmates aren’t here, invite them to join.
                </EmptyState>
            ) : result ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {result.results.map((a) => <AlumniCard key={a.id} alumni={a} />)}
                    </div>
                    <Pagination
                        page={result.current_page}
                        pages={result.pages}
                        onPage={(p) => { update({ page: String(p) }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                </>
            ) : null}
        </div>
    );
}
