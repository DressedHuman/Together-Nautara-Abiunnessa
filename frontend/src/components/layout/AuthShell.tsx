import type { ReactNode } from 'react';

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="mx-auto grid max-w-5xl items-stretch gap-0 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
            <aside className="relative hidden overflow-hidden rounded-l-3xl bg-ink-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-gold-400/20" />
                <div aria-hidden="true" className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full border-[28px] border-white/5" />
                <p className="eyebrow text-gold-300">Nautara Abiunnessa B.L. High School</p>
                <div className="relative">
                    <p className="font-display text-3xl leading-snug text-white">
                        “The bell rang for all of us. Years later, we still answer to it.”
                    </p>
                    <p className="bn mt-4 text-lg text-ink-200">স্কুলের ঘণ্টা আমাদের সবার জন্য বেজেছিল।</p>
                </div>
                <ul className="relative space-y-2 text-sm text-ink-200">
                    <li>· Every profile is checked by the alumni committee</li>
                    <li>· Your email and phone are never shown publicly</li>
                </ul>
            </aside>
            <section className="card rounded-3xl p-6 sm:p-10 lg:rounded-l-none lg:border-l-0">
                <h1 className="text-3xl font-semibold">{title}</h1>
                {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
                <div className="mt-8">{children}</div>
                {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">{footer}</div>}
            </section>
        </div>
    );
}
