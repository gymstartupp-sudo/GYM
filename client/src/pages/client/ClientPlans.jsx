import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Eye, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../../components/Button';

const PlanDetailModal = ({ plan, onClose }) => {
    if (!plan) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface-secondary border border-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">{plan.planName}</h2>
                        <p className="text-primary text-sm mt-1">{plan.durationMonths} month{plan.durationMonths !== 1 ? 's' : ''} plan</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors mt-1 ml-4">
                        <X size={22} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center bg-surface-hover/60 rounded-xl p-4 border border-border/70">
                        <span className="text-text-secondary text-sm uppercase tracking-wider">Price</span>
                        <span className="text-primary text-2xl font-black">₹{plan.price?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center bg-surface-hover/60 rounded-xl p-4 border border-border/70">
                        <span className="text-text-secondary text-sm uppercase tracking-wider">Duration</span>
                        <span className="text-text-primary font-semibold">{plan.durationMonths} Month{plan.durationMonths !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="bg-surface-hover/60 rounded-xl p-4 border border-border/70">
                        <p className="text-text-secondary text-sm uppercase tracking-wider mb-2">Description</p>
                        <p className="text-text-primary text-sm leading-relaxed">
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

const PlanCard = ({ plan, onViewDetails }) => (
    <div className="card relative flex flex-col group border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-primary/10 hover:shadow-xl">
        <span className="inline-block text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 mb-4 w-fit">
            {plan.durationMonths}M Plan
        </span>
        <h3 className="text-xl font-bold text-text-primary mb-1">{plan.planName}</h3>
        <p className="text-primary text-3xl font-black mb-6">
            ₹{plan.price?.toLocaleString('en-IN')}
            <span className="text-sm text-text-secondary font-normal"> / {plan.durationMonths} mo</span>
        </p>
        <button
            onClick={() => onViewDetails(plan)}
            className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 bg-surface-divider hover:bg-primary/20 hover:border-primary/40 text-text-primary rounded-lg transition-all text-sm font-medium border border-border"
        >
            <Eye size={15} /> View Details
        </button>
    </div>
);

const ClientPlans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailPlan, setDetailPlan] = useState(null);

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
        <>
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Available Gym Plans</h1>
                <p className="text-text-secondary mt-1 text-sm md:text-base">Browse all membership plans offered by your gym.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : plans.length === 0 ? (
                <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
                    No plans available at the moment.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <PlanCard key={plan._id} plan={plan} onViewDetails={setDetailPlan} />
                    ))}
                </div>
            )}

            {detailPlan && (
                <PlanDetailModal plan={detailPlan} onClose={() => setDetailPlan(null)} />
            )}
        </>
    );
};

export default ClientPlans;
