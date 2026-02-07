import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchMyProfile, updateProfile, createProfile } from '../features/alumni/alumniSlice';
import { fetchBatches } from '../features/batch/batchSlice';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

export default function ProfileEditPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { profile, loading: alumniLoading, error: alumniError } = useAppSelector((state) => state.alumni);
    const { batches } = useAppSelector((state) => state.batch);

    const [formData, setFormData] = useState({
        full_name_en: '',
        full_name_bn: '',
        batch: '',
        roll: '',
        section: '',
        city: '',
        country: '',
        profession: '',
        company: '',
        university: '',
        bio: '',
        facebook: '',
        linkedin: '',
    });

    const [photo, setPhoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchMyProfile());
        dispatch(fetchBatches());
    }, [dispatch]);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name_en: profile.full_name_en || '',
                full_name_bn: profile.full_name_bn || '',
                batch: profile.batch || '',
                roll: profile.roll || '',
                section: profile.section || '',
                city: profile.city || '',
                country: profile.country || '',
                profession: profile.profession || '',
                company: profile.company || '',
                university: profile.university || '',
                bio: profile.bio || '',
                facebook: profile.facebook || '',
                linkedin: profile.linkedin || '',
            });
            if (profile.photo) setPreview(profile.photo);
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value) data.append(key, value);
        });
        if (photo) data.append('photo', photo);

        let result;
        if (profile) {
            result = await dispatch(updateProfile(data));
        } else {
            result = await dispatch(createProfile(data));
        }

        if (updateProfile.fulfilled.match(result) || createProfile.fulfilled.match(result)) {
            navigate('/profile');
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">{profile ? 'Edit Profile' : 'Create Profile'}</h1>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-xl p-6 sm:p-8 space-y-6">
                {alumniError && <Alert type="error" message={alumniError} />}

                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-indigo-100">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No Photo
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Full Name (English)" name="full_name_en" value={formData.full_name_en} onChange={handleChange} required />
                    <Input label="Full Name (Bengali)" name="full_name_bn" value={formData.full_name_bn} onChange={handleChange} />

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                        <select
                            name="batch"
                            value={formData.batch}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        >
                            <option value="">Select Batch</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.year} ({b.display_name})</option>
                            ))}
                        </select>
                    </div>

                    <Input label="Roll" name="roll" value={formData.roll} onChange={handleChange} />
                    <Input label="Section" name="section" value={formData.section} onChange={handleChange} />
                    <Input label="Profession" name="profession" value={formData.profession} onChange={handleChange} />
                    <Input label="Company" name="company" value={formData.company} onChange={handleChange} />
                    <Input label="University" name="university" value={formData.university} onChange={handleChange} />
                    <Input label="City" name="city" value={formData.city} onChange={handleChange} />
                    <Input label="Country" name="country" value={formData.country} onChange={handleChange} />
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                        placeholder="Tell us about yourself..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Facebook URL" name="facebook" value={formData.facebook} onChange={handleChange} type="url" />
                    <Input label="LinkedIn URL" name="linkedin" value={formData.linkedin} onChange={handleChange} type="url" />
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <Button variant="secondary" onClick={() => navigate(-1)} type="button">Cancel</Button>
                    <Button type="submit" loading={alumniLoading}>Save Profile</Button>
                </div>
            </form>
        </div>
    );
}
