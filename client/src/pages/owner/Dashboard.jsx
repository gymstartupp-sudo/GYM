import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Users, UserCheck, AlertCircle, AlertTriangle, List, X, UserPlus, Eye, Activity, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientForm from '../../components/ClientForm';
import ClientDetail from './ClientDetail';
import PaymentModal from '../../components/PaymentModal';
import ClientCard from '../../components/ClientCard';
import Pagination from '../../components/Pagination';
import { calculateDaysLeft, formatDisplayDate, getPlanStatus } from '../../utils/membership';

const StatCard = ({ title, value, icon, accentClass = 'text-primary' }) => (
    <div className="kpi-card">
        <div className="flex justify-between items-start">
            <div>
                <p className="kpi-card-label">{title}</p>
                <h3 className="kpi-card-value mt-1">{value}</h3>
            </div>
            <div className={`p-2.5 rounded-lg bg-surface-divider ${accentClass}`}>
                {icon}
            </div>
        </div>
    </div>
);

const ClientDashboardTable = ({ clients, onView }) => (
    <div className="table-container border-0 rounded-none">
        <table className="data-table min-w-[500px]">
            <thead>
                <tr>
                    <th>Client Info</th>
                    <th>Contact Info</th>
                    <th className="text-right">Action</th>
                </tr>
            </thead>
            <tbody>
                {clients.map(client => (
                    <tr key={client._id} className="group">
                        <td>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0 group-hover:bg-primary group-hover:text-black transition-all duration-200">
                                    {client.personalInfo?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-text-primary font-semibold truncate group-hover:text-primary transition-colors">{client.personalInfo?.name}</span>
                                    <span className="text-text-muted text-[10px] font-mono tracking-tighter uppercase">{client.clientId || 'N/A'}</span>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span className="text-text-secondary text-sm font-medium">{client.personalInfo?.mobileNo || '-'}</span>
                        </td>
                        <td className="text-right">
                            <button
                                onClick={() => onView(client)}
                                className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border"
                                title="View Details"
                            >
                                <Eye size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewClient, setViewClient] = useState(null);
    const [showAllClientsModal, setShowAllClientsModal] = useState(false);
    const [allClients, setAllClients] = useState([]);
    const [dashboardTableClients, setDashboardTableClients] = useState([]);
    const [loadingAllClients, setLoadingAllClients] = useState(false);
    const [formInstanceKey, setFormInstanceKey] = useState(0);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [plans, setPlans] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [allClientsSearchTerm, setAllClientsSearchTerm] = useState('');
    const [allClientsPage, setAllClientsPage] = useState(1);
    const modalScrollRef = useRef(null);
    const itemsPerPage = 10;

    const closeAddModal = (force = false) => {
        if (!force && isFormDirty) {
            if (!window.confirm("You have unsaved changes. Are you sure you want to close?")) {
                return;
            }
        }
        setShowAddModal(false);
        setFormInstanceKey((currentKey) => currentKey + 1);
        setIsFormDirty(false);
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/gym/dashboard');
            setStats(res.data.data);

            // Fetch all clients including inactive ones
            const [activeRes, inactiveRes, plansRes, paymentsRes] = await Promise.all([
                api.get('/client?status=all'),
                api.get('/client/inactive'),
                api.get('/plan'),
                api.get('/payment')
            ]);
            const activeClients = activeRes.data.data || [];
            const inactiveClients = inactiveRes.data.data || [];
            const combined = [...activeClients, ...inactiveClients];
            const sorted = combined.sort((a, b) => {
                const idA = a.clientId || '';
                const idB = b.clientId || '';
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            });
            setAllClients(sorted);
            setDashboardTableClients(sorted.slice(0, 4));

            setPlans(plansRes.data.data);
            setAllPayments(paymentsRes.data.data || []);
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const fetchAllClients = async () => {
        setLoadingAllClients(true);
        setShowAllClientsModal(true);
        try {
            const [activeRes, inactiveRes] = await Promise.all([
                api.get('/client?status=all'),
                api.get('/client/inactive')
            ]);
            const activeClients = activeRes.data.data || [];
            const inactiveClients = inactiveRes.data.data || [];
            const combined = [...activeClients, ...inactiveClients];
            const sorted = combined.sort((a, b) => {
                const idA = a.clientId || '';
                const idB = b.clientId || '';
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            });
            setAllClients(sorted);
        } catch (error) {
            toast.error("Failed to refresh client list");
        } finally {
            setLoadingAllClients(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (showAllClientsModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showAllClientsModal]);
    // Skeleton pulse block for loading state
    const SkeletonCard = () => (
        <div className="card relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div>
                    <div className="h-3 w-24 bg-surface-divider rounded animate-pulse mb-3"></div>
                    <div className="h-8 w-16 bg-surface-divider rounded animate-pulse"></div>
                </div>
                <div className="w-12 h-12 bg-surface-divider rounded-xl animate-pulse"></div>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                        <h1 className="page-heading text-2xl md:text-[36px]">Dashboard Overview</h1>
                        <p className="text-text-secondary mt-1 text-sm md:text-base">Here is what's happening in your Gym today.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={() => setShowAddModal(true)} className="btn-primary flex-1 sm:flex-none text-sm md:text-base">
                            + Add Client
                        </button>
                        <button onClick={() => setShowPaymentModal(true)} className="btn-success flex-1 sm:flex-none text-sm md:text-base">
                            Record Payment
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {loading ? (
                        <>
                            <SkeletonCard /><SkeletonCard /><SkeletonCard />
                            <SkeletonCard /><SkeletonCard /><SkeletonCard />
                        </>
                    ) : (
                        <>
                            <StatCard title="Total Clients" value={stats?.stats?.totalClients || 0} icon={<Users size={22} />} accentClass="text-primary" />
                            <StatCard title="Active Clients" value={stats?.stats?.activeClients || 0} icon={<UserCheck size={22} />} accentClass="text-success" />
                            <StatCard
                                title="Retention Rate"
                                value={`${stats?.stats?.totalClients > 0 ? ((stats?.stats?.activeClients / stats?.stats?.totalClients) * 100).toFixed(1) : 0}%`}
                                icon={<Activity size={22} />}
                                accentClass="text-primary"
                            />
                            <div onClick={() => navigate('/owner/requests')} className="cursor-pointer">
                                <StatCard title="Pending Requests" value={stats?.pendingList?.length || 0} icon={<UserPlus size={22} />} accentClass="text-warning" />
                            </div>
                            <StatCard title="Expiring Soon" value={stats?.stats?.expiringSoon || 0} icon={<AlertCircle size={22} />} accentClass="text-warning" />
                            <StatCard title="Expired" value={stats?.stats?.expiredClients || 0} icon={<AlertTriangle size={22} />} accentClass="text-danger" />
                        </>
                    )}
                </div>

                {/* Client List Section */}
                <div className="card p-0 mb-10 bg-surface-divider/80 border-border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="flex justify-between items-center p-6 border-b border-border/60 bg-surface-divider/50">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <List size={20} className="text-primary" /> Client List
                        </h3>
                    </div>

                    <div className="overflow-hidden">
                        {dashboardTableClients.length === 0 ? (
                            <div className="py-12 text-center text-text-muted italic">No clients found</div>
                        ) : (
                            <ClientDashboardTable clients={dashboardTableClients} onView={setViewClient} />
                        )}
                    </div>

                    {stats?.stats?.totalClients > 4 && (
                        <div className="p-4 bg-surface-divider/10 border-t border-border/50">
                            <button
                                onClick={fetchAllClients}
                                className="w-full py-3 text-primary text-sm font-bold hover:bg-primary/5 rounded-lg border border-border transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                View More Clients
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Expiring Soon */}
                    <div className="card p-0 bg-surface-secondary/30 border-border rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-warning"></div> Expiring Soon</h3>
                        </div>
                        {stats?.expiringSoonList?.length === 0 ? (
                            <div className="py-8 text-center text-text-muted bg-surface-divider/50 dashed">No clients expiring soon</div>
                        ) : (
                            <div>
                                <ClientDashboardTable clients={stats?.expiringSoonList?.slice(0, 3) || []} onView={setViewClient} />

                                {stats?.stats?.expiringSoon > 3 && (
                                    <div className="p-4 border-t border-border">
                                        <button
                                            onClick={() => navigate('/owner/dues?tab=expiring')}
                                            className="w-full py-2 text-primary text-sm font-medium hover:bg-primary/10 rounded-lg border border-primary/20 transition-all"
                                        >
                                            View All Expiring
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Expired List */}
                    <div className="card p-0 bg-surface-secondary/30 border-border rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-alert"></div> Expired</h3>
                        </div>
                        {stats?.expiredList?.length === 0 ? (
                            <div className="py-8 text-center text-text-muted bg-surface-divider/50 dashed">No expired clients</div>
                        ) : (
                            <div>
                                <ClientDashboardTable clients={stats?.expiredList?.slice(0, 3) || []} onView={setViewClient} />

                                {stats?.stats?.expiredClients > 3 && (
                                    <div className="p-4 border-t border-border">
                                        <button
                                            onClick={() => navigate('/owner/expired')}
                                            className="w-full py-2 text-alert text-sm font-medium hover:bg-alert/10 rounded-lg border border-alert/20 transition-all"
                                        >
                                            View All Expired
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-surface-primary border border-border/50 rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <button type="button" onClick={() => closeAddModal(false)} className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors z-10">
                            <X size={24} />
                        </button>
                        <h2 className="text-2xl font-bold text-text-primary mb-6">Add New Client</h2>
                        <ClientForm
                            key={formInstanceKey}
                            mode="owner"
                            showCancel
                            onCancel={() => closeAddModal(false)}
                            onDirtyChange={setIsFormDirty}
                            onSuccess={() => {
                                closeAddModal(true);
                                toast.success('Client added successfully');
                                fetchStats();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* View Client Modal */}
            {viewClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-surface-secondary border border-border/50 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-text-primary">Client Details</h2>
                            <button onClick={() => setViewClient(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 bg-surface-secondary">
                            <ClientDetail clientId={viewClient._id} onClose={() => { setViewClient(null); fetchStats(); }} />
                        </div>
                    </div>
                </div>
            )}

            {/* View All Clients Modal */}
            {showAllClientsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-surface-secondary border border-border/50 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-divider/50">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">All Gym Members</h2>
                                <p className="text-text-muted text-xs mt-1">Sorted by Client ID ascending</p>
                            </div>
                            <button onClick={() => { setShowAllClientsModal(false); setAllClientsSearchTerm(''); }} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-divider rounded-lg transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-border bg-surface-divider/80">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Search by ID or Name..."
                                    className="w-full bg-surface-divider border border-border rounded-lg py-2.5 px-4 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                                    value={allClientsSearchTerm}
                                    onChange={(e) => { setAllClientsSearchTerm(e.target.value); setAllClientsPage(1); }}
                                />
                            </div>
                        </div>

                        <div ref={modalScrollRef} className="overflow-y-auto flex-1 custom-scrollbar">
                            {loadingAllClients ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-text-muted font-medium">Loading your members...</p>
                                </div>
                            ) : allClients.length === 0 ? (
                                <div className="py-20 text-center text-text-muted italic">No clients found</div>
                            ) : (() => {
                                const filtered = allClients.filter(c =>
                                    (c.personalInfo?.name || '').toLowerCase().includes(allClientsSearchTerm.toLowerCase()) ||
                                    (c.clientId || '').toLowerCase().includes(allClientsSearchTerm.toLowerCase())
                                );
                                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                const paginated = filtered.slice((allClientsPage - 1) * itemsPerPage, allClientsPage * itemsPerPage);
                                return (
                                    <>
                                        <ClientDashboardTable
                                            clients={paginated}
                                            onView={(c) => {
                                                setShowAllClientsModal(false);
                                                setAllClientsSearchTerm('');
                                                setAllClientsPage(1);
                                                setViewClient(c);
                                            }}
                                        />
                                        <Pagination
                                            currentPage={allClientsPage}
                                            totalPages={totalPages}
                                            disableAutoScroll
                                            onPageChange={(page) => {
                                                setAllClientsPage(page);
                                                if (modalScrollRef.current) {
                                                    modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                                }
                                            }}
                                        />
                                    </>
                                );
                            })()}
                        </div>

                        <div className="p-4 border-t border-border bg-surface-secondary text-center">
                            <p className="text-gray-600 text-[10px] uppercase font-bold tracking-[0.2em]">End of List • {allClients.length} Total Members</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSave={async (paymentData) => {
                    try {
                        if (paymentData._isUpdate && paymentData._paymentId) {
                            // Update existing pending payment
                            const additionalAmount = Number(paymentData.paidAmount) || 0;
                            if (additionalAmount <= 0) {
                                setShowPaymentModal(false);
                                return;
                            }
                            await api.put(`/payment/${paymentData._paymentId}`, {
                                additionalAmount,
                                paymentMethod: paymentData.paymentMethod
                            });
                            toast.success("Payment updated successfully");
                        } else {
                            // New payment
                            await api.post('/payment', paymentData);
                            toast.success("Payment recorded successfully");
                        }
                        setShowPaymentModal(false);
                        fetchStats();
                    } catch (error) {
                        toast.error(error.response?.data?.message || "Failed to record payment");
                        throw error;
                    }
                }}
                clients={allClients}
                plans={plans}
                payments={allPayments}
            />
        </div>
    );
};

export default Dashboard;
