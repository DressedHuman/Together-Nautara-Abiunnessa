import { Link } from 'react-router-dom';
import type { AlumniCard as Card } from '../types';
import { Avatar } from './ui';
import Icon from './ui/Icon';

export default function AlumniCard({ alumni }: { alumni: Card }) {
    const place = [alumni.city, alumni.country].filter(Boolean).join(', ');
    const work = [alumni.profession, alumni.company].filter(Boolean).join(' · ');
    return (
        <Link
            to={`/alumni/${alumni.id}`}
            className="card group flex min-w-0 flex-col gap-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-[0_12px_30px_-12px_rgba(12,18,40,0.18)]"
        >
            <div className="flex items-start gap-4">
                <Avatar name={alumni.full_name_en} src={alumni.photo} />
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-sans text-[15px] font-semibold text-ink-950 group-hover:text-ink-700">{alumni.full_name_en}</h3>
                    {alumni.full_name_bn && <p className="bn truncate text-sm text-muted">{alumni.full_name_bn}</p>}
                    <span className="mt-1.5 inline-block rounded-md bg-gold-50 px-2 py-0.5 text-xs font-semibold text-gold-700">SSC {alumni.batch_year}</span>
                </div>
            </div>
            {(work || place) && (
                <div className="space-y-1.5 border-t border-line pt-3 text-sm text-ink-700">
                    {work && (
                        <p className="flex items-center gap-2 truncate"><Icon name="briefcase" className="h-3.5 w-3.5 shrink-0 text-muted" /><span className="truncate">{work}</span></p>
                    )}
                    {place && (
                        <p className="flex items-center gap-2 truncate"><Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-muted" /><span className="truncate">{place}</span></p>
                    )}
                </div>
            )}
        </Link>
    );
}

export function AlumniCardSkeleton() {
    return (
        <div className="card animate-pulse p-5" aria-hidden="true">
            <div className="flex gap-4">
                <div className="h-14 w-14 rounded-full bg-ink-50" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 w-2/3 rounded bg-ink-50" />
                    <div className="h-3 w-1/3 rounded bg-ink-50" />
                </div>
            </div>
            <div className="mt-5 space-y-2 border-t border-line pt-3">
                <div className="h-3 w-3/4 rounded bg-ink-50" />
                <div className="h-3 w-1/2 rounded bg-ink-50" />
            </div>
        </div>
    );
}
