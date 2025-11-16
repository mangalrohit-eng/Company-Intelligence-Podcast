/**
 * Settings Page
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Lock, User, Palette, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = () => {
    // TODO: Call API to delete account
    setShowDeleteConfirm(false);
    router.push('/goodbye');
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    type="text"
                    defaultValue="John Doe"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <Input
                    type="email"
                    defaultValue="john@example.com"
                    placeholder="your.email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <Input
                    type="text"
                    defaultValue="Acme Corp"
                    placeholder="Your company name"
                  />
                </div>
                <div className="pt-4">
                  <Button>Save Profile</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <div className="font-medium mb-1">Push Notifications</div>
                    <div className="text-sm text-muted">Receive notifications when episodes are ready</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <div className="font-medium mb-1">Email Updates</div>
                    <div className="text-sm text-muted">Get notified about new features and updates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailUpdates}
                    onChange={(e) => setEmailUpdates(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>

                <div className="pt-4">
                  <Button>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Integrations & Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Apple Podcasts */}
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Apple Podcasts</div>
                        <div className="text-sm text-muted">Submit to Apple Podcasts Connect</div>
                      </div>
                    </div>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Submit your RSS feed to Apple Podcasts to reach millions of listeners
                  </p>
                  <Button variant="outline" size="sm">
                    Submit to Apple
                  </Button>
                </div>

                {/* Spotify */}
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1DB954] rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Spotify for Podcasters</div>
                        <div className="text-sm text-muted">Distribute to Spotify</div>
                      </div>
                    </div>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Add your podcast to Spotify and reach the world&apos;s largest audio platform
                  </p>
                  <Button variant="outline" size="sm">
                    Submit to Spotify
                  </Button>
                </div>

                {/* Slack */}
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Slack Notifications</div>
                        <div className="text-sm text-muted">Get notified in Slack</div>
                      </div>
                    </div>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Receive notifications when new episodes are published
                  </p>
                  <Input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    className="mb-3"
                  />
                  <Button variant="outline" size="sm">
                    Connect Slack
                  </Button>
                </div>

                {/* Microsoft Teams */}
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#5059C9] rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.5 0C11.015 0 9 2.015 9 4.5V9H4.5C2.015 9 0 11.015 0 13.5S2.015 18 4.5 18H9v1.5C9 21.985 11.015 24 13.5 24S18 21.985 18 19.5V18h1.5c2.485 0 4.5-2.015 4.5-4.5S21.985 9 19.5 9H18V4.5C18 2.015 15.985 0 13.5 0z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">Microsoft Teams</div>
                        <div className="text-sm text-muted">Teams webhook notifications</div>
                      </div>
                    </div>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Send episode notifications to your Teams channel
                  </p>
                  <Input
                    type="url"
                    placeholder="https://outlook.office.com/webhook/..."
                    className="mb-3"
                  />
                  <Button variant="outline" size="sm">
                    Connect Teams
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Appearance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <Select defaultValue="dark">
                    <option value="dark">Dark (Default)</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto (System)</option>
                  </Select>
                  <p className="text-sm text-muted mt-2">Choose your preferred color scheme</p>
                </div>
                <div className="pt-4">
                  <Button>Save Appearance</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="font-medium mb-2">Password</div>
                  <p className="text-sm text-muted mb-4">Last changed 30 days ago</p>
                  <Button variant="outline">Change Password</Button>
                </div>

                <div className="p-4 bg-secondary rounded-lg">
                  <div className="font-medium mb-2">Two-Factor Authentication</div>
                  <p className="text-sm text-muted mb-4">Add an extra layer of security to your account</p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="danger">
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="font-medium mb-2">Delete Account</div>
                  <p className="text-sm text-muted mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                      Delete Account
                    </Button>
                  ) : (
                    <div className="p-4 bg-background border border-red-500 rounded-lg">
                      <p className="font-medium mb-3">⚠️ Are you absolutely sure?</p>
                      <p className="text-sm text-muted mb-4">
                        All podcasts and episodes will be removed. Continue?
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="danger"
                          onClick={handleDeleteAccount}
                        >
                          Yes, Delete Everything
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

