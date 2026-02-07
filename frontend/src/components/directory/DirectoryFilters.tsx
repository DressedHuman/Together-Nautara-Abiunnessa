import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { setFilters, searchDirectory, clearFilters } from '../../features/directory/directorySlice';
import { fetchBatches } from '../../features/batch/batchSlice';

export default function DirectoryFilters() {
    const dispatch = useAppDispatch();
    const { batches } = useAppSelector((state) => state.batch);
    const { filters } = useAppSelector((state) => state.directory);

    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    useEffect(() => {
        dispatch(fetchBatches());
    }, [dispatch]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== filters.search) {
                dispatch(setFilters({ search: searchTerm, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, dispatch, filters.search]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch(setFilters({ [name]: value, page: 1 }));
    };

    const handleClear = () => {
        setSearchTerm('');
        dispatch(clearFilters());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Search */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Search Alumni</label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Name, roll, profession, or university..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Batch Filter */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Batch</label>
                    <select
                        name="batch"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition appearance-none"
                        value={filters.batch || ''}
                        onChange={handleFilterChange}
                    >
                        <option value="">All Batches</option>
                        {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                                {batch.year} ({batch.display_name})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end">
                    <button
                        onClick={handleClear}
                        className="w-full py-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition"
                    >
                        Clear All Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
