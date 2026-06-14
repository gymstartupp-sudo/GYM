import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="bg-white py-20 px-4 md:px-8 text-center flex flex-col items-center">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
          Gym Management Made Simple
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Manage clients, track memberships, and automate renewals — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link 
            to="/login" 
            className="px-8 py-3 bg-surface-secondary text-text-primary font-medium rounded-xl hover:bg-surface-divider transition w-full sm:w-auto text-center shadow-sm"
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="px-8 py-3 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition w-full sm:w-auto text-center border border-gray-200"
          >
            Register Gym
          </Link>
        </div>
        
        {/* Dashboard Preview Image Placeholder */}
        <div className="w-full max-w-5xl mx-auto bg-gray-50 rounded-xl shadow-xl border border-gray-200 overflow-hidden text-left pt-6 px-6 aspect-video flex flex-col">
           <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
           </div>
           <div className="bg-white rounded-t-xl border border-b-0 border-gray-200 flex-1 grid grid-cols-4 gap-4 p-4 opacity-80">
              <div className="col-span-1 hidden md:flex flex-col gap-3">
                 <div className="h-8 bg-gray-100 rounded"></div>
                 <div className="h-8 bg-gray-100 rounded w-2/3"></div>
                 <div className="h-8 bg-gray-100 rounded w-3/4"></div>
              </div>
              <div className="col-span-4 md:col-span-3 flex flex-col gap-4">
                 <div className="flex gap-4 h-24">
                    <div className="bg-blue-50 rounded-xl flex-1 border border-blue-100"></div>
                    <div className="bg-green-50 rounded-xl flex-1 border border-green-100"></div>
                    <div className="bg-purple-50 rounded-xl flex-1 border border-purple-100 hidden sm:block"></div>
                 </div>
                 <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl"></div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
