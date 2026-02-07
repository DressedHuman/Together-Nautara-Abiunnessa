import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile } from '../features/alumni/alumniSlice';
import { logout } from '../features/auth/authSlice';

export default function ProfilePage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const { profile, loading } = useAppSelector((state) => state.alumni);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        dispatch(fetchMyProfile());
    }, [dispatch, isAuthenticated, navigate]);

    const handleLogout = async () => {
        await dispatch(logout());
        navigate('/');
    };

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700"
                >
                    Logout
                </button>
            </div>

            {profile ? (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-6">
                        {profile.photo ? (
                            <img
                                src={profile.photo}
                                alt={profile.full_name_en}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-4xl text-indigo-600">
                                    {profile.full_name_en.charAt(0)}
                                </span>
                            </div>
                        )}
                        <div className="ml-6">
                            <h2 className="text-2xl font-semibold">{profile.full_name_en}</h2>
                            <p className="text-gray-600">{profile.full_name_bn}</p>
                            <span
                                className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${profile.status === 'approved'
                                        ? 'bg-green-100 text-green-700'
                                        : profile.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}
                            >
                                {profile.status}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-gray-500 text-sm">Batch</p>
                            <p>{profile.batch_year}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Roll</p>
                            <p>{profile.roll || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Profession</p>
                            <p>{profile.profession || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Company</p>
                            <p>{profile.company || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Location</p>
                            <p>
                                {profile.city && profile.country
                                    ? `${profile.city}, ${profile.country}`
                                    : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <p className="text-gray-600 mb-4">You haven't created a profile yet.</p>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                        Create Profile
                    </button>
                </div>
            )}
        </div>
    );
}
