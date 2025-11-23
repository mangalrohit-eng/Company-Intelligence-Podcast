/**
 * Landing Page
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Mic, TrendingUp, Globe, Sparkles, Zap, Radio, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Dashboard } from '@/components/Dashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Home() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const isAuthenticated = !!user;

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show dashboard for authenticated users
  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <main className="min-h-screen bg-background overflow-hidden" role="main">
      {/* Header - Only show for unauthenticated users */}
      {!isAuthenticated && (
        <header 
          className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border safe-area-top"
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <Link 
              href="/" 
              className="flex items-center gap-2 min-h-[44px] min-w-[44px]"
              aria-label="Home"
            >
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" aria-hidden="true" />
              <span className="text-lg sm:text-xl font-bold text-primary">Podcast AI</span>
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-sm">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="text-sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section */}
      <section 
        className={`relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16 lg:py-20 ${!isAuthenticated ? 'pt-24 sm:pt-32' : 'lg:pt-20'}`}
        aria-labelledby="hero-heading"
      >
        {/* Animated Background */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="absolute top-20 left-4 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-4 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6 text-primary">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide">AI-Powered Intelligence</span>
          </div>
          
          <h1 
            id="hero-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 px-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000"
          >
            Turn Your Company News Into a Podcast — Automatically
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Generate intelligent, company-focused podcasts powered by AI.
            Stay ahead with competitor insights and industry trends delivered daily.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Link href="/podcasts/new" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Play className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                <span>Create Your Podcast</span>
              </Button>
            </Link>
            <Link href="/podcasts" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Radio className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                <span>Browse Podcasts</span>
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-muted px-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>13-Stage AI Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Real-time Insights</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Global Sources</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-secondary/20"
        aria-labelledby="features-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 id="features-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Everything You Need for Intelligence Podcasts
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted max-w-2xl mx-auto px-4">
              Powered by OpenAI GPT-4, our 13-stage pipeline delivers professional podcasts automatically
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <FeatureCard
              icon={<Mic className="w-10 h-10" />}
              title="AI-Powered Scripts"
              description="Generate engaging narratives from latest industry news with natural language processing"
            />
            <FeatureCard
              icon={<TrendingUp className="w-10 h-10" />}
              title="Competitor Analysis"
              description="Track competitors and get strategic insights with automated contrast analysis"
            />
            <FeatureCard
              icon={<Globe className="w-10 h-10" />}
              title="Multi-Source Intelligence"
              description="Aggregate from trusted sources worldwide with smart filtering and ranking"
            />
            <FeatureCard
              icon={<Play className="w-10 h-10" />}
              title="One-Click Publishing"
              description="Generate audio with OpenAI TTS and publish to RSS for Apple/Spotify distribution"
            />
          </div>
        </div>
      </section>

      {/* Demo Player Section */}
      <section 
        className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-secondary/20 to-background"
        aria-labelledby="demo-heading"
      >
        <div className="max-w-4xl mx-auto">
          <h2 id="demo-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4">
            Hear the Quality
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted text-center mb-8 sm:mb-12 px-4">
            Listen to a sample AI-generated podcast episode
          </p>

          <Card className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center">
              {/* Cover Art */}
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="w-full max-w-[192px] sm:w-48 h-48 mx-auto sm:mx-0 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg aspect-square">
                  <Radio className="w-16 h-16 sm:w-24 sm:h-24 text-background" aria-hidden="true" />
                </div>
              </div>

              {/* Player Info & Controls */}
              <div className="flex-1 w-full">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Sample Episode: Tech Industry Update</h3>
                <p className="text-sm sm:text-base text-muted mb-4">A 2-minute daily briefing on tech news and competitor movements</p>
                
                {/* Audio Player */}
                <div className="bg-background border border-border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3">
                    <button 
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-primary hover:bg-accent active:bg-accent/90 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg min-h-[48px] min-w-[48px] touch-manipulation"
                      aria-label="Play sample episode"
                    >
                      <svg className="w-6 h-6 text-background" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <div className="w-full bg-border rounded-full h-2 cursor-pointer">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted mt-1">
                        <span>0:00</span>
                        <span>2:15</span>
                      </div>
                    </div>
                    <button 
                      className="text-muted hover:text-foreground active:text-foreground/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                      aria-label="Volume control"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Waveform Visualization */}
                  <div className="flex items-center justify-center gap-0.5 h-12">
                    {[...Array(50)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary/30 rounded-full transition-all hover:bg-primary cursor-pointer"
                        style={{
                          height: `${20 + Math.random() * 60}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted mt-4 text-center">
                  🎧 In production, this would play an actual generated sample
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section 
        className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6"
        aria-labelledby="how-it-works-heading"
      >
        <div className="max-w-7xl mx-auto">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 lg:mb-16">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              { step: '01', title: 'Configure', desc: 'Set your company, competitors, topics, and cadence in a simple 5-step wizard' },
              { step: '02', title: 'AI Pipeline', desc: 'Our 13-stage pipeline discovers, scrapes, analyzes, and generates your episode' },
              { step: '03', title: 'Publish', desc: 'Audio is generated with OpenAI TTS and published to your RSS feed automatically' },
            ].map((item) => (
              <Card key={item.step} className="p-8 hover:border-primary transition-all group">
                <div className="text-5xl font-bold text-primary/20 mb-4 group-hover:text-primary/40 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-primary/10"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted mb-6 sm:mb-8 px-4">
            Create your first AI-powered podcast in less than 5 minutes
          </p>
          <Link href="/podcasts/new" className="inline-block">
            <Button size="lg" className="gap-2">
              <Play className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>Create Your First Podcast</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="border-t border-border py-6 sm:py-8 px-4 sm:px-6"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm sm:text-base text-muted">&copy; 2025 AI Podcast Platform. All rights reserved.</p>
            <nav aria-label="Footer navigation">
              <div className="flex gap-4 sm:gap-6 text-sm text-muted">
                <Link href="#" className="hover:text-primary active:text-primary/80 transition-colors min-h-[44px] flex items-center">Privacy</Link>
                <Link href="#" className="hover:text-primary active:text-primary/80 transition-colors min-h-[44px] flex items-center">Terms</Link>
                <Link href="#" className="hover:text-primary active:text-primary/80 transition-colors min-h-[44px] flex items-center">Contact</Link>
              </div>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-4 sm:p-6 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all group touch-manipulation">
      <div className="text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-muted leading-relaxed">{description}</p>
    </Card>
  );
}

