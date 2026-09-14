import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Image, Video, MessageSquare, Send, CheckCircle2, X } from 'lucide-react';
import api from '../../utils/api';

export default function CustomMessages() {
  const [template, setTemplate] = useState('msg');
  const [messageContent, setMessageContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  const [audienceType, setAudienceType] = useState('active_clients'); // leads, active_clients, inactive_clients
  const [isFilterSelected, setIsFilterSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchListData();
  }, [audienceType]);

  const fetchListData = async () => {
    setLoading(true);
    setListData([]);
    setSelectedIds([]);
    try {
      if (audienceType === 'leads') {
        const res = await api.get('/leads');
        setListData(res.data.data || []);
      } else {
        const res = await api.get('/client');
        let clients = res.data.data || [];
        if (audienceType === 'active_clients') {
          clients = clients.filter(c => c.isActive);
        } else if (audienceType === 'inactive_clients') {
          clients = clients.filter(c => !c.isActive);
        }
        setListData(clients);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch recipients');
    }
    setLoading(false);
    setCurrentPage(1);
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (template === 'msg_imag' && !file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (template === 'msg_video' && !file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleClearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(listData.map(item => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const validateAndConfirm = () => {
    if (!messageContent.trim()) {
      return toast.error('Message content cannot be empty');
    }
    if (template !== 'msg' && !mediaFile) {
      return toast.error('Media file is required for this template');
    }
    if (isFilterSelected && selectedIds.length === 0) {
      return toast.error('Please select at least one recipient');
    }
    if (!isFilterSelected && listData.length === 0) {
      return toast.error('No recipients found in this category');
    }
    setShowConfirm(true);
  };

  const handleSend = async () => {
    setSending(true);
    setShowConfirm(false);
    try {
      const formData = new FormData();
      formData.append('templateName', template);
      formData.append('messageContent', messageContent);
      formData.append('audienceType', isFilterSelected ? 'selected' : audienceType);

      if (isFilterSelected) {
        formData.append('selectedIds', JSON.stringify(selectedIds));
      }
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      const res = await api.post('/custom-messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success(`Message campaign started for ${res.data.data.recipientCount} recipients`);
        setMessageContent('');
        handleClearMedia();
        setSelectedIds([]);
      } else {
        toast.error(res.data.message || 'Failed to send messages');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send messages');
    }
    setSending(false);
  };

  const paginatedData = listData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(listData.length / itemsPerPage);

  const activeRecipientsCount = isFilterSelected ? selectedIds.length : listData.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Custom Messages</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface-secondary rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4 text-text-primary">1. Select Template</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setTemplate('msg'); handleClearMedia(); }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${template === 'msg' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-muted hover:bg-surface-hover'}`}
              >
                <MessageSquare size={20} />
                <span className="font-medium">Message Only </span>
              </button>
              <button
                onClick={() => { setTemplate('msg_imag'); handleClearMedia(); }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${template === 'msg_imag' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-muted hover:bg-surface-hover'}`}
              >
                <Image size={20} />
                <span className="font-medium">Message + Image </span>
              </button>
              <button
                onClick={() => { setTemplate('msg_video'); handleClearMedia(); }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${template === 'msg_video' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-muted hover:bg-surface-hover'}`}
              >
                <Video size={20} />
                <span className="font-medium">Message + Video </span>
              </button>
            </div>
          </div>

          <div className="bg-surface-secondary rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4 text-text-primary">2. Compose Message</h2>

            {template !== 'msg' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Upload {template === 'msg_imag' ? 'Image' : 'Video'}
                </label>
                {!mediaPreview ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer relative">
                    <input type="file" accept={template === 'msg_imag' ? "image/*" : "video/*"} className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMediaChange} />
                    {template === 'msg_imag' ? <Image size={32} /> : <Video size={32} />}
                    <span className="mt-2 text-sm font-medium">Click to upload</span>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center h-48">
                    {template === 'msg_imag' ? (
                      <img src={mediaPreview} alt="Preview" className="max-h-full object-contain" />
                    ) : (
                      <video src={mediaPreview} controls className="max-h-full w-full" />
                    )}
                    <button onClick={handleClearMedia} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/80 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Message Content</label>
              <textarea
                value={messageContent}
                maxLength={1024}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your announcement here..."
                className="w-full bg-surface-primary border border-border rounded-lg p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-32"
              ></textarea>
              <div className="text-xs text-text-muted text-right mt-1">
                {messageContent.length} / 1024 characters
              </div>
            </div>
          </div>
        </div>

        {/* Recipients Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-secondary rounded-xl border border-border p-5 flex flex-col h-full">
            <h2 className="font-semibold mb-4 text-text-primary">3. Select Recipients</h2>

            <div className="flex gap-2 mb-6 border-b border-border">
              <button onClick={() => { setAudienceType('active_clients'); setIsFilterSelected(false); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative ${audienceType === 'active_clients' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                Active Clients
                {audienceType === 'active_clients' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
              </button>
              <button onClick={() => { setAudienceType('inactive_clients'); setIsFilterSelected(false); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative ${audienceType === 'inactive_clients' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                Inactive Clients
                {audienceType === 'inactive_clients' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
              </button>
              <button onClick={() => { setAudienceType('leads'); setIsFilterSelected(false); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative ${audienceType === 'leads' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                Leads
                {audienceType === 'leads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                  <input type="radio" checked={!isFilterSelected} onChange={() => setIsFilterSelected(false)} className="text-primary focus:ring-primary h-4 w-4" />
                  All in Category ({listData.length})
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-primary">
                  <input type="radio" checked={isFilterSelected} onChange={() => setIsFilterSelected(true)} className="text-primary focus:ring-primary h-4 w-4" />
                  Selected Only ({selectedIds.length})
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-hover sticky top-0 z-10 text-xs uppercase text-text-muted">
                  <tr>
                    {isFilterSelected && (
                      <th className="p-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === listData.length && listData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                      </th>
                    )}
                    <th className="p-3 font-medium text-left">Name</th>
                    <th className="p-3 font-medium text-center">Phone</th>
                    <th className="p-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-text-muted">Loading recipients...</td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-text-muted">No recipients found</td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => (
                      <tr key={item._id} className="hover:bg-surface-hover/50 transition-colors">
                        {isFilterSelected && (
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item._id)}
                              onChange={() => handleSelectOne(item._id)}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                          </td>
                        )}
                        <td className="p-3 text-left text-text-primary font-medium">{item.personalInfo?.name || item.name}</td>
                        <td className="p-3 text-center text-text-muted">{item.personalInfo?.whatsappNumber || item.whatsappNumber || item.personalInfo?.mobileNo || item.phone}</td>
                        <td className="p-3 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${audienceType === 'leads' ? 'bg-blue-500/10 text-blue-500' :
                              item.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                            {audienceType === 'leads' ? 'Lead' : item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-text-muted">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, listData.length)} of {listData.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
              <div className="text-sm">
                <span className="text-text-muted">Ready to send to: </span>
                <span className="font-bold text-primary">{activeRecipientsCount} recipients</span>
              </div>
              <button
                onClick={validateAndConfirm}
                disabled={sending || activeRecipientsCount === 0}
                className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} />
                )}
                <span>Send Message</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-secondary w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="p-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Confirm Send</h3>
              <p className="text-text-muted mb-4">
                You are about to send a WhatsApp message using the <strong className="text-text-primary">{template}</strong> template to <strong className="text-text-primary">{activeRecipientsCount}</strong> recipients.
              </p>

              <div className="bg-surface-hover rounded-lg p-3 text-sm text-text-primary mb-6 max-h-32 overflow-y-auto">
                <span className="text-xs text-text-muted uppercase font-bold block mb-1">Message Preview:</span>
                "{messageContent}"
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 rounded-lg font-medium text-text-primary hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  className="btn-primary px-6 py-2"
                >
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
