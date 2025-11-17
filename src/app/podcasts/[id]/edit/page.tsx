/**
 * Edit Podcast Page - Reuses wizard components with pre-filled data
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ProtectedRoute } from '@/components/ProtectedRoute';

type Step = 1 | 2 | 3 | 4 | 5;

export default function EditPodcastPage() {
  const params = useParams();
  const router = useRouter();
  const podcastId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetchPodcastData();
  }, [podcastId]);

  const fetchPodcastData = async () => {
    try {
      setLoading(true);
      const { api } = await import('@/lib/api');
      const response = await api.get(`/podcasts/${podcastId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Pre-fill form with existing data
        setFormData({
          title: data.title || '',
          subtitle: data.subtitle || '',
          description: data.description || '',
          author: data.author || '',
          email: data.email || '',
          category: data.category || 'Business',
          explicit: data.explicit || false,
          language: data.language || 'en',
          companyId: data.companyId || '',
          industryId: data.industryId || '',
          competitorIds: data.competitorIds || [],
          cadence: data.cadence || 'weekly',
          durationMinutes: data.durationMinutes || 5,
          publishTime: data.publishTime || '09:00',
          timezone: data.timezone || 'America/New_York',
          timeWindowHours: data.timeWindowHours || 168,
          topicIds: data.topicIds || [],
          topicPriorities: data.topicPriorities || {},
          regions: data.regions || ['US'],
          sourceLanguages: data.sourceLanguages || ['en'],
          robotsMode: data.robotsMode || 'strict',
          allowDomains: data.allowDomains || [],
          blockDomains: data.blockDomains || [],
          voiceId: data.voiceId || 'alloy',
          voiceSpeed: data.voiceSpeed || 1.0,
          voiceTone: data.voiceTone || 'professional',
        });
      } else {
        alert('Failed to load podcast data');
        router.push('/podcasts');
      }
    } catch (error) {
      console.error('Error fetching podcast:', error);
      alert('Error loading podcast data');
      router.push('/podcasts');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    try {
      setSaving(true);
      const { api } = await import('@/lib/api');
      const response = await api.put(`/podcasts/${podcastId}`, formData);

      if (response.ok) {
        alert('✅ Podcast updated successfully!');
        router.push(`/podcasts/${podcastId}`);
      } else {
        const error = await response.text();
        alert(`❌ Failed to update podcast:\n\n${error}`);
      }
    } catch (error) {
      console.error('Error updating podcast:', error);
      alert('❌ Error updating podcast. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted">Loading podcast data...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => router.push(`/podcasts/${podcastId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Podcast
            </Button>
            <h1 className="text-4xl font-bold mb-2">Edit Podcast</h1>
            <p className="text-muted">Update your podcast settings</p>
          </div>

          {/* Progress Stepper */}
          <div className="mb-12">
            <div className="hidden md:flex items-center justify-between">
              {steps.map((step, idx) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold text-xl mb-2 transition-all ${
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
                    <div className="text-center">
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

            {/* Mobile Progress */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold">
                  Step {currentStep} of {steps.length}
                </span>
                <span className="text-sm text-muted">
                  {steps[currentStep - 1].title}
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
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

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {currentStep > 1 ? (
              <Button variant="outline" size="lg" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button size="lg" onClick={handleNext}>
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="gap-2 px-8"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Reuse step components from wizard
function Step1({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Branding & Metadata</h2>
        <p className="text-muted">Update your podcast's basic information</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Podcast Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Tech Industry Insights"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Subtitle <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          placeholder="e.g., Daily AI and tech news for decision makers"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what your podcast covers..."
          rows={4}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Author <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="Your name or company"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@company.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Category</label>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Business">Business</option>
            <option value="Technology">Technology</option>
            <option value="News">News</option>
            <option value="Education">Education</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Language</label>
          <Select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Explicit</label>
          <Select
            value={formData.explicit ? 'yes' : 'no'}
            onChange={(e) => setFormData({ ...formData, explicit: e.target.value === 'yes' })}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Company & Industry</h2>
        <p className="text-muted">Update company focus and competitors</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Company Name <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.companyId}
          onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
          placeholder="Your company name"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Industry</label>
        <Select
          value={formData.industryId}
          onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
        >
          <option value="technology">Technology</option>
          <option value="finance">Finance</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail</option>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Competitors (comma-separated)
        </label>
        <Textarea
          value={formData.competitorIds.join(', ')}
          onChange={(e) => setFormData({ 
            ...formData, 
            competitorIds: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          })}
          placeholder="Competitor1, Competitor2, Competitor3"
          rows={3}
        />
        <p className="text-xs text-muted mt-2">
          Enter competitor names separated by commas
        </p>
      </div>
    </div>
  );
}

function Step3({ formData, setFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Cadence & Schedule</h2>
        <p className="text-muted">Update podcast schedule and duration</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Cadence</label>
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

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Duration (minutes)
          </label>
          <Input
            type="number"
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 5 })}
            min="1"
            max="60"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Publish Time
          </label>
          <Input
            type="time"
            value={formData.publishTime}
            onChange={(e) => setFormData({ ...formData, publishTime: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function Step4({ formData, setFormData }: any) {
  const topics = [
    'company-news',
    'competitor-analysis',
    'industry-trends',
    'product-launches',
    'financial-reports',
    'technology-updates',
  ];

  const toggleTopic = (topic: string) => {
    const current = formData.topicIds || [];
    if (current.includes(topic)) {
      setFormData({ ...formData, topicIds: current.filter((t: string) => t !== topic) });
    } else {
      setFormData({ ...formData, topicIds: [...current, topic] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Topics & Coverage</h2>
        <p className="text-muted">Select topics to cover in your podcast</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3">Topics</label>
        <div className="space-y-2">
          {topics.map((topic) => (
            <label key={topic} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.topicIds.includes(topic)}
                onChange={() => toggleTopic(topic)}
                className="w-4 h-4"
              />
              <span className="capitalize">{topic.replace(/-/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">Regions</label>
        <Input
          value={formData.regions.join(', ')}
          onChange={(e) => setFormData({ 
            ...formData, 
            regions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          })}
          placeholder="US, UK, EU"
        />
      </div>
    </div>
  );
}

function Step5({ formData, setFormData }: any) {
  const voices = [
    { id: 'alloy', name: 'Alloy', desc: 'Balanced, neutral' },
    { id: 'echo', name: 'Echo', desc: 'Calm, professional' },
    { id: 'fable', name: 'Fable', desc: 'Warm, expressive' },
    { id: 'onyx', name: 'Onyx', desc: 'Deep, authoritative' },
    { id: 'nova', name: 'Nova', desc: 'Clear, engaging' },
    { id: 'shimmer', name: 'Shimmer', desc: 'Bright, energetic' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Voice & Audio</h2>
        <p className="text-muted">Update voice settings for your podcast</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-3">Voice</label>
        <div className="grid md:grid-cols-2 gap-3">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.voiceId === voice.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setFormData({ ...formData, voiceId: voice.id })}
            >
              <div className="font-semibold capitalize">{voice.name}</div>
              <div className="text-xs text-muted">{voice.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Voice Speed: {formData.voiceSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={formData.voiceSpeed}
          onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}


