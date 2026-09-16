import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CustomDropdown from '../../components/CustomDropdown';
import { toast } from 'react-toastify';
import { Image, Video, MessageSquare, Send, CheckCircle2, X, Trash2, Edit, Plus, Users, ArrowLeft, Search } from 'lucide-react';
import api from '../../utils/api';

export default function CustomMessages() {
  const [viewMode, setViewMode] = useState('manage'); // 'manage' or 'send'

  // --- Templates Management State ---
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState(null);
  
  const [templateForm, setTemplateForm] = useState({
    title: '',
    templateType: 'msg',
    content: ''
  });
  const [templateMediaFile, setTemplateMediaFile] = useState(null);
  const [templateMediaPreview, setTemplateMediaPreview] = useState(null);

  // --- Sending State ---
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState({ active: [], inactive: [], leads: [] });
  const [listData, setListData] = useState({ active: [], inactive: [], leads: [] });
  const [activeTab, setActiveTab] = useState('active'); // active, inactive, leads
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loadingLists, setLoadingLists] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- Filtering State ---
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPlan, setFilterPlan] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [plans, setPlans] = useState([]);
  const [messageHistory, setMessageHistory] = useState({});

  useEffect(() => {
    fetchTemplates();

    // Fetch plans for filter
    api.get('/plan')
      .then(res => setPlans(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (viewMode === 'send') {
      fetchAllRecipients();
    }
  }, [viewMode]);

  // --- Template Management Logic ---
  const fetchTemplates = async () => {
    try {
      const res = await api.get('/custom-messages/templates');
      if (res.data.success) {
        setSavedTemplates(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const enterSendMode = () => {
    setSelectedTemplateId('');
    setSelectedRecipients({ active: [], inactive: [], leads: [] });
    setFilterStatus('All');
    setFilterPlan('All');
    setActiveTab('active');
    setCurrentPage(1);
    setViewMode('send');
  };

  const openCreateModal = () => {
    setEditingTemplateId(null);
    setTemplateForm({ title: '', templateType: 'msg', content: '' });
    setTemplateMediaFile(null);
    setTemplateMediaPreview(null);
    setShowTemplateModal(true);
  };

  const openEditModal = (t) => {
    setEditingTemplateId(t._id);
    setTemplateForm({ title: t.title, templateType: t.templateType || 'msg', content: t.content });
    setTemplateMediaFile(null);
    setTemplateMediaPreview(t.mediaUrl || null);
    setShowTemplateModal(true);
  };

  const handleTemplateMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (templateForm.templateType === 'msg_img' && !file.type.startsWith('image/')) {
      return toast.error('Please upload an image file');
    }
    if (templateForm.templateType === 'msg_video' && !file.type.startsWith('video/')) {
      return toast.error('Please upload a video file');
    }

    setTemplateMediaFile(file);
    setTemplateMediaPreview(URL.createObjectURL(file));
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      return toast.error('Title and content are required');
    }
    if (templateForm.templateType !== 'msg' && !templateMediaFile && !templateMediaPreview) {
      return toast.error('Media file is required for this template type');
    }

    try {
      const formData = new FormData();
      formData.append('title', templateForm.title);
      formData.append('templateType', templateForm.templateType);
      formData.append('content', templateForm.content);
      if (templateMediaFile) {
        formData.append('media', templateMediaFile);
      }

      if (editingTemplateId) {
        const res = await api.put(`/custom-messages/templates/${editingTemplateId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) toast.success('Template updated successfully');
      } else {
        const res = await api.post('/custom-messages/templates', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) toast.success('Template created successfully');
      }
      setShowTemplateModal(false);
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  const confirmDeleteTemplate = (id) => {
    setDeleteTemplateId(id);
  };

  const executeDeleteTemplate = async () => {
    if (!deleteTemplateId) return;
    try {
      const res = await api.delete(`/custom-messages/templates/${deleteTemplateId}`);
      if (res.data.success) {
        toast.success('Template deleted');
        fetchTemplates();
      }
    } catch (err) {
      toast.error('Failed to delete template');
    }
    setDeleteTemplateId(null);
  };

  // --- Sending Logic ---
  const fetchAllRecipients = async () => {
    setLoadingLists(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterPlan !== 'All') params.append('planName', filterPlan);

      const [leadsRes, clientRes, historyRes] = await Promise.all([
        api.get('/leads'),
        api.get(`/client?${params.toString()}`),
        api.get('/custom-messages/history')
      ]);
      
      const clients = clientRes.data.data || [];
      const leads = leadsRes.data.data || [];
      const history = historyRes.data?.data || {};
      
      setListData({
        active: clients.filter(c => c.isActive),
        inactive: clients.filter(c => !c.isActive),
        leads: leads
      });
      setMessageHistory(history);
      // We don't reset selections here, so users can accumulate selections across filters.
    } catch (err) {
      toast.error('Failed to fetch recipients');
    }
    setLoadingLists(false);
  };

  useEffect(() => {
    if (viewMode === 'send') {
      fetchAllRecipients();
    }
  }, [viewMode, filterStatus, filterPlan]);

  const handleSelectAllInTab = (e) => {
    const visibleIds = listData[activeTab].map(item => item._id);
    if (e.target.checked) {
      setSelectedRecipients(prev => ({
        ...prev,
        [activeTab]: [...new Set([...prev[activeTab], ...visibleIds])]
      }));
    } else {
      setSelectedRecipients(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(id => !visibleIds.includes(id))
      }));
    }
  };

  const handleSelectOne = (id) => {
    const currentSelected = selectedRecipients[activeTab];
    if (currentSelected.includes(id)) {
      setSelectedRecipients({
        ...selectedRecipients,
        [activeTab]: currentSelected.filter(i => i !== id)
      });
    } else {
      setSelectedRecipients({
        ...selectedRecipients,
        [activeTab]: [...currentSelected, id]
      });
    }
  };

  const validateAndConfirm = () => {
    if (!selectedTemplateId) {
      return toast.error('Please select a template');
    }
    const selectedTemplate = savedTemplates.find(t => t._id === selectedTemplateId);
    
    if (selectedTemplate.templateType !== 'msg' && !selectedTemplate.mediaUrl) {
      return toast.error('This template is missing its required media. Please edit it to add media.');
    }
    
    const totalSelected = selectedRecipients.active.length + selectedRecipients.inactive.length + selectedRecipients.leads.length;
    if (totalSelected === 0) {
      return toast.error('Please select at least one recipient');
    }
    
    setShowConfirm(true);
  };

  const handleSend = async () => {
    setSending(true);
    setShowConfirm(false);
    
    try {
      const selectedTemplate = savedTemplates.find(t => t._id === selectedTemplateId);
      const allSelectedIds = [...selectedRecipients.active, ...selectedRecipients.inactive, ...selectedRecipients.leads];
      
      const payload = {
        templateName: selectedTemplate.templateType,
        messageContent: selectedTemplate.content,
        audienceType: 'selected',
        selectedIds: JSON.stringify(allSelectedIds)
      };

      if (selectedTemplate.mediaUrl) {
        payload.mediaUrl = selectedTemplate.mediaUrl;
      }

      const res = await api.post('/custom-messages/send', payload);

      if (res.data.success) {
        toast.success(`Campaign started for ${res.data.data.recipientCount} recipients`);
        setViewMode('manage'); // go back to templates list
        setSelectedTemplateId('');
      } else {
        toast.error(res.data.message || 'Failed to send messages');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send messages');
    }
    setSending(false);
  };

  // --- Render Helpers ---
  const renderManageView = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-text-primary mb-2">Custom Messages</h1>
        <p className="text-text-muted">Create and manage your WhatsApp message templates, and launch bulk campaigns.</p>
      </div>

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-bold text-text-primary">Saved Templates</h2>
        <div className="flex gap-3">
          <button onClick={openCreateModal} className="btn-primary px-4 py-2 flex items-center gap-2">
            <Plus size={18} />
            <span>Create Template</span>
          </button>
          <button onClick={() => setViewMode('send')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Send size={18} />
            <span>Bulk Send Message</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedTemplates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-text-muted bg-surface-secondary rounded-xl border border-border">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>No saved templates yet. Click "Create Template" to get started.</p>
          </div>
        ) : (
          savedTemplates.map(t => (
            <div key={t._id} className="bg-surface-secondary border border-border rounded-xl p-5 flex flex-col hover:border-primary transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-text-primary">{t.title}</h3>
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-surface-hover text-text-muted rounded-full mt-1">
                    {t.templateType === 'msg' && <><MessageSquare size={12} /> Message</>}
                    {t.templateType === 'msg_img' && <><Image size={12} /> Message + Image</>}
                    {t.templateType === 'msg_video' && <><Video size={12} /> Message + Video</>}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(t)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => confirmDeleteTemplate(t._id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-surface-primary rounded p-3 text-sm text-text-muted whitespace-pre-wrap overflow-hidden relative">
                <div className="line-clamp-4">{t.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Template Modal */}
      {showTemplateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-secondary w-full max-w-lg rounded-xl shadow-xl border border-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">{editingTemplateId ? 'Edit Template' : 'Create Template'}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-text-muted hover:text-text-primary"><X size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Template Title</label>
                <input
                  type="text"
                  value={templateForm.title}
                  maxLength={50}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                  placeholder="e.g. Diwali Offer"
                  className="w-full bg-surface-primary border border-border rounded-lg p-2.5 text-text-primary focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Template Type {editingTemplateId && '(Cannot change type when editing)'}</label>
                <CustomDropdown
                  value={templateForm.templateType}
                  disabled={!!editingTemplateId}
                  onChange={(val) => setTemplateForm({ ...templateForm, templateType: val })}
                  options={[
                    { label: 'Message Only', value: 'msg' },
                    { label: 'Message + Image', value: 'msg_img' },
                    { label: 'Message + Video', value: 'msg_video' }
                  ]}
                  placeholder="Select Template Type"
                  className="w-full"
                />
              </div>

              {templateForm.templateType !== 'msg' && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">
                    Upload {templateForm.templateType === 'msg_img' ? 'Image' : 'Video'}
                  </label>
                  {!templateMediaPreview ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer relative bg-surface-primary h-32">
                      <input 
                        type="file" 
                        accept={templateForm.templateType === 'msg_img' ? "image/*" : undefined} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleTemplateMediaChange} 
                      />
                      {templateForm.templateType === 'msg_img' ? <Image size={24} /> : <Video size={24} />}
                      <span className="mt-2 text-sm font-medium text-center px-4">Click to upload {templateForm.templateType === 'msg_img' ? 'Image' : 'Video'}</span>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center h-32">
                      {templateForm.templateType === 'msg_img' || (typeof templateMediaPreview === 'string' && templateMediaPreview.match(/\.(jpeg|jpg|gif|png)$/i)) ? (
                        <img src={templateMediaPreview} alt="Preview" className="max-h-full object-contain" />
                      ) : (
                        <video src={templateMediaPreview} controls className="max-h-full w-full" />
                      )}
                      <button onClick={() => { setTemplateMediaFile(null); setTemplateMediaPreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/80 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Message Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  maxLength={1024}
                  rows={5}
                  placeholder="Type your announcement here..."
                  className="w-full bg-surface-primary border border-border rounded-lg p-3 text-text-primary focus:ring-2 focus:ring-primary outline-none resize-none"
                ></textarea>
                <div className="text-right text-xs text-text-muted mt-1">{templateForm.content.length}/1024 characters</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 rounded-lg font-medium text-text-primary hover:bg-surface-hover transition-colors">Cancel</button>
              <button onClick={handleSaveTemplate} className="btn-primary px-6 py-2">
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteTemplateId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-secondary w-full max-w-sm rounded-xl shadow-xl border border-border p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Delete Template</h3>
            <p className="text-text-muted mb-6">Are you sure you want to delete this template? This action cannot be undone.</p>
            <div className="flex justify-center gap-3 w-full">
              <button onClick={() => setDeleteTemplateId(null)} className="flex-1 px-4 py-2 rounded-lg font-medium text-text-primary hover:bg-surface-hover transition-colors">Cancel</button>
              <button onClick={executeDeleteTemplate} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  const renderSendView = () => {
    const activeData = listData[activeTab].filter(item => {
    if (!searchQuery) return true;
    const name = (item.personalInfo?.name || item.name || '').toLowerCase();
    const phone = (item.personalInfo?.whatsappNumber || item.whatsappNumber || item.personalInfo?.mobileNo || item.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || phone.includes(query);
  });
  const paginatedData = activeData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(activeData.length / itemsPerPage);
    const selectedTemplate = savedTemplates.find(t => t._id === selectedTemplateId);

    const totalSelectedCount = selectedRecipients.active.length + selectedRecipients.inactive.length + selectedRecipients.leads.length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <button onClick={() => setViewMode('manage')} className="p-2 bg-surface-secondary border border-border rounded hover:bg-surface-hover text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Bulk Send Campaign</h1>
            <p className="text-sm text-text-muted">Select a template, choose recipients across all categories, and send.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface-secondary rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-4 text-text-primary">1. Choose Template</h2>
              <CustomDropdown
                value={selectedTemplateId}
                onChange={(val) => setSelectedTemplateId(val)}
                options={savedTemplates.map(t => ({
                  label: `${t.title} (${t.templateType === 'msg' ? 'Text' : t.templateType === 'msg_img' ? 'Image' : 'Video'})`,
                  value: t._id
                }))}
                placeholder="Select a saved template..."
                className="w-full mb-4"
              />

              {selectedTemplate && (
                <div className="bg-surface-primary p-3 rounded-lg border border-border">
                  <div className="text-xs font-bold text-text-muted uppercase mb-1">Preview</div>
                  <div className="text-sm text-text-primary whitespace-pre-wrap">{selectedTemplate.content}</div>
                </div>
              )}
            </div>

            {selectedTemplate && selectedTemplate.templateType !== 'msg' && (
              <div className="bg-surface-secondary rounded-xl border border-border p-5">
                <h2 className="font-semibold mb-4 text-text-primary">2. Attached Media</h2>
                {selectedTemplate.mediaUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center h-48">
                    {selectedTemplate.templateType === 'msg_img' || selectedTemplate.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      <img src={selectedTemplate.mediaUrl} alt="Preview" className="max-h-full object-contain" />
                    ) : (
                      <video src={selectedTemplate.mediaUrl} controls className="max-h-full w-full" />
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded">
                    Warning: This template requires media but none is attached. Please edit the template to upload media before sending.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recipients Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-secondary rounded-xl border border-border p-5 flex flex-col h-[600px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="font-semibold text-text-primary">3. Select Recipients</h2>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Total Selected: {totalSelectedCount}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mb-4 border-b border-border overflow-x-auto custom-scrollbar">
                <button onClick={() => { setActiveTab('active'); setCurrentPage(1); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'active' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                  Active Clients ({selectedRecipients.active.length}/{listData.active.length})
                  {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                </button>
                <button onClick={() => { setActiveTab('inactive'); setCurrentPage(1); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'inactive' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                  Inactive Clients ({selectedRecipients.inactive.length}/{listData.inactive.length})
                  {activeTab === 'inactive' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                </button>
                <button onClick={() => { setActiveTab('leads'); setCurrentPage(1); }} className={`pb-3 px-4 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'leads' ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                  Leads ({selectedRecipients.leads.length}/{listData.leads.length})
                  {activeTab === 'leads' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {(activeTab === 'active' || activeTab === 'inactive') && (
                    <>
                      <CustomDropdown
                        value={filterStatus}
                        onChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}
                        options={[
                          { value: 'All', label: 'All Status' },
                          { value: 'Upcoming', label: 'Upcoming' },
                          { value: 'Active', label: 'Active' },
                          { value: 'Expiring Soon', label: 'Expiring Soon' },
                          { value: 'Dues', label: 'Dues' },
                          { value: 'Expired', label: 'Expired' },
                        ]}
                        className="w-full sm:w-48"
                      />
                      <CustomDropdown
                        value={filterPlan}
                        onChange={(val) => { setFilterPlan(val); setCurrentPage(1); }}
                        options={[
                          { value: 'All', label: 'All Plans' },
                          ...plans.map(p => ({ value: p._id, label: p.planType === 'pt' ? `${p.name} (PT)` : p.name }))
                        ]}
                        className="w-full sm:w-48"
                      />
                      {(filterStatus !== 'All' || filterPlan !== 'All' || searchQuery) && (
                        <button
                          onClick={() => { setFilterStatus('All'); setFilterPlan('All'); setSearchQuery(''); setCurrentPage(1); }}
                          className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors flex items-center px-2"
                        >
                          Clear Filters
                        </button>
                      )}
                    </>
                  )}
                </div>
                
                {totalSelectedCount > 0 && (
                  <button 
                    onClick={() => setSelectedRecipients({ active: [], inactive: [], leads: [] })}
                    className="text-xs font-semibold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                  >
                    <X size={14} /> Clear Selection
                  </button>
                )}
              </div>
              
              <div className="mb-4 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by name or mobile number..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-surface-primary border border-border text-text-primary rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex-1 overflow-auto border border-border rounded-lg relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-hover sticky top-0 z-10 text-xs uppercase text-text-muted">
                    <tr>
                      <th className="p-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={activeData.length > 0 && activeData.every(item => selectedRecipients[activeTab].includes(item._id))}
                          onChange={handleSelectAllInTab}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                      </th>
                      <th className="p-3 font-medium text-center">Name</th>
                      <th className="p-3 font-medium text-center">Mobile Number</th>
                      <th className="p-3 font-medium text-center">Last Message</th>
                      <th className="p-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {loadingLists ? (
                      <tr><td colSpan="5" className="p-8 text-center text-text-muted">Loading recipients...</td></tr>
                    ) : paginatedData.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-text-muted">No recipients found</td></tr>
                    ) : (
                      paginatedData.map((item, index) => {
                        const history = messageHistory[item._id];
                        return (
                        <tr key={item._id} className="hover:bg-surface-hover/50 transition-colors">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRecipients[activeTab].includes(item._id)}
                              onChange={() => handleSelectOne(item._id)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <div className="text-text-primary font-medium">{item.personalInfo?.name || item.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">
                              {activeTab === 'leads' 
                                ? `#${((currentPage - 1) * itemsPerPage) + index + 1}` 
                                : item.clientId ? item.clientId : ''}
                            </div>
                          </td>
                          <td className="p-3 text-center text-text-muted">{item.personalInfo?.whatsappNumber || item.whatsappNumber || item.personalInfo?.mobileNo || item.phone}</td>
                          <td className="p-3 text-center">
                            {history ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-medium text-text-primary mb-1">
                                  {history.templateName === 'msg' ? 'Text Template' : history.templateName === 'msg_img' ? 'Image Template' : 'Video Template'}
                                </span>
                                <span className="text-[10px] text-text-muted">
                                  {new Date(history.date).toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted italic">No template sent</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {history ? (
                              <div className="flex flex-col items-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  history.status === 'sent' ? 'bg-green-500/10 text-green-500' :
                                  history.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                                  'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                  {history.status.toUpperCase()}
                                </span>
                                {history.error && history.status === 'failed' && (
                                  <span className="text-[10px] text-red-400 mt-1 max-w-[150px] truncate" title={history.error}>
                                    {history.error}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-text-muted italic">-</span>
                            )}
                          </td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-text-muted">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, activeData.length)} of {activeData.length}
                  </span>
                  <div className="flex gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50">Prev</button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border flex justify-end">
                <button
                  onClick={validateAndConfirm}
                  disabled={sending || totalSelectedCount === 0 || !selectedTemplateId}
                  className="btn-primary flex items-center gap-2 px-8 py-2.5 disabled:opacity-50"
                >
                  <Send size={18} />
                  <span>Review & Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-surface-secondary w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
              <div className="p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Confirm Send</h3>
                <p className="text-text-muted mb-4">You are about to send the campaign.</p>
                
                <div className="bg-surface-primary rounded-lg border border-border p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Active Clients:</span>
                    <span className="font-bold text-text-primary">{selectedRecipients.active.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Inactive Clients:</span>
                    <span className="font-bold text-text-primary">{selectedRecipients.inactive.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Leads:</span>
                    <span className="font-bold text-text-primary">{selectedRecipients.leads.length}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border flex justify-between">
                    <span className="font-medium text-text-primary">Total Recipients:</span>
                    <span className="font-bold text-primary text-lg">{totalSelectedCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg font-medium text-text-primary hover:bg-surface-hover transition-colors">Cancel</button>
                  <button onClick={handleSend} disabled={sending} className="btn-primary flex items-center justify-center w-32 py-2">
                    {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {viewMode === 'manage' ? renderManageView() : renderSendView()}
    </div>
  );
}
