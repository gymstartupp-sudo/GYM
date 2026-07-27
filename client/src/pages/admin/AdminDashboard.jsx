import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, X, Upload, Download, Search, CheckCircle2, AlertTriangle, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminSidebar } from '../../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [runningCheck, setRunningCheck] = useState(false);
    const [checkResults, setCheckResults] = useState(null);
    const [runningReminders, setRunningReminders] = useState(false);

    // Bulk Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [gyms, setGyms] = useState([]);
    const [importStep, setImportStep] = useState(1);
    const [selectedGymId, setSelectedGymId] = useState('');
    const [selectedGymName, setSelectedGymName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importSummary, setImportSummary] = useState(null);

    const handleRunOverdueCheck = async () => {
        setRunningCheck(true);
        setCheckResults(null);
        try {
            const res = await api.post('/admin/overdue-check');
            setCheckResults(res.data.data);
            toast.success("Overdue check executed successfully");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to execute overdue check");
        } finally {
            setRunningCheck(false);
        }
    };
    const handleRunRemindersJob = async () => {
        setRunningReminders(true);
        try {
            const res = await api.post('/admin/run-reminders');
            if (res.data.success) {
                toast.success(res.data.message || 'Reminder job executed successfully!');
            } else {
                toast.error(res.data.message || 'Failed to execute reminder job.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error triggering reminder job');
        } finally {
            setRunningReminders(false);
        }
    };

    const openImportModal = async () => {
        setImportStep(1);
        setSelectedGymId('');
        setSelectedGymName('');
        setSearchQuery('');
        setFile(null);
        setParsedData([]);
        setImportSummary(null);
        try {
            const res = await api.get('/admin/gyms');
            if (res.data.success) {
                setGyms(res.data.data);
            }
            setShowImportModal(true);
        } catch (err) {
            toast.error("Failed to load gyms for import");
        }
    };

    const downloadSampleTemplate = () => {
        const headers = [
            "Client Name",
            "Gender",
            "Email",
            "DOB (DD-MM-YYYY)",
            "Mobile Number",
            "Emergency Contact",
            "Address",
            "State",
            "City",
            "Pincode",
            "Password",
            "Confirm Password",
            "Membership Plan",
            "Membership Start Date (DD-MM-YYYY)",
            "Paid Amount"
        ];
        const sampleData = [
            {
                "Client Name": "John Doe",
                "Gender": "Male",
                "Email": "johndoe@example.com",
                "DOB (DD-MM-YYYY)": "15-08-1995",
                "Mobile Number": "9876543210",
                "Emergency Contact": "9876543211",
                "Address": "123 Main Street",
                "State": "Maharashtra",
                "City": "Mumbai",
                "Pincode": "400001",
                "Password": "password123",
                "Confirm Password": "password123",
                "Membership Plan": "Monthly Plan",
                "Membership Start Date (DD-MM-YYYY)": "20-07-2026",
                "Paid Amount": 1000
            }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Import Template");
        XLSX.writeFile(wb, "bulk_client_import_template.xlsx");
    };

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        const ext = uploadedFile.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            toast.error("Please upload only .xlsx or .xls Excel files");
            return;
        }

        setFile(uploadedFile);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Parse raw json with headers
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (json.length === 0) {
                    toast.error("The uploaded Excel file has no rows");
                    return;
                }

                // Verify columns
                const firstRow = json[0];
                const requiredHeaders = [
                    "Client Name", "Gender", "Email", "DOB (DD-MM-YYYY)", "Mobile Number",
                    "Emergency Contact", "Address", "State", "City", "Pincode",
                    "Password", "Confirm Password", "Membership Plan", "Membership Start Date (DD-MM-YYYY)", "Paid Amount"
                ];
                const missingHeaders = requiredHeaders.filter(h => !(h in firstRow));

                if (missingHeaders.length > 0) {
                    toast.error(`Missing required headers: ${missingHeaders.join(', ')}`);
                    return;
                }

                setParsedData(json);
                toast.success(`Excel parsed successfully: ${json.length} rows found`);
            } catch (error) {
                console.error("Error parsing Excel:", error);
                toast.error("Failed to parse Excel file");
            }
        };
        reader.readAsBinaryString(uploadedFile);
    };

    const handleStartImport = async () => {
        if (!selectedGymId) {
            toast.error("Please select a gym first");
            return;
        }
        if (parsedData.length === 0) {
            toast.error("No data parsed to import");
            return;
        }

        setImporting(true);
        try {
            const res = await api.post('/admin/bulk-import', {
                gymId: selectedGymId,
                clients: parsedData
            });
            if (res.data.success) {
                setImportSummary(res.data.data);
                setImportStep(3);
                toast.success("Import processing complete");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Import failed");
        } finally {
            setImporting(false);
        }
    };

    const downloadErrorReport = () => {
        if (!importSummary || !importSummary.errors || importSummary.errors.length === 0) return;

        // Create CSV Content
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Row Number,Client Name,Reason\n";

        importSummary.errors.forEach(err => {
            const row = `"${err.rowNumber}","${err.clientName.replace(/"/g, '""')}","${err.reason.replace(/"/g, '""')}"`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `import_errors_${selectedGymId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/dashboard');
                setStats(res.data.data);
            } catch (e) {
                toast.error("Failed to load dashboard data");
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    return (
        <div className={`flex bg-surface-primary h-screen overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>
            {/* MOBILE HEADER BAR */}
            {isMobile && (
                <header className="h-16 bg-surface-secondary border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
                    <span className="text-primary font-bold text-base tracking-tight">Super Admin</span>
                    <div className="flex items-center gap-2">
                        <ThemeToggle className="w-9 h-9" />
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors duration-200"
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </header>
            )}

            {/* MOBILE DRAWER BACKDROP */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity"
                />
            )}

            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10">
                <h1 className="page-heading text-2xl md:text-[36px] mb-8">Platform Overview</h1>

                {loading ? <div className="text-text-muted">Loading data...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        <div className="kpi-card">
                            <p className="kpi-card-label">Total Gyms Onboarded</p>
                            <h3 className="kpi-card-value">{stats?.totalGyms || 0}</h3>
                        </div>
                        <div className="kpi-card">
                            <p className="kpi-card-label">Total Active Clients</p>
                            <h3 className="kpi-card-value">{stats?.totalClients || 0}</h3>
                        </div>
                        <div className="kpi-card">
                            <p className="kpi-card-label">Platform Revenue/Payments</p>
                            <h3 className="kpi-card-value">{stats?.totalPayments || 0} Trx</h3>
                        </div>
                    </div>
                )}

                {/* System Diagnostics, Manual Expiry Reminders & Bulk Import */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
                    <div className="card border-border bg-surface-divider/80 p-6 rounded-2xl border">
                        <h2 className="text-lg font-bold text-text-primary mb-2">System Diagnostics</h2>
                        <p className="text-text-secondary text-xs mb-5">Run a read-only diagnostics/analytics analysis across all gyms to view client reminder states without sending notifications or modifying records.</p>

                        <button
                            type="button"
                            onClick={handleRunOverdueCheck}
                            disabled={runningCheck}
                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {runningCheck ? 'Running Diagnostics...' : 'Analyze Reminder Status'}
                        </button>
                    </div>

                    <div className="card border-border bg-surface-divider/80 p-6 rounded-2xl border">
                        <h2 className="text-lg font-bold text-text-primary mb-2">Manual Expiry Reminders</h2>
                        <p className="text-text-secondary text-xs mb-5">Manually execute the daily WhatsApp expiry reminders job. This sends expiration warning alerts to clients via Meta WhatsApp API.</p>

                        <button
                            type="button"
                            onClick={handleRunRemindersJob}
                            disabled={runningReminders}
                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {runningReminders ? 'Running Reminders Job...' : 'Run Expiry Reminders'}
                        </button>
                    </div>

                    <div className="card border-border bg-surface-divider/80 p-6 rounded-2xl border">
                        <h2 className="text-lg font-bold text-text-primary mb-2">Bulk Client Import</h2>
                        <p className="text-text-secondary text-xs mb-5">Quickly onboard and import hundreds of clients into any gym via a structured Excel template sheet.</p>

                        <button
                            type="button"
                            onClick={openImportModal}
                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10"
                        >
                            Bulk Import Clients
                        </button>
                    </div>
                </div>

                {/* Diagnostics Report (Render full width below the buttons grid) */}
                {checkResults && (
                    <div className="mt-8 space-y-6 w-full max-w-4xl animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Overall Summary Cards */}
                        <div className="bg-surface-secondary border border-border p-6 rounded-2xl shadow-xl">
                            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center justify-between">
                                <span>Overall Statistics</span>
                                <span className="text-xs font-mono text-emerald-400 font-normal">Execution Time: {checkResults.executionTime}</span>
                            </h3>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Gyms", value: checkResults.overall.totalGyms },
                                    { label: "Total Clients", value: checkResults.overall.totalClients },
                                    { label: "Active Membership", value: checkResults.overall.activeMembership },
                                    { label: "Fully Paid", value: checkResults.overall.fullyPaid },
                                    { label: "Pending Dues", value: checkResults.overall.pendingDues },
                                    { label: "Expiring Soon", value: checkResults.overall.expiringSoon },
                                    { label: "Membership Expired", value: checkResults.overall.membershipExpired },
                                    { label: "Expiring Soon + Pending", value: checkResults.overall.expiringSoonPending },
                                    { label: "Expired + Pending", value: checkResults.overall.expiredPending },
                                    { label: "Reminder 1 Eligible", value: checkResults.overall.reminder1Eligible },
                                    { label: "Reminder 2 Eligible", value: checkResults.overall.reminder2Eligible },
                                    { label: "Reminder 3 Eligible", value: checkResults.overall.reminder3Eligible },
                                    { label: "Renewed Memberships", value: checkResults.overall.renewedMemberships },
                                    { label: "Inactive Clients", value: checkResults.overall.inactiveClients }
                                ].map((item, i) => (
                                    <div key={i} className="bg-surface-divider/45 border border-border/40 p-4 rounded-xl flex flex-col justify-between">
                                        <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">{item.label}</span>
                                        <span className="text-lg font-black text-text-primary mt-1">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Text Report Copy Box */}
                        <div className="bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-xl">
                            <div className="flex justify-between items-center bg-surface-divider/40 px-6 py-4 border-b border-border">
                                <span className="text-sm font-bold text-text-primary">Formatted Text Report</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(checkResults.textReport);
                                        toast.success("Report copied to clipboard!");
                                    }}
                                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary hover:text-text-primary text-primary text-xs font-bold rounded-lg border border-primary/20 transition-all"
                                >
                                    Copy Report
                                </button>
                            </div>
                            <div className="p-6">
                                <textarea
                                    readOnly
                                    value={checkResults.textReport}
                                    rows={15}
                                    className="w-full bg-surface-primary border border-border rounded-xl p-4 text-xs font-mono text-text-secondary focus:outline-none custom-scrollbar"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BULK IMPORT MODAL */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface-secondary border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-divider/20">
                            <span className="text-base font-black text-text-primary">Bulk Client Import</span>
                            <button
                                onClick={() => {
                                    if (!importing) setShowImportModal(false);
                                }}
                                className="text-text-muted hover:text-text-primary transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* Step Indicator */}
                            {importStep < 3 && (
                                <div className="flex items-center gap-2 mb-6">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importStep === 1 ? 'bg-primary text-text-primary' : 'bg-surface-divider text-text-muted'}`}>1</div>
                                    <div className="h-0.5 flex-1 bg-border/60"></div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importStep === 2 ? 'bg-primary text-text-primary' : 'bg-surface-divider text-text-muted'}`}>2</div>
                                </div>
                            )}

                            {/* Step 1 - Select Gym */}
                            {importStep === 1 && (
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">Select Target Gym</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-text-muted" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by Gym ID or Name..."
                                            className="w-full bg-surface-primary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>

                                    <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border/60 bg-surface-primary custom-scrollbar">
                                        {gyms.filter(g =>
                                            g.gymId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            g.gymName.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).length > 0 ? (
                                            gyms.filter(g =>
                                                g.gymId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                g.gymName.toLowerCase().includes(searchQuery.toLowerCase())
                                            ).map((gym) => (
                                                <button
                                                    key={gym._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedGymId(gym.gymId);
                                                        setSelectedGymName(gym.gymName);
                                                        setImportStep(2);
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-surface-divider/40 transition-colors flex items-center justify-between text-sm group"
                                                >
                                                    <div>
                                                        <span className="font-bold text-primary mr-2 font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">{gym.gymId}</span>
                                                        <span className="text-text-primary group-hover:text-primary font-medium transition-colors">{gym.gymName}</span>
                                                    </div>
                                                    <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-xs text-text-muted">No gyms match your search query</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 2 - Upload Excel */}
                            {importStep === 2 && (
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between bg-surface-divider/45 p-4 rounded-xl border border-border">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-text-muted text-left">Selected Gym</p>
                                            <p className="text-sm font-bold text-text-primary mt-0.5">{selectedGymId} - {selectedGymName}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setImportStep(1);
                                                setFile(null);
                                                setParsedData([]);
                                            }}
                                            className="text-xs text-primary hover:underline font-bold"
                                        >
                                            Change Gym
                                        </button>
                                    </div>

                                    <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-8 text-center bg-surface-primary transition-colors cursor-pointer relative group">
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload size={32} className="mx-auto text-text-muted group-hover:text-primary transition-colors mb-3" />
                                        <p className="text-sm font-bold text-text-primary">
                                            {file ? file.name : "Choose an Excel File to Upload"}
                                        </p>
                                        <p className="text-xs text-text-muted mt-1.5">
                                            {parsedData.length > 0 ? `${parsedData.length} rows parsed successfully` : "Only .xlsx and .xls formats are supported"}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={downloadSampleTemplate}
                                            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                        >
                                            <Download size={14} />
                                            Download Sample Excel
                                        </button>

                                        <button
                                            onClick={handleStartImport}
                                            disabled={parsedData.length === 0 || importing}
                                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                        >
                                            {importing ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Importing...
                                                </>
                                            ) : (
                                                <>
                                                    Start Import
                                                    <ArrowRight size={14} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 - Summary */}
                            {importStep === 3 && importSummary && (
                                <div className="space-y-5 text-left">
                                    <div className="text-center py-2">
                                        <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3" />
                                        <h3 className="text-base font-bold text-text-primary">Import Completed</h3>
                                        <p className="text-xs text-text-secondary mt-1">Gym: {importSummary.gymName}</p>
                                    </div>

                                    <div className="bg-surface-divider/40 p-5 rounded-xl border border-border space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                            <div className="flex flex-col gap-1 bg-surface-primary/60 p-3 rounded-lg border border-border/40">
                                                <span className="text-[10px] uppercase font-bold text-text-muted">Rows Processed</span>
                                                <span className="text-base font-black text-text-primary">{importSummary.rowsProcessed}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 bg-surface-primary/60 p-3 rounded-lg border border-border/40">
                                                <span className="text-[10px] uppercase font-bold text-text-muted">Successfully Imported</span>
                                                <span className="text-base font-black text-emerald-400">{importSummary.importedSuccessfully}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 bg-surface-primary/60 p-3 rounded-lg border border-border/40">
                                                <span className="text-[10px] uppercase font-bold text-text-muted">Failed Rows</span>
                                                <span className="text-base font-black text-rose-400">{importSummary.failed}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 bg-surface-primary/60 p-3 rounded-lg border border-border/40">
                                                <span className="text-[10px] uppercase font-bold text-text-muted">Clients Created</span>
                                                <span className="text-base font-black text-text-primary">{importSummary.clientsCreated}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 bg-surface-primary/60 p-3 rounded-lg border border-border/40 col-span-2">
                                                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-text-muted mb-1">
                                                    <span>Payments Breakdown</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs font-sans text-text-secondary pt-1">
                                                    <div>Full Payments: <span className="font-bold text-text-primary">{importSummary.fullPayments}</span></div>
                                                    <div>Partial Payments: <span className="font-bold text-text-primary">{importSummary.partialPayments}</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        {importSummary.failed > 0 && (
                                            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex items-start gap-2.5">
                                                <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                                                <div>
                                                    <p className="text-xs font-bold text-rose-400">Import Encountered Errors</p>
                                                    <p className="text-[11px] text-text-secondary mt-1">Some rows could not be imported. Download the error report to review rows and validation details.</p>
                                                    <button
                                                        onClick={downloadErrorReport}
                                                        className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:underline"
                                                    >
                                                        <Download size={14} />
                                                        Download Error Report (CSV)
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={() => {
                                                setShowImportModal(false);
                                                window.location.reload();
                                            }}
                                            className="px-5 py-2.5 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10"
                                        >
                                            Close Summary
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
