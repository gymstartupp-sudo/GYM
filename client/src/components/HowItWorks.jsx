import React from 'react';
import { Building2, UserPlus, Zap, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Building2,
    title: "1. Create your gym",
    description: "Sign up and set up your gym's basic information."
  },
  {
    icon: UserPlus,
    title: "2. Add clients & plans",
    description: "Import members and create membership plans."
  },
  {
    icon: Zap,
    title: "3. System tracks & reminds",
    description: "Enjoy automated expiration alerts and status updates."
  }
];

const HowItWorks = () => {
  return (
    <section className="bg-white py-24 px-4 md:px-8 border-t border-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600">Get up and running in minutes, not days.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-4 relative">
          {steps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center max-w-xs relative z-10 w-full md:w-1/3">
                <div className="w-16 h-16 bg-surface-secondary text-text-primary rounded-xl flex items-center justify-center mb-6 shadow-md border border-border">
                  <step.icon size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
              
              {idx < steps.length - 1 && (
                <div className="hidden md:block text-text-secondary flex-shrink-0">
                  <ArrowRight size={32} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
