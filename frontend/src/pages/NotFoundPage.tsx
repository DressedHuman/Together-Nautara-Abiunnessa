import { ButtonLink } from '../components/ui';

export default function NotFoundPage() {
    return (
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
            <p className="font-display text-7xl font-semibold text-ink-100">404</p>
            <h1 className="mt-4 text-3xl font-semibold">This page skipped class</h1>
            <p className="mt-2 text-muted">The page you’re looking for doesn’t exist or has moved.</p>
            <div className="mt-8 flex gap-3">
                <ButtonLink to="/">Go home</ButtonLink>
                <ButtonLink to="/directory" variant="secondary">Open the directory</ButtonLink>
            </div>
        </div>
    );
}
