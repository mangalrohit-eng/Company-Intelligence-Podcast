/**
 * Settings Page
 */

'use client';

import { useState } from 'react';
import { Bell, Lock, User, Palette } from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        {/* Profile Settings */}
        <div className="bg-secondary border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                defaultValue="John Doe"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                defaultValue="john@example.com"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-secondary border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span>Push notifications</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>Email updates</span>
              <input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-secondary border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Appearance</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary">
                <option>Dark (Default)</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-secondary border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Security</h2>
          </div>
          
          <button className="px-6 py-2 bg-primary hover:bg-accent text-background rounded-lg transition-all">
            Change Password
          </button>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-4">
          <button className="px-6 py-3 border border-border hover:border-primary rounded-lg transition-all">
            Cancel
          </button>
          <button className="px-6 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-lg transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

