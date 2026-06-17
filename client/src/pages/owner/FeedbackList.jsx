import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { CheckCircle, Eye, MessageSquare, X } from 'lucide-react';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';

const formatDate = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB'); // Formats as DD/MM/YYYY
};

const FeedbackList = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const fetchFeedbacks = async () => {
    try {
      const gymId = user?.gymId || user?._id;
      const { data } = await api.get(`/feedback/gym/${gymId}`);
      setFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [feedbacks.length]);

  const paginatedFeedbacks = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    return feedbacks.slice(startIndex, startIndex + 10);
  }, [feedbacks, currentPage]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/feedback/${id}/status`, { status: newStatus });
      toast.success(`Feedback marked as ${newStatus}`);
      
      // Update local state
      setFeedbacks((prev) =>
        prev.map((f) => (f._id === id ? { ...f, status: newStatus } : f))
      );

      // Update active modal status if open
      if (selectedFeedback && selectedFeedback._id === id) {
        setSelectedFeedback((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleOpenModal = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
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

  return (
    <div className="p-4 md:p-8 md:pt-10 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight flex items-center gap-3">
          <MessageSquare className="text-primary" /> Client Feedback
        </h1>
        <p className="text-text-secondary mt-2 text-base md:text-lg">Monitor, read, and manage feedback submitted by your gym members.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="card bg-surface-secondary border border-border rounded-2xl p-12 text-center shadow-xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-surface-hover/50 rounded-2xl flex items-center justify-center text-text-muted mb-4">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">No feedback available</h3>
          <p className="text-text-secondary text-sm max-w-sm">
            Feedback submitted by your clients will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="min-w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-secondary/80 border-b border-border z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Client Info</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Subject</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-card">
                {paginatedFeedbacks.map((item) => (
                  <tr key={item._id} className="bg-surface-card hover:bg-white/[0.02] transition-colors group">
                    {/* Client Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg border border-primary/20 shrink-0 shadow-inner group-hover:bg-primary group-hover:text-black transition-all duration-300">
                          {item.clientAvatar || item.clientName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-text-primary text-sm truncate max-w-[150px] group-hover:text-primary transition-colors">{item.clientName}</h4>
                          <span className="text-xs text-text-muted font-mono tracking-tight block uppercase">{item.clientId}</span>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Subject */}
                    <td className="px-6 py-4 text-sm text-text-primary font-medium truncate max-w-xs md:max-w-md">
                      {item.subject || <span className="text-text-muted italic">No Subject</span>}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-2 bg-surface-divider text-text-secondary hover:text-[var(--btn-primary-text)] hover:bg-primary rounded-lg transition-all duration-200 border border-border"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(feedbacks.length / 10)}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* FEEDBACK DETAILS MODAL */}
      {isModalOpen && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-surface-secondary border border-border rounded-2xl overflow-hidden shadow-2xl p-6 text-text-primary animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex justify-center items-center font-bold text-lg border border-accent/25 shadow-inner">
                  {selectedFeedback.clientAvatar || selectedFeedback.clientName?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-text-primary text-base leading-tight truncate max-w-[200px]">{selectedFeedback.clientName}</h3>
                  <span className="text-xs text-text-muted font-mono tracking-wider block uppercase">{selectedFeedback.clientId}</span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary p-1">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Date</span>
                  <div className="text-sm font-semibold text-text-primary">{formatDate(selectedFeedback.createdAt)}</div>
                </div>

                <div>
                  <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                </div>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Subject</span>
                <div className="text-base font-bold text-text-primary">
                  {selectedFeedback.subject || <span className="text-text-muted italic">No Subject</span>}
                </div>
              </div>

              <div>
                <span className="block text-xs uppercase tracking-wider text-text-muted font-medium mb-1">Message</span>
                <div className="bg-surface-divider/50 border border-border rounded-xl p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                {selectedFeedback.status === 'Unread' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedFeedback._id, 'Read')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-text-primary bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Mark as Read
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedFeedback._id, 'Resolved')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-text-primary bg-green-600 hover:bg-green-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle size={15} /> Resolve
                    </button>
                  </>
                )}
                {selectedFeedback.status === 'Read' && (
                  <button
                    onClick={() => handleStatusChange(selectedFeedback._id, 'Resolved')}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-text-primary bg-green-600 hover:bg-green-700 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle size={15} /> Resolve
                  </button>
                )}
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
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

export default FeedbackList;
