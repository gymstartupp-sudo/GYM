import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Plus, Eye, MessageSquare, X } from 'lucide-react';
import Button from '../../components/Button';

const ClientFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-text-secondary border border-gray-500/20">
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
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
            <MessageSquare className="text-primary" /> Feedback History
          </h1>
          <p className="text-text-secondary mt-2 text-base md:text-lg">View and track your submitted feedback.</p>
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
        <div className="card bg-surface-secondary border border-border rounded-2xl p-12 text-center shadow-xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-surface-hover/50 rounded-2xl flex items-center justify-center text-text-muted mb-4">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">No feedback submitted yet</h3>
          <p className="text-text-secondary text-sm max-w-sm">
            If you have any suggestions, comments, or issues regarding the gym facilities, send us your feedback.
          </p>
        </div>
      ) : (
        <div className="bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="min-w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-secondary/80 border-b border-border z-10 backdrop-blur-sm">
                <tr className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Subject</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-card">
                {feedbacks.map((item) => (
                  <tr key={item._id} className="bg-surface-card hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary font-medium truncate max-w-xs md:max-w-md transition-colors">
                      {item.subject || <span className="text-text-muted italic">No Subject</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleOpenViewModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary bg-surface-divider hover:bg-surface-hover transition-colors"
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
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSendModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-2xl p-6 text-text-primary animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="text-primary" /> Send Feedback
              </h2>
              <button
                onClick={() => !isSubmitting && setIsSendModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold">Subject (Optional)</label>
                  <span className={`text-xs font-medium ${subject.length >= 30 ? 'text-red-400' : 'text-text-muted'}`}>
                    {subject.length}/30
                  </span>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    if (e.target.value.length <= 30) setSubject(e.target.value);
                  }}
                  maxLength={30}
                  placeholder="E.g., Equipment maintenance, Class timings"
                  className={`w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none transition-colors text-sm ${subject.length >= 30 ? 'border-red-500/60 focus:border-red-500' : 'focus:border-primary'
                    }`}
                  disabled={isSubmitting}
                />
                {subject.length >= 30 && (
                  <p className="text-xs text-red-400 mt-1">Maximum 30 characters allowed for subject.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs uppercase tracking-wider text-text-secondary font-semibold">Message *</label>
                  <span className={`text-xs font-medium ${message.length >= 300 ? 'text-red-400' : message.length >= 270 ? 'text-yellow-400' : 'text-text-muted'}`}>
                    {message.length}/300
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) setMessage(e.target.value);
                  }}
                  maxLength={300}
                  placeholder="Describe your suggestion or issue in detail..."
                  rows={5}
                  className={`w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none transition-colors text-sm resize-none ${message.length >= 300 ? 'border-red-500/60 focus:border-red-500' : 'focus:border-primary'
                    }`}
                  required
                  disabled={isSubmitting}
                />
                {message.length >= 300 && (
                  <p className="text-xs text-red-400 mt-1">Maximum 300 characters allowed for description.</p>
                )}
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

          <div className="relative w-full max-w-lg bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-2xl p-6 text-text-primary animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Feedback Details</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-text-secondary hover:text-text-primary p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Subject</span>
                <div className="text-base font-semibold text-text-primary">
                  {selectedFeedback.subject || <span className="text-text-muted italic">No Subject</span>}
                </div>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Message</span>
                <div className="bg-surface-divider/50 border border-border rounded-xl p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedFeedback.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Submitted</span>
                  <div className="text-sm font-medium text-text-primary">{formatDate(selectedFeedback.createdAt)}</div>
                </div>

                <div>
                  <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Status</span>
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
    </>
  );
};

export default ClientFeedback;
