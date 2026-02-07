import { useState, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { login, clearError } from '../features/auth/authSlice';
import { validateLoginForm } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

export default function LoginPage() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { loading, error } = useAppSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const from = location.state?.from?.pathname || '/profile';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        dispatch(clearError());

        const validation = validateLoginForm(formData);
        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            return;
        }

        const result = await dispatch(login({ email: formData.email, password: formData.password }));
        if (login.fulfilled.match(result)) {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Welcome Back</h1>
                <p className="text-center text-gray-600 mb-8">Sign in to your account</p>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                    {error && (
                        <Alert
                            type="error"
                            message={error}
                            onClose={() => dispatch(clearError())}
                        />
                    )}

                    <Input
                        id="email"
                        name="email"
                        type="email"
                        label="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        error={fieldErrors.email}
                        placeholder="you@example.com"
                        autoComplete="email"
                    />

                    <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Password"
                        value={formData.password}
                        onChange={handleChange}
                        error={fieldErrors.password}
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />

                    <Button type="submit" loading={loading} className="w-full mt-2">
                        Sign In
                    </Button>

                    <p className="text-center mt-6 text-gray-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo-600 font-medium hover:underline">
                            Create Account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
