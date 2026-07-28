import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Shield, 
  Users, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  ShieldCheck, 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  Clock, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { FLASK_PROJECT_FILES, CodeFile } from './flaskCode';
import { ReliefRequest, SystemStats, PriorityLevel, RequestStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'victim' | 'volunteer' | 'admin' | 'flask-code'>('victim');
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [stats, setStats] = useState<SystemStats>({ total: 0, pending: 0, assigned: 0, completed: 0, volunteers: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Victim portal form states
  const [vicName, setVicName] = useState('');
  const [vicLocation, setVicLocation] = useState('');
  const [vicContact, setVicContact] = useState('');
  const [vicHelpType, setVicHelpType] = useState('Food & Water');
  const [vicPriority, setVicPriority] = useState<PriorityLevel>('Medium');
  const [vicDescription, setVicDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Volunteer portal states
  const [currentVolunteer, setCurrentVolunteer] = useState('volunteer1');
  const [volunteerFilter, setVolunteerFilter] = useState<RequestStatus | 'All'>('All');
  const [volunteerSearch, setVolunteerSearch] = useState('');

  // Admin dashboard states
  const [adminStatusFilter, setAdminStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [adminPriorityFilter, setAdminPriorityFilter] = useState<PriorityLevel | 'All'>('All');
  const [adminSearch, setAdminSearch] = useState('');

  // Flask Code Viewer states
  const [selectedFile, setSelectedFile] = useState<CodeFile>(FLASK_PROJECT_FILES[0]);
  const [codeCopied, setCodeCopied] = useState(false);

  // Fetch requests and stats from Express Server APIs
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [reqRes, statsRes] = await Promise.all([
          fetch('/api/requests'),
          fetch('/api/stats')
        ]);
        if (reqRes.ok && statsRes.ok) {
          const reqData = await reqRes.json();
          const statsData = await statsRes.json();
          setRequests(reqData);
          setStats(statsData);
        }
      } catch (err) {
        console.error('Error fetching backend details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [refreshTrigger]);

  // Handler to trigger full state reload
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Reset database back to default seeded items
  const handleResetDatabase = async () => {
    if (window.confirm('Wipe all current requests and reset SQLite-JSON database to default test seeds?')) {
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        if (res.ok) {
          triggerRefresh();
        }
      } catch (err) {
        console.error('Failed to reset DB:', err);
      }
    }
  };

  // Victim Help Request submit
  const handleVictimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vicName || !vicLocation || !vicContact || !vicHelpType || !vicDescription) {
      setFormError('All fields are required. Please describe your situation.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vicName,
          location: vicLocation,
          contact: vicContact,
          help_type: vicHelpType,
          priority: vicPriority,
          description: vicDescription
        })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        // Clear forms
        setVicName('');
        setVicLocation('');
        setVicContact('');
        setVicDescription('');
        triggerRefresh();
      } else {
        const errorData = await res.json();
        setFormError(errorData.error || 'Failed to submit request.');
      }
    } catch (err) {
      setFormError('Network communication error with Express backend.');
    } finally {
      setSubmitting(false);
    }
  };

  // Volunteer Claim Action
  const handleVolunteerClaim = async (requestId: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Assigned',
          assigned_volunteer: currentVolunteer
        })
      });
      if (res.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to claim task:', err);
    }
  };

  // Volunteer Fulfill Action
  const handleVolunteerFulfill = async (requestId: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed'
        })
      });
      if (res.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Helper to format iso strings cleanly
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900 overflow-hidden antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* LEFT SIDEBAR - HIGH DENSITY COMMAND PANEL */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 bg-indigo-600 flex items-center gap-3 shrink-0 shadow-md">
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center shadow-inner">
            <Heart className="w-5 h-5 fill-white/10 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight uppercase tracking-wider">Disaster Relief Coordination System</h1>
            <p className="text-[10px] text-indigo-200 font-mono font-medium">Emergency Response System</p>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto space-y-1">
          <div className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Console</div>
          
          {/* Victim Portal */}
          <button
            onClick={() => { setActiveTab('victim'); setSubmitSuccess(false); }}
            className={`w-full flex items-center px-6 py-3 text-xs transition-colors text-left font-medium ${
              activeTab === 'victim' 
                ? 'bg-slate-800 border-r-4 border-indigo-500 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 mr-3 opacity-80 flex items-center justify-center">
              <Heart className={`w-4 h-4 ${activeTab === 'victim' ? 'text-rose-500' : 'text-slate-500'}`} />
            </span>
            Victim Portal
          </button>

          {/* Volunteer Grid */}
          <button
            onClick={() => setActiveTab('volunteer')}
            className={`w-full flex items-center px-6 py-3 text-xs transition-colors text-left font-medium ${
              activeTab === 'volunteer' 
                ? 'bg-slate-800 border-r-4 border-indigo-500 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 mr-3 opacity-80 flex items-center justify-center">
              <Users className={`w-4 h-4 ${activeTab === 'volunteer' ? 'text-emerald-400' : 'text-slate-500'}`} />
            </span>
            Volunteer Grid
            {stats.pending > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                {stats.pending}
              </span>
            )}
          </button>

          {/* Admin Dashboard */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center px-6 py-3 text-xs transition-colors text-left font-medium ${
              activeTab === 'admin' 
                ? 'bg-slate-800 border-r-4 border-indigo-500 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 mr-3 opacity-80 flex items-center justify-center">
              <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-sky-400' : 'text-slate-500'}`} />
            </span>
            Admin Dashboard
          </button>

          

         
        </nav>

        {/* Sidebar Status Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 shrink-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-400">System Status: <span className="text-emerald-400 font-bold">Online</span></span>
          </div>
          <p className="text-[9px] text-slate-600 font-mono tracking-wider uppercase">Connected to Database</p>
        </div>
      </aside>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP COMPACT HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">
              {activeTab === 'victim' && 'Disaster Response / Victim Registration Portal'}
              {activeTab === 'volunteer' && 'Live Responder / Dispatch Coordination Grid'}
              {activeTab === 'admin' && 'Central Command Logistics Control Hub'}
              {activeTab === 'flask-code' && 'Exportable Target Artifact Source Code Files'}
            </h2>
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-mono border border-slate-200">
              <span>Secure Zone</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Current Disaster Event</p>
              <p className="text-xs font-semibold text-red-600">Flood Emergency 2026-ASSAM</p>
            </div>
            <div className="flex items-center gap-2 border-l pl-6">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold font-mono text-slate-700">
                AD
              </div>
              <span className="text-xs font-bold text-slate-700">Administrator</span>
            </div>
          </div>
        </header>

        {/* HIGH DENSITY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <AnimatePresence mode="wait">
            {/* 1. VICTIM PORTAL */}
            {activeTab === 'victim' && (
              <motion.div
                key="victim"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                {submitSuccess ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Request Registered Successfully</h3>
                    <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                      Your request has been successfully committed to the database. Registered rescue volunteers can claim this dispatch ticket instantly.
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => setSubmitSuccess(false)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        Submit Another Request
                      </button>
                      <button
                        onClick={() => setActiveTab('volunteer')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs"
                      >
                        Check Dispatch Grid
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200">
                    <div className="border-b border-slate-100 pb-4 mb-6">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-mono text-[10px] font-bold rounded uppercase tracking-wider border border-rose-100">Victim Portal</span>
                      <h2 className="text-xl font-bold text-slate-900 mt-2">Submit Distress Assistance Request</h2>
                      <p className="text-slate-500 text-xs mt-1">
                        Fill out the details below. This will directly broadcast to emergency response staff on-site.
                      </p>
                    </div>

                    {formError && (
                      <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-r-lg text-xs font-semibold mb-5 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                        <div>{formError}</div>
                      </div>
                    )}

                    <form onSubmit={handleVictimSubmit} className="space-y-4 text-xs">
                      {/* Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Household / Contact Name</label>
                        <input
                          type="text"
                          required
                          value={vicName}
                          onChange={e => setVicName(e.target.value)}
                          placeholder="e.g. Rahul Sharma or The Arjun Singh"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-xs"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Exact Location / Shelter Cot</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={vicLocation}
                            onChange={e => setVicLocation(e.target.value)}
                            placeholder="e.g. Beltola, Guwahati, Assam, or Flood Relief Camp, Tezpur, Assam"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-xs"
                          />
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1 font-mono">Include landmarks or coordinates for quick responder routing.</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Contact Phone */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Callback Number</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="tel"
                              required
                              value={vicContact}
                              onChange={e => setVicContact(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-xs"
                            />
                          </div>
                        </div>

                        {/* Help Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assistance Category</label>
                          <select
                            value={vicHelpType}
                            onChange={e => setVicHelpType(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs"
                          >
                            <option value="Food & Water">Food & Water</option>
                            <option value="Medical Supplies">Medical Supplies</option>
                            <option value="Shelter & Clothing">Shelter & Clothing</option>
                            <option value="Search & Rescue">Search & Rescue</option>
                            <option value="Other Support">Other Support</option>
                          </select>
                        </div>
                      </div>

                      {/* Urgency Priority */}
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Self-Assessed Urgency Level</span>
                        <div className="grid grid-cols-3 gap-3">
                          {(['Low', 'Medium', 'High'] as PriorityLevel[]).map(level => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setVicPriority(level)}
                              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                                vicPriority === level 
                                  ? level === 'High' 
                                    ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500/20'
                                    : level === 'Medium'
                                      ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500/20'
                                      : 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500/20'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {level === 'High' ? '🔴 Critical' : level === 'Medium' ? '🟡 High' : '🔵 Medium'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description of Needs & Situation</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <textarea
                            required
                            rows={3}
                            value={vicDescription}
                            onChange={e => setVicDescription(e.target.value)}
                            placeholder="Please explain context... e.g. 'Elderly relative requires immediate medical aid and oxygen transport support.'"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-xs"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all disabled:opacity-50 uppercase tracking-wider"
                      >
                        {submitting ? 'Registering with SQLite-JSON DB...' : 'Submit Emergency Request'}
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. VOLUNTEER PORTAL */}
            {activeTab === 'volunteer' && (
              <motion.div
                key="volunteer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Active Responder Header */}
                <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold rounded uppercase tracking-wider border border-emerald-500/20">Responder Profile</span>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-emerald-400 shrink-0" />
                      <h2 className="text-lg font-bold text-slate-100">On-Site Responder Workspace</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400 font-mono">Current Handle:</span>
                    <select
                      value={currentVolunteer}
                      onChange={e => setCurrentVolunteer(e.target.value)}
                      className="bg-slate-800 text-white border border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none"
                    >
                      <option value="volunteer1">volunteer1</option>
                      <option value="volunteer2">volunteer2</option>
                      <option value="Responder Goutham">Goutham (Field Leader)</option>
                      <option value="Rescue Squad">Rescue Squad</option>
                    </select>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {(['All', 'Pending', 'Assigned', 'Completed'] as const).map(fState => (
                      <button
                        key={fState}
                        onClick={() => setVolunteerFilter(fState)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          volunteerFilter === fState
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {fState === 'All' ? 'All Alerts' : fState === 'Pending' ? 'Pending (Unclaimed)' : fState === 'Assigned' ? 'My Claims' : 'Completed'}
                      </button>
                    ))}
                  </div>

                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={volunteerSearch}
                      onChange={e => setVolunteerSearch(e.target.value)}
                      placeholder="Search requests..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Cards Grid */}
                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" /> Loading active dispatches...
                  </div>
                ) : (
                  (() => {
                    const filtered = requests.filter(r => {
                      const matchesStatus = volunteerFilter === 'All' || r.status === volunteerFilter;
                      const matchesSearch = !volunteerSearch || 
                        r.name.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        r.location.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        r.help_type.toLowerCase().includes(volunteerSearch.toLowerCase()) ||
                        r.description.toLowerCase().includes(volunteerSearch.toLowerCase());
                      return matchesStatus && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
                          <p className="text-slate-400 text-xs">No aid requests match the selected dispatch criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(r => (
                          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                            <div>
                              {/* Header */}
                              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-[9px] font-bold border border-indigo-100">
                                  {r.help_type.toUpperCase()}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                    r.priority === 'High' 
                                      ? 'bg-red-50 text-red-600 border border-red-100' 
                                      : r.priority === 'Medium' 
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  }`}>
                                    {r.priority === 'High' ? '🔴 Critical' : r.priority === 'Medium' ? '🟡 High' : '🔵 Medium'}
                                  </span>

                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase ${
                                    r.status === 'Pending' 
                                      ? 'bg-amber-500' 
                                      : r.status === 'Assigned' 
                                        ? 'bg-indigo-600' 
                                        : 'bg-emerald-600'
                                  }`}>
                                    {r.status}
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="space-y-2.5 text-xs">
                                <div>
                                  <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">Victim Contact</span>
                                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{r.name}</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">Zone Location</span>
                                    <p className="text-slate-700 font-medium text-xs mt-0.5 truncate" title={r.location}>
                                      📍 {r.location}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">Callback Log</span>
                                    <p className="text-slate-800 font-mono font-semibold text-xs mt-0.5">
                                      📞 {r.contact}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <span className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider">Situation Logs</span>
                                  <p className="text-slate-600 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-0.5 leading-relaxed">
                                    {r.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatTimeAgo(r.created_at)}
                              </span>

                              <div>
                                {r.status === 'Pending' && (
                                  <button
                                    onClick={() => handleVolunteerClaim(r.id)}
                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-all"
                                  >
                                    Assign to Me
                                  </button>
                                )}

                                {r.status === 'Assigned' && (
                                  r.assigned_volunteer === currentVolunteer ? (
                                    <button
                                      onClick={() => handleVolunteerFulfill(r.id)}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition-all"
                                    >
                                      Mark Completed
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-mono text-slate-400 italic">
                                      Claimed: {r.assigned_volunteer}
                                    </span>
                                  )
                                )}

                                {r.status === 'Completed' && (
                                  <span className="text-emerald-600 text-[10px] font-black font-mono flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </motion.div>
            )}

            {/* 3. ADMIN DASHBOARD */}
            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Admin Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-100">Central Logistics Console</span>
                    <h2 className="text-xl font-bold text-slate-900 mt-2">Logistics Control Tower</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Tactical database oversight, statistics aggregates, and reset actions.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDatabase}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Database
                    </button>
                    <button
                      onClick={triggerRefresh}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all"
                      title="Reload Active Records"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Cards - MATCHING THE DESIGN HTML ELEGANTLY */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Total */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">Active Requests</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">Live</span>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">Unclaimed Alerts</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-black text-amber-600">{stats.pending}</span>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Pending</span>
                    </div>
                  </div>

                  {/* Assigned */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">On-Site Active</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-black text-indigo-600">{stats.assigned}</span>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Assigned</span>
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">Fulfilled Aid</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-black text-emerald-600">{stats.completed}</span>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Completed</span>
                    </div>
                  </div>

                  {/* Personnel */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
                    <p className="text-[11px] uppercase font-bold text-slate-400 mb-1">Field Responders</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-black text-slate-800">{stats.volunteers}</span>
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Active</span>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Victims / Logs</label>
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={e => setAdminSearch(e.target.value)}
                        placeholder="Search Abhijeet Bhattacharya, Riverside..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Status</label>
                      <select
                        value={adminStatusFilter}
                        onChange={e => setAdminStatusFilter(e.target.value as RequestStatus | 'All')}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="All">All Active Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Urgency</label>
                      <select
                        value={adminPriorityFilter}
                        onChange={e => setAdminPriorityFilter(e.target.value as PriorityLevel | 'All')}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="All">All Priorities</option>
                        <option value="High">High Urgency</option>
                        <option value="Medium">Medium Urgency</option>
                        <option value="Low">Low Urgency</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table Console Log */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Response Feed Table</h3>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Commits Logged: {requests.length} total</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="text-[10px] uppercase text-slate-400 font-bold bg-white sticky top-0">
                        <tr className="border-b border-slate-100">
                          <th className="px-6 py-3">ID</th>
                          <th className="px-6 py-3">Victim / Contact</th>
                          <th className="px-6 py-3">Help Type</th>
                          <th className="px-6 py-3">Location (Zone)</th>
                          <th className="px-6 py-3">Priority</th>
                          <th className="px-6 py-3 text-center">Status</th>
                          <th className="px-6 py-3">Assignee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(() => {
                          const filtered = requests.filter(r => {
                            const matchesStatus = adminStatusFilter === 'All' || r.status === adminStatusFilter;
                            const matchesPriority = adminPriorityFilter === 'All' || r.priority === adminPriorityFilter;
                            const matchesSearch = !adminSearch || 
                              r.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
                              r.location.toLowerCase().includes(adminSearch.toLowerCase()) ||
                              r.description.toLowerCase().includes(adminSearch.toLowerCase());
                            return matchesStatus && matchesPriority && matchesSearch;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                                  No database rows found matching active grid criteria.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((r, index) => (
                            <tr key={r.id} className={index % 2 === 1 ? 'bg-slate-50/50' : ''}>
                              <td className="px-6 py-3.5 font-mono text-slate-400">#REQ-{r.id.substring(0, 4)}</td>
                              <td className="px-6 py-3.5">
                                <div className="font-bold text-slate-800">{r.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{r.contact}</div>
                              </td>
                              <td className="px-6 py-3.5">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                                  {r.help_type.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-slate-600 truncate max-w-xs">{r.location}</td>
                              <td className="px-6 py-3.5">
                                <span className={`font-bold ${
                                  r.priority === 'High' ? 'text-red-600' : r.priority === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {r.priority === 'High' ? '🔴 Critical' : r.priority === 'Medium' ? '🟡 High' : '🔵 Medium'}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  r.status === 'Pending' 
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                                    : r.status === 'Assigned' 
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-slate-500 font-medium">
                                {r.assigned_volunteer ? (
                                  <span className="text-indigo-600 font-semibold">{r.assigned_volunteer}</span>
                                ) : (
                                  <span className="text-slate-300 italic">Unassigned</span>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. FLASK PROJECT FILES CODE TREE VIEW */}
            {activeTab === 'flask-code' && (
              <motion.div
                key="flask-code"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* File list sidebar */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-bold rounded uppercase tracking-wider border border-indigo-500/20">Mini-Project Artifacts</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                      <h3 className="text-sm font-bold">Source File Tree</h3>
                    </div>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      Explore the Python Flask + SQLite codebase template. Select any file to preview, copy, or download from the settings export.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-sm">
                    <span className="block text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">Flask Project Files</span>
                    {FLASK_PROJECT_FILES.map(file => (
                      <button
                        key={file.path}
                        onClick={() => { setSelectedFile(file); setCodeCopied(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                          selectedFile.path === file.path 
                            ? 'bg-slate-100 text-slate-900 border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full ${
                            file.name.endsWith('.py') 
                              ? 'bg-blue-400' 
                              : file.name.endsWith('.html') 
                                ? 'bg-amber-400' 
                                : file.name.endsWith('.md')
                                  ? 'bg-indigo-400'
                                  : 'bg-slate-400'
                          }`} />
                          <span className="font-mono truncate">{file.path}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase text-slate-400 font-bold shrink-0">
                          {file.language}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-xs space-y-1.5 leading-relaxed text-indigo-950">
                    <h4 className="font-bold flex items-center gap-1 text-indigo-900">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      Export Mini-Project
                    </h4>
                    <p className="text-indigo-800">
                      All files shown are served physically from your workspace directory. You can export them as a complete zip file anytime!
                    </p>
                  </div>
                </div>

                {/* Code viewer main window */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{selectedFile.name}</h3>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-mono font-bold uppercase">
                            {selectedFile.language}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{selectedFile.description}</p>
                      </div>

                      <button
                        onClick={handleCopyCode}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                      >
                        {codeCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>

                    {/* Code Container */}
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 p-4 text-[10px] font-mono leading-relaxed text-[#c9d1d9] max-h-[500px] overflow-y-auto shadow-inner">
                      <pre className="whitespace-pre overflow-x-auto scrollbar-thin">
                        <code>{selectedFile.content}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      
      </main>
    </div>
  );
}
