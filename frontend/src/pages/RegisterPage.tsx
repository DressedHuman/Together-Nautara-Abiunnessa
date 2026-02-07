import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { register, clearError } from '../features/auth/authSlice';
import { validateRegisterForm } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';

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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

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
        setSuccessMessage('');

        const validation = validateRegisterForm(formData);
        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            return;
        }

        const result = await dispatch(register(formData));
        if (register.fulfilled.match(result)) {
            setSuccessMessage('Registration successful! Please check your email for verification.');
            setTimeout(() => navigate('/login'), 2000);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Join Together Nautara</h1>
                <p className="text-center text-gray-600 mb-8">Create your alumni account</p>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                    {error && (
                        <Alert
                            type="error"
                            message={error}
                            onClose={() => dispatch(clearError())}
                        />
                    )}

                    {successMessage && (
                        <Alert type="success" message={successMessage} />
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
                        id="phone"
                        name="phone"
                        type="tel"
                        label="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        error={fieldErrors.phone}
                        placeholder="+880 1XXX-XXXXXX"
                        autoComplete="tel"
                    />

                    <Input
                        id="password"
                        name="password"
                        type="password"
                        label="Password"
                        value={formData.password}
                        onChange={handleChange}
                        error={fieldErrors.password}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                    />

                    <Input
                        id="password_confirm"
                        name="password_confirm"
                        type="password"
                        label="Confirm Password"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        error={fieldErrors.password_confirm}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                    />

                    <Button type="submit" loading={loading} className="w-full mt-2">
                        Create Account
                    </Button>

                    <p className="text-center mt-6 text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
