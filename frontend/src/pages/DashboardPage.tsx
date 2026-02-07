import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile } from '../features/alumni/alumniSlice';

export default function DashboardPage() {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { profile, loading } = useAppSelector((state) => state.alumni);

    useEffect(() => {
        dispatch(fetchMyProfile());
    }, [dispatch]);

    const calculateCompletion = () => {
        if (!profile) return 0;
        const fields = [
            'roll', 'section', 'full_name_bn', 'full_name_en',
            'city', 'country', 'profession', 'company',
            'university', 'bio', 'facebook', 'linkedin', 'photo'
        ];
        const completed = fields.filter(field => !!profile[field as keyof typeof profile]).length;
        return Math.round((completed / fields.length) * 100);
    };

    const completion = calculateCompletion();

    if (loading) {
        return <div className="text-center py-12">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            <header className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Welcome back, {profile?.full_name_en || user?.email.split('@')[0]}!
                        </h1>
                        <p className="text-gray-500">Here's an overview of your alumni account.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold 
                            ${profile?.status === 'approved' ? 'bg-green-100 text-green-700' :
                                profile?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'}`}>
                            {profile?.status || 'No Profile'}
                        </span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Completion Card */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Profile Completion</h2>
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                                    Progress
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-semibold inline-block text-indigo-600">
                                    {completion}%
                                </span>
                            </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                            <div style={{ width: `${completion}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"></div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        A complete profile helps other alumni and the committee find and verify you more easily.
                    </p>
                    <Link to="/profile/edit" className="text-indigo-600 font-medium hover:text-indigo-700 text-sm">
                        Update your information →
                    </Link>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                    <ul className="space-y-3">
                        <li>
                            <Link to="/directory" className="flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition">
                                <span className="mr-3">🔍</span>
                                Search Directory
                            </Link>
                        </li>
                        <li>
                            <Link to="/profile" className="flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition">
                                <span className="mr-3">👤</span>
                                View My Profile
                            </Link>
                        </li>
                        <li>
                            <Link to="/profile/edit" className="flex items-center p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition">
                                <span className="mr-3">✏️</span>
                                Edit Information
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
