import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Dumbbell, Users, UserPlus, Settings2 } from 'lucide-react';
import Button from '../components/Button';

const RegistrationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gymId = location.state?.gymId;

  // Onboarding items configuration
  const checklist = [
    { title: 'Add Membership Plans', desc: 'Create monthly, quarterly, or customized fitness plans.', icon: Dumbbell, color: 'text-blue-400 bg-blue-500/10' },
    { title: 'Add Trainers', desc: 'Assign trainers and configure coaching schedules.', icon: Users, color: 'text-purple-400 bg-purple-500/10' },
    { title: 'Add Your First Client', desc: 'Onboard members and activate their gym memberships.', icon: UserPlus, color: 'text-emerald-400 bg-emerald-500/10' },
    { title: 'Configure Reminder Automation', desc: 'Set up WhatsApp, SMS, and email expiry alerts.', icon: Settings2, color: 'text-amber-400 bg-amber-500/10' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4">
      <div className="card w-full max-w-xl relative z-10 backdrop-blur-xl bg-slate-950/80 border border-slate-800/80 shadow-2xl p-8 rounded-2xl text-center">
        
        {/* Decorative ambient lighting */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-10"></div>

        {/* Success Header */}
        <div className="flex justify-center mb-5 animate-bounce-slow">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <CheckCircle2 size={36} className="stroke-[2.5px]" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Gym Created Successfully!</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8">Your enterprise workspace is ready. Save your credentials below to get started.</p>

        {/* Credentials Display Badge */}
        <div className="relative overflow-hidden p-6 bg-slate-900/50 border border-slate-800 rounded-xl max-w-sm mx-auto mb-8 group hover:border-slate-700/80 transition-all duration-300">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors"></div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">Your Gym ID</p>
          <div className="text-2xl font-black text-blue-400 tracking-widest mb-1.5 select-all uppercase">
            {gymId || 'G-ERROR'}
          </div>
          <div className="w-fit mx-auto flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>Use this ID for user and client logins</span>
          </div>
        </div>

        {/* Onboarding Checklist Header */}
        <div className="text-left mb-4">
          <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider block">Recommended Onboarding Checklist</span>
        </div>

        {/* Onboarding Checklist Grid */}
        <div className="grid grid-cols-1 gap-3.5 mb-8">
          {checklist.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-900 bg-slate-900/30 text-left hover:border-slate-800/80 hover:bg-slate-900/50 transition-all duration-300 group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color} border border-slate-800 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{item.title}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary Action Button */}
        <Button 
          onClick={() => navigate('/owner/dashboard')} 
          className="w-full text-sm font-extrabold py-3.5 rounded-xl uppercase tracking-wider shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Button>

      </div>
    </div>
  );
};

export default RegistrationSuccess;
