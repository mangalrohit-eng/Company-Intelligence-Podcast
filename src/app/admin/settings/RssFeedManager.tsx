'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RssFeed } from '@/types/admin-settings';
import { Radio, Plus, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';

interface RssFeedManagerProps {
  feeds: RssFeed[];
  onChange: (feeds: RssFeed[]) => void;
}

export function RssFeedManager({ feeds, onChange }: RssFeedManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<RssFeed>>({
    name: '',
    url: '',
    description: '',
    enabled: true,
  });

  const handleAdd = () => {
    if (!formData.name || !formData.url) return;

    const newFeed: RssFeed = {
      id: `feed_${Date.now()}`,
      name: formData.name,
      url: formData.url,
      description: formData.description || '',
      enabled: formData.enabled ?? true,
    };

    onChange([...feeds, newFeed]);
    setShowAddForm(false);
    setFormData({ name: '', url: '', description: '', enabled: true });
  };

  const handleEdit = (feed: RssFeed) => {
    setEditingId(feed.id);
    setFormData(feed);
  };

  const handleUpdate = () => {
    if (!editingId || !formData.name || !formData.url) return;

    const updatedFeeds = feeds.map(f => 
      f.id === editingId 
        ? { ...f, name: formData.name!, url: formData.url!, description: formData.description, enabled: formData.enabled ?? true }
        : f
    );

    onChange(updatedFeeds);
    setEditingId(null);
    setFormData({ name: '', url: '', description: '', enabled: true });
  };

  const handleDelete = (id: string) => {
    // Using browser confirm for admin actions - can be enhanced later
    if (confirm('Are you sure you want to delete this RSS feed?')) {
      onChange(feeds.filter(f => f.id !== id));
    }
  };

  const handleToggleEnabled = (id: string) => {
    const updatedFeeds = feeds.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    );
    onChange(updatedFeeds);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: '', url: '', description: '', enabled: true });
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Radio className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>RSS Feed Discovery</CardTitle>
              <CardDescription>
                Manage news sources for article discovery • Use {'{company}'} placeholder for company name
              </CardDescription>
            </div>
          </div>
          {!showAddForm && !editingId && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Feed
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-indigo-200 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {editingId ? '✏️ Edit RSS Feed' : '➕ Add New RSS Feed'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feed-name">Feed Name *</Label>
                <Input
                  id="feed-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Google News"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feed-url">Feed URL *</Label>
                <Input
                  id="feed-url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://news.google.com/rss/search?q={company}"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feed-description">Description</Label>
              <Input
                id="feed-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this feed"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="feed-enabled"
                checked={formData.enabled ?? true}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="feed-enabled" className="cursor-pointer">
                Enable this feed
              </Label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={!formData.name || !formData.url}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Feed' : 'Add Feed'}
              </Button>
              <Button
                variant="outline"
                onClick={cancelEdit}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Feed List */}
        <div className="space-y-3">
          {feeds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Radio className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No RSS feeds configured</p>
              <p className="text-sm">Click "Add Feed" to get started</p>
            </div>
          ) : (
            feeds.map((feed) => (
              <div
                key={feed.id}
                className={`border rounded-lg p-4 transition-all ${
                  feed.enabled 
                    ? 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm' 
                    : 'bg-gray-50 border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{feed.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        feed.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {feed.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-2 break-all">
                      {feed.url}
                    </code>

                    {feed.description && (
                      <p className="text-sm text-gray-600">{feed.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleEnabled(feed.id)}
                      className="flex items-center gap-1"
                      title={feed.enabled ? 'Disable feed' : 'Enable feed'}
                    >
                      {feed.enabled ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(feed)}
                      disabled={editingId !== null || showAddForm}
                      title="Edit feed"
                    >
                      ✏️ Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(feed.id)}
                      disabled={editingId !== null || showAddForm}
                      className="text-red-600 hover:bg-red-50"
                      title="Delete feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Helper Info */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Tips:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use <code className="bg-blue-100 px-1 rounded">{'{company}'}</code> as a placeholder - it will be replaced with the podcast's company name</li>
            <li>• Google News is recommended as it aggregates from many sources and supports company search</li>
            <li>• You can temporarily disable feeds without deleting them</li>
            <li>• At least one feed should be enabled for discovery to work</li>
          </ul>
        </div>

        {/* Active Feeds Summary */}
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <span className="text-sm font-medium text-gray-700">
            Active Feeds: <span className="text-indigo-600">{feeds.filter(f => f.enabled).length}</span> of {feeds.length}
          </span>
          {feeds.filter(f => f.enabled).length === 0 && (
            <span className="text-sm text-red-600 font-medium">
              ⚠️ No feeds enabled - discovery will fail!
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

