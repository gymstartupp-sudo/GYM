import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dumbbell,
  Users,
  Calendar,
  BellRing,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Menu,
  X,
  ArrowRight,
  Mail,
  HelpCircle,
  ChevronDown,
  DollarSign,
  Briefcase,
  FileText,
  Check
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: Users,
      title: "Client Profiles & Auditing",
      description: "Manage membership states, emergency contacts, medical details, active plans, and pending dues tags from a single list."
    },
    {
      icon: Calendar,
      title: "Custom Plans & Date Shifting",
      description: "Create subscription plans (monthly, quarterly, custom days) with automatic non-overlapping date calculation and dynamic balance tracking."
    },
    {
      icon: BellRing,
      title: "Meta WhatsApp Autopilot",
      description: "Daily automated background scans dispatch official Meta WhatsApp template messages before and after memberships expire — no manual follow-ups needed."
    },
    {
      icon: DollarSign,
      title: "Financial Ledger & Expenses",
      description: "Log expenses (rent, salary, maintenance) and track monthly net revenue and total profit automatically."
    },
    {
      icon: FileText,
      title: "Automated PDF Invoicing",
      description: "Every payment instantly generates a branded PDF receipt, uploads it to Cloudinary, and delivers it to the client via Meta WhatsApp — zero manual effort."
    },
    {
      icon: AlertCircle,
      title: "Dues & Partial Payment Auditing",
      description: "Filter dues ledgers, track partial payments, record installment snapshots, and enforce minimum payments and due dates."
    }
  ];

  const faqs = [
    {
      q: "How does the automated reminder system work?",
      a: "RexFit runs scheduled daily cron jobs to scan all clients. When a client's plan is set to expire soon (under 3 days) or has expired, it dispatches official Meta WhatsApp template messages automatically — covering expiry reminders, overdue dues, and payment confirmations."
    },
    {
      q: "How are payment receipts delivered to clients?",
      a: "Every successful payment instantly triggers an automated workflow: a branded PDF invoice is generated, uploaded to Cloudinary for a permanent URL, and delivered directly to the client's WhatsApp via an official Meta template message — all without any manual action from the gym owner."
    },
    {
      q: "What's the difference between the Owner Dashboard and the Client Portal?",
      a: "The Owner Dashboard gives gym staff full control — register clients, manage plans, track dues, log expenses, run manual reminders, and audit monthly revenue. The Client Portal is a read-only self-service view where members check their plan status, submit feedback, and receive automated WhatsApp alerts."
    },
    {
      q: "How does the Partial Payment and Dues system work?",
      a: "Gym owners can allow or disallow partial payments per gym. When enabled, the system creates immutable payment snapshots, updates remaining balances, and flags clients with pending dues on the owner dashboard."
    }
  ];

  return (
    <div className="min-h-screen bg-surface-primary text-text-primary transition-colors duration-theme font-sans">

      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-surface-secondary/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-dark shadow-md shadow-primary/20">
              <Dumbbell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-text-primary">
              Rex<span className="text-primary font-extrabold">Fit</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium">
            <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</a>
            <a href="#workflows" className="text-text-secondary hover:text-text-primary transition-colors">Workflows</a>

            <a href="#faqs" className="text-text-secondary hover:text-text-primary transition-colors">FAQs</a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 border border-border text-text-primary rounded-xl font-semibold hover:bg-surface-hover transition-colors"
            >
              Client Portal
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 bg-primary text-dark rounded-xl font-bold hover:brightness-95 transition-all shadow-sm shadow-primary/10"
            >
              Register Gym
            </Link>
          </div>

          {/* Mobile Menu Buttons */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle className="w-10 h-10" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary bg-surface-card"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface-secondary px-4 pt-4 pb-6 flex flex-col gap-4 animate-fadeIn">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-text-secondary hover:text-text-primary font-medium"
            >
              Features
            </a>
            <a
              href="#workflows"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-text-secondary hover:text-text-primary font-medium"
            >
              Workflows
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-text-secondary hover:text-text-primary font-medium"
            >
              Pricing
            </a>
            <a
              href="#faqs"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-text-secondary hover:text-text-primary font-medium"
            >
              FAQs
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center border border-border text-text-primary rounded-xl font-semibold hover:bg-surface-hover"
              >
                Client Portal
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center bg-primary text-dark rounded-xl font-bold hover:brightness-95"
              >
                Register Gym
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center max-w-4xl mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface-secondary text-primary font-semibold text-sm mb-6 animate-pulse">
            <ShieldCheck size={16} /> Fully Verified & Hardened Integration
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
            Gym Management <span className="text-primary">Simplified.</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage memberships, automate Whatsapp alerts, log custom plan revenue, track expenses all in one visual system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-dark font-extrabold rounded-xl text-center shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Onboard Your Gym Now
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 border border-border bg-surface-secondary text-text-primary font-bold rounded-xl text-center hover:bg-surface-hover transition-all"
            >
              Client Login
            </Link>
          </div>
        </div>

        {/* Dynamic HTML/CSS Mockup of Dashboard and Mobile App */}
        <div className="w-full relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 pt-8">

          {/* Main Desktop Mockup (RexFit Dashboard) */}
          <div className="w-full max-w-4xl bg-surface-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col aspect-video select-none z-10">
            {/* Window control header */}
            <div className="bg-surface-secondary px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger/80"></div>
                <div className="w-3 h-3 rounded-full bg-warning/80"></div>
                <div className="w-3 h-3 rounded-full bg-success/80"></div>
              </div>
              <div className="bg-surface-primary border border-border rounded px-4 py-1 text-xs text-text-muted font-medium w-1/3 text-center truncate">
                dashboard.rexfit.com/owner
              </div>
              <div className="w-10"></div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="flex-1 bg-surface-primary flex">
              {/* Sidebar */}
              <div className="w-1/5 border-r border-border bg-surface-secondary p-2.5 hidden sm:flex flex-col gap-2">
                <div className="h-5 bg-primary/20 border border-primary/30 rounded-lg flex items-center px-2 text-[9px] font-bold text-primary">Dashboard</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Clients</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Plans</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Dues</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Ledger</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Requests</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Feedback</div>
                <div className="h-5 bg-surface-hover rounded-lg flex items-center px-2 text-[9px] text-text-secondary">Settings</div>
              </div>

              {/* Central View */}
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                {/* Stats cards row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted font-medium uppercase">Active Clients</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold">342</span>
                      <span className="text-[9px] text-success font-semibold">+12%</span>
                    </div>
                  </div>
                  <div className="bg-surface-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted font-medium uppercase">Total Dues</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-danger">₹45,200</span>
                      <span className="text-[8px] bg-danger/10 text-danger px-1 rounded">14 pending</span>
                    </div>
                  </div>
                  <div className="bg-surface-card p-3 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] text-text-muted font-medium uppercase">Monthly Profit</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-success">₹1,85,400</span>
                      <span className="text-[9px] text-success font-semibold">8.2%</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="bg-surface-card border border-border rounded-xl p-3 flex-1 flex flex-col gap-2 min-h-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">Revenue vs Expenses</span>
                    <div className="flex gap-2">
                      <span className="text-[8px] flex items-center gap-1 font-semibold"><div className="w-1.5 h-1.5 bg-primary rounded-full"></div> Revenue</span>
                      <span className="text-[8px] flex items-center gap-1 font-semibold"><div className="w-1.5 h-1.5 bg-danger rounded-full"></div> Expense</span>
                    </div>
                  </div>
                  {/* CSS Chart mockup */}
                  <div className="flex-1 flex items-end justify-between px-4 pb-2 border-b border-border pt-2 gap-4">
                    <div className="w-1/6 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1 items-end h-16 justify-center">
                        <div className="w-3 bg-primary rounded-t h-[80%]"></div>
                        <div className="w-3 bg-danger rounded-t h-[40%]"></div>
                      </div>
                      <span className="text-[8px] text-text-muted">Jan</span>
                    </div>
                    <div className="w-1/6 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1 items-end h-16 justify-center">
                        <div className="w-3 bg-primary rounded-t h-[95%]"></div>
                        <div className="w-3 bg-danger rounded-t h-[30%]"></div>
                      </div>
                      <span className="text-[8px] text-text-muted">Feb</span>
                    </div>
                    <div className="w-1/6 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1 items-end h-16 justify-center">
                        <div className="w-3 bg-primary rounded-t h-[75%]"></div>
                        <div className="w-3 bg-danger rounded-t h-[50%]"></div>
                      </div>
                      <span className="text-[8px] text-text-muted">Mar</span>
                    </div>
                    <div className="w-1/6 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1 items-end h-16 justify-center">
                        <div className="w-3 bg-primary rounded-t h-[90%]"></div>
                        <div className="w-3 bg-danger rounded-t h-[25%]"></div>
                      </div>
                      <span className="text-[8px] text-text-muted">Apr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mobile Portal Mockup */}
          <div className="absolute right-4 bottom-[-32px] w-64 bg-surface-card border-4 border-text-primary rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[9/18] hidden lg:flex flex-col z-20 transition-all select-none">
            {/* Phone Speaker/Camera notch */}
            <div className="bg-text-primary h-6 w-full flex justify-center items-end pb-1">
              <div className="w-16 h-3 bg-surface-card rounded-b-md"></div>
            </div>

            {/* Mobile View Container */}
            <div className="flex-1 bg-surface-primary p-4 flex flex-col gap-4 overflow-hidden text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-dark font-bold">JD</div>
                  <div>
                    <div className="font-bold text-[10px]">John Doe</div>
                    <div className="text-[8px] text-text-muted">RexFit Active</div>
                  </div>
                </div>
                <div className="bg-success/15 text-success text-[8px] px-1.5 py-0.5 rounded-full font-bold">Active</div>
              </div>

              {/* Countdown Card */}
              <div className="bg-surface-card border border-border p-3 rounded-xl flex flex-col gap-1.5">
                <div className="text-text-secondary text-[10px]">Your Plan Expiry</div>
                <div className="font-extrabold text-sm text-text-primary">18 Days Left</div>
                <div className="w-full bg-surface-divider h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
                <div className="text-[8px] text-text-muted mt-1">Expires on: 08/07/2026</div>
              </div>

              {/* Mobile Quick Action Buttons */}
              <div className="flex flex-col gap-2">
                <button className="w-full py-2 bg-primary text-dark text-[10px] font-bold rounded-lg hover:brightness-95 transition-all text-center">
                  Renew Plan Online
                </button>
                <button className="w-full py-2 bg-surface-secondary text-text-primary text-[10px] font-semibold rounded-lg border border-border hover:bg-surface-hover transition-all text-center">
                  Payments & Receipts
                </button>
              </div>

              {/* Feedback Prompt */}
              <div className="mt-auto bg-surface-secondary p-2.5 border border-border rounded-xl flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-[9px]">Need Help?</span>
                  <span className="text-[7px] text-text-muted">Submit feedback to gym.</span>
                </div>
                <div className="w-6 h-6 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                  <MessageSquare size={12} />
                </div>
              </div>
            </div>
            {/* Bottom Bar indicator */}
            <div className="h-5 w-full bg-surface-card flex justify-center items-center">
              <div className="w-24 h-1 bg-text-primary/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Trusted Metrics Section */}


      {/* 4. Feature Showcase */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Production-Grade Features
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            RexFit eliminates manual record keeping. Explore the exact functionality deployed on our backend architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, idx) => {
            const IconComponent = f.icon;
            return (
              <div
                key={idx}
                className="bg-surface-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
                  <IconComponent size={24} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-3">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed text-sm">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Role-Based Workflows */}
      <section id="workflows" className="bg-surface-secondary border-y border-border py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Dual-Role Connected Portal
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              RexFit connects gym administration directly to the client's screen for real-time collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Gym Owner Workflow */}
            <div className="flex flex-col gap-6 bg-surface-card border border-border p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                <Briefcase size={24} />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Gym Owner Dashboard</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Empower your desk staff to register new clients, handle custom payment amounts, and automatically track memberships.
              </p>
              <ul className="flex flex-col gap-3.5 pt-2 text-sm text-text-secondary">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Approve client registration requests dynamically
                </li>

                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Track pending, upcoming, active, and expired memberships
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Log business expenses and audit monthly margins
                </li>
              </ul>
            </div>

            {/* Member Workflow */}
            <div className="flex flex-col gap-6 bg-surface-card border border-border p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                <Users size={24} />
              </div>
              <h3 className="text-2xl font-bold text-text-primary">Client Portal</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                Provide members with a personalized dashboard. Keep them connected, informed, and compliant.
              </p>
              <ul className="flex flex-col gap-3.5 pt-2 text-sm text-text-secondary">
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Self-registration & membership details tracking
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Submit direct feedback to the gym owner
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                  Monitor plan history, transaction logs, and receipts
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* 7. FAQ Section */}
      <section id="faqs" className="bg-surface-secondary border-y border-border py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-text-secondary">
              Everything you need to know about the RexFit platform.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-surface-card border border-border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <span className="flex items-center gap-2.5"><HelpCircle size={18} className="text-primary" /> {faq.q}</span>
                    <ChevronDown size={18} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-text-secondary leading-relaxed border-t border-border pt-4 animate-slideDown">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Call to Action (CTA) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-black mb-6">
          Ready to scale your gym operations?
        </h2>
        <p className="text-text-secondary text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Sign up now to launch your customized RexFit owner dashboard and give your clients a secure, premium portal.
        </p>
        <div className="flex justify-center">
          <Link
            to="/register"
            className="px-8 py-3.5 bg-primary text-dark font-extrabold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            Start Registration <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-surface-secondary border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-dark shadow-sm shadow-primary/10">
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-primary">
              Rex<span className="text-primary font-extrabold">Fit</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-text-muted font-medium">
            <a href="mailto:support@rexfit.com" className="flex items-center gap-1.5 hover:text-text-primary transition-colors">
              <Mail size={14} /> support@rexfit.com
            </a>
            <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1"><FileText size={14} /> Privacy Policy</span>
            <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1"><FileText size={14} /> Terms & Conditions</span>
          </div>

          <div className="text-xs text-text-muted">
            © {new Date().getFullYear()} RexFit. All rights reserved.
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;