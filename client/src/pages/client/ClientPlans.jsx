import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Home, List, Eye, X, Menu } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../../components/Button';

// Re-usable sidebar for client pages
const ClientSidebar = ({ isOpen, onClose, isMobile }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    return (
        <div className={`${isMobile ? `fixed inset-y-0 left-0 z-50 w-64 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out` : 'w-64'} h-screen bg-gray-900 border-r border-gray-800 flex flex-col pt-6 px-4 shrink-0`}>
            <div className="flex items-center justify-between gap-3 mb-10 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent flex justify-center items-center font-bold text-lg text-white shadow-lg shadow-accent/20">
                        {user?.avatar || 'C'}
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-lg tracking-tight -mb-1 truncate max-w-[120px]">{user?.personalInfo?.name}</h2>
                        <span className="text-xs text-gray-400 uppercase tracking-wider truncate max-w-[120px] block">{user?.gymName}</span>
                    </div>
                </div>
                {isMobile && (
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X size={20} />
                    </button>
                )}
            </div>
            <div className="flex-1 space-y-2">
                <NavLink to="/client" end onClick={() => isMobile && onClose()} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>
                    <Home size={20} /> Profile
                </NavLink>
                <NavLink to="/client/plans" onClick={() => isMobile && onClose()} className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>
                    <List size={20} /> Plans
                </NavLink>
            </div>
            <div className="pb-6 pt-4 border-t border-gray-800">
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </div>
    );
};

// Plan Detail Modal
const PlanDetailModal = ({ plan, onClose }) => {
    if (!plan) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{plan.planName}</h2>
                        <p className="text-primary text-sm mt-1">{plan.durationMonths} month{plan.durationMonths !== 1 ? 's' : ''} plan</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors mt-1 ml-4">
                        <X size={22} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center bg-gray-800/60 rounded-lg p-4">
                        <span className="text-gray-400 text-sm uppercase tracking-wider">Price</span>
                        <span className="text-primary text-2xl font-black">₹{plan.price?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/60 rounded-lg p-4">
                        <span className="text-gray-400 text-sm uppercase tracking-wider">Duration</span>
                        <span className="text-white font-semibold">{plan.durationMonths} Month{plan.durationMonths !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-4">
                        <p className="text-gray-400 text-sm uppercase tracking-wider mb-2">Description</p>
                        <p className="text-gray-200 text-sm leading-relaxed">
                            {plan.description?.trim() || 'No description provided for this plan.'}
                        </p>
                    </div>

                </div>
                <div className="px-6 pb-6">
                    <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
                </div>
            </div>
        </div>
    );
};

// Plan Card
const PlanCard = ({ plan, onViewDetails }) => (
    <div className="card relative flex flex-col group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-primary/10 hover:shadow-xl">
        <span className="inline-block text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 mb-4 w-fit">
            {plan.durationMonths}M Plan
        </span>
        <h3 className="text-xl font-bold text-white mb-1">{plan.planName}</h3>
        <p className="text-primary text-3xl font-black mb-6">
            ₹{plan.price?.toLocaleString('en-IN')}
            <span className="text-sm text-gray-400 font-normal"> / {plan.durationMonths} mo</span>
        </p>
        <button
            onClick={() => onViewDetails(plan)}
            className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-primary/20 hover:border-primary/40 text-white rounded-lg transition-all text-sm font-medium border border-gray-700"
        >
            <Eye size={15} /> View Details
        </button>
    </div>
);

const ClientPlans = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailPlan, setDetailPlan] = useState(null);

    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) {
                setIsSidebarOpen(false);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await api.get('/plan');
                setPlans(res.data.data || []);
            } catch {
                toast.error('Failed to load plans');
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    return (
        <div className={`flex bg-dark h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {/* MOBILE HEADER BAR */}
            {isMobile && (
                <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-40 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex justify-center items-center font-bold text-sm text-white shadow-md">
                            {user?.avatar || 'C'}
                        </div>
                        <div>
                            <span className="text-white font-bold text-base tracking-tight truncate max-w-[120px] inline-block">{user?.personalInfo?.name}</span>
                            <span className="text-xs text-gray-500 block -mt-1 uppercase tracking-wider truncate max-w-[120px]">{user?.gymName}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </header>
            )}

            {/* MOBILE DRAWER BACKDROP */}
            {isMobile && isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
                />
            )}

            <ClientSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Available Gym Plans</h1>
                    <p className="text-gray-400 mt-1 text-sm md:text-base">Browse all membership plans offered by your gym.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="card bg-gray-900 border-gray-800 text-center py-16 text-gray-400">
                        No plans available at the moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <PlanCard key={plan._id} plan={plan} onViewDetails={setDetailPlan} />
                        ))}
                    </div>
                )}
            </div>

            {detailPlan && (
                <PlanDetailModal plan={detailPlan} onClose={() => setDetailPlan(null)} />
            )}
        </div>
    );
};

export default ClientPlans;
