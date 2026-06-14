import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Contact from '../components/Contact';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Hero />
      <Features />
      <HowItWorks />
      <Contact />

      <footer className="bg-white py-8 border-t border-gray-100 text-center text-text-muted">
        <p>© {new Date().getFullYear()} GymFlow. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;