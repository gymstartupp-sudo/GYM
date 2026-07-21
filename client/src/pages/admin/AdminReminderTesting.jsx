import React, { useState, useEffect, useRef } from 'react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Menu, Play, RefreshCw, Send, AlertTriangle, CheckCircle, Info, Calendar, Clock, User, ShieldAlert, ChevronDown, Search } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import Button from '../../components/Button';

const AdminReminderTesting = () => {
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [history, setHistory] = useState([]);
  
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [sendingType, setSendingType] = useState('');
  const [runningCron, setRunningCron] = useState('');
  
  const [lastResult, setLastResult] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [clearingHistory, setClearingHistory] = useState(false);

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Helper functions for client multi-select dropdown
  const getClientDisplayLabel = () => {
    if (!selectedGym) return '-- Select Gym First --';
    if (loadingClients) return 'Loading clients...';
    if (selectedClient === 'all' || !Array.isArray(selectedClient) || selectedClient.length === 0) {
      return 'All Clients';
    }
    const selectedObjs = clients.filter(c => selectedClient.includes(c._id));
    if (selectedObjs.length === 0) return 'All Clients';
    if (selectedObjs.length === 1) {
      return `${selectedObjs[0].clientId || ''} - ${selectedObjs[0].personalInfo?.name || ''}`;
    }
    return `${selectedObjs.length} clients selected`;
  };

  const filteredClients = clients.filter(client => {
    const searchLower = clientSearchQuery.toLowerCase();
    const nameMatch = client.personalInfo?.name?.toLowerCase().includes(searchLower);
    const idMatch = client.clientId?.toLowerCase().includes(searchLower);
    return nameMatch || idMatch;
  });

  // Fetch gyms on mount
  useEffect(() => {
    const fetchGyms = async () => {
      try {
        const res = await api.get('/admin/gyms');
        setGyms(res.data.data || []);
      } catch (err) {
        toast.error('Failed to load gyms');
      } finally {
        setLoadingGyms(false);
      }
    };
    fetchGyms();
  }, []);

  // Fetch clients & history when gym changes
  useEffect(() => {
    if (!selectedGym) {
      setClients([]);
      setSelectedClient('');
      setHistory([]);
      return;
    }

    const fetchGymClients = async () => {
      setLoadingClients(true);
      try {
        const res = await api.get(`/admin/reminder-test/clients?gymId=${selectedGym}`);
        setClients(res.data.data || []);
        setSelectedClient('all');
      } catch (err) {
        toast.error('Failed to load clients for selected gym');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchGymClients();
    fetchHistory();
  }, [selectedGym]);

  const fetchHistory = async () => {
    if (!selectedGym) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/admin/reminder-test/history?gymId=${selectedGym}`);
      setHistory(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load reminder history logs');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Trigger single alert send
  const handleSendReminder = async (type) => {
    if (!selectedGym || !selectedClient) {
      toast.warn('Please select a Gym and a Client first');
      return;
    }
    setSendingType(type);
    setLastResult(null);
    try {
      const res = await api.post('/admin/reminder-test/send', {
        gymId: selectedGym,
        clientId: selectedClient,
        reminderType: type
      });
      toast.success(res.data.message || 'Reminder sent successfully!');
      
      // Update result panel
      setLastResult({
        type: 'Individual Trigger',
        name: type.toUpperCase().replace('_', ' '),
        executionTime: new Date().toISOString(),
        success: true,
        data: res.data.data || {}
      });
      
      // Refresh history
      fetchHistory();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Send Failed';
      toast.error(errorMsg);
      setLastResult({
        type: 'Individual Trigger',
        name: type.toUpperCase().replace('_', ' '),
        executionTime: new Date().toISOString(),
        success: false,
        error: errorMsg,
        client: clients.find(c => c._id === selectedClient)?.personalInfo?.name || 'N/A'
      });
      fetchHistory();
    } finally {
      setSendingType('');
    }
  };

  // Run Cron Manually
  const handleRunCron = async (cronName) => {
    if (!selectedGym) {
      toast.warn('Please select a Gym context first to resolve configurations');
      return;
    }
    setRunningCron(cronName);
    setLastResult(null);
    try {
      const res = await api.post('/admin/reminder-test/run-cron', { 
        cronName,
        gymId: selectedGym,
        clientId: selectedClient
      });
      toast.success('Cron job completed!');
      
      // Update result panel
      setLastResult({
        type: 'Cron Execution',
        name: cronName === 'membership' ? 'Membership Expiry Job' : 'Dues Overdue Job',
        executionTime: res.data.data?.executionTime || new Date().toISOString(),
        success: true,
        stats: res.data.data
      });
      
      // Refresh history
      fetchHistory();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Cron Run Failed';
      toast.error(errorMsg);
      setLastResult({
        type: 'Cron Execution',
        name: cronName === 'membership' ? 'Membership Expiry Job' : 'Dues Overdue Job',
        executionTime: new Date().toISOString(),
        success: false,
        error: errorMsg
      });
      fetchHistory();
    } finally {
      setRunningCron('');
    }
  };

  const handleClearHistory = async () => {
    if (!selectedGym) {
      toast.warn('Please select a Gym first');
      return;
    }
    if (!window.confirm('Are you sure you want to clear the reminder logs and reset testing state?')) {
      return;
    }
    setClearingHistory(true);
    try {
      await api.post('/admin/reminder-test/clear-history', { gymId: selectedGym });
      toast.success('Reminder history logs cleared and testing state reset successfully!');
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to clear logs');
    } finally {
      setClearingHistory(false);
    }
  };

  // Filtered History
  const filteredHistory = history.filter(item => {
    return item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.reminderType.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.templateName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-surface-primary overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isMobile={isMobile} />
      
      <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-text-muted hover:text-text-primary p-2 transition-colors border border-border rounded-xl bg-surface-secondary"
              >
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">Reminder Testing</h1>
              <p className="text-text-muted text-xs md:text-sm mt-1">
                Developer tools for testing and verifying Meta WhatsApp templates, cron logic, and message history logs.
              </p>
            </div>
          </div>
          
          {selectedGym && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                disabled={loadingHistory || clearingHistory}
                className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 hover:bg-danger hover:text-text-primary text-danger border border-danger/20 text-xs font-bold rounded-lg transition-all"
              >
                Clear Logs
              </button>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary border border-border hover:bg-surface-divider text-text-secondary text-xs rounded-lg transition-all"
              >
                <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                Reload Logs
              </button>
            </div>
          )}
        </div>

        {/* Environment Alert */}
        {!import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl flex items-center gap-3">
            <ShieldAlert size={20} className="shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">Production Safeguard Warning:</span> This dashboard panel is strictly limited to Development mode environment settings. Testing triggers on live accounts are deactivated.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Column 1: Configuration and Triggers */}
          <div className="xl:col-span-2 space-y-6">
            {/* Context Selection Card */}
            <div className="card p-6 bg-surface-secondary border border-border rounded-2xl">
              <h2 className="text-sm font-black uppercase text-text-muted tracking-wider mb-4">Context Setup</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Target Gym</label>
                  <select
                    value={selectedGym}
                    onChange={(e) => setSelectedGym(e.target.value)}
                    disabled={loadingGyms}
                    className="w-full bg-surface-primary border border-border rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-primary text-text-primary"
                  >
                    <option value="">-- Select Gym --</option>
                    {gyms.map(gym => (
                      <option key={gym.gymId} value={gym.gymId}>
                        {gym.gymName} ({gym.gymId})
                      </option>
                    ))}
                  </select>
                </div>
                 <div>
                 <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Target Client</label>
                  <button
                    type="button"
                    disabled={!selectedGym || loadingClients}
                    onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                    className="w-full bg-surface-primary border border-border rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center text-left"
                  >
                    <span className="truncate">{getClientDisplayLabel()}</span>
                    <ChevronDown size={14} className="text-text-muted shrink-0 ml-1" />
                  </button>

                  {isClientDropdownOpen && selectedGym && !loadingClients && (
                    <div className="absolute right-0 left-0 mt-1.5 bg-surface-primary border border-border rounded-xl shadow-xl z-30 p-3 space-y-2 flex flex-col max-h-72">
                      <div className="relative shrink-0">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <Search size={12} className="text-text-muted" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search clients..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full bg-surface-secondary border border-border rounded-lg text-xs pl-8 pr-3 py-1.5 focus:outline-none focus:border-primary text-text-primary"
                        />
                      </div>

                      <div className="overflow-y-auto divide-y divide-border/30 flex-1 custom-scrollbar text-xs">
                        {/* Option: All Clients */}
                        <label className="flex items-center gap-2.5 py-2 px-1 hover:bg-surface-divider/40 rounded cursor-pointer font-bold text-text-primary">
                          <input
                            type="checkbox"
                            checked={selectedClient === 'all' || !Array.isArray(selectedClient) || selectedClient.length === 0}
                            onChange={() => {
                              setSelectedClient('all');
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 bg-surface-primary"
                          />
                          All Clients
                        </label>

                        {/* Options: Individual Clients */}
                        {filteredClients.length > 0 ? (
                          filteredClients.map(client => {
                            const isChecked = Array.isArray(selectedClient) && selectedClient.includes(client._id);
                            return (
                              <label key={client._id} className="flex items-center gap-2.5 py-2 px-1 hover:bg-surface-divider/40 rounded cursor-pointer text-text-secondary">
                                <input
                                  type="checkbox"
                                  checked={isChecked && selectedClient !== 'all'}
                                  onChange={() => {
                                    let nextSelected = Array.isArray(selectedClient) ? [...selectedClient] : [];
                                    if (isChecked) {
                                      nextSelected = nextSelected.filter(id => id !== client._id);
                                    } else {
                                      nextSelected.push(client._id);
                                    }
                                    if (nextSelected.length === 0) {
                                      setSelectedClient('all');
                                    } else {
                                      setSelectedClient(nextSelected);
                                    }
                                  }}
                                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 bg-surface-primary"
                                />
                                <span className="font-mono text-[9px] bg-surface-divider px-1.5 py-0.5 rounded text-text-primary font-bold tracking-wider shrink-0">
                                  {client.clientId || 'N/A'}
                                </span>
                                <span className="truncate">{client.personalInfo?.name}</span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 text-[11px] text-text-muted">No clients match search</div>
                        )}
                      </div>
                    </div>
                  )}
                </div></div>
              </div>
            </div>

            {/* Reminder Automation Simulator Card */}
            <div className="card p-6 bg-surface-secondary border border-border rounded-2xl">
              <h2 className="text-sm font-black uppercase text-text-muted tracking-wider mb-2">Reminder Automation Simulator</h2>
              <p className="text-text-secondary text-xs mb-6">
                Trigger full WhatsApp reminder checks for the selected gym and target client context. This executes both the Membership Expiry Reminders and Dues Overdue Reminders jobs in sequence.
              </p>
              <div className="flex justify-start">
                <Button
                  onClick={() => handleRunCron('all')}
                  disabled={!selectedGym || !!runningCron}
                  loading={!!runningCron}
                  className="px-6 py-3 bg-primary text-text-primary text-xs font-bold rounded-lg hover:brightness-95 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2"
                >
                  <Play size={14} />
                  {runningCron ? 'Running Message Automation...' : 'Run Message Automation'}
                </Button>
              </div>
            </div>
          </div>

          {/* Column 2: Test Result Panel */}
          <div>
            <div className="card p-6 bg-surface-secondary border border-border rounded-2xl h-full flex flex-col">
              <h2 className="text-sm font-black uppercase text-text-muted tracking-wider mb-4">Test Result Panel</h2>
              
              {!lastResult ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-muted border border-dashed border-border rounded-xl bg-surface-primary/30">
                  <Info size={28} className="mb-2 text-text-muted opacity-50" />
                  <p className="text-xs font-bold">No execution results available</p>
                  <p className="text-[10px] mt-1 text-text-muted">Trigger any manual send action or run simulator cron to inspect performance metadata here.</p>
                </div>
              ) : (
                <div className="flex-1 space-y-4 animate-in fade-in duration-300">
                  {/* Status header */}
                  <div className={`p-4 rounded-xl flex items-center gap-3 border ${
                    lastResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-danger/10 border-danger/20 text-danger'
                  }`}>
                    {lastResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide">
                        {lastResult.type} ({lastResult.success ? 'Success' : 'Failed'})
                      </h3>
                      <p className="text-[10px] opacity-80 mt-0.5">{lastResult.name}</p>
                    </div>
                  </div>

                  {/* Execution logs */}
                  <div className="p-4 bg-surface-primary rounded-xl border border-border/80 text-[11px] font-mono text-text-secondary space-y-2">
                    <div className="flex justify-between border-b border-border/40 pb-1.5">
                      <span>Execution Time:</span>
                      <span className="text-text-primary font-bold">
                        {new Date(lastResult.executionTime).toLocaleTimeString()}
                      </span>
                    </div>

                    {lastResult.error && (
                      <div className="space-y-1 text-danger pt-1">
                        <span className="font-bold">Error details:</span>
                        <p className="bg-danger/5 border border-danger/10 p-2 rounded text-[10px]">
                          {lastResult.error}
                        </p>
                        {lastResult.client && (
                          <div className="flex justify-between text-[10px] text-text-secondary pt-1">
                            <span>Client:</span>
                            <span className="font-bold">{lastResult.client}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show detailed Cron run stats */}
                    {lastResult.stats && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span>Processed Clients:</span>
                          <span className="text-text-primary font-extrabold">{lastResult.stats.processedClients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Successful Messages:</span>
                          <span className="text-emerald-400 font-extrabold">{lastResult.stats.successfulMessages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failed Messages:</span>
                          <span className="text-danger font-extrabold">{lastResult.stats.failedMessages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Skipped Clients:</span>
                          <span className="text-text-muted font-bold">{lastResult.stats.skippedClients}</span>
                        </div>
                        <div className="flex justify-between border-t border-border/40 pt-1.5">
                          <span>Duration Time:</span>
                          <span className="text-primary font-extrabold">{lastResult.stats.durationMs} ms</span>
                        </div>

                        {lastResult.stats.errors?.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <span className="text-danger font-bold">Cron Failures log ({lastResult.stats.errors.length}):</span>
                            <div className="max-h-36 overflow-y-auto space-y-1 bg-surface-secondary border border-border p-2 rounded">
                              {lastResult.stats.errors.map((err, idx) => (
                                <div key={idx} className="border-b border-border/30 pb-1 last:border-0 text-[10px]">
                                  <span className="text-text-primary font-semibold">{err.client}</span> ({err.reminderType}): <span className="text-danger">{err.error}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Individual send result details */}
                    {lastResult.data && lastResult.data.messageId && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span>WhatsApp Provider:</span>
                          <span className="text-text-primary font-semibold">Meta WhatsApp</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Message ID:</span>
                          <span className="text-text-primary font-semibold select-all text-[10px] bg-surface-secondary px-1 border rounded">
                            {lastResult.data.messageId}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Reminder Logs History */}
        {selectedGym && (
          <div className="card p-6 bg-surface-secondary border border-border rounded-2xl mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-black uppercase text-text-muted tracking-wider">Reminder History log</h2>
                <p className="text-[10px] text-text-muted mt-0.5">Logs updated across all clients from target Gym database</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search client, template..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-surface-primary border border-border text-xs rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-primary w-48"
                />
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-text-muted">Loading logs history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                No logs matching current filters found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-divider border-b border-border text-text-secondary font-bold">
                      <th className="py-3 px-4">Date/Time</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Template</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Message ID / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-surface-divider/40 text-text-secondary">
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="opacity-60" />
                            <span>{item.date}</span>
                            <Clock size={12} className="opacity-60 ml-1" />
                            <span>{item.time}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-text-primary">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="opacity-50" />
                            <span>{item.clientName} ({item.clientId})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                          {item.reminderType}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            item.executionSource === 'Automatic Cron'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : item.executionSource === 'Manual Trigger'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.executionSource}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[10px]">
                          {item.templateName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            item.status === 'sent' || item.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-danger/10 text-danger border border-danger/20'
                          }`}>
                            {item.status === 'sent' || item.status === 'success' ? 'Sent' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px]">
                          {item.status === 'sent' || item.status === 'success' ? (
                            <span className="text-text-muted select-all block max-w-[200px] truncate" title={item.messageId}>
                              {item.messageId}
                            </span>
                          ) : (
                            <span className="text-danger block max-w-[200px] truncate" title={item.error}>
                              {item.error || 'Unknown send error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReminderTesting;
