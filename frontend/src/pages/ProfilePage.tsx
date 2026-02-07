import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile } from '../features/alumni/alumniSlice';
import { logout } from '../features/auth/authSlice';
import Button from '../components/common/Button';

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
        return <div className="text-center py-12">Loading profile...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                    <button
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-700 font-medium"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {profile ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-indigo-600 h-32"></div>
                    <div className="px-6 pb-8">
                        <div className="relative -mt-16 mb-6">
                            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-indigo-100">
                                {profile.photo ? (
                                    <img
                                        src={profile.photo}
                                        alt={profile.full_name_en}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-4xl text-indigo-600 uppercase">
                                            {profile.full_name_en.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{profile.full_name_en}</h2>
                                <p className="text-gray-500 font-medium">{profile.full_name_bn}</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                        ${profile.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            profile.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'}`}>
                                        {profile.status}
                                    </span>
                                    <span className="text-sm text-gray-500">Batch {profile.batch_year}</span>
                                </div>
                            </div>
                            <Button onClick={() => navigate('/profile/edit')}>Edit Profile</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Identity Details</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Roll No:</span>
                                        <span className="font-medium">{profile.roll || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Section:</span>
                                        <span className="font-medium">{profile.section || '-'}</span>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Professional Info</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Profession:</span>
                                        <span className="font-medium">{profile.profession || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Company:</span>
                                        <span className="font-medium">{profile.company || '-'}</span>
                                    </div>
                                </div>
                            </section>

                            <section className="md:col-span-2 space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Biography</h3>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {profile.bio || "No biography provided yet."}
                                </p>
                            </section>

                            {(profile.facebook || profile.linkedin) && (
                                <section className="md:col-span-2 pt-4 border-t">
                                    <div className="flex gap-4">
                                        {profile.facebook && (
                                            <a href={profile.facebook} target="_blank" rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline flex items-center gap-2">
                                                Facebook
                                            </a>
                                        )}
                                        {profile.linkedin && (
                                            <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline flex items-center gap-2">
                                                LinkedIn
                                            </a>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
                    <p className="text-gray-600 mb-6">You haven't created your alumni profile yet.</p>
                    <Button onClick={() => navigate('/profile/edit')}>Create My Profile</Button>
                </div>
            )}
        </div>
    );
}
