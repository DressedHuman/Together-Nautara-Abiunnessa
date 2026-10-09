import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useRedux';
import { PageSpinner } from '../ui';
import type { Role } from '../../types';

interface ProtectedRouteProps {
    children: ReactNode;
    /** false = only for signed-out visitors (login, register). */
    requireAuth?: boolean;
    roles?: Role[];
}

export default function ProtectedRoute({ children, requireAuth = true, roles }: ProtectedRouteProps) {
    const location = useLocation();
    const { user, status } = useAppSelector((state) => state.auth);

    if (status === 'checking') return <PageSpinner />;

    if (requireAuth && !user) {
        return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
    }
    if (!requireAuth && user) {
        const from = (location.state as { from?: string } | null)?.from;
        const target = from && from.startsWith('/') && !from.startsWith('//') ? from : user.has_profile || user.role === 'committee' ? '/dashboard' : '/profile/edit';
        return <Navigate to={target} replace />;
    }
    if (roles && user && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
}
