import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { batchService } from '../../services';
import { parseError } from '../../lib/api';
import type { BatchDetail } from '../../types';
import { Alert, Button, Dialog, EmptyState, Input, PageSpinner } from '../../components/ui';
import Icon from '../../components/ui/Icon';

function BatchRow({ batch, onChange, onError }: { batch: BatchDetail; onChange: () => void; onError: (m: string) => void }) {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [busy, setBusy] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(batch.display_name);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const addCoordinator = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setBusy(true);
        setEmailError('');
        try {
            await batchService.addCoordinator(batch.year, email.trim());
            setEmail('');
            onChange();
        } catch (err) {
            const parsed = parseError(err);
            setEmailError(parsed.fields.email ?? parsed.message);
        } finally {
            setBusy(false);
        }
    };

    const act = async (fn: () => Promise<unknown>) => {
        try { await fn(); onChange(); } catch (err) { onError(parseError(err).message); }
    };

    const canDelete = batch.alumni_count + batch.pending_count === 0;

    return (
        <article className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    {renaming ? (
                        <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); await act(() => batchService.rename(batch.year, name)); setRenaming(false); }}>
                            <span className="font-display text-2xl font-semibold text-ink-900">{batch.year}</span>
                            <input aria-label="Batch name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="h-9 rounded-lg border border-line px-3 text-sm focus:border-ink-500 focus:outline-none" autoFocus />
                            <Button size="sm" type="submit">Save</Button>
                            <Button size="sm" variant="ghost" type="button" onClick={() => { setRenaming(false); setName(batch.display_name); }}>Cancel</Button>
                        </form>
                    ) : (
                        <h3 className="flex items-center gap-2 font-sans text-lg font-semibold">
                            <span className="font-display text-2xl text-ink-900">{batch.year}</span>
                            <span className="text-muted">·</span>
                            <span className="text-base font-medium">{batch.display_name}</span>
                            <button className="rounded p-1 text-muted hover:text-ink-900" onClick={() => setRenaming(true)} aria-label={`Rename batch ${batch.year}`}><Icon name="edit" className="h-3.5 w-3.5" /></button>
                        </h3>
                    )}
                    <p className="mt-1 text-sm text-muted">{batch.alumni_count} verified · {batch.pending_count} waiting</p>
                </div>
                <Button size="sm" variant="ghost" icon="trash" disabled={!canDelete} title={canDelete ? 'Delete batch' : 'Only empty batches can be deleted'} onClick={() => setConfirmDelete(true)}>
                    Delete
                </Button>
            </div>

            <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Coordinators</p>
                {batch.coordinators.length === 0 ? (
                    <p className="text-sm text-muted">No coordinator yet.</p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {batch.coordinators.map((c) => (
                            <li key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-3 pr-1 text-sm">
                                <span>{c.name ?? c.user.email}</span>
                                {c.name && <span className="text-xs text-muted">{c.user.email}</span>}
                                <button onClick={() => act(() => batchService.removeCoordinator(batch.year, c.id))} className="rounded-full p-1 text-muted hover:bg-rose-50 hover:text-rose-700" aria-label={`Remove ${c.user.email}`}>
                                    <Icon name="x" className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <form onSubmit={addCoordinator} className="mt-3 flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <input type="email" placeholder="Member’s email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={`Add coordinator to ${batch.year}`}
                            className="h-9 w-full rounded-lg border border-line px-3 text-sm focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100" />
                        {emailError && <p className="mt-1 text-sm text-rose-700">{emailError}</p>}
                    </div>
                    <Button size="sm" variant="secondary" icon="plus" loading={busy} type="submit">Add coordinator</Button>
                </form>
            </div>

            <Dialog open={confirmDelete} title={`Delete batch ${batch.year}?`} onClose={() => setConfirmDelete(false)}
                footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="danger" onClick={async () => { setConfirmDelete(false); await act(() => batchService.remove(batch.year)); }}>Delete</Button></>}>
                <p className="text-sm text-muted">This batch has no profiles. Its coordinators will be unassigned.</p>
            </Dialog>
        </article>
    );
}

export default function AdminBatchesPage() {
    const [batches, setBatches] = useState<BatchDetail[] | null>(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState('');
    const [name, setName] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => {
        batchService.listDetailed().then((b) => { setBatches(b); setError(''); }).catch((e) => setError(parseError(e).message));
    }, []);
    useEffect(load, [load]);

    const create = async (e: FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setCreating(true);
        try {
            await batchService.create(Number(year), name.trim());
            setYear(''); setName('');
            load();
        } catch (err) {
            const parsed = parseError(err);
            setFieldErrors(Object.keys(parsed.fields).length ? parsed.fields : { year: parsed.message });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
                {error && <Alert type="error">{error}</Alert>}
                {!batches ? <PageSpinner /> : batches.length === 0 ? (
                    <EmptyState icon="layers" title="No batches yet">Batches are created automatically when alumni pick their SSC year, or you can add one here.</EmptyState>
                ) : batches.map((b) => <BatchRow key={b.id} batch={b} onChange={load} onError={setError} />)}
            </div>
            <aside>
                <form onSubmit={create} className="card space-y-4 p-5 lg:sticky lg:top-24">
                    <h2 className="font-sans text-base font-semibold">Add a batch</h2>
                    <Input label="SSC year" type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} error={fieldErrors.year} />
                    <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} optional placeholder={year ? `Batch of ${year}` : 'Batch of 2015'} error={fieldErrors.display_name} />
                    <Button type="submit" className="w-full" loading={creating} disabled={!year}>Create batch</Button>
                    <p className="text-xs leading-relaxed text-muted">A coordinator must already have a verified account. Coordinators can recommend batchmates but can’t approve them.</p>
                </form>
            </aside>
        </div>
    );
}
