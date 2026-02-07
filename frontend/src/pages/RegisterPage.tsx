import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { register, clearError } from '../features/auth/authSlice';

export default function RegisterPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, error } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        password: '',
        password_confirm: '',
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        dispatch(clearError());

        const result = await dispatch(register(formData));
        if (register.fulfilled.match(result)) {
            navigate('/login');
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Register</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
                )}

                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Phone</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 mb-2">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Confirm Password</label>
                    <input
                        type="password"
                        value={formData.password_confirm}
                        onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>

                <p className="text-center mt-4 text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-600 hover:underline">
                        Login
                    </Link>
                </p>
            </form>
        </div>
    );
}
