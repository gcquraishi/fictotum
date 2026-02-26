'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserCircle, Mail, Calendar } from 'lucide-react';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-text">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <UserCircle className="w-8 h-8 text-brand-accent" />
            <h1 className="text-3xl font-bold text-brand-primary">Your Profile</h1>
          </div>
          <p className="text-brand-text/70">
            View and manage your Fictotum account
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-brand-primary/20 shadow-sm overflow-hidden mb-8">
          {/* Header */}
          <div className="h-20 bg-gradient-to-r from-brand-primary to-brand-accent"></div>

          {/* Profile Content */}
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-10 mb-6">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || 'User'}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-brand-primary/20 flex items-center justify-center">
                  <UserCircle className="w-12 h-12 text-brand-primary" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-brand-primary">
                  {user.name || 'Anonymous User'}
                </h2>
              </div>
            </div>

            {/* Information */}
            <div className="space-y-4 border-t border-brand-primary/10 pt-6">
              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-brand-accent mt-0.5" />
                <div>
                  <p className="text-sm text-brand-text/70">Email</p>
                  <p className="text-lg font-medium text-brand-text">
                    {user.email || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Account Created */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-brand-accent mt-0.5" />
                <div>
                  <p className="text-sm text-brand-text/70">Member Since</p>
                  <p className="text-lg font-medium text-brand-text">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-brand-primary/20 shadow-sm text-center">
            <p className="text-3xl font-bold text-brand-accent">0</p>
            <p className="text-sm text-brand-text/70 mt-1">Contributions</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-brand-primary/20 shadow-sm text-center">
            <p className="text-3xl font-bold text-brand-accent">0</p>
            <p className="text-sm text-brand-text/70 mt-1">Figures Added</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-brand-primary/20 shadow-sm text-center">
            <p className="text-3xl font-bold text-brand-accent">0</p>
            <p className="text-sm text-brand-text/70 mt-1">Media Works Added</p>
          </div>
        </div>

        {/* Account Settings Link */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Visit{' '}
            <a href="/settings" className="text-blue-900 font-semibold hover:underline">
              Settings
            </a>
            {' '}to manage your account preferences
          </p>
        </div>
      </div>
    </div>
  );
}
