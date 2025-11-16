/**
 * New Podcast Wizard - 5-step creation flow
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5;

export default function NewPodcastPage() {
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

  const handleSubmit = async () => {
    // TODO: Submit to API
    console.log('Creating podcast:', formData);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold border-2 transition-all ${
                      currentStep === step.num
                        ? 'bg-primary border-primary text-background'
                        : currentStep > step.num
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-secondary border-border text-muted'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-semibold">{step.title}</div>
                    <div className="text-xs text-muted">{step.desc}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 ${
                      currentStep > step.num ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-secondary border border-border rounded-lg p-8 mb-8">
          {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <Step3 formData={formData} setFormData={setFormData} />}
          {currentStep === 4 && <Step4 formData={formData} setFormData={setFormData} />}
          {currentStep === 5 && <Step5 formData={formData} setFormData={setFormData} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 border border-border hover:border-primary rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-accent text-background font-semibold rounded-full transition-all"
            >
              <Check className="w-5 h-5" />
              Create Podcast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step1({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold mb-8">Branding & Metadata</h2>

      <div>
        <label className="block text-sm font-medium mb-2">Podcast Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          placeholder="Your Company Intelligence Podcast"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Subtitle</label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          placeholder="Daily insights on tech and innovation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          rows={4}
          placeholder="Describe your podcast..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Author *</label>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }: any) {
  const [companyName, setCompanyName] = useState('');
  const [suggestedCompetitors, setSuggestedCompetitors] = useState<string[]>([]);
  
  // Competitor database - in production, this would be an API call
  const competitorMap: Record<string, string[]> = {
    'att': ['Verizon', 'T-Mobile', 'Dish Network', 'Comcast'],
    'at&t': ['Verizon', 'T-Mobile', 'Dish Network', 'Comcast'],
    'verizon': ['AT&T', 'T-Mobile', 'Dish Network', 'Charter Communications'],
    't-mobile': ['AT&T', 'Verizon', 'Dish Network', 'US Cellular'],
    'tmobile': ['AT&T', 'Verizon', 'Dish Network', 'US Cellular'],
    'apple': ['Samsung', 'Google', 'Microsoft', 'Amazon'],
    'microsoft': ['Google', 'Amazon', 'Apple', 'Oracle', 'Salesforce'],
    'google': ['Microsoft', 'Amazon', 'Apple', 'Meta'],
    'amazon': ['Microsoft', 'Google', 'Walmart', 'Target'],
    'meta': ['Google', 'TikTok', 'Snap', 'Twitter/X'],
    'facebook': ['Google', 'TikTok', 'Snap', 'Twitter/X'],
    'tesla': ['Ford', 'GM', 'Rivian', 'Lucid Motors', 'BYD'],
    'ford': ['Tesla', 'GM', 'Stellantis', 'Toyota'],
    'gm': ['Ford', 'Tesla', 'Stellantis', 'Toyota'],
    'walmart': ['Amazon', 'Target', 'Costco', 'Kroger'],
    'target': ['Walmart', 'Amazon', 'Costco', 'Best Buy'],
    'jpmorgan': ['Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'],
    'chase': ['Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'],
    'bank of america': ['JPMorgan Chase', 'Wells Fargo', 'Citigroup', 'US Bank'],
    'wells fargo': ['JPMorgan Chase', 'Bank of America', 'Citigroup', 'US Bank'],
    'coca-cola': ['PepsiCo', 'Dr Pepper', 'Monster Beverage', 'Keurig Dr Pepper'],
    'pepsi': ['Coca-Cola', 'Dr Pepper', 'Monster Beverage', 'Red Bull'],
    'nike': ['Adidas', 'Under Armour', 'Puma', 'Lululemon'],
    'adidas': ['Nike', 'Puma', 'Under Armour', 'New Balance'],
  };

  const handleCompanyChange = (value: string) => {
    setCompanyName(value);
    setFormData({ ...formData, companyId: value });
    
    // Generate competitor suggestions
    const normalized = value.toLowerCase().trim();
    const competitors = competitorMap[normalized] || [];
    setSuggestedCompetitors(competitors);
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
      <h2 className="text-3xl font-bold mb-8">Company & Industry</h2>
      <p className="text-muted mb-6">Define your focus and we'll suggest relevant competitors</p>

      <div>
        <label className="block text-sm font-medium mb-2">Company *</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => handleCompanyChange(e.target.value)}
          placeholder="e.g., AT&T, Verizon, Apple, Microsoft..."
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
        />
        {companyName && suggestedCompetitors.length === 0 && (
          <p className="text-sm text-yellow-500 mt-2">
            💡 No competitors found. Try entering the full company name.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Industry *</label>
        <select 
          value={formData.industryId}
          onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Select industry...</option>
          <option value="technology">Technology</option>
          <option value="telecom">Telecommunications</option>
          <option value="finance">Finance & Banking</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail & E-commerce</option>
          <option value="automotive">Automotive</option>
          <option value="consumer">Consumer Goods</option>
        </select>
      </div>

      {suggestedCompetitors.length > 0 && (
        <div className="p-4 bg-green-950/30 border border-green-800 rounded-lg animate-in fade-in duration-300">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-green-400">✨</span>
            AI-Suggested Competitors for {companyName}
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
  const presets = [
    { name: 'Daily 2-min', cadence: 'daily', duration: 2 },
    { name: 'Weekly 5-min', cadence: 'weekly', duration: 5 },
    { name: 'Monthly 10-min', cadence: 'monthly', duration: 10 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold mb-8">Preset & Cadence</h2>

      <div>
        <label className="block text-sm font-medium mb-4">Choose a preset</label>
        <div className="grid md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                setFormData({
                  ...formData,
                  cadence: preset.cadence,
                  durationMinutes: preset.duration,
                })
              }
              className={`p-6 border-2 rounded-lg transition-all ${
                formData.cadence === preset.cadence && formData.durationMinutes === preset.duration
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-xl font-semibold mb-2">{preset.name}</div>
              <div className="text-sm text-muted capitalize">{preset.cadence} episodes</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Publish Time</label>
          <input
            type="time"
            value={formData.publishTime}
            onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Asia/Tokyo</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function Step4({ formData: _formData, setFormData: _setFormData }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold mb-8">Topics & Regions</h2>

      <div>
        <label className="block text-sm font-medium mb-4">Standard Topics</label>
        <div className="grid md:grid-cols-2 gap-3">
          {['Earnings', 'Product Launches', 'M&A', 'Leadership', 'Technology', 'Strategy'].map(
            (topic) => (
              <label key={topic} className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span>{topic}</span>
              </label>
            )
          )}
        </div>
      </div>

      <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
        <h3 className="font-semibold mb-2">✨ AI-Suggested Special Topics</h3>
        <div className="space-y-2 mt-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>AI & Machine Learning</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" />
            <span>Sustainability</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Geographic Focus</label>
        <select
          multiple
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option>United States</option>
          <option>United Kingdom</option>
          <option>Global</option>
        </select>
      </div>
    </div>
  );
}

function Step5({ formData, setFormData }: any) {
  const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold mb-8">Voice & Review</h2>

      <div>
        <label className="block text-sm font-medium mb-4">OpenAI TTS Voice</label>
        <div className="grid md:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <button
              key={voice}
              onClick={() => setFormData({ ...formData, voiceId: voice })}
              className={`p-4 border-2 rounded-lg transition-all capitalize ${
                formData.voiceId === voice
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {voice}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Speed: {formData.voiceSpeed}x
        </label>
        <input
          type="range"
          min="0.25"
          max="4.0"
          step="0.25"
          value={formData.voiceSpeed}
          onChange={(e) =>
            setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })
          }
          className="w-full"
        />
      </div>

      <div className="p-6 bg-secondary border border-border rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Review Your Podcast</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Title:</span>
            <span className="font-medium">{formData.title || 'Not set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Cadence:</span>
            <span className="font-medium capitalize">{formData.cadence}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Duration:</span>
            <span className="font-medium">{formData.durationMinutes} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Voice:</span>
            <span className="font-medium capitalize">{formData.voiceId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

