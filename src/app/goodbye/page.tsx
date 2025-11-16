/**
 * Goodbye Page - Shown after account deletion
 */

import Link from 'next/link';
import { CheckCircle, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GoodbyePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Radio className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Podcast AI</h1>
        </Link>

        <Card className="p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-primary" />
          </div>

          <h2 className="text-3xl font-bold mb-4">Account Successfully Deleted</h2>
          
          <p className="text-lg text-muted mb-6">
            Your account and all associated data have been permanently removed from our systems.
          </p>

          <div className="bg-secondary border border-border rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold mb-3">What we've removed:</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                All podcast configurations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                Generated episodes and audio files
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                RSS feeds and distribution data
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                Personal information and account details
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                Pipeline runs and analytics
              </li>
            </ul>
          </div>

          <p className="text-muted mb-8">
            We&apos;re sorry to see you go. If you change your mind, you can always create a new account and start fresh.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                Back to Home
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Create New Account
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted">
              Need help or have feedback?{' '}
              <a href="mailto:support@podcastai.com" className="text-primary hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </Card>

        <p className="text-center text-sm text-muted mt-6">
          Data retention: Backups will be permanently deleted within 30 days
        </p>
      </div>
    </div>
  );
}

