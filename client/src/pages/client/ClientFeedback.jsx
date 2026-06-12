import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { Menu, X, Plus, Eye, MessageSquare } from 'lucide-react';
import Button from '../../components/Button';
import ClientSidebar from '../../components/ClientSidebar';

const ClientFeedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal states
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get('/feedback/client');
      setFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Failed to load feedback history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSendFeedback = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Feedback message is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/feedback/submit', { subject, message });
      toast.success('Feedback submitted successfully!');
      setSubject('');
      setMessage('');
      setIsSendModalOpen(false);
      fetchFeedbacks(); // Auto-refresh table
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenViewModal = (feedback) => {
    setSelectedFeedback(feedback);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Unread':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Unread
          </span>
        );
      case 'Read':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Read
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            Resolved
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB'); // Formats as DD/MM/YYYY
  };

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

      <div className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-10 space-y-8 scrollbar-hide">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <MessageSquare className="text-primary" /> Feedback History
            </h1>
            <p className="text-gray-400 mt-2 text-base md:text-lg">View and track your submitted feedback.</p>
          </div>
          <Button onClick={() => setIsSendModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> Send Feedback
          </Button>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="card bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center shadow-xl flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center text-gray-500 mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">No feedback submitted yet</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              If you have any suggestions, comments, or issues regarding the gym facilities, send us your feedback.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto relative">
              <table className="min-w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-955 border-b border-gray-800 z-10">
                  <tr className="bg-gray-950/80 backdrop-blur-md">
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Subject</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {feedbacks.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium truncate max-w-xs md:max-w-md">
                        {item.subject || <span className="text-gray-500 italic">No Subject</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          onClick={() => handleOpenViewModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-750 transition-colors"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SEND FEEDBACK MODAL */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSendModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="text-primary" /> Send Feedback
              </h2>
              <button 
                onClick={() => !isSubmitting && setIsSendModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Subject (Optional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g., Equipment maintenance, Class timings"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors text-sm"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Message *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your suggestion or issue in detail..."
                  rows={5}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsSendModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  isLoading={isSubmitting}
                >
                  Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FEEDBACK MODAL */}
      {isViewModalOpen && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl p-6 text-white animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Feedback Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Subject</span>
                <div className="text-base font-semibold text-white">
                  {selectedFeedback.subject || <span className="text-gray-500 italic">No Subject</span>}
                </div>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Message</span>
                <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedFeedback.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Submitted</span>
                  <div className="text-sm font-medium text-white">{formatDate(selectedFeedback.createdAt)}</div>
                </div>

                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFeedback;
