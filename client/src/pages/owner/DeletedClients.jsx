import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import { Search, RotateCcw, X, AlertCircle } from 'lucide-react';
import Button from '../../components/Button';
import Pagination from '../../components/Pagination';

const DeletedClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchDeletedClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/client/deleted');
      setClients(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch deleted clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedClients();
  }, []);

  const handleRestore = async (client) => {
    try {
      await api.put(`/client/${client._id}/restore`);
      toast.success('Client restored successfully.');
      navigate(`/owner/clients/${client._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to restore client');
    }
  };

  // Filter clients locally
  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.personalInfo?.name?.toLowerCase().includes(term) ||
      (c.clientId || '').toLowerCase().includes(term) ||
      c.personalInfo?.mobileNo?.includes(term)
    );
  }, [clients, searchTerm]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  return (
    <div className="p-4 md:p-8 md:pt-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Deleted Clients</h1>
          <p className="text-text-secondary mt-1 text-sm md:text-base">
            Restore clients who were soft-deleted. Historical records and membership periods are preserved.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="card mb-3 bg-surface-secondary border-border relative z-20">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
          <input
            type="text"
            placeholder="Search by name, ID or phone..."
            className="input-field pl-10 w-full"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <p className="text-xs text-text-muted mb-4 px-1">
        {loading ? 'Loading...' : `${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''} found`}
      </p>

      {/* Main List */}
      {loading ? (
        <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-2 px-6 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <div>Client Info</div>
            <div>Mobile No</div>
            <div>Previous Plan</div>
            <div>Deleted On</div>
            <div className="text-right">Actions</div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 border-b border-border/50">
              <div className="w-10 h-10 bg-surface-divider rounded-xl animate-pulse shrink-0"></div>
              <div className="flex-1 grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-2 items-center">
                <div>
                  <div className="h-4 w-28 bg-surface-divider rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-16 bg-surface-divider rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-surface-divider rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-surface-divider rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-surface-divider rounded-lg animate-pulse ml-auto"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card bg-surface-secondary border-border text-center py-16 text-text-secondary">
          <AlertCircle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No deleted clients found</p>
          <p className="text-sm mt-1 text-gray-600">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="card p-0 bg-surface-secondary border border-border rounded-xl overflow-hidden shadow-lg">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-2 px-6 py-4 bg-surface-secondary/80 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
            <div>Client Info</div>
            <div>Mobile No</div>
            <div>Previous Plan</div>
            <div>Deleted On</div>
            <div className="text-right">Actions</div>
          </div>
          
          <div className="flex flex-col">
            {paginatedClients.map(client => {
              const name = client?.personalInfo?.name || 'Client';
              const avatarText = name.charAt(0).toUpperCase();
              const latestPlan = client?.memberships?.[client?.memberships?.length - 1] || client?.membership;

              return (
                <div key={client._id} className="grid-table-row bg-surface-card border-b border-border hover:bg-white/[0.02] transition-colors group px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 md:gap-2 items-center text-sm">
                    {/* Client Info */}
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-black text-lg border border-red-500/20 shrink-0 shadow-inner group-hover:bg-red-500 group-hover:text-black transition-all duration-300">
                        {avatarText}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-text-primary truncate">{name}</h3>
                        <p className="text-xs text-text-muted truncate">{client?.clientId || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Mobile No */}
                    <div className="flex items-center md:block">
                      <span className="w-28 md:hidden text-text-muted text-xs font-semibold uppercase">Mobile: </span>
                      <p className="text-text-primary truncate">{client?.personalInfo?.mobileNo || '-'}</p>
                    </div>

                    {/* Previous Plan */}
                    <div className="flex items-center md:block">
                      <span className="w-28 md:hidden text-text-muted text-xs font-semibold uppercase">Previous Plan: </span>
                      <p className="text-text-primary truncate">{latestPlan?.planName || 'No previous plan'}</p>
                    </div>

                    {/* Deleted On */}
                    <div className="flex items-center md:block">
                      <span className="w-28 md:hidden text-text-muted text-xs font-semibold uppercase">Deleted On: </span>
                      <p className="text-text-primary truncate">
                        {client.deletedAt
                          ? new Date(client.deletedAt).toLocaleDateString('en-GB').replace(/\//g, '-')
                          : '-'}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-start md:justify-end gap-2 shrink-0 mt-2 md:mt-0">
                      <Button
                        type="button"
                        onClick={() => handleRestore(client)}
                        className="!px-4 !py-2 text-xs flex items-center gap-1.5 font-bold shadow-md shadow-primary/10"
                      >
                        <RotateCcw size={13} /> Restore
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default DeletedClients;
