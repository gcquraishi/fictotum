import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Figure Not Found</h2>
        <p className="text-gray-400 mb-6">
          The historical figure you&apos;re looking for doesn&apos;t exist in our database.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
