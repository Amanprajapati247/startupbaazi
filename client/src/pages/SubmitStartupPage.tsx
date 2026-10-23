import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Globe,
  Sparkles,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  AlertCircle,
  RotateCcw,
  Save
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DRAFT_KEY = 'startupbaazi_submission_draft';

export const SubmitStartupPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [createdSlug, setCreatedSlug] = useState<string>('');
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    websiteUrl: '',
    logoUrl: '',
    industry: 'AI & Machine Learning',
    hqCity: 'Bengaluru',
    hqState: 'Karnataka',
    foundedYear: new Date().getFullYear(),
    stage: 'Seed',
    cin: '',
    gstin: '',
    twitterUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Restore draft on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed, agreeToTerms: false }));
        setDraftRestored(true);
      }
    } catch (e) {
      console.warn('Failed to parse draft from localStorage');
    }
  }, []);

  // Save draft whenever formData changes (except terms checkbox)
  const updateFormData = (patch: Partial<typeof formData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...patch };
      try {
        const { agreeToTerms, ...toSave } = updated;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setFormData({
        name: '',
        tagline: '',
        description: '',
        websiteUrl: '',
        logoUrl: '',
        industry: 'AI & Machine Learning',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: new Date().getFullYear(),
        stage: 'Seed',
        cin: '',
        gstin: '',
        twitterUrl: '',
        linkedinUrl: '',
        githubUrl: '',
        agreeToTerms: false,
      });
      setDraftRestored(false);
      showToast('Draft cleared', 'info');
    } catch (e) {}
  };

  // Sync draft changes automatically
  useEffect(() => {
    try {
      const { agreeToTerms, ...toSave } = formData;
      if (toSave.name || toSave.tagline || toSave.websiteUrl || toSave.description) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
      }
    } catch (e) {}
  }, [formData]);

  const industries = [
    'AI & Machine Learning',
    'Fintech & Payments',
    'SaaS & Enterprise',
    'Developer Tools',
    'D2C & E-Commerce',
    'EdTech',
    'Healthcare & Biotech',
    'Logistics & Mobility',
  ];

  const cities = [
    'Bengaluru',
    'Delhi NCR',
    'Mumbai',
    'Pune',
    'Hyderabad',
    'Chennai',
    'Indore',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
  ];

  const stages = [
    'Idea',
    'Bootstrapped',
    'Pre-Seed',
    'Seed',
    'Series A',
    'Series B+',
    'Profitable',
  ];

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Company name is required';
    if (!formData.tagline.trim() || formData.tagline.length < 5)
      errs.tagline = 'Tagline must be at least 5 characters';
    if (!formData.description.trim() || formData.description.length < 20)
      errs.description = 'Description must be at least 20 characters';
    if (!formData.websiteUrl.trim() || !formData.websiteUrl.startsWith('http'))
      errs.websiteUrl = 'Valid URL starting with http:// or https:// is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!formData.hqCity.trim()) errs.hqCity = 'Headquarters city is required';
    if (!formData.hqState.trim()) errs.hqState = 'State is required';
    if (formData.foundedYear < 1990 || formData.foundedYear > new Date().getFullYear())
      errs.foundedYear = `Founded year must be between 1990 and ${new Date().getFullYear()}`;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast('Please sign in or create an account to list your startup.', 'warning');
      navigate('/login?redirect=/submit');
      return;
    }

    if (!formData.agreeToTerms) {
      showToast('Please agree to the platform guidelines and terms.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.submitCompany({
        name: formData.name,
        tagline: formData.tagline,
        description: formData.description,
        websiteUrl: formData.websiteUrl,
        logoUrl: formData.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(formData.name)}`,
        industry: formData.industry,
        hqCity: formData.hqCity,
        hqState: formData.hqState,
        foundedYear: formData.foundedYear,
        stage: formData.stage,
        cin: formData.cin || undefined,
        gstin: formData.gstin || undefined,
        twitterUrl: formData.twitterUrl || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        githubUrl: formData.githubUrl || undefined,
      });

      if (res.success) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {}
        setCreatedSlug(res.data.company.slug);
        setSubmissionSuccess(true);
        showToast('Startup submitted for review!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Submission failed. Please check inputs.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-xl">
          🚀
        </div>
        <h2 className="text-3xl font-black text-white">Startup Submitted Successfully!</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Your startup listing for <span className="font-bold text-white">{formData.name}</span> has been submitted to the StartupBaazi moderation desk.
        </p>
        <div className="p-4 bg-navy-900 border border-slate-800 rounded-2xl text-xs text-slate-400 text-left space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Listing Status: PENDING_APPROVAL</span>
          </div>
          <p>
            An administrator will review your official website, branding, and details. Once approved, your startup will be published to the national directory and eligible for paid leaderboard bids!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            to="/dashboard"
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25"
          >
            Go to Founder Dashboard
          </Link>
          <Link
            to={`/startup/${createdSlug}`}
            className="flex-1 py-3.5 rounded-xl bg-navy-900 text-slate-200 border border-slate-700 font-bold text-xs hover:bg-navy-850"
          >
            Preview Listing Draft
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          List Your Startup on StartupBaazi
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Get verified, reach high-intent customers & investors, and compete for India's #1 startup spotlight.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 relative">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
              currentStep === step
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-500/20'
                : currentStep > step
                ? 'bg-emerald-500 text-white'
                : 'bg-navy-900 text-slate-500 border border-slate-800'
            }`}
          >
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
        ))}
      </div>

      {/* Draft Restored Alert */}
      {draftRestored && (
        <div className="flex items-center justify-between p-3.5 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-xs text-brand-300">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span>Restored an unsaved draft from your previous session.</span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Discard</span>
          </button>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Basic Company Details */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                <span>Step 1: Startup Details</span>
              </h2>

              {/* Startup Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Startup / Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zerodha, Postman, Krutrim"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
                {errors.name && <p className="text-rose-400 text-[11px] mt-1">{errors.name}</p>}
              </div>

              {/* Short Tagline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Short Tagline * (Max 120 chars)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. India's fastest collaborative API development platform"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
                {errors.tagline && <p className="text-rose-400 text-[11px] mt-1">{errors.tagline}</p>}
              </div>

              {/* Official Website URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Official Website URL *
                </label>
                <input
                  type="url"
                  placeholder="https://yourstartup.com"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
                {errors.websiteUrl && <p className="text-rose-400 text-[11px] mt-1">{errors.websiteUrl}</p>}
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Logo Image URL (Optional, or leave empty for auto-generated avatar)
                </label>
                <input
                  type="url"
                  placeholder="https://yourstartup.com/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Description * (Min 20 characters)
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell the Indian startup community what problem you solve, who your users are, and your traction..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
                {errors.description && <p className="text-rose-400 text-[11px] mt-1">{errors.description}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: Ecosystem & Location */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-400" />
                <span>Step 2: Industry, Location & Stage</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Industry */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Industry Category *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Startup Stage *
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    {stages.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                {/* HQ City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Headquarters City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, Delhi NCR, Mumbai"
                    value={formData.hqCity}
                    onChange={(e) => setFormData({ ...formData, hqCity: e.target.value })}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  {errors.hqCity && <p className="text-rose-400 text-[11px] mt-1">{errors.hqCity}</p>}
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    State / UT *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karnataka, Maharashtra"
                    value={formData.hqState}
                    onChange={(e) => setFormData({ ...formData, hqState: e.target.value })}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Founded Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Founded Year *
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={new Date().getFullYear()}
                    value={formData.foundedYear}
                    onChange={(e) => setFormData({ ...formData, foundedYear: parseInt(e.target.value, 10) || 2024 })}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  {errors.foundedYear && <p className="text-rose-400 text-[11px] mt-1">{errors.foundedYear}</p>}
                </div>

                {/* Optional GSTIN / CIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GSTIN or CIN (Optional, speeds up verification)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Social Links */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-400" />
                <span>Step 3: Social & Developer Profiles</span>
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Twitter / X Profile URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/yourstartup"
                  value={formData.twitterUrl}
                  onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  LinkedIn Page URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/company/yourstartup"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GitHub Organization URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/yourstartup"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Review & Agreement */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-400" />
                <span>Step 4: Review & Guidelines Agreement</span>
              </h2>

              {/* Summary box */}
              <div className="p-4 rounded-2xl bg-navy-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Startup:</span>
                  <span className="font-bold text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Tagline:</span>
                  <span className="text-slate-200">{formData.tagline}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Website:</span>
                  <span className="text-brand-400 truncate max-w-xs">{formData.websiteUrl}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-slate-200">{formData.hqCity}, {formData.hqState}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Industry:</span>
                  <span className="text-slate-200">{formData.industry}</span>
                </div>
              </div>

              {/* Policy agreement */}
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                    I confirm that I am an authorized representative of this company. I agree to StartupBaazi's{' '}
                    <Link to="/terms" className="text-brand-400 underline">Terms of Service</Link>,{' '}
                    <Link to="/bidding-rules" className="text-brand-400 underline">Bidding Rules</Link>, and understand that all listings undergo administrative verification before public publication.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !formData.agreeToTerms}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting Listing...</span>
                ) : (
                  <>
                    <span>Submit Startup for Review</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
