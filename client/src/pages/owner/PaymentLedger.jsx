import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { 
    Plus, 
    CircleDollarSign, 
    TrendingUp, 
    TrendingDown, 
    CreditCard, 
    Calendar,
    X,
    ChevronDown,
    Edit2,
    Trash2,
    FileText,
    Eye,
    Image as ImageIcon,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Equipment', 'Maintenance', 'Other'];

const CATEGORY_COLORS = {
    Rent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Salary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Utilities: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Equipment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Maintenance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};

const PaymentLedger = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Add Expense / View
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
    const [currentExpense, setCurrentExpense] = useState(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        note: '',
        billImage: null
    });
    const [billFile, setBillFile] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [paymentsRes, expensesRes] = await Promise.all([
                api.get('/payment'),
                api.get('/expenses')
            ]);
            setPayments(paymentsRes.data.data);
            setExpenses(expensesRes.data.data);
        } catch (error) {
            toast.error("Failed to load ledger data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter current month data
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPayments = payments.filter(p => {
        const d = new Date(p.paymentDate || p.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const monthlyExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return !e.isReminder && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Calculate Metrics
    const totalRevenue = monthlyPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    
    // Calculate online and cash payments (any paymentMethod other than 'cash' is online)
    const onlinePaymentsList = monthlyPayments.filter(p => p.paymentMethod && p.paymentMethod.toLowerCase() !== 'cash');
    const cashPaymentsList = monthlyPayments.filter(p => !p.paymentMethod || p.paymentMethod.toLowerCase() === 'cash');

    const onlinePaymentsTotal = onlinePaymentsList.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    const cashPaymentsTotal = cashPaymentsList.reduce((acc, p) => acc + (p.paidAmount || 0), 0);

    const onlinePercent = totalRevenue > 0 ? ((onlinePaymentsTotal / totalRevenue) * 100).toFixed(1) : 0;
    const cashPercent = totalRevenue > 0 ? ((cashPaymentsTotal / totalRevenue) * 100).toFixed(1) : 0;

    // Assuming a 2% gateway fee on online payments
    const gatewayFee = onlinePaymentsTotal * 0.02;
    const netAmount = totalRevenue - gatewayFee;

    const overallExpensesTotal = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
    const profit = netAmount - overallExpensesTotal;

    // Calculate overall pending payments (Not just current month)
    const pendingPaymentsOverall = payments.reduce((acc, p) => {
        if (p.status === 'pending' || p.status === 'partial') {
            return acc + (p.amount - (p.paidAmount || 0));
        }
        return acc;
    }, 0);

    const handleOpenModal = (mode, expense = null) => {
        setModalMode(mode);
        if ((mode === 'edit' || mode === 'view') && expense) {
            setCurrentExpense(expense);
            setFormData({
                title: expense.title,
                amount: expense.amount,
                category: expense.category || 'Other',
                date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                note: expense.note || '',
                billImage: expense.billImage
            });
        } else {
            setCurrentExpense(null);
            setFormData({
                title: '',
                amount: '',
                category: 'Other',
                date: new Date().toISOString().split('T')[0],
                note: '',
                billImage: null
            });
            setBillFile(null);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title || !formData.title.trim()) {
            return toast.error("Please enter a valid title");
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            return toast.error("Please enter a valid amount greater than 0");
        }

        const data = new FormData();
        data.append('title', formData.title);
        data.append('amount', formData.amount);
        data.append('category', formData.category);
        data.append('date', formData.date);
        data.append('note', formData.note);
        if (billFile) {
            data.append('billImage', billFile);
        }

        try {
            if (modalMode === 'add') {
                await api.post('/expenses', data);
                toast.success("Expense added successfully");
            } else if (modalMode === 'edit') {
                // For edit, we might want to support updating the image too
                await api.put(`/expenses/${currentExpense._id}`, data);
                toast.success("Updated successfully");
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this?")) return;
        try {
            await api.delete(`/expenses/${id}`);
            toast.success("Deleted successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark">
            <div className="flex-1 overflow-y-auto p-8 pt-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Payment Ledger</h1>
                        <p className="text-gray-400 mt-1">Dashboard style analytics and expense tracking.</p>
                    </div>
                </div>

                {loading ? (
                    <>
                        {/* Skeleton for dashboard cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="card bg-gray-900/50 border-gray-800 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-800/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gray-800 rounded-xl animate-pulse"></div>
                                        <div>
                                            <div className="h-3 w-20 bg-gray-800 rounded animate-pulse mb-2"></div>
                                            <div className="h-7 w-24 bg-gray-800 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Skeleton for breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-2 bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                                <div className="h-5 w-48 bg-gray-800 rounded animate-pulse mb-6"></div>
                                <div className="space-y-6">
                                    <div><div className="h-4 w-full bg-gray-800 rounded animate-pulse mb-2"></div><div className="h-3 w-full bg-gray-800 rounded-full animate-pulse"></div></div>
                                    <div><div className="h-4 w-full bg-gray-800 rounded animate-pulse mb-2"></div><div className="h-3 w-full bg-gray-800 rounded-full animate-pulse"></div></div>
                                </div>
                            </div>
                            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-gray-800 rounded-full animate-pulse mb-4"></div>
                                <div className="h-5 w-32 bg-gray-800 rounded animate-pulse mb-2"></div>
                                <div className="h-10 w-28 bg-gray-800 rounded animate-pulse"></div>
                            </div>
                        </div>
                        {/* Skeleton for expenses table */}
                        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <div className="h-5 w-32 bg-gray-800 rounded animate-pulse"></div>
                                <div className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse"></div>
                            </div>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-800/50">
                                    <div className="h-4 w-28 bg-gray-800 rounded animate-pulse"></div>
                                    <div className="h-5 w-16 bg-gray-800 rounded-full animate-pulse"></div>
                                    <div className="h-4 w-20 bg-gray-800 rounded animate-pulse"></div>
                                    <div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div>
                                    <div className="flex gap-2 ml-auto"><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-gray-800 rounded-lg animate-pulse"></div></div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* TOP DASHBOARD CARDS (Current Month) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="card bg-gray-900/50 border-gray-800 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400">
                                        <CircleDollarSign size={28} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
                                        <h3 className="text-2xl font-black text-white">₹{totalRevenue.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card bg-gray-900/50 border-gray-800 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-xl bg-primary/10 text-primary">
                                        <TrendingUp size={28} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Net Amount</p>
                                        <h3 className="text-2xl font-black text-white">₹{netAmount.toLocaleString()}</h3>
                                        <p className="text-xs text-gray-500">After ₹{gatewayFee.toLocaleString()} Gateway Fee</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-gray-900/50 border-gray-800 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400">
                                        <TrendingDown size={28} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Overall Expenses</p>
                                        <h3 className="text-2xl font-black text-white">₹{overallExpensesTotal.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="card bg-gray-900/50 border-gray-800 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-400">
                                        <CreditCard size={28} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Profit</p>
                                        <h3 className="text-2xl font-black text-white">₹{profit.toLocaleString()}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2 & 3: Payment Breakdown & Pending Payments */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-2 bg-gray-900/30 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <CreditCard size={20} className="text-primary" />
                                    Payment Breakdown (Current Month)
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-gray-300">Online Payments</span>
                                            <span className="text-sm font-bold text-white">₹{onlinePaymentsTotal.toLocaleString()} ({onlinePercent}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-3">
                                            <div className="bg-primary h-3 rounded-full" style={{ width: `${onlinePercent}%` }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-gray-300">Cash Payments</span>
                                            <span className="text-sm font-bold text-white">₹{cashPaymentsTotal.toLocaleString()} ({cashPercent}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-3">
                                            <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${cashPercent}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-center items-center text-center">
                                <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 mb-4">
                                    <TrendingDown size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Pending Payments</h3>
                                <p className="text-sm text-gray-400 mb-4">Overall unpaid amount from clients</p>
                                <h2 className="text-4xl font-black text-rose-500">₹{pendingPaymentsOverall.toLocaleString()}</h2>
                            </div>
                        </div>

                        {/* EXPENSES LIST */}
                        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FileText size={20} className="text-primary" />
                                    Expenses List
                                </h3>
                                <button 
                                    onClick={() => handleOpenModal('add')}
                                    className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg shadow-primary/30 font-medium transition-all text-sm"
                                >
                                    <Plus size={16} /> Add Expense
                                </button>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-gray-900 z-10 border-b border-gray-800">
                                        <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            <th className="p-4">Title / Name</th>
                                            <th className="p-4">Category</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Amount</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {monthlyExpenses.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                                    No expenses recorded this month.
                                                </td>
                                            </tr>
                                        ) : monthlyExpenses.map(exp => (
                                            <tr key={exp._id} className="hover:bg-gray-800/30 transition-colors group">
                                                <td className="p-4">
                                                    <span className="text-white font-semibold">{exp.title}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other}`}>
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-gray-500" />
                                                        {new Date(exp.date).toLocaleDateString('en-GB')}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-white font-black">₹{exp.amount.toLocaleString()}</span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal('view', exp); }}
                                                            className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', exp); }}
                                                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(exp._id); }}
                                                            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit / View Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-dark border border-gray-700/50 rounded-xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                        
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            {modalMode === 'view' ? <Eye className="text-emerald-400" /> : <CircleDollarSign className="text-primary" />}
                            {modalMode === 'add' ? 'Add Expense' : modalMode === 'edit' ? 'Edit Entry' : 'View Details'}
                        </h2>
                        
                        {modalMode === 'view' ? (
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Title</p>
                                    <p className="text-white font-medium">{formData.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                                        <p className="text-white font-black text-xl">₹{Number(formData.amount).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Category</p>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-block mt-1 ${CATEGORY_COLORS[formData.category] || CATEGORY_COLORS.Other}`}>
                                            {formData.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</p>
                                    <p className="text-white">{new Date(formData.date).toLocaleDateString('en-GB')}</p>
                                </div>
                                {formData.note && (
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-gray-300 text-sm leading-relaxed">{formData.note}</p>
                                    </div>
                                )}
                                {currentExpense?.billImage && (
                                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Attached Bill</p>
                                        <a 
                                            href={`${(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')}${currentExpense.billImage}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 w-full p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all group"
                                        >
                                            <ImageIcon size={18} />
                                            <span className="text-sm font-bold">View Bill Document</span>
                                            <ExternalLink size={14} className="ml-auto opacity-50 group-hover:opacity-100" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Title / Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary"
                                        placeholder="e.g., Monthly Rent"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            required
                                            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                                value={formData.category}
                                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            >
                                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Notes (Optional)</label>
                                    <textarea 
                                        className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary h-24 resize-none"
                                        placeholder="Add any additional details..."
                                        value={formData.note}
                                        onChange={(e) => setFormData({...formData, note: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Attach Bill (Optional)</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={(e) => setBillFile(e.target.files[0])}
                                            className="hidden" 
                                            id="bill-upload"
                                        />
                                        <label 
                                            htmlFor="bill-upload"
                                            className="flex items-center justify-center gap-2 w-full bg-gray-900 border border-gray-800 border-dashed rounded-lg py-4 px-4 text-gray-400 cursor-pointer hover:border-primary hover:text-primary transition-all"
                                        >
                                            <ImageIcon size={20} />
                                            <span className="text-sm font-medium">
                                                {billFile ? billFile.name : 'Upload Bill/Receipt Image'}
                                            </span>
                                        </label>
                                        {billFile && (
                                            <button 
                                                type="button" 
                                                onClick={() => setBillFile(null)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-rose-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit"
                                    className="w-full text-white font-bold py-3 rounded-lg shadow-lg transition-all mt-4 bg-primary hover:bg-blue-600 shadow-primary/30"
                                >
                                    {modalMode === 'add' ? 'Create Expense' : 'Save Changes'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentLedger;
