import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Dumbbell, Users, UserPlus, Settings2 } from 'lucide-react';
import Button from '../components/Button';

const RegistrationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gymId = location.state?.gymId;
  const gymName = location.state?.gymName;
  const gymEmail = location.state?.gymEmail;
  const gymContact = location.state?.gymContact;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4">
      <div className="card w-full max-w-xl relative z-10 backdrop-blur-xl bg-slate-950/80 border border-slate-800/80 shadow-2xl p-8 rounded-2xl text-center">

        {/* Decorative ambient lighting */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>

        {/* Success Header */}
        <div className="flex justify-center mb-5 animate-bounce-slow">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <CheckCircle2 size={36} className="stroke-[2.5px]" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-text-primary tracking-tight mb-2">Registration Submitted!</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Your gym registration for <span className="text-white font-bold">{gymName || 'your gym'}</span> has been sent to the Super Admin for verification and approval.
        </p>

        {/* Information Notice Box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-left mb-6 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Account Activation Pending</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            The administrator will review your registration details and provision your isolated gym database. You will be able to log in as soon as your account is approved.
          </p>
        </div>

        {/* Submitted Credentials Card */}
        <div className="relative overflow-hidden p-5 bg-slate-900/50 border border-slate-800 rounded-xl max-w-md mx-auto mb-8 space-y-3 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mb-1">Assigned Gym ID</p>
            <div className="text-2xl font-black text-primary tracking-widest select-all uppercase">
              {gymId || 'PENDING'}
            </div>
          </div>

          {(gymEmail || gymContact) && (
            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-around text-xs text-slate-400">
              {gymEmail && (
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Login Email</span>
                  <span className="text-slate-200 font-medium">{gymEmail}</span>
                </div>
              )}
              {gymContact && (
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Login Phone</span>
                  <span className="text-slate-200 font-medium">{gymContact}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Return to Login Action Button */}
        <Button
          onClick={() => navigate('/login')}
          className="w-full text-sm font-extrabold py-3.5 rounded-xl uppercase tracking-wider shadow-lg shadow-primary/10 hover:shadow-primary/20 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            <span>Return to Login</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Button>

      </div>
    </div>
  );
};

export default RegistrationSuccess;
