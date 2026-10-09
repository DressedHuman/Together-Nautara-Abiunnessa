import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from './Icon';
import type { ProfileStatus } from '../../types';
import { buttonClass, cx, initials, type ButtonSize, type ButtonVariant } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: IconName;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...rest }: ButtonProps) {
    return (
        <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
            {loading ? <Spinner className="h-4 w-4" /> : icon ? <Icon name={icon} /> : null}
            {children}
        </button>
    );
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon, className = '', children }: { to: string; variant?: ButtonVariant; size?: ButtonSize; icon?: IconName; className?: string; children: ReactNode }) {
    return (
        <Link to={to} className={buttonClass(variant, size, className)}>
            {children}
            {icon && <Icon name={icon} />}
        </Link>
    );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
    return (
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted" role="status">
            <Spinner /> <span className="text-sm">{label}</span>
        </div>
    );
}

/* ---------- Form fields ---------- */

interface FieldShellProps {
    label: string;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
    id: string;
    children: ReactNode;
}

function FieldShell({ label, error, hint, optional, id, children }: FieldShellProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink-900">
                {label}
                {optional && <span className="text-xs font-normal text-muted">Optional</span>}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-sm text-rose-700">{error}</p>
            ) : hint ? (
                <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
            ) : null}
        </div>
    );
}

const controlClass = (error?: string) =>
    cx(
        'block w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-950 placeholder:text-ink-300 transition',
        'focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100',
        error ? 'border-rose-300' : 'border-line hover:border-ink-200',
    );

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
}

export function Input({ label, error, hint, optional, id, className = '', ...rest }: InputProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <FieldShell label={label} error={error} hint={hint} optional={optional} id={fieldId}>
            <input
                id={fieldId}
                className={cx(controlClass(error), 'h-11', className)}
                aria-invalid={!!error}
                aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
                {...rest}
            />
        </FieldShell>
    );
}

export function PasswordInput(props: Omit<InputProps, 'type'>) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input {...props} type={show ? 'text' : 'password'} className="pr-16" />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-[34px] rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-ink-900"
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? 'Hide' : 'Show'}
            </button>
        </div>
    );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
}

export function Textarea({ label, error, hint, optional, id, className = '', ...rest }: TextareaProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <FieldShell label={label} error={error} hint={hint} optional={optional} id={fieldId}>
            <textarea id={fieldId} className={cx(controlClass(error), 'py-3 leading-relaxed', className)} aria-invalid={!!error} {...rest} />
        </FieldShell>
    );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    hint?: ReactNode;
    optional?: boolean;
}

export function Select({ label, error, hint, optional, id, className = '', children, ...rest }: SelectProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <FieldShell label={label} error={error} hint={hint} optional={optional} id={fieldId}>
            <select id={fieldId} className={cx(controlClass(error), 'h-11 pr-9', className)} aria-invalid={!!error} {...rest}>
                {children}
            </select>
        </FieldShell>
    );
}

/* ---------- Feedback ---------- */

const ALERT_STYLES = {
    error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: 'alert' as IconName },
    success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: 'check' as IconName },
    info: { box: 'border-ink-100 bg-ink-50 text-ink-900', icon: 'info' as IconName },
    warning: { box: 'border-gold-200 bg-gold-50 text-gold-700', icon: 'clock' as IconName },
};

export function Alert({ type = 'info', title, children, className = '' }: { type?: keyof typeof ALERT_STYLES; title?: string; children?: ReactNode; className?: string }) {
    const style = ALERT_STYLES[type];
    return (
        <div role={type === 'error' ? 'alert' : 'status'} className={cx('flex gap-3 rounded-xl border px-4 py-3 text-sm animate-rise', style.box, className)}>
            <Icon name={style.icon} className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-0.5">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className="leading-relaxed">{children}</div>}
            </div>
        </div>
    );
}

const STATUS_STYLES: Record<ProfileStatus, string> = {
    approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    pending: 'bg-gold-50 text-gold-700 ring-gold-200',
    rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
};
const STATUS_LABEL: Record<ProfileStatus, string> = { approved: 'Verified', pending: 'In review', rejected: 'Needs changes' };

export function StatusBadge({ status }: { status: ProfileStatus }) {
    return (
        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', STATUS_STYLES[status])}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {STATUS_LABEL[status]}
        </span>
    );
}

export function Badge({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'gold' }) {
    return (
        <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tone === 'gold' ? 'bg-gold-100 text-gold-700' : 'bg-ink-50 text-ink-700')}>
            {children}
        </span>
    );
}

/* ---------- Avatar ---------- */

const AVATAR_TONES = ['bg-ink-100 text-ink-800', 'bg-gold-100 text-gold-700', 'bg-emerald-50 text-emerald-800', 'bg-rose-50 text-rose-800', 'bg-sky-50 text-sky-800'];

export function Avatar({ name, src, size = 'md', className = '' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
    const [failed, setFailed] = useState(false);
    const dims = { sm: 'h-9 w-9 text-xs', md: 'h-14 w-14 text-base', lg: 'h-20 w-20 text-xl', xl: 'h-32 w-32 text-3xl' }[size];
    const tone = AVATAR_TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
    if (src && !failed) {
        return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={cx('shrink-0 rounded-full object-cover ring-1 ring-line', dims, className)} />;
    }
    return (
        <div className={cx('flex shrink-0 items-center justify-center rounded-full font-display font-semibold ring-1 ring-black/5', dims, tone, className)} aria-hidden="true">
            {initials(name)}
        </div>
    );
}

/* ---------- Layout bits ---------- */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
                {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
                {description && <p className="mt-2 text-[15px] leading-relaxed text-muted">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function EmptyState({ icon = 'search', title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
    return (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-600">
                <Icon name={icon} className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
    if (pages <= 1) return null;
    return (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} icon="arrowLeft">
                Previous
            </Button>
            <span className="px-3 text-sm text-muted">
                Page <strong className="text-ink-900">{page}</strong> of {pages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
                Next <Icon name="arrowRight" />
            </Button>
        </nav>
    );
}

/* ---------- Dialog ---------- */

export function Dialog({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (open && !el.open) el.showModal();
        if (!open && el.open) el.close();
    }, [open]);
    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => e.target === ref.current && onClose()}
            className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 text-ink-950 shadow-2xl backdrop:bg-ink-950/40 backdrop:backdrop-blur-[2px]"
        >
            {open && (
                <div className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-ink-50 hover:text-ink-900" aria-label="Close">
                            <Icon name="x" />
                        </button>
                    </div>
                    {children}
                    {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
                </div>
            )}
        </dialog>
    );
}

