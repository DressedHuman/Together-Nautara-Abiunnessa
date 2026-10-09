import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { logout } from '../../features/auth/authSlice';
import Icon from '../ui/Icon';
import { buttonClass, cx } from '../../lib/utils';

export function Logo({ compact = false }: { compact?: boolean }) {
    return (
        <Link to="/" className="group flex items-center gap-2.5" aria-label="Together — home">
            <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
                <rect width="40" height="40" rx="11" className="fill-ink-900" />
                <circle cx="15.5" cy="20" r="7.5" fill="none" stroke="#d4a23b" strokeWidth="2.4" />
                <circle cx="24.5" cy="20" r="7.5" fill="none" stroke="#fff" strokeWidth="2.4" />
            </svg>
            {!compact && (
                <span className="leading-none">
                    <span className="block font-display text-[19px] font-semibold tracking-tight text-ink-950">Together</span>
                    <span className="mt-0.5 block text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted">Nautara Abiunnessa Alumni</span>
                </span>
            )}
        </Link>
    );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
    cx('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'text-ink-950 bg-ink-50' : 'text-ink-700 hover:text-ink-950');

export default function Layout() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAppSelector((s) => s.auth.user);
    const [open, setOpen] = useState(false);
    const [lastPath, setLastPath] = useState(location.pathname);

    // Close the mobile menu on navigation.
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setOpen(false);
    }

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const signOut = async () => {
        await dispatch(logout());
        navigate('/');
    };

    const links = [
        { to: '/directory', label: 'Directory' },
        { to: '/about', label: 'About' },
        ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
        ...(user && user.role !== 'alumni' ? [{ to: '/coordinator', label: 'My batch' }] : []),
        ...(user?.role === 'committee' ? [{ to: '/admin/approvals', label: 'Committee' }] : []),
    ];

    return (
        <div className="flex min-h-screen flex-col">
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
                Skip to content
            </a>
            <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Logo />
                    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                        {links.map((l) => (
                            <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
                        ))}
                    </nav>
                    <div className="hidden items-center gap-2 md:flex">
                        {user ? (
                            <>
                                <NavLink to="/profile" className={navClass}>My profile</NavLink>
                                <button onClick={signOut} className={buttonClass('ghost', 'sm')} title="Sign out">
                                    <Icon name="logout" /> Sign out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className={buttonClass('ghost', 'sm')}>Sign in</Link>
                                <Link to="/register" className={buttonClass('primary', 'sm')}>Join the network</Link>
                            </>
                        )}
                    </div>
                    <button className="rounded-lg p-2 text-ink-900 md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
                        <Icon name={open ? 'x' : 'menu'} className="h-5 w-5" />
                    </button>
                </div>
                {open && (
                    <div className="border-t border-line bg-paper px-4 pb-5 pt-3 md:hidden animate-rise">
                        <nav className="flex flex-col gap-1" aria-label="Mobile">
                            {links.map((l) => (
                                <NavLink key={l.to} to={l.to} className={navClass}>{l.label}</NavLink>
                            ))}
                            {user && <NavLink to="/profile" className={navClass}>My profile</NavLink>}
                            {user && <NavLink to="/settings" className={navClass}>Account settings</NavLink>}
                        </nav>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {user ? (
                                <button onClick={signOut} className={buttonClass('secondary', 'md', 'col-span-2')}>Sign out</button>
                            ) : (
                                <>
                                    <Link to="/login" className={buttonClass('secondary')}>Sign in</Link>
                                    <Link to="/register" className={buttonClass('primary')}>Join</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            <main id="main" className="flex-1">
                <Outlet />
            </main>

            <footer className="mt-20 border-t border-line bg-white/60">
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
                    <div className="space-y-3">
                        <Logo />
                        <p className="max-w-xs text-sm leading-relaxed text-muted">
                            The verified alumni network of Nautara Abiunnessa B.L. High School.
                            <span className="bn mt-1 block">একসাথে, প্রতিটি ব্যাচ।</span>
                        </p>
                    </div>
                    <div>
                        <p className="mb-3 text-sm font-semibold">Explore</p>
                        <ul className="space-y-2 text-sm text-muted">
                            <li><Link to="/directory" className="hover:text-ink-900">Alumni directory</Link></li>
                            <li><Link to="/about" className="hover:text-ink-900">How verification works</Link></li>
                        </ul>
                    </div>
                    <div>
                        <p className="mb-3 text-sm font-semibold">Members</p>
                        <ul className="space-y-2 text-sm text-muted">
                            {user ? (
                                <>
                                    <li><Link to="/dashboard" className="hover:text-ink-900">Dashboard</Link></li>
                                    <li><Link to="/settings" className="hover:text-ink-900">Account settings</Link></li>
                                </>
                            ) : (
                                <>
                                    <li><Link to="/register" className="hover:text-ink-900">Create an account</Link></li>
                                    <li><Link to="/login" className="hover:text-ink-900">Sign in</Link></li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-line py-5 text-center text-xs text-muted">
                    © {new Date().getFullYear()} Together — Nautara Abiunnessa B.L. High School Alumni
                </div>
            </footer>
        </div>
    );
}
