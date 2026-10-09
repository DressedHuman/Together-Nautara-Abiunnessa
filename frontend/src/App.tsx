import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAppDispatch } from './hooks/useRedux';
import { loadSession, sessionExpired } from './features/auth/authSlice';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import DirectoryPage from './pages/DirectoryPage';
import AlumniPublicProfilePage from './pages/AlumniPublicProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import SettingsPage from './pages/SettingsPage';
import CoordinatorPage from './pages/CoordinatorPage';
import AdminLayout from './pages/admin/AdminLayout';
import ApprovalsPage from './pages/admin/ApprovalsPage';
import AdminAlumniPage from './pages/admin/AdminAlumniPage';
import AdminBatchesPage from './pages/admin/AdminBatchesPage';
import NotFoundPage from './pages/NotFoundPage';

function LegacyDirectoryRedirect() {
    const { id } = useParams();
    return <Navigate to={`/alumni/${id}`} replace />;
}

export default function App() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(loadSession());
        const onExpired = () => dispatch(sessionExpired());
        window.addEventListener('auth:expired', onExpired);
        return () => window.removeEventListener('auth:expired', onExpired);
    }, [dispatch]);

    const guest = (el: React.ReactNode) => <ProtectedRoute requireAuth={false}>{el}</ProtectedRoute>;
    const member = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="directory" element={<DirectoryPage />} />
                    <Route path="directory/:id" element={<LegacyDirectoryRedirect />} />
                    <Route path="alumni/:id" element={<AlumniPublicProfilePage />} />

                    <Route path="login" element={guest(<LoginPage />)} />
                    <Route path="register" element={guest(<RegisterPage />)} />
                    <Route path="verify" element={guest(<VerifyPage />)} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />

                    <Route path="dashboard" element={member(<DashboardPage />)} />
                    <Route path="profile" element={member(<ProfilePage />)} />
                    <Route path="profile/edit" element={member(<ProfileEditPage />)} />
                    <Route path="settings" element={member(<SettingsPage />)} />
                    <Route
                        path="coordinator"
                        element={<ProtectedRoute roles={['coordinator', 'committee']}><CoordinatorPage /></ProtectedRoute>}
                    />
                    <Route path="admin" element={<ProtectedRoute roles={['committee']}><AdminLayout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="approvals" replace />} />
                        <Route path="approvals" element={<ApprovalsPage />} />
                        <Route path="alumni" element={<AdminAlumniPage />} />
                        <Route path="batches" element={<AdminBatchesPage />} />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
