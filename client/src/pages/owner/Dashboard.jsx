import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Users, UserCheck, AlertCircle, AlertTriangle, List, X, UserPlus, Eye, Activity, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClientForm from '../../components/ClientForm';
import ClientDetail from './ClientDetail';
import PaymentModal from '../../components/PaymentModal';
import ClientCard from '../../components/ClientCard';
import { calculateDaysLeft, formatDisplayDate, getPlanStatus } from '../../utils/membership';

const planStatusStyles = {
  Active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Upcoming: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Expired: 'bg-gray-500/10 text-gray-400 border border-gray-700/50',
};

const paymentStatusStyles = {
  paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial: 'bg-red-500/10 text-red-400 border border-red-500/20',
  overdue: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const StatCard = ({ title, value, icon, color }) => (
  <div className={`card relative overflow-hidden group`}>
     <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full opacity-[0.03] group-hover:opacity-10 group-hover:scale-150 transition-all duration-700 ease-out ${color}`}></div>
     
     <div className="flex justify-between items-start relative z-10">
        <div>
           <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1 opacity-80 group-hover:opacity-100 transition-opacity">{title}</p>
           <h3 className="text-3xl font-black text-white group-hover:text-primary transition-colors duration-300">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 backdrop-blur-md border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
           {icon}
        </div>
     </div>
     
     <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 ease-in-out ${color}`}></div>
  </div>
);

const ClientDashboardTable = ({ clients, onView }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
                <tr className="bg-gray-800/40 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-gray-800">
                    <th className="px-6 py-4">Client Info</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
                {clients.map(client => (
                    <tr key={client._id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-base border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    {client.personalInfo?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-white font-bold truncate group-hover:text-primary transition-colors">{client.personalInfo?.name}</span>
                                    <span className="text-gray-500 text-[10px] font-mono tracking-tighter uppercase">{client.clientId || 'N/A'}</span>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="text-gray-300 text-sm font-medium">{client.personalInfo?.mobileNo || '-'}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={() => onView(client)}
                                className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-primary rounded-lg transition-all shadow-lg border border-gray-700/50"
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
            
            // Fetch all clients to get the 'first' ones for the dashboard table
            const [activeRes, plansRes, paymentsRes] = await Promise.all([
                api.get('/client?status=all'),
                api.get('/plan'),
                api.get('/payment')
            ]);
            const combined = activeRes.data.data || [];
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
        // We already have allClients from fetchStats, but we can refresh it
        setLoadingAllClients(true);
        setShowAllClientsModal(true);
        try {
            const [activeRes] = await Promise.all([
                api.get('/client?status=all')
            ]);
            const combined = activeRes.data.data || [];
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
   // Skeleton pulse block for loading state
   const SkeletonCard = () => (
       <div className="card relative overflow-hidden">
           <div className="flex justify-between items-start">
               <div>
                   <div className="h-3 w-24 bg-gray-800 rounded animate-pulse mb-3"></div>
                   <div className="h-8 w-16 bg-gray-800 rounded animate-pulse"></div>
               </div>
               <div className="w-12 h-12 bg-gray-800 rounded-xl animate-pulse"></div>
           </div>
       </div>
   );

   return (
        <div className="flex flex-col h-full bg-dark">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
                    <div>
                       <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                       <p className="text-gray-400 mt-1 text-sm md:text-base">Here is what's happening in your Gym today.</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                       <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none text-center bg-primary hover:bg-blue-600 text-white px-4 md:px-5 py-2.5 rounded-lg shadow-lg shadow-primary/30 font-medium transition-all text-sm md:text-base">
                         + Add Client
                       </button>
                       <button onClick={() => setShowPaymentModal(true)} className="flex-1 sm:flex-none text-center bg-accent hover:bg-emerald-600 text-white px-4 md:px-5 py-2.5 rounded-lg shadow-lg shadow-accent/30 font-medium transition-all text-sm md:text-base">
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
                            <StatCard title="Total Clients" value={stats?.stats?.totalClients || 0} icon={<Users size={24} className="text-primary" />} color="bg-primary text-primary" />
                            <StatCard title="Active Clients" value={stats?.stats?.activeClients || 0} icon={<UserCheck size={24} className="text-emerald-400" />} color="bg-emerald-500 text-emerald-500" />
                            <StatCard 
                                title="Retention Rate" 
                                value={`${stats?.stats?.totalClients > 0 ? ((stats?.stats?.activeClients / stats?.stats?.totalClients) * 100).toFixed(1) : 0}%`} 
                                icon={<Activity size={24} className="text-blue-400" />} 
                                color="bg-blue-500 text-blue-500" 
                            />
                            <div onClick={() => navigate('/owner/requests')} className="cursor-pointer">
                                <StatCard title="Pending Requests" value={stats?.pendingList?.length || 0} icon={<UserPlus size={24} className="text-yellow-500" />} color="bg-yellow-500 text-yellow-500" />
                            </div>
                            <StatCard title="Expiring Soon" value={stats?.stats?.expiringSoon || 0} icon={<AlertCircle size={24} className="text-warning" />} color="bg-warning text-warning" />
                            <StatCard title="Expired" value={stats?.stats?.expiredClients || 0} icon={<AlertTriangle size={24} className="text-alert" />} color="bg-alert text-alert" />
                        </>
                    )}
                </div>

               {/* Client List Section */}
               <div className="card p-0 mb-10 bg-gray-900/40 border-gray-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="flex justify-between items-center p-6 border-b border-gray-800/60 bg-gray-800/20">
                     <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <List size={20} className="text-primary" /> Client List
                     </h3>
                  </div>
                  
                  <div className="overflow-hidden">
                    {dashboardTableClients.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 italic">No clients found</div>
                    ) : (
                        <ClientDashboardTable clients={dashboardTableClients} onView={setViewClient} />
                    )}
                  </div>

                  {stats?.stats?.totalClients > 4 && (
                      <div className="p-4 bg-gray-800/10 border-t border-gray-800/50">
                          <button 
                            onClick={fetchAllClients} 
                            className="w-full py-3 text-primary text-sm font-bold hover:bg-primary/5 rounded-xl border border-primary/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            View More Clients
                          </button>
                      </div>
                  )}
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Expiring Soon */}
                  <div className="card p-0 bg-gray-900/30 border-gray-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                     <div className="flex justify-between items-center p-6 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-warning"></div> Expiring Soon</h3>
                     </div>
                     {stats?.expiringSoonList?.length === 0 ? (
                         <div className="py-8 text-center text-gray-500 bg-gray-800/20 dashed">No clients expiring soon</div>
                     ) : (
                         <div>
                             <ClientDashboardTable clients={stats?.expiringSoonList?.slice(0, 3) || []} onView={setViewClient} />

                             {stats?.stats?.expiringSoon > 3 && (
                               <div className="p-4 border-t border-gray-800">
                                   <button 
                                     onClick={() => navigate('/owner/clients?status=Expiring Soon')}
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
                  <div className="card p-0 bg-gray-900/30 border-gray-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
                     <div className="flex justify-between items-center p-6 border-b border-gray-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-alert"></div> Expired</h3>
                     </div>
                     {stats?.expiredList?.length === 0 ? (
                         <div className="py-8 text-center text-gray-500 bg-gray-800/20 dashed">No expired clients</div>
                     ) : (
                         <div>
                             <ClientDashboardTable clients={stats?.expiredList?.slice(0, 3) || []} onView={setViewClient} />

                             {stats?.stats?.expiredClients > 3 && (
                               <div className="p-4 border-t border-gray-800">
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
           </div>

           {/* Add Client Modal */}
           {showAddModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                   <div className="relative bg-dark border border-gray-700/50 rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                       <button type="button" onClick={() => closeAddModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10">
                           <X size={24} />
                       </button>
                       <h2 className="text-2xl font-bold text-white mb-6">Add New Client</h2>
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
                    <div className="relative bg-gray-900 border border-gray-700/50 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-bold text-white">Client Details</h2>
                            <button onClick={() => setViewClient(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 bg-gray-900">
                            <ClientDetail clientId={viewClient._id} onClose={() => setViewClient(null)} />
                        </div>
                    </div>
                </div>
            )}

             {/* View All Clients Modal */}
             {showAllClientsModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                     <div className="relative bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden flex flex-col">
                         <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/20">
                             <div>
                                 <h2 className="text-xl font-bold text-white">All Gym Members</h2>
                                 <p className="text-gray-500 text-xs mt-1">Sorted by Client ID ascending</p>
                             </div>
                             <button onClick={() => { setShowAllClientsModal(false); setAllClientsSearchTerm(''); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                                 <X size={24} />
                             </button>
                         </div>

                         <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                             <div className="relative w-full">
                                 <input 
                                     type="text" 
                                     placeholder="Search by ID or Name..." 
                                     className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-4 text-white text-sm focus:outline-none focus:border-primary transition-colors"
                                     value={allClientsSearchTerm}
                                     onChange={(e) => setAllClientsSearchTerm(e.target.value)}
                                 />
                             </div>
                         </div>
                         
                         <div className="overflow-y-auto flex-1 custom-scrollbar">
                             {loadingAllClients ? (
                                 <div className="flex flex-col items-center justify-center py-20 gap-4">
                                     <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                     <p className="text-gray-500 font-medium">Loading your members...</p>
                                 </div>
                             ) : allClients.length === 0 ? (
                                 <div className="py-20 text-center text-gray-500 italic">No clients found</div>
                             ) : (
                                 <ClientDashboardTable 
                                     clients={allClients.filter(c => 
                                         (c.personalInfo?.name || '').toLowerCase().includes(allClientsSearchTerm.toLowerCase()) || 
                                         (c.clientId || '').toLowerCase().includes(allClientsSearchTerm.toLowerCase())
                                     )} 
                                     onView={(c) => {
                                         setShowAllClientsModal(false);
                                         setAllClientsSearchTerm('');
                                         setViewClient(c);
                                     }} 
                                 />
                             )}
                         </div>
                         
                         <div className="p-4 border-t border-gray-800 bg-gray-900 text-center">
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
