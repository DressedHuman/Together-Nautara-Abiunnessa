import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useRedux';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
}

export default function ProtectedRoute({
    children,
    requireAuth = true,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const location = useLocation();
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    if (requireAuth && !isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/profile" replace />;
    }

    return <>{children}</>;
}
