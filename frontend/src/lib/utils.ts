export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(' ');
}


export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-ink-900 text-white hover:bg-ink-800 shadow-sm',
    gold: 'bg-gold-400 text-ink-950 hover:bg-gold-300 shadow-sm',
    secondary: 'bg-white text-ink-900 border border-line hover:border-ink-300 hover:bg-ink-50',
    ghost: 'text-ink-700 hover:bg-ink-50',
    danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' };
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
    return cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap',
        VARIANTS[variant], SIZES[size], extra,
    );
}


export function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export function formatDate(iso: string | null | undefined) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
