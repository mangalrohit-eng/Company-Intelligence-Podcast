/**
 * Landing Page
 */

import Link from 'next/link';
import { Play, Mic, TrendingUp, Globe } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Podcast Platform
          </h1>
          <p className="text-xl md:text-2xl text-muted mb-12 max-w-3xl mx-auto">
            Generate intelligent, company-focused podcasts powered by AI.
            Stay ahead with competitor insights and industry trends.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/podcasts/new"
              className="px-8 py-4 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all transform hover:scale-105"
            >
              Create Your Podcast
            </Link>
            <Link
              href="/podcasts"
              className="px-8 py-4 border-2 border-primary hover:bg-primary/10 font-semibold rounded-full transition-all"
            >
              Browse Podcasts
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Intelligent Podcast Generation
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Mic className="w-12 h-12" />}
              title="AI-Powered Scripts"
              description="Automatically generate engaging scripts from latest industry news and insights"
            />
            <FeatureCard
              icon={<TrendingUp className="w-12 h-12" />}
              title="Competitor Analysis"
              description="Track your competitors and get strategic insights in every episode"
            />
            <FeatureCard
              icon={<Globe className="w-12 h-12" />}
              title="Multi-Source Intelligence"
              description="Aggregate news from trusted sources worldwide with smart filtering"
            />
            <FeatureCard
              icon={<Play className="w-12 h-12" />}
              title="One-Click Publishing"
              description="Generate audio, publish to RSS, and distribute to all major platforms"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center text-muted">
        <p>&copy; 2025 AI Podcast Platform. All rights reserved.</p>
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
    <div className="p-6 rounded-lg bg-secondary border border-border hover:border-primary transition-all group">
      <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  );
}

