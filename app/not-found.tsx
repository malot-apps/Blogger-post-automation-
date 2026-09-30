import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 text-slate-800 text-center">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-600 mb-4">The requested page could not be found.</p>
      <Link
        href="/"
        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors"
      >
        Return to Publisher
      </Link>
    </div>
  );
}
