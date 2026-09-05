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
    ExternalLink,
    Download,
    RefreshCw,
    BarChart3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomDatePicker from '../../components/CustomDatePicker';
import CustomDropdown from '../../components/CustomDropdown';
import { DATE_RULES, getCurrentYear, validateExpenseDate } from '../../utils/dateInput';
import ConfirmModal from '../../components/ConfirmModal';
import Tooltip from '../../components/Tooltip';


const CATEGORIES = ['Rent', 'Salary', 'Utilities', 'Equipment', 'Maintenance', 'Other'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CATEGORY_COLORS = {
    Rent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Salary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Utilities: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Equipment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Maintenance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};

const getBillUrl = (billPath) => {
    if (!billPath) return '';
    if (billPath.startsWith('http://') || billPath.startsWith('https://')) {
        return billPath;
    }
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
    return `${baseUrl}${billPath}`;
};

const PaymentLedger = () => {
    const { user, role } = useAuth();
    const isReadOnly = role === 'superadmin' && !!sessionStorage.getItem('viewGymId');
    const [payments, setPayments] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Period filtering state
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Modal state for Add Expense / View
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
    const [currentExpense, setCurrentExpense] = useState(null);
    const [selectedExpenseId, setSelectedExpenseId] = useState(null);

    // Confirm delete modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Other',
        date: new Date().toISOString().split('T')[0],
        note: '',
        billImage: null
    });
    const [billFile, setBillFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const validateField = (name, val) => {
        let errMessage = '';
        if (name === 'amount') {
            const digits = val.replace(/\D/g, '');
            const num = Number(val);
            if (val !== '' && (num <= 0 || isNaN(num))) {
                errMessage = 'Enter a valid amount greater than 0';
            }
        } else if (name === 'note') {
            if (val.length > 100) {
                errMessage = 'Notes cannot exceed 100 characters';
            }
        } else if (name === 'title') {
            if (!val || !val.trim()) {
                errMessage = 'Title / Name is required';
            } else if (val.trim().length > 25) {
                errMessage = 'Title cannot exceed 25 characters';
            }
        } else if (name === 'date') {
            if (val) {
                const yearMessage = validateExpenseDate(val);
                if (yearMessage) {
                    errMessage = yearMessage;
                } else {
                    const d = new Date(val);
                    if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) {
                        const monthName = MONTHS[selectedMonth];
                        errMessage = `Date must be within the selected month (${monthName} ${selectedYear})`;
                    }
                }
            }
        }

        setFormErrors(prev => {
            const newErr = { ...prev };
            if (errMessage) {
                newErr[name] = errMessage;
            } else {
                delete newErr[name];
            }
            return newErr;
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [paymentsRes, expensesRes, clientsRes] = await Promise.all([
                api.get('/payment'),
                api.get('/expenses'),
                api.get('/client')
            ]);
            setPayments(paymentsRes.data.data);
            setExpenses(expensesRes.data.data);
            setClients(clientsRes.data.data || []);
        } catch (error) {
            toast.error("Failed to load ledger data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Dynamically calculate year range options from existing data
    const yearOptions = React.useMemo(() => {
        const years = new Set();
        years.add(new Date().getFullYear());
        payments.forEach(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            if (!isNaN(d.getFullYear())) years.add(d.getFullYear());
        });
        expenses.forEach(e => {
            const d = new Date(e.date);
            if (!isNaN(d.getFullYear())) years.add(d.getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [payments, expenses]);

    // Filter payments and expenses by selected month and year
    const monthlyPayments = React.useMemo(() => {
        return payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [payments, selectedMonth, selectedYear]);

    const monthlyExpenses = React.useMemo(() => {
        return expenses.filter(e => {
            const d = new Date(e.date);
            return !e.isReminder && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [expenses, selectedMonth, selectedYear]);

    // Filtered expenses for Expenses table only
    const filteredExpenses = React.useMemo(() => {
        return monthlyExpenses.filter(e => selectedCategory === 'All' || e.category === selectedCategory);
    }, [monthlyExpenses, selectedCategory]);

    // Calculate metrics for selected month/year
    const totalRevenue = React.useMemo(() => {
        return monthlyPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    }, [monthlyPayments]);

    const onlinePaymentsList = React.useMemo(() => {
        return monthlyPayments.filter(p => p.razorpay_payment_id);
    }, [monthlyPayments]);

    const offlinePaymentsList = React.useMemo(() => {
        return monthlyPayments.filter(p => !p.razorpay_payment_id);
    }, [monthlyPayments]);

    const onlinePaymentsTotal = React.useMemo(() => {
        return onlinePaymentsList.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    }, [onlinePaymentsList]);

    const offlinePaymentsTotal = React.useMemo(() => {
        return offlinePaymentsList.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    }, [offlinePaymentsList]);

    const onlinePercent = totalRevenue > 0 ? ((onlinePaymentsTotal / totalRevenue) * 100).toFixed(1) : '0.0';
    const offlinePercent = totalRevenue > 0 ? ((offlinePaymentsTotal / totalRevenue) * 100).toFixed(1) : '0.0';

    const gatewayFee = onlinePaymentsTotal * 0.02;
    const netAmount = totalRevenue - gatewayFee;

    const overallExpensesTotal = React.useMemo(() => {
        return monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
    }, [monthlyExpenses]);

    const profit = netAmount - overallExpensesTotal;

    // Calculate pending payments within the selected period dynamically based on client outstanding balances
    const pendingPaymentsPeriod = React.useMemo(() => {
        const selectedPeriodEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
        let sumPending = 0;

        clients.forEach(client => {
            if (!client.isActive) return;
            if (client.memberships && Array.isArray(client.memberships)) {
                client.memberships.forEach(m => {
                    const startD = new Date(m.startDate);
                    if (startD > selectedPeriodEnd) return; // Started in the future relative to the selected period

                    // Find all payment records for this client, plan, and start date that happened on or before selectedPeriodEnd
                    const relatedPayments = payments.filter(p =>
                        p.clientId?.toString() === client._id.toString() &&
                        p.planId?.toString() === m.planId?.toString() &&
                        new Date(p.startDate).getTime() === startD.getTime() &&
                        new Date(p.paymentDate || p.createdAt) <= selectedPeriodEnd
                    );

                    const totalPaidInPeriod = relatedPayments.reduce((sum, p) => sum + (p.paidNow || p.paidAmount || 0), 0);
                    const finalPrice = m.finalPrice || (relatedPayments.length > 0 ? (relatedPayments[0].invoiceAmount || relatedPayments[0].amount) : 0);
                    const balance = Math.max(0, finalPrice - totalPaidInPeriod);
                    sumPending += balance;
                });
            }
        });
        return sumPending;
    }, [payments, clients, selectedMonth, selectedYear]);

    // Compute previous month metrics for MoM comparison
    const previousMonthMetrics = React.useMemo(() => {
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

        const prevPayments = payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        const prevExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return !e.isReminder && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });

        const prevRev = prevPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
        const prevOnlinePay = prevPayments.filter(p => p.razorpay_payment_id).reduce((acc, p) => acc + (p.paidAmount || 0), 0);
        const prevNet = prevRev - (prevOnlinePay * 0.02);
        const prevExp = prevExpenses.reduce((acc, e) => acc + e.amount, 0);
        const prevProf = prevNet - prevExp;

        return {
            revenue: prevRev,
            expenses: prevExp,
            profit: prevProf
        };
    }, [payments, expenses, selectedMonth, selectedYear]);

    // Percentage change calculator helper
    const getMoMChange = (current, previous) => {
        if (previous === 0) {
            if (current === 0) return { percent: '0.0', isPositive: true, isNeutral: true };
            return { percent: '100.0', isPositive: current > 0, isNeutral: false };
        }
        const diff = current - previous;
        const percent = ((diff / Math.abs(previous)) * 100).toFixed(1);
        return {
            percent: Math.abs(percent),
            isPositive: diff >= 0,
            isNeutral: diff === 0
        };
    };

    const revenueChange = getMoMChange(totalRevenue, previousMonthMetrics.revenue);
    const expensesChange = getMoMChange(overallExpensesTotal, previousMonthMetrics.expenses);
    const profitChange = getMoMChange(profit, previousMonthMetrics.profit);

    // Compute 6-Month Trend Data ending in selected month/year
    const trendData = React.useMemo(() => {
        const monthsData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 5; i >= 0; i--) {
            let m = selectedMonth - i;
            let y = selectedYear;
            if (m < 0) {
                m += 12;
                y -= 1;
            }

            const mPayments = payments.filter(p => {
                const d = new Date(p.paymentDate || p.createdAt);
                return d.getMonth() === m && d.getFullYear() === y;
            });

            const mExpenses = expenses.filter(e => {
                const d = new Date(e.date);
                return !e.isReminder && d.getMonth() === m && d.getFullYear() === y;
            });

            const rev = mPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
            const onlinePay = mPayments.filter(p => p.razorpay_payment_id).reduce((acc, p) => acc + (p.paidAmount || 0), 0);
            const net = rev - (onlinePay * 0.02);
            const exp = mExpenses.reduce((acc, e) => acc + e.amount, 0);
            const prof = net - exp;

            monthsData.push({
                label: `${monthNames[m]} ${String(y).slice(-2)}`,
                revenue: rev,
                expenses: exp,
                profit: prof
            });
        }
        return monthsData;
    }, [payments, expenses, selectedMonth, selectedYear]);

    const maxTrendValue = React.useMemo(() => {
        const values = trendData.flatMap(d => [d.revenue, d.expenses, Math.max(0, d.profit)]);
        return Math.max(...values, 1000);
    }, [trendData]);

    // PDF Export function
    const exportPDF = () => {
        const doc = new jsPDF();
        const periodStr = `${MONTHS[selectedMonth]} ${selectedYear}`;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text('GYM LEDGER & FINANCIAL REPORT', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(`Period: ${periodStr}`, 14, 26);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 31);

        // Summary Table
        const summaryRows = [
            ['Total Revenue', `INR ${totalRevenue.toLocaleString()}`],
            ['Online Payments (Razorpay)', `INR ${onlinePaymentsTotal.toLocaleString()}`],
            ['Offline Payments (Gym-Collected)', `INR ${offlinePaymentsTotal.toLocaleString()}`],
            ['Online Gateway Fees (2% estimation)', `INR ${gatewayFee.toLocaleString()}`],
            ['Net Amount (After Gateway Fees)', `INR ${netAmount.toLocaleString()}`],
            ['Overall Expenses', `INR ${overallExpensesTotal.toLocaleString()}`],
            ['Net Profit (Net Amount - Overall Expenses)', `INR ${profit.toLocaleString()}`],
            ['Pending Payments in Period', `INR ${pendingPaymentsPeriod.toLocaleString()}`]
        ];

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('1. Financial Summary', 14, 42);

        autoTable(doc, {
            startY: 46,
            head: [['Financial Metric', 'Value']],
            body: summaryRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue-500
            styles: { fontSize: 10, cellPadding: 5 }
        });

        // Expenses Page
        doc.addPage();
        doc.setFontSize(14);
        doc.text(`2. Expenses Details (${periodStr})`, 14, 20);

        const expenseHeaders = [['Title / Name', 'Category', 'Date', 'Amount (INR)', 'Notes']];
        const expenseRows = monthlyExpenses.map(exp => [
            exp.title,
            exp.category,
            new Date(exp.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
            exp.amount.toLocaleString(),
            exp.note || ''
        ]);

        autoTable(doc, {
            startY: 25,
            head: expenseHeaders,
            body: expenseRows,
            theme: 'grid',
            headStyles: { fillColor: [244, 63, 94] }, // Rose-500
            styles: { fontSize: 9, cellPadding: 4 }
        });

        doc.save(`Financial_Report_${MONTHS[selectedMonth]}_${selectedYear}.pdf`);
        toast.success('PDF report exported successfully!');
    };

    // Excel Export function
    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        const periodStr = `${MONTHS[selectedMonth]} ${selectedYear}`;

        // 1. Summary Sheet
        const summaryData = [
            { 'Financial Parameter': 'Report Period', 'Value / Amount': periodStr },
            { 'Financial Parameter': 'Total Revenue (INR)', 'Value / Amount': totalRevenue },
            { 'Financial Parameter': 'Online Payments (Razorpay)', 'Value / Amount': onlinePaymentsTotal },
            { 'Financial Parameter': 'Offline Payments', 'Value / Amount': offlinePaymentsTotal },
            { 'Financial Parameter': 'Gateway Fees (2%)', 'Value / Amount': gatewayFee },
            { 'Financial Parameter': 'Net Amount', 'Value / Amount': netAmount },
            { 'Financial Parameter': 'Overall Expenses', 'Value / Amount': overallExpensesTotal },
            { 'Financial Parameter': 'Net Profit', 'Value / Amount': profit },
            { 'Financial Parameter': 'Pending Payments in Period', 'Value / Amount': pendingPaymentsPeriod }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Financial Summary');

        // 2. Expenses Sheet
        const expensesData = monthlyExpenses.map(exp => ({
            'Title / Description': exp.title,
            'Category': exp.category,
            'Date': new Date(exp.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
            'Amount (INR)': exp.amount,
            'Additional Notes': exp.note || ''
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses Details');

        XLSX.writeFile(wb, `Financial_Ledger_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
        toast.success('Excel ledger exported successfully!');
    };

    const handleResetPeriod = () => {
        const today = new Date();
        setSelectedMonth(today.getMonth());
        setSelectedYear(today.getFullYear());
        setSelectedCategory('All');
        toast.info('Filters reset to current month');
    };

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
            const today = new Date();
            let defaultDateStr = today.toISOString().split('T')[0];
            if (today.getMonth() !== selectedMonth || today.getFullYear() !== selectedYear) {
                const defaultDate = new Date(selectedYear, selectedMonth, 1);
                const y = defaultDate.getFullYear();
                const m = String(defaultDate.getMonth() + 1).padStart(2, '0');
                const d = String(defaultDate.getDate()).padStart(2, '0');
                defaultDateStr = `${y}-${m}-${d}`;
            }
            setFormData({
                title: '',
                amount: '',
                category: 'Other',
                date: defaultDateStr,
                note: '',
                billImage: null
            });
            setBillFile(null);
        }
        setFormErrors({});
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
        if (!formData.date || isNaN(new Date(formData.date).getTime())) {
            return toast.error("Please enter a valid Date");
        }
        if (Object.keys(formErrors).length > 0) {
            return toast.error("Please fix validation errors first");
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

    const handleDelete = (id) => {
        setExpenseToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setShowDeleteConfirm(false);
        try {
            await api.delete(`/expenses/${expenseToDelete}`);
            toast.success("Deleted successfully");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete");
        } finally {
            setExpenseToDelete(null);
        }
    };

    const minExpenseDate = new Date(selectedYear, selectedMonth, 1);
    const maxExpenseDate = new Date(selectedYear, selectedMonth + 1, 0);

    const formatYYYYMMDD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const minDateStr = formatYYYYMMDD(minExpenseDate);
    const maxDateStr = formatYYYYMMDD(maxExpenseDate);

    return (
        <div className="p-4 sm:p-8 pt-10">
            {/* Header and Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-3">
                        Financial Ledger & Analytics
                    </h1>
                    <p className="text-text-secondary mt-1">Analyze historical gym revenue, expenses, and profitability trends.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Month Filter */}
                    <CustomDropdown
                        value={selectedMonth}
                        onChange={(val) => setSelectedMonth(Number(val))}
                        options={MONTHS.map((m, idx) => ({ label: m, value: idx }))}
                    />

                    {/* Year Filter */}
                    <CustomDropdown
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(Number(val))}
                        options={yearOptions.map(yr => ({ label: String(yr), value: yr }))}
                    />

                    {/* Reset button */}
                    <Tooltip content="Reset to Current Month">
                        <button
                            onClick={handleResetPeriod}
                            className="flex items-center gap-1.5 bg-surface-secondary border border-border text-text-secondary hover:text-text-primary px-3 py-2 rounded-xl transition-all text-sm"
                        >
                            <RefreshCw size={14} />
                            Reset
                        </button>
                    </Tooltip>

                    <div className="h-6 w-px bg-surface-divider mx-1 hidden sm:block"></div>

                    {/* Export Buttons */}
                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-text-primary px-3 py-2 rounded-xl transition-all text-sm font-semibold"
                    >
                        <Download size={14} />
                        PDF
                    </button>
                    <button
                        onClick={exportExcel}
                        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-text-primary px-3 py-2 rounded-xl transition-all text-sm font-semibold"
                    >
                        <Download size={14} />
                        Excel
                    </button>
                </div>
            </div>

            {loading ? (
                <>
                    {/* Skeleton for dashboard cards */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card bg-surface-divider/80 border-border backdrop-blur-md p-3.5 sm:p-6 rounded-2xl shadow-lg border border-border/50">
                                <div className="flex items-center gap-2.5 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
                                    <div className="min-w-0 flex-1">
                                        <div className="h-3 w-16 sm:w-20 bg-surface-divider rounded animate-pulse mb-2"></div>
                                        <div className="h-5 sm:h-7 w-20 sm:w-24 bg-surface-divider rounded animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Skeleton for breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2 bg-surface-secondary/30 border border-border rounded-2xl p-6">
                            <div className="h-5 w-48 bg-surface-divider rounded animate-pulse mb-6"></div>
                            <div className="space-y-6">
                                <div><div className="h-4 w-full bg-surface-divider rounded animate-pulse mb-2"></div><div className="h-3 w-full bg-surface-divider rounded-full animate-pulse"></div></div>
                                <div><div className="h-4 w-full bg-surface-divider rounded animate-pulse mb-2"></div><div className="h-3 w-full bg-surface-divider rounded-full animate-pulse"></div></div>
                            </div>
                        </div>
                        <div className="bg-surface-secondary/30 border border-border rounded-2xl p-6 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-surface-divider rounded-full animate-pulse mb-4"></div>
                            <div className="h-5 w-32 bg-surface-divider rounded animate-pulse mb-2"></div>
                            <div className="h-10 w-28 bg-surface-divider rounded animate-pulse"></div>
                        </div>
                    </div>
                    {/* Skeleton for expenses table */}
                    <div className="bg-surface-secondary/30 border border-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div className="h-5 w-32 bg-surface-divider rounded animate-pulse"></div>
                            <div className="h-9 w-28 bg-surface-divider rounded-lg animate-pulse"></div>
                        </div>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50">
                                <div className="h-4 w-28 bg-surface-divider rounded animate-pulse"></div>
                                <div className="h-5 w-16 bg-surface-divider rounded-full animate-pulse"></div>
                                <div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div>
                                <div className="h-4 w-16 bg-surface-divider rounded animate-pulse"></div>
                                <div className="flex gap-2 ml-auto"><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div><div className="h-7 w-7 bg-surface-divider rounded-lg animate-pulse"></div></div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* TOP DASHBOARD CARDS */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-8">
                        <div className="card bg-surface-divider/80 border-border backdrop-blur-md p-3.5 sm:p-6 rounded-2xl shadow-lg border border-border/50">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="p-2.5 sm:p-4 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                                    <CircleDollarSign size={20} className="sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Total Revenue</p>
                                    <h3 className="text-lg sm:text-2xl font-black text-text-primary truncate">₹{totalRevenue.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-surface-divider/80 border-border backdrop-blur-md p-3.5 sm:p-6 rounded-2xl shadow-lg border border-border/50">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="p-2.5 sm:p-4 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <TrendingUp size={20} className="sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Amount Received</p>
                                    <h3 className="text-lg sm:text-2xl font-black text-text-primary truncate">₹{netAmount.toLocaleString()}</h3>
                                    <p className="text-[10px] text-text-muted truncate hidden sm:block">After ₹{gatewayFee.toLocaleString()} Fee</p>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-surface-divider/80 border-border backdrop-blur-md p-3.5 sm:p-6 rounded-2xl shadow-lg border border-border/50">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="p-2.5 sm:p-4 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                                    <TrendingDown size={20} className="sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Overall Expenses</p>
                                    <h3 className="text-lg sm:text-2xl font-black text-text-primary truncate">₹{overallExpensesTotal.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-surface-divider/80 border-border backdrop-blur-md p-3.5 sm:p-6 rounded-2xl shadow-lg border border-border/50">
                            <div className="flex items-center gap-2.5 sm:gap-4">
                                <div className="p-2.5 sm:p-4 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                    <CreditCard size={20} className="sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1">Profit</p>
                                    <h3 className="text-lg sm:text-2xl font-black text-text-primary truncate">₹{profit.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Month-over-Month Comparison Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5 mb-8">
                        <div className="card bg-surface-secondary/50 border border-border/60 p-3.5 sm:p-4 rounded-2xl flex flex-col gap-2 backdrop-blur-sm shadow-md">
                            <span className="text-text-secondary text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider leading-tight">Revenue MoM Change</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-base sm:text-xl font-bold text-text-primary">₹{totalRevenue.toLocaleString()}</span>
                                <span className="text-[10px] text-text-muted leading-snug">vs ₹{previousMonthMetrics.revenue.toLocaleString()} last month</span>
                            </div>
                        </div>

                        <div className="card bg-surface-secondary/50 border border-border/60 p-3.5 sm:p-4 rounded-2xl flex flex-col gap-2 backdrop-blur-sm shadow-md">
                            <span className="text-text-secondary text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider leading-tight">Expenses MoM Change</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-base sm:text-xl font-bold text-text-primary">₹{overallExpensesTotal.toLocaleString()}</span>
                                <span className="text-[10px] text-text-muted leading-snug">vs ₹{previousMonthMetrics.expenses.toLocaleString()} last month</span>
                            </div>
                        </div>

                        <div className="card col-span-2 sm:col-span-1 bg-surface-secondary/50 border border-border/60 p-3.5 sm:p-4 rounded-2xl flex flex-col gap-2 backdrop-blur-sm shadow-md">
                            <span className="text-text-secondary text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider leading-tight">Profit MoM Change</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-base sm:text-xl font-bold text-text-primary">₹{profit.toLocaleString()}</span>
                                <span className="text-[10px] text-text-muted leading-snug">vs ₹{previousMonthMetrics.profit.toLocaleString()} last month</span>
                            </div>
                        </div>
                    </div>



                    {/* SECTION 2 & 3: Payment Breakdown & Pending Payments */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        <div className="lg:col-span-2 bg-surface-secondary/30 border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                                <CreditCard size={20} className="text-primary" />
                                Payment Breakdown ({MONTHS[selectedMonth]} {selectedYear})
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-text-secondary">Online Payments</span>
                                        <span className="text-sm font-bold text-text-primary">₹{onlinePaymentsTotal.toLocaleString()} ({onlinePercent}%)</span>
                                    </div>
                                    <div className="w-full bg-surface-divider rounded-full h-3">
                                        <div className="bg-primary h-3 rounded-full" style={{ width: `${onlinePercent}%` }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-text-secondary">Offline Payments</span>
                                        <span className="text-sm font-bold text-text-primary">₹{offlinePaymentsTotal.toLocaleString()} ({offlinePercent}%)</span>
                                    </div>
                                    <div className="w-full bg-surface-divider rounded-full h-3">
                                        <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${offlinePercent}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-secondary/30 border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-sm flex flex-col justify-center items-center text-center">
                            <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 mb-4">
                                <TrendingDown size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary mb-2">Pending Payments</h3>
                            <p className="text-sm text-text-secondary mb-4">Unpaid balance in selected period</p>
                            <h2 className="text-4xl font-black text-rose-500">₹{pendingPaymentsPeriod.toLocaleString()}</h2>
                        </div>
                    </div>

                    {/* EXPENSES LIST */}
                    <div className="bg-surface-secondary/30 border border-border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="p-4 sm:p-6 border-b border-border space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-text-primary">Expenses List</h3>
                                        <p className="text-xs text-text-muted">Showing expenses for {MONTHS[selectedMonth]} {selectedYear}</p>
                                    </div>
                                </div>

                                {!isReadOnly && (
                                    <button
                                        onClick={() => handleOpenModal('add')}
                                        className="flex items-center justify-center gap-2 bg-primary hover:brightness-95 text-text-primary px-4 py-2 rounded-xl shadow-lg shadow-primary/30 font-medium transition-all text-sm w-full sm:w-auto"
                                    >
                                        <Plus size={16} /> Add Expense
                                    </button>
                                )}
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                {['All', ...CATEGORIES].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${selectedCategory === cat
                                            ? 'bg-primary text-text-primary shadow-md font-bold'
                                            : 'bg-surface-divider text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border/50'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="sticky top-0 bg-surface-secondary z-10 border-b border-border">
                                    <tr className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        <th className="p-4">Title / Name</th>
                                        <th className="p-4 text-center">Category</th>
                                        <th className="p-4 text-center">Date</th>
                                        <th className="p-4 text-center">Amount</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-text-muted">
                                                No expenses recorded matching the selected filters.
                                            </td>
                                        </tr>
                                    ) : filteredExpenses.map(exp => (
                                        <tr key={exp._id} className="hover:bg-surface-divider/80 transition-colors group">
                                            <td className="p-4">
                                                <span className="text-text-primary font-semibold">{exp.title}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Other}`}>
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-text-secondary text-sm">
                                                {new Date(exp.date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-text-primary font-black">₹{exp.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal('view', exp); }}
                                                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-text-primary rounded-lg transition-all"
                                                        title="View"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal('edit', exp); }}
                                                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-text-primary rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(exp._id); }}
                                                            className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-text-primary rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
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

            {/* Add / Edit / View Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="relative bg-surface-primary border border-border/50 rounded-xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            {modalMode === 'view' ? <Eye className="text-emerald-400" /> : <CircleDollarSign className="text-primary" />}
                            {modalMode === 'add' ? 'Add Expense' : modalMode === 'edit' ? 'Edit Entry' : 'View Details'}
                        </h2>

                        {modalMode === 'view' ? (
                            <div className="space-y-4">
                                <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Title</p>
                                    <p className="text-text-primary font-medium">{formData.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Amount</p>
                                        <p className="text-text-primary font-black text-xl">₹{Number(formData.amount).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Category</p>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-block mt-1 ${CATEGORY_COLORS[formData.category] || CATEGORY_COLORS.Other}`}>
                                            {formData.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Date</p>
                                    <p className="text-text-primary">{new Date(formData.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                </div>
                                {formData.note && (
                                    <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{formData.note}</p>
                                    </div>
                                )}
                                {currentExpense?.billImage && (
                                    <div className="bg-surface-divider/80 p-4 rounded-lg border border-border">
                                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Attached Bill</p>
                                        <a
                                            href={getBillUrl(currentExpense.billImage)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 w-full p-3 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-text-primary transition-all group"
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
                                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Title / Name</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={25}
                                        className="w-full bg-surface-secondary border border-border rounded-lg py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary"
                                        placeholder="e.g., Monthly Rent"
                                        value={formData.title}
                                        onChange={(e) => {
                                            const val = e.target.value.slice(0, 25);
                                            setFormData({ ...formData, title: val });
                                            validateField('title', val);
                                        }}
                                    />

                                    {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Amount (₹)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            required
                                            className="w-full bg-surface-secondary border border-border rounded-lg py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary"
                                            placeholder="e.g. 5000"
                                            value={formData.amount}
                                            onChange={(e) => {
                                                // Allow only digits, max 6
                                                const raw = e.target.value.replace(/\D/g, '');
                                                const clamped = raw.slice(0, 6);
                                                setFormData({ ...formData, amount: clamped });
                                                validateField('amount', clamped);
                                            }}
                                        />
                                        {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
                                        <CustomDropdown
                                            value={formData.category}
                                            onChange={(val) => setFormData({ ...formData, category: val })}
                                            options={CATEGORIES.map(cat => ({ label: cat, value: cat }))}
                                            className="w-full"
                                            buttonClassName="py-2.5"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Date</label>
                                    <CustomDatePicker
                                        required
                                        validationRule={DATE_RULES.EXPENSE}
                                        minDate={minDateStr}
                                        maxDate={maxDateStr}
                                        className={`w-full bg-surface-secondary border rounded-lg py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary ${formErrors.date ? 'border-red-500' : 'border-border'}`}
                                        value={formData.date}
                                        onChange={(e) => {
                                            setFormData({ ...formData, date: e.target.value });
                                            validateField('date', e.target.value);
                                        }}
                                        onValidationError={(message) => {
                                            setFormErrors(prev => {
                                                const next = { ...prev };
                                                if (message) next.date = message;
                                                else delete next.date;
                                                return next;
                                            });
                                        }}
                                    />
                                    {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                                </div>

                                <div>
                                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Notes (Optional)</label>
                                    <textarea
                                        className="w-full bg-surface-secondary border border-border rounded-lg py-2.5 px-4 text-text-primary focus:outline-none focus:border-primary h-24 resize-none"
                                        placeholder="Add any additional details..."
                                        maxLength="100"
                                        value={formData.note}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({ ...formData, note: val });
                                            validateField('note', val);
                                        }}
                                    />
                                    {formErrors.note && <p className="text-red-500 text-xs mt-1">{formErrors.note}</p>}
                                </div>

                                <div>
                                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Attach Bill (Optional)</label>
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
                                            className="flex items-center justify-center gap-2 w-full bg-surface-secondary border border-border border-dashed rounded-lg py-4 px-4 text-text-secondary cursor-pointer hover:border-primary hover:text-primary transition-all"
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
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-rose-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full text-text-primary font-bold py-3 rounded-lg shadow-lg transition-all mt-4 bg-primary hover:brightness-95 shadow-primary/30"
                                >
                                    {modalMode === 'add' ? 'Create Expense' : 'Save Changes'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Expense"
                message="Are you sure you want to permanently delete this expense? This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger={true}
                onCancel={() => { setShowDeleteConfirm(false); setExpenseToDelete(null); }}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default PaymentLedger;
