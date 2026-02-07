interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Invalid email format';
    return null;
}

export function validatePhone(phone: string): string | null {
    if (!phone) return 'Phone is required';
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'Invalid phone format';
    return null;
}

export function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
    if (!confirm) return 'Password confirmation is required';
    if (password !== confirm) return 'Passwords do not match';
    return null;
}

export function validateLoginForm(data: { email: string; password: string }): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

export function validateRegisterForm(data: {
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
}): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    const confirmError = validatePasswordConfirm(data.password, data.password_confirm);
    if (confirmError) errors.password_confirm = confirmError;

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}
