import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchAlumniById, clearSelectedAlumni } from '../features/directory/directorySlice';
import Button from '../components/common/Button';

export default function AlumniPublicProfilePage() {
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { selectedAlumni: profile, loading, error } = useAppSelector((state) => state.directory);

    useEffect(() => {
        if (id) {
            dispatch(fetchAlumniById(id));
        }
        return () => {
            dispatch(clearSelectedAlumni());
        };
    }, [id, dispatch]);

    if (loading) {
        return <div className="text-center py-20">Loading profile...</div>;
    }

    if (error || !profile) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500 mb-4">{error || 'Alumni not found'}</p>
                <Button onClick={() => navigate('/directory')}>Back to Directory</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <button
                onClick={() => navigate(-1)}
                className="mb-8 flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium transition"
            >
                ← Back
            </button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header/Cover */}
                <div className="h-48 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                <div className="px-8 pb-10">
                    {/* Profile Image & Basic Info */}
                    <div className="relative -mt-20 mb-8 flex flex-col md:flex-row md:items-end gap-6">
                        <div className="w-40 h-40 rounded-3xl border-8 border-white overflow-hidden bg-indigo-50 shadow-lg">
                            {profile.photo ? (
                                <img
                                    src={profile.photo}
                                    alt={profile.full_name_en}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-indigo-300">
                                    {profile.full_name_en.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-grow pt-4">
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{profile.full_name_en}</h1>
                            <p className="text-xl text-gray-500 font-medium">{profile.full_name_bn}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                                    Batch {profile.batch_year}
                                </span>
                                {profile.profession && (
                                    <span className="bg-gray-100 text-gray-700 px-4 py-1 rounded-full text-sm font-bold">
                                        {profile.profession}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Sidebar */}
                        <div className="space-y-8">
                            <section>
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Location</h2>
                                <p className="text-gray-900 font-bold text-lg flex items-center gap-2">
                                    <span>📍</span> {profile.city ? `${profile.city}, ` : ''}{profile.country || 'Global'}
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Social Connect</h2>
                                <div className="space-y-3">
                                    {profile.linkedin ? (
                                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition font-bold">
                                            LinkedIn Profile
                                        </a>
                                    ) : null}
                                    {profile.facebook ? (
                                        <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition font-bold">
                                            Facebook Profile
                                        </a>
                                    ) : null}
                                    {!profile.linkedin && !profile.facebook && (
                                        <p className="text-gray-400 text-sm italic">No social links provided.</p>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-10">
                            <section>
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">About</h2>
                                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                                    {profile.bio || `Passionate Alumnus from batch ${profile.batch_year}. Connect to learn more about my journey!`}
                                </p>
                            </section>

                            <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Academic & Career</h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <span className="text-gray-500 font-medium">University</span>
                                        <span className="text-gray-900 font-bold">{profile.university || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <span className="text-gray-500 font-medium">Company</span>
                                        <span className="text-gray-900 font-bold">{profile.company || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <span className="text-gray-500 font-medium">Current Role</span>
                                        <span className="text-gray-900 font-bold">{profile.profession || '-'}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
