/**
 * Email Verification Page
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function VerifyPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState('user@example.com');

  useEffect(() => {
    // TODO: Verify email token from URL params via Cognito
    // Simulate verification
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 2000);
  }, []);

  const handleResendEmail = () => {
    alert('Verification email will be resent via AWS Cognito');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Radio className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-primary">Podcast AI</h1>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isVerifying ? 'Verifying Email' : isVerified ? 'Email Verified!' : 'Verify Your Email'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isVerifying ? (
              <div className="text-center py-8">
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted">Please wait while we verify your email...</p>
              </div>
            ) : isVerified ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Success!</p>
                <p className="text-muted mb-6">
                  Your email has been verified. You can now start creating podcasts.
                </p>
                <Link href="/podcasts">
                  <Button size="lg" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-semibold mb-2">Check Your Email</p>
                <p className="text-muted mb-6">
                  We&apos;ve sent a verification link to <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-sm text-muted mb-6">
                  Click the link in the email to verify your account and get started.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResendEmail}
                  >
                    Resend Verification Email
                  </Button>
                  <Link href="/auth/login">
                    <Button variant="ghost" className="w-full">
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

