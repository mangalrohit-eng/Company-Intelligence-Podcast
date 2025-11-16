/**
 * New Podcast Wizard - 5-step creation flow
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Create New Podcast</h1>
          <p className="text-muted">Follow these 5 steps to configure your AI-powered podcast</p>
        </div>

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
      </div>
    </div>
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
        <p className="text-muted">Define your podcast's identity and basic information</p>
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
      <div>
        <h2 className="text-3xl font-bold mb-2">Company & Industry</h2>
        <p className="text-muted">Define your focus and we'll suggest relevant competitors</p>
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

  const playVoicePreview = (voiceId: string) => {
    // TODO: Play actual preview from OpenAI TTS
    alert(`🎧 Voice Preview: ${voiceId}\n\nIn production, this will play a sample audio clip using OpenAI TTS.\n\n"Welcome to your AI-powered podcast..."`);
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
                className="mt-3 w-full px-3 py-1.5 text-xs bg-background hover:bg-border border border-border rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" />
                </svg>
                Preview
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

