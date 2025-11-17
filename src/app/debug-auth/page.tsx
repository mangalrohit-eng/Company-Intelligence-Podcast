'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthDebugPage() {
  const { user, getToken } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      setError(null);
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession({ forceRefresh: false });
      
      setSessionInfo({
        hasTokens: !!session.tokens,
        hasIdToken: !!session.tokens?.idToken,
        hasAccessToken: !!session.tokens?.accessToken,
        credentials: !!session.credentials,
        identityId: session.identityId,
        tokenLength: session.tokens?.idToken?.toString().length,
      });
      
      const token = session.tokens?.idToken?.toString();
      if (token) {
        setTokenInfo(token.substring(0, 100) + '...');
      } else {
        setTokenInfo(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testAPICall = async () => {
    try {
      setError(null);
      const { api } = await import('@/lib/api');
      const response = await api.get('/podcasts');
      
      if (response.ok) {
        alert('✅ API call successful!');
      } else {
        const data = await response.json();
        alert(`❌ API call failed: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Context</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p><strong>User ID:</strong> {user.userId}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.name || 'Not set'}</p>
                <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <p className="text-muted">No user logged in</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkSession} className="mb-4">
              Check Session
            </Button>
            
            {sessionInfo && (
              <div className="space-y-2 text-sm">
                <p><strong>Has Tokens:</strong> {sessionInfo.hasTokens ? '✅' : '❌'}</p>
                <p><strong>Has ID Token:</strong> {sessionInfo.hasIdToken ? '✅' : '❌'}</p>
                <p><strong>Has Access Token:</strong> {sessionInfo.hasAccessToken ? '✅' : '❌'}</p>
                <p><strong>Has Credentials:</strong> {sessionInfo.credentials ? '✅' : '❌'}</p>
                <p><strong>Identity ID:</strong> {sessionInfo.identityId || 'None'}</p>
                <p><strong>Token Length:</strong> {sessionInfo.tokenLength || 0} characters</p>
              </div>
            )}
            
            {tokenInfo && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs font-mono break-all">{tokenInfo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testAPICall}>
              Test API Call (GET /podcasts)
            </Button>
            <p className="text-sm text-muted mt-2">
              This will test if authentication is working with the API.
              Check browser console for detailed logs.
            </p>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-red-500 overflow-auto">{error}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

