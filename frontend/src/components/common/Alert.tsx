interface AlertProps {
    type: 'error' | 'success' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
}

export default function Alert({ type, message, onClose }: AlertProps) {
    const styles = {
        error: 'bg-red-50 border-red-200 text-red-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    const icons = {
        error: '✕',
        success: '✓',
        warning: '⚠',
        info: 'ℹ',
    };

    return (
        <div
            className={`flex items-center justify-between p-4 rounded-lg border ${styles[type]} mb-4`}
            role="alert"
        >
            <div className="flex items-center gap-3">
                <span className="text-lg">{icons[type]}</span>
                <p>{message}</p>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-current opacity-70 hover:opacity-100"
                    aria-label="Close"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
