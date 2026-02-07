import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { searchDirectory, setFilters } from '../features/directory/directorySlice';
import DirectoryFilters from '../components/directory/DirectoryFilters';
import Button from '../components/common/Button';

export default function DirectoryPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { alumni, loading, total, pages, currentPage, filters } = useAppSelector((state) => state.directory);

    useEffect(() => {
        dispatch(searchDirectory(filters));
    }, [dispatch, filters]);

    const handlePageChange = (page: number) => {
        dispatch(setFilters({ page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Alumni Directory</h1>
                <p className="text-gray-500 text-lg">Reconnect and network with your fellow Nautarians.</p>
            </header>

            <DirectoryFilters />

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-gray-500 font-medium">
                    Showing <span className="text-gray-900 font-bold">{alumni.length}</span> of {total} alumni
                </h2>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                            <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : alumni.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {alumni.map((person) => (
                        <div
                            key={person.id}
                            onClick={() => navigate(`/directory/${person.id}`)}
                            className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                        >
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-50 border-2 border-white shadow-sm ring-1 ring-gray-100">
                                    {person.photo ? (
                                        <img
                                            src={person.photo}
                                            alt={person.full_name_en}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-indigo-400">
                                            {person.full_name_en.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                                {person.full_name_en}
                            </h3>
                            <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                                Batch {person.batch_year}
                            </p>

                            <div className="space-y-1 mb-6 flex-grow">
                                <p className="text-gray-700 font-medium text-sm line-clamp-1">{person.profession || 'Alumnus'}</p>
                                <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
                                    <span>📍</span> {person.city ? `${person.city}, ` : ''}{person.country || 'Not specified'}
                                </p>
                            </div>

                            <button className="w-full py-2 text-sm font-bold text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-xl transition-all">
                                View Full Profile
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4 text-lg">No alumni found matching your criteria.</p>
                    <Button variant="secondary" onClick={() => dispatch(setFilters({ search: '', batch: '', page: 1 }))}>
                        Clear search and try again
                    </Button>
                </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-8">
                    <Button
                        variant="secondary"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="!px-3"
                    >
                        ←
                    </Button>
                    <div className="flex gap-1">
                        {[...Array(pages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => handlePageChange(i + 1)}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all
                                    ${currentPage === i + 1
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="secondary"
                        disabled={currentPage === pages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="!px-3"
                    >
                        →
                    </Button>
                </div>
            )}
        </div>
    );
}
