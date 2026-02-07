import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Together Nautara
            </h1>
            <p className="text-xl text-gray-600 mb-8">
                Connect with alumni from our institution
            </p>
            <div className="flex justify-center gap-4">
                <Link
                    to="/directory"
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                >
                    Browse Directory
                </Link>
                <Link
                    to="/register"
                    className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 transition"
                >
                    Join Us
                </Link>
            </div>
        </div>
    );
}
