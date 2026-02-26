'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Settings, Bell, Shield, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    privateProfile: false,
    showContributions: true,
    digestFrequency: 'weekly',
  });

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
          <p className="text-brand-text">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const handleToggle = (setting: string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof settings],
    }));
  };

  const handleSave = () => {
    // TODO: Save settings to database
    alert('Settings saved! (This feature is coming soon)');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-brand-accent" />
            <h1 className="text-3xl font-bold text-brand-primary">Settings</h1>
          </div>
          <p className="text-brand-text/70">
            Manage your Fictotum preferences
          </p>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg border border-brand-primary/20 shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 px-6 py-4 border-b border-brand-primary/20">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-brand-accent" />
              <h2 className="text-lg font-semibold text-brand-primary">Notifications</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">Email Notifications</p>
                <p className="text-sm text-brand-text/60">
                  Receive email updates about new portrayals and contributions
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between pt-4 border-t border-brand-primary/10">
              <div>
                <p className="font-medium text-brand-text">Push Notifications</p>
                <p className="text-sm text-brand-text/60">
                  Get browser notifications for important updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => handleToggle('pushNotifications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
              </label>
            </div>

            {/* Digest Frequency */}
            <div className="pt-4 border-t border-brand-primary/10">
              <p className="font-medium text-brand-text mb-2">Digest Frequency</p>
              <select
                value={settings.digestFrequency}
                onChange={(e) => setSettings(prev => ({ ...prev, digestFrequency: e.target.value }))}
                className="w-full bg-white border border-brand-primary/30 rounded-md py-2 px-3 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white rounded-lg border border-brand-primary/20 shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 px-6 py-4 border-b border-brand-primary/20">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-brand-accent" />
              <h2 className="text-lg font-semibold text-brand-primary">Privacy</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Private Profile */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">Private Profile</p>
                <p className="text-sm text-brand-text/60">
                  Hide your profile from other users
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privateProfile}
                  onChange={() => handleToggle('privateProfile')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
              </label>
            </div>

            {/* Show Contributions */}
            <div className="flex items-center justify-between pt-4 border-t border-brand-primary/10">
              <div>
                <p className="font-medium text-brand-text">Show My Contributions</p>
                <p className="text-sm text-brand-text/60">
                  Let others see what you've contributed
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showContributions}
                  onChange={() => handleToggle('showContributions')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Section */}
        <div className="bg-white rounded-lg border border-brand-primary/20 shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 px-6 py-4 border-b border-brand-primary/20">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-brand-accent" />
              <h2 className="text-lg font-semibold text-brand-primary">Display</h2>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-brand-text/60">
              Dark mode and other display preferences coming soon
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-md transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-semibold rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
