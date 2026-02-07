import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { searchDirectory } from '../features/directory/directorySlice';

export default function DirectoryPage() {
    const dispatch = useAppDispatch();
    const { alumni, loading, total } = useAppSelector((state) => state.directory);

    useEffect(() => {
        dispatch(searchDirectory({}));
    }, [dispatch]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Alumni Directory</h1>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <>
                    <p className="text-gray-600 mb-4">{total} alumni found</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alumni.map((person) => (
                            <div
                                key={person.id}
                                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
                            >
                                <div className="flex items-center mb-4">
                                    {person.photo ? (
                                        <img
                                            src={person.photo}
                                            alt={person.full_name_en}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="text-2xl text-indigo-600">
                                                {person.full_name_en.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="ml-4">
                                        <h3 className="font-semibold text-gray-900">
                                            {person.full_name_en}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Batch {person.batch_year}
                                        </p>
                                    </div>
                                </div>
                                {person.profession && (
                                    <p className="text-gray-600">{person.profession}</p>
                                )}
                                {person.city && person.country && (
                                    <p className="text-sm text-gray-500">
                                        {person.city}, {person.country}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
