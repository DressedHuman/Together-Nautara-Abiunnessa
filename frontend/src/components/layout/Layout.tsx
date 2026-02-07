import { Outlet, Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useRedux';

export default function Layout() {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="text-xl font-bold text-indigo-600">
                                Together Nautara
                            </Link>
                            <div className="ml-10 flex items-center space-x-4">
                                <Link to="/directory" className="text-gray-700 hover:text-indigo-600">
                                    Directory
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <Link
                                    to="/profile"
                                    className="text-gray-700 hover:text-indigo-600"
                                >
                                    Profile
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-gray-700 hover:text-indigo-600"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
}
