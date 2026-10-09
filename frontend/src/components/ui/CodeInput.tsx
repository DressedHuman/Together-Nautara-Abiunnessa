import { useEffect, useState } from 'react';
import { Button } from '.';

/** Six-digit one-time code field. */
export function CodeInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor="otp" className="text-sm font-medium text-ink-900">6-digit code</label>
            <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                aria-invalid={!!error}
                className="block h-14 w-full rounded-xl border border-line bg-white text-center font-mono text-2xl tracking-[0.6em] text-ink-950 placeholder:text-ink-200 focus:border-ink-500 focus:outline-none focus:ring-4 focus:ring-ink-100"
            />
            {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
    );
}

/** "Send again" with a visible cooldown, matching the server's 60-second limit. */
export function ResendButton({ onResend, initialWait = 60 }: { onResend: () => Promise<void>; initialWait?: number }) {
    const [wait, setWait] = useState(initialWait);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (wait <= 0) return;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={busy}
            disabled={wait > 0}
            onClick={async () => {
                setBusy(true);
                try {
                    await onResend();
                } finally {
                    setBusy(false);
                    setWait(60);
                }
            }}
        >
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </Button>
    );
}
