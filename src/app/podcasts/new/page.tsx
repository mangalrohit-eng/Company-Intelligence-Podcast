/**
 * New Podcast Wizard - 5-step creation flow
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Zap, Sparkles, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';

type Step = 1 | 2 | 3 | 4 | 5;

export default function NewPodcastPage() {
  const [setupMode, setSetupMode] = useState<'choice' | 'easy' | 'advanced'>('choice');
  const [easyModeCompany, setEasyModeCompany] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    // Step 1: Branding
    title: '',
    subtitle: '',
    description: '',
    author: '',
    email: '',
    category: 'Business',
    explicit: false,
    language: 'en',

    // Step 2: Company & Industry
    companyId: '',
    industryId: '',
    competitorIds: [] as string[],

    // Step 3: Preset & Cadence
    cadence: 'weekly' as const,
    durationMinutes: 5,
    publishTime: '09:00',
    timezone: 'America/New_York',
    timeWindowHours: 168,

    // Step 4: Topics & Regions
    topicIds: [] as string[],
    topicPriorities: {} as Record<string, number>,
    regions: ['US'],
    sourceLanguages: ['en'],
    robotsMode: 'strict' as const,
    allowDomains: [] as string[],
    blockDomains: [] as string[],

    // Step 5: Voice
    voiceId: 'alloy',
    voiceSpeed: 1.0,
    voiceTone: 'professional',
  });

  const steps = [
    { num: 1, title: 'Branding', desc: 'Metadata & identity' },
    { num: 2, title: 'Company', desc: 'Focus & competitors' },
    { num: 3, title: 'Cadence', desc: 'Schedule & duration' },
    { num: 4, title: 'Topics', desc: 'Coverage & sources' },
    { num: 5, title: 'Voice', desc: 'Audio settings' },
  ];

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleEasyModeSubmit = async () => {
    if (!easyModeCompany.trim()) {
      alert('Please enter your company name');
      return;
    }

    try {
      // Auto-generate all settings based on company name
      const companyName = easyModeCompany.trim();
      const { api } = await import('@/lib/api');
      const response = await api.post('/podcasts', {
        // Auto-generated branding
        title: `${companyName} Intelligence Briefing`,
        subtitle: `Daily insights for ${companyName}`,
        description: `Stay ahead of the curve with AI-powered intelligence briefings tailored for ${companyName}. Get daily updates on industry trends, competitor moves, and market insights.`,
        author: companyName,
        email: '', // Will use user's email from auth
        category: 'Business',
        explicit: false,
        language: 'en',
        
        // Company settings
        companyId: companyName,
        industryId: 'technology', // Default
        competitorIds: [],
        
        // Smart defaults for cadence
        cadence: 'daily',
        durationMinutes: 5,
        publishTime: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timeWindowHours: 24,
        
        // Topics & regions defaults
        topics: ['company-news', 'competitor-analysis', 'industry-trends'],
        topicPriorities: {
          'company-news': 3,
          'competitor-analysis': 2,
          'industry-trends': 2
        },
        regions: ['US'],
        sourceLanguages: ['en'],
        robotsMode: 'strict',
        allowDomains: [],
        blockDomains: [],
        
        // Voice defaults
        voiceId: 'alloy',
        voiceSpeed: 1.0,
        voiceTone: 'professional',
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = `/podcasts/${data.id}`;
      } else {
        const error = await response.text();
        alert(`Failed to create podcast: ${error}`);
      }
    } catch (error) {
      console.error('Error creating podcast:', error);
      alert('Failed to create podcast. Please try again.');
    }
  };

  const handleSubmit = async () => {
    try {
      // Create podcast via AWS Lambda API Gateway with auth token
      const { api } = await import('@/lib/api');
      const response = await api.post('/podcasts', {
          title: formData.title,
          description: formData.description,
          companyId: formData.companyId,
          competitors: formData.competitorIds || [],
          topics: formData.topicIds || [],
          duration: formData.durationMinutes || 5,
          voice: formData.voiceId || 'alloy',
          schedule: formData.cadence || 'weekly',
        });

      if (response.ok) {
        const data = await response.json();
        // Redirect to the new podcast's page
        window.location.href = `/podcasts/${data.id}`;
      } else {
        const error = await response.text();
        alert(`Failed to create podcast: ${error}`);
      }
    } catch (error) {
      console.error('Error creating podcast:', error);
      alert('Failed to create podcast. Please try again.');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Create New Podcast</h1>
          <p className="text-muted">
            {setupMode === 'choice' && 'Choose your setup experience'}
            {setupMode === 'easy' && 'Quick setup - Just enter your company name'}
            {setupMode === 'advanced' && 'Follow these 5 steps to configure your AI-powered podcast'}
          </p>
        </div>

        {/* Setup Mode Choice */}
        {setupMode === 'choice' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Easy Mode Card */}
              <Card className="p-8 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Easy Mode</h2>
                  <p className="text-muted mb-6 leading-relaxed">
                    Just enter your company name and we'll handle the rest with smart defaults.
                    Perfect for getting started quickly.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full gap-2"
                    onClick={() => setSetupMode('easy')}
                  >
                    <Sparkles className="w-5 h-5" />
                    I'm Feeling Lucky
                  </Button>
                  <p className="text-xs text-muted mt-3">⚡ Setup in 30 seconds</p>
                </div>
              </Card>

              {/* Advanced Mode Card */}
              <Card className="p-8 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Settings className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Advanced Setup</h2>
                  <p className="text-muted mb-6 leading-relaxed">
                    Full control over all settings including competitors, topics, voice, and scheduling.
                    Customize everything.
                  </p>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setSetupMode('advanced')}
                  >
                    <Settings className="w-5 h-5" />
                    Custom Setup
                  </Button>
                  <p className="text-xs text-muted mt-3">🎯 Full customization</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Easy Mode Form */}
        {setupMode === 'easy' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Quick Setup</h2>
                <p className="text-muted">
                  We'll create an intelligent daily briefing podcast for your company with optimal settings
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={easyModeCompany}
                    onChange={(e) => setEasyModeCompany(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="text-lg p-6"
                    autoFocus
                  />
                  <p className="text-xs text-muted mt-2">
                    This will be used to generate your podcast title and content focus
                  </p>
                </div>

                {/* Preview of what will be created */}
                {easyModeCompany.trim() && (
                  <div className="bg-secondary border border-border rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold text-sm text-primary mb-3">📋 What we'll create:</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Title:</span>{' '}
                          <span className="text-muted">{easyModeCompany} Intelligence Briefing</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Schedule:</span>{' '}
                          <span className="text-muted">Daily at 9:00 AM</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Duration:</span>{' '}
                          <span className="text-muted">~5 minutes</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Topics:</span>{' '}
                          <span className="text-muted">Company news, Competitor analysis, Industry trends</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Voice:</span>{' '}
                          <span className="text-muted">Professional AI narrator</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted pt-3 border-t border-border">
                      💡 You can customize all settings later from the podcast settings page
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setSetupMode('choice')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleEasyModeSubmit}
                  disabled={!easyModeCompany.trim()}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Podcast
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Advanced Mode - Original 5-step flow */}
        {setupMode === 'advanced' && (
          <>

        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold border-2 transition-all shadow-lg ${
                      currentStep === step.num
                        ? 'bg-primary border-primary text-background scale-110 shadow-primary/50'
                        : currentStep > step.num
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-secondary border-border text-muted'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <Check className="w-7 h-7" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-sm font-semibold">{step.title}</div>
                    <div className="text-xs text-muted">{step.desc}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-4 rounded-full transition-all ${
                      currentStep > step.num ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Mobile Stepper */}
          <div className="md:hidden">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted">Step {currentStep} of 5</span>
              <span className="text-sm font-semibold">{steps[currentStep - 1].title}</span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-6 md:p-8 mb-8">
          {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <Step3 formData={formData} setFormData={setFormData} />}
          {currentStep === 4 && <Step4 formData={formData} setFormData={setFormData} />}
          {currentStep === 5 && <Step5 formData={formData} setFormData={setFormData} />}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              size="lg"
              className="gap-2"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              size="lg"
              className="gap-2 px-8"
            >
              <Check className="w-5 h-5" />
              Create Podcast
            </Button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}

function Step1({ formData, setFormData }: any) {
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size and type
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('File must be an image');
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setFormData({ ...formData, coverFile: file });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Branding & Metadata</h2>
        <p className="text-muted">Define your podcast&apos;s identity and basic information</p>
      </div>

      {/* Cover Art Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Cover Art (3000×3000)</label>
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center overflow-hidden border-2 border-border">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <svg className="w-12 h-12 mx-auto mb-2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-muted">No image</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
              id="cover-upload"
            />
            <label
              htmlFor="cover-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-accent text-background rounded-lg cursor-pointer transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Cover Art
            </label>
            <p className="text-xs text-muted mt-2">
              • Recommended: 3000×3000px<br/>
              • Format: JPG or PNG<br/>
              • Max size: 10MB<br/>
              • Square aspect ratio required
            </p>
            {coverPreview && (
              <button
                onClick={() => {
                  setCoverPreview(null);
                  setFormData({ ...formData, coverFile: null });
                }}
                className="text-sm text-red-500 hover:underline mt-2"
              >
                Remove image
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Podcast Title *</label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Your Company Intelligence Podcast"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Subtitle</label>
        <Input
          type="text"
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          placeholder="Daily insights on tech and innovation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          placeholder="Describe your podcast..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Author *</label>
          <Input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@company.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Business">Business</option>
            <option value="Technology">Technology</option>
            <option value="News">News</option>
            <option value="Education">Education</option>
            <option value="Science">Science</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Language</label>
          <Select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </Select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer h-12">
            <input
              type="checkbox"
              checked={formData.explicit}
              onChange={(e) => setFormData({ ...formData, explicit: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium">Explicit Content</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }: any) {
  const [companyName, setCompanyName] = useState('');
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<string[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);
  const [competitorError, setCompetitorError] = useState('');
  
  // ❌ HARDCODED FALLBACK REMOVED - REAL AI API ONLY FOR TESTING
  // Uncomment this only if you want fallback behavior in production
  /*
  const competitorMap: Record<string, string[]> = {
    'att': ['Verizon', 'T-Mobile', 'Dish Network', 'Comcast'],
    'at&t': ['Verizon', 'T-Mobile', 'Dish Network', 'Comcast'],
    // ... etc
  };
  */

  const handleCompanyChange = async (value: string) => {
    setCompanyName(value);
    setFormData({ ...formData, companyId: value });
    setCompetitorError('');
    
    // Don't fetch if less than 3 characters
    if (value.length < 3) {
      setSuggestedCompetitors([]);
      return;
    }
    
    // Try AI-powered suggestions first
    setIsLoadingCompetitors(true);
    
    try {
      const { api } = await import('@/lib/api');
      const response = await api.post('/competitors/suggest', { 
        companyName: value 
      }, {
        requireAuth: false, // Skip auth for local development
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestedCompetitors(data.competitors || []);
        setCompetitorError(''); // Clear any previous errors
      } else {
        // ❌ NO FALLBACK - SHOW REAL ERROR FROM API
        setSuggestedCompetitors([]);
        const errorData = await response.json().catch(() => ({}));
        setCompetitorError(
          `⚠️ API Error: ${errorData.error || response.statusText}. Check OpenAI API key and Lambda logs.`
        );
      }
    } catch (error) {
      console.error('Failed to fetch competitor suggestions:', error);
      
      // ❌ NO FALLBACK - SHOW REAL ERROR
      setSuggestedCompetitors([]);
      setCompetitorError(
        `❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check API Gateway and Lambda deployment.`
      );
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  const toggleCompetitor = (competitor: string) => {
    const currentCompetitors = formData.competitorIds || [];
    const isSelected = currentCompetitors.includes(competitor);
    
    const updated = isSelected
      ? currentCompetitors.filter((c: string) => c !== competitor)
      : [...currentCompetitors, competitor];
    
    setFormData({ ...formData, competitorIds: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Company & Industry</h2>
        <p className="text-muted">Define your focus and we&apos;ll suggest relevant competitors</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Company *</label>
        <Input
          type="text"
          value={companyName}
          onChange={(e) => handleCompanyChange(e.target.value)}
          placeholder="e.g., AT&T, Verizon, Apple, Microsoft..."
        />
        {companyName && suggestedCompetitors.length === 0 && (
          <p className="text-sm text-yellow-500 mt-2 flex items-center gap-2">
            <span>💡</span>
            <span>No competitors found. Try entering the full company name.</span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Industry *</label>
        <Select 
          value={formData.industryId}
          onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
        >
          <option value="">Select industry...</option>
          <option value="technology">Technology</option>
          <option value="telecom">Telecommunications</option>
          <option value="finance">Finance & Banking</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail & E-commerce</option>
          <option value="automotive">Automotive</option>
          <option value="consumer">Consumer Goods</option>
        </Select>
      </div>

      {isLoadingCompetitors && (
        <div className="p-4 bg-blue-950/30 border border-blue-800 rounded-lg">
          <p className="text-sm flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Generating AI-powered competitor suggestions...
          </p>
        </div>
      )}

      {competitorError && (
        <div className="p-4 bg-yellow-950/30 border border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-400">{competitorError}</p>
        </div>
      )}

      {!isLoadingCompetitors && suggestedCompetitors.length > 0 && (
        <div className="p-4 bg-green-950/30 border border-green-800 rounded-lg animate-in fade-in duration-300">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-green-400">🤖</span>
            AI-Generated Competitors for {companyName}
          </h3>
          <p className="text-sm text-muted mb-4">
            Based on your company, we recommend tracking these competitors
          </p>
          <div className="space-y-2">
            {suggestedCompetitors.map((competitor) => (
              <label 
                key={competitor} 
                className="flex items-center gap-2 cursor-pointer hover:bg-green-900/20 p-2 rounded transition-colors"
              >
                <input 
                  type="checkbox" 
                  className="w-4 h-4 cursor-pointer"
                  checked={(formData.competitorIds || []).includes(competitor)}
                  onChange={() => toggleCompetitor(competitor)}
                />
                <span>{competitor}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            ✓ Selected: {(formData.competitorIds || []).length} competitor(s)
          </p>
        </div>
      )}
    </div>
  );
}

function Step3({ formData, setFormData }: any) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const presets = [
    { name: 'Daily 2-min', cadence: 'daily', duration: 2, icon: '📅' },
    { name: 'Weekly 5-min', cadence: 'weekly', duration: 5, icon: '📆' },
    { name: 'Monthly 10-min', cadence: 'monthly', duration: 10, icon: '🗓️' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Preset & Cadence</h2>
        <p className="text-muted">Choose how often episodes should be generated</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Choose a preset</label>
        <div className="grid md:grid-cols-3 gap-4">
          {presets.map((preset) => {
            const isSelected = !isCustomMode && formData.cadence === preset.cadence && formData.durationMinutes === preset.duration;
            return (
              <Card
                key={preset.name}
                onClick={() => {
                  setIsCustomMode(false);
                  setFormData({
                    ...formData,
                    cadence: preset.cadence,
                    durationMinutes: preset.duration,
                    timeWindowHours: preset.cadence === 'daily' ? 24 : preset.cadence === 'weekly' ? 168 : 720,
                  });
                }}
                className={`p-6 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'hover:border-primary/50'
                }`}
              >
                <div className="text-4xl mb-3">{preset.icon}</div>
                <div className="text-xl font-semibold mb-2">{preset.name}</div>
                <div className="text-sm text-muted capitalize">{preset.cadence} episodes</div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Mode Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isCustomMode}
          onChange={(e) => setIsCustomMode(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          id="custom-mode"
        />
        <label htmlFor="custom-mode" className="text-sm font-medium cursor-pointer">
          Custom Mode (Advanced)
        </label>
      </div>

      {/* Custom Mode Sliders */}
      {isCustomMode && (
        <Card className="p-6 bg-primary/5 border-primary/30">
          <h3 className="font-semibold mb-4">Custom Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Episode Duration: {formData.durationMinutes} minutes
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>1 min</span>
                <span>30 min</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Time Window: {formData.timeWindowHours} hours ({Math.round(formData.timeWindowHours / 24)} days)
              </label>
              <input
                type="range"
                min="24"
                max="720"
                step="24"
                value={formData.timeWindowHours}
                onChange={(e) => setFormData({ ...formData, timeWindowHours: parseInt(e.target.value) })}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cadence</label>
              <Select
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Publish Time</label>
          <Input
            type="time"
            value={formData.publishTime}
            onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Timezone</label>
          <Select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          >
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Asia/Tokyo</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Step4({ formData, setFormData }: any) {
  const [topicPriorities, setTopicPriorities] = useState<Record<string, number>>({
    'Earnings': 80,
    'Product Launches': 70,
    'M&A': 60,
    'Leadership': 50,
    'Technology': 85,
    'Strategy': 75,
  });

  const [selectedRegions, setSelectedRegions] = useState<string[]>(['US', 'UK']);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);

  const regions = ['US', 'UK', 'EU', 'APAC', 'LATAM', 'MEA', 'Global'];
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
  ];

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Topics & Regions</h2>
        <p className="text-muted">Configure what content to include and prioritize</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Standard Topics with Priority</label>
        <div className="space-y-4">
          {Object.entries(topicPriorities).map(([topic, priority]) => (
            <div key={topic} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="font-medium">{topic}</span>
                </label>
                <span className="text-sm text-muted">Priority: {priority}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={priority}
                onChange={(e) => setTopicPriorities({ ...topicPriorities, [topic]: parseInt(e.target.value) })}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-primary/10 border-primary/30">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-primary">✨</span>
          AI-Suggested Special Topics
        </h3>
        <p className="text-sm text-muted mb-4">Based on your industry and competitors</p>
        <div className="space-y-2">
          {[
            { name: 'AI & Machine Learning', desc: 'Latest AI developments and applications' },
            { name: 'Sustainability', desc: 'ESG and environmental initiatives' },
            { name: 'Digital Transformation', desc: 'Technology adoption and modernization' },
          ].map((topic) => (
            <label key={topic.name} className="flex items-start gap-2 p-2 hover:bg-primary/5 rounded cursor-pointer">
              <input type="checkbox" className="w-4 h-4 mt-0.5" />
              <div>
                <div className="font-medium">{topic.name}</div>
                <div className="text-xs text-muted">{topic.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <div>
        <label className="block text-sm font-medium mb-3">Geographic Regions</label>
        <div className="flex flex-wrap gap-2">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedRegions.includes(region)
                  ? 'bg-primary text-background'
                  : 'bg-secondary border border-border hover:border-primary'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Source Languages</label>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => toggleLanguage(lang.code)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedLanguages.includes(lang.code)
                  ? 'bg-primary text-background'
                  : 'bg-secondary border border-border hover:border-primary'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-secondary">
        <h3 className="font-semibold mb-3">Compliance & Filtering</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="text-sm">Respect robots.txt (recommended)</span>
          </label>
          
          <div>
            <label className="block text-sm font-medium mb-2">Allow Domains (whitelist)</label>
            <Input
              type="text"
              placeholder="example.com, news.com (comma separated)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Block Domains (blacklist)</label>
            <Input
              type="text"
              placeholder="spam.com, unwanted.com (comma separated)"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Step5({ formData, setFormData }: any) {
  const voices = [
    { id: 'alloy', name: 'Alloy', desc: 'Neutral and balanced' },
    { id: 'echo', name: 'Echo', desc: 'Warm and friendly' },
    { id: 'fable', name: 'Fable', desc: 'Clear and expressive' },
    { id: 'onyx', name: 'Onyx', desc: 'Deep and authoritative' },
    { id: 'nova', name: 'Nova', desc: 'Energetic and youthful' },
    { id: 'shimmer', name: 'Shimmer', desc: 'Smooth and professional' },
  ];

  const tones = ['conversational', 'professional', 'energetic', 'formal'];

  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);

  const playVoicePreview = async (voiceId: string) => {
    try {
      setIsPlayingPreview(voiceId);
      
      // Call real OpenAI TTS API
      const { api } = await import('@/lib/api');
      const response = await api.post('/voice/preview', { voiceId });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsPlayingPreview(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsPlayingPreview(null);
          alert('Failed to play audio preview');
        };
        
        await audio.play();
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      alert('Failed to generate voice preview. Make sure OpenAI API key is configured.');
      setIsPlayingPreview(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Voice & Review</h2>
        <p className="text-muted">Choose your podcast voice and review settings</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">OpenAI TTS Voice</label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <Card
              key={voice.id}
              className={`p-4 cursor-pointer transition-all ${
                formData.voiceId === voice.id
                  ? 'border-primary bg-primary/10'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setFormData({ ...formData, voiceId: voice.id })}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold capitalize">{voice.name}</div>
                  <div className="text-xs text-muted">{voice.desc}</div>
                </div>
                {formData.voiceId === voice.id && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playVoicePreview(voice.id);
                }}
                disabled={isPlayingPreview === voice.id}
                className="mt-3 w-full px-3 py-1.5 text-xs bg-background hover:bg-border border border-border rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlayingPreview === voice.id ? (
                  <>
                    <span className="animate-pulse">🔊</span>
                    Playing...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
                    </svg>
                    Preview
                  </>
                )}
              </button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Tone Style</label>
        <div className="flex flex-wrap gap-3">
          {tones.map((tone) => (
            <button
              key={tone}
              onClick={() => setFormData({ ...formData, voiceTone: tone })}
              className={`px-4 py-2 rounded-lg capitalize transition-all ${
                formData.voiceTone === tone
                  ? 'bg-primary text-background'
                  : 'bg-secondary border border-border hover:border-primary'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Voice Speed: {formData.voiceSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={formData.voiceSpeed}
          onChange={(e) =>
            setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>0.5x (Slower)</span>
          <span>1.0x (Normal)</span>
          <span>2.0x (Faster)</span>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Review Your Podcast
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Title:</span>
              <span className="font-medium">{formData.title || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Company:</span>
              <span className="font-medium">{formData.companyId || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Cadence:</span>
              <span className="font-medium capitalize">{formData.cadence}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Duration:</span>
              <span className="font-medium">{formData.durationMinutes} minutes</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Voice:</span>
              <span className="font-medium capitalize">{formData.voiceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tone:</span>
              <span className="font-medium capitalize">{formData.voiceTone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Language:</span>
              <span className="font-medium">{formData.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Category:</span>
              <span className="font-medium">{formData.category}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

