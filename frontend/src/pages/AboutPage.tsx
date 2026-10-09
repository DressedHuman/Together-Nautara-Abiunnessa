import { ButtonLink } from '../components/ui';
import Icon, { type IconName } from '../components/ui/Icon';

const ROLES: Array<{ icon: IconName; title: string; body: string }> = [
    { icon: 'user', title: 'Alumni', body: 'Keep your own profile up to date and browse the directory. Once verified, you can see other members’ contact links.' },
    { icon: 'users', title: 'Batch coordinators', body: 'One or two trusted people per batch who recognise their classmates and recommend them to the committee.' },
    { icon: 'shield', title: 'Alumni committee', body: 'Makes the final call on every profile, appoints coordinators and keeps the directory clean.' },
];

const VISIBILITY = [
    { what: 'Name, batch, photo, profession, workplace, city, country, bio', who: 'Everyone' },
    { what: 'Roll, section, Facebook and LinkedIn links', who: 'Verified alumni only' },
    { what: 'Email and phone number', who: 'You, your batch coordinator and the committee' },
];

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
            <p className="eyebrow">About Together</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">A home for everyone who walked through our school gate</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
                Together is the alumni network of Nautara Abiunnessa B.L. High School. It started with a simple
                goal: a reliable, searchable list of former students, so batchmates can reconnect and seniors can
                support juniors with advice, mentoring and opportunities.
            </p>

            <section className="mt-14">
                <h2 className="text-2xl font-semibold">Who does what</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {ROLES.map((r) => (
                        <div key={r.title} className="card p-5">
                            <Icon name={r.icon} className="h-5 w-5 text-gold-500" />
                            <h3 className="mt-3 font-sans font-semibold">{r.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-14">
                <h2 className="text-2xl font-semibold">How verification works</h2>
                <ol className="mt-6 space-y-4">
                    {[
                        'You register and confirm your email with a one-time code.',
                        'You fill in your profile: SSC year, roll, section and your name in Bangla and English.',
                        'Your batch coordinator (if your batch has one) recognises you and recommends your profile.',
                        'The alumni committee approves it. You appear in the directory and get an email.',
                        'If something doesn’t match, the committee tells you what to fix. Edit your profile and it goes back for review.',
                    ].map((text, i) => (
                        <li key={i} className="flex gap-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-gold-300">{i + 1}</span>
                            <p className="pt-1 leading-relaxed text-ink-800">{text}</p>
                        </li>
                    ))}
                </ol>
                <p className="mt-5 text-sm text-muted">
                    Changing your name, batch, roll or section after approval sends your profile back for a quick re-check.
                    Everything else you can change freely.
                </p>
            </section>

            <section className="mt-14">
                <h2 className="text-2xl font-semibold">Your privacy</h2>
                <div className="card mt-6 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-ink-50 text-ink-800">
                            <tr><th className="px-5 py-3 font-semibold">Information</th><th className="px-5 py-3 font-semibold">Who can see it</th></tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {VISIBILITY.map((v) => (
                                <tr key={v.what}><td className="px-5 py-3.5 text-ink-800">{v.what}</td><td className="px-5 py-3.5 font-medium">{v.who}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-sm text-muted">
                    Photos are resized and stripped of hidden data (like the location they were taken) when you upload them.
                    Profiles that aren’t approved are never public.
                </p>
            </section>

            <div className="mt-14 flex flex-wrap gap-3">
                <ButtonLink to="/register" icon="arrowRight">Join the network</ButtonLink>
                <ButtonLink to="/directory" variant="secondary">Browse the directory</ButtonLink>
            </div>
        </div>
    );
}
