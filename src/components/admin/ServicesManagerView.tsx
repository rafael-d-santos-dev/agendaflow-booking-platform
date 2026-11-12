/**
 * AgendaFlow — Services & Pricing Management Module
 * Product Specification v1.0 | Phase 2C
 * Full administrative service catalog with creation, editing,
 * activation/deactivation, industry-specific attributes, and historical preservation.
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Tag, 
  Clock, 
  DollarSign, 
  UserCheck, 
  Users, 
  Edit2, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  X, 
  RotateCcw,
  Building,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Business, Service, Staff } from '../../types/index.ts';
import { Card } from '../common/Card.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { formatCurrency, formatDuration } from '../../utils/formatters.ts';
import { 
  createService, 
  updateService, 
  toggleServiceActive, 
  getStaffAssignedToService 
} from '../../utils/storage.ts';

interface ServicesManagerViewProps {
  business: Business;
  services: Service[];
  staff: Staff[];
  onNavigate: (path: string) => void;
  onRefreshData?: () => void;
}

export const ServicesManagerView: React.FC<ServicesManagerViewProps> = ({
  business,
  services,
  staff,
  onNavigate,
}) => {
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deactivatingService, setDeactivatingService] = useState<Service | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Derive all unique categories for this business
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [services]);

  // Filtered Services list
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = s.description.toLowerCase().includes(q);
        const matchesCategory = s.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'active' && !s.active) return false;
      if (statusFilter === 'inactive' && s.active) return false;

      // 3. Category Filter
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;

      return true;
    });
  }, [services, searchQuery, statusFilter, categoryFilter]);

  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter !== 'all' || categoryFilter !== 'all');

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const handleToggleActive = (service: Service) => {
    if (service.active) {
      // Prompt confirmation before deactivating
      setDeactivatingService(service);
    } else {
      // Directly activate
      const success = toggleServiceActive(service.id, business.id);
      if (success) {
        showFeedback('success', `Service "${service.name}" activated for new bookings.`);
      } else {
        showFeedback('error', 'Failed to update service status.');
      }
    }
  };

  const confirmDeactivation = () => {
    if (!deactivatingService) return;
    const success = toggleServiceActive(deactivatingService.id, business.id);
    if (success) {
      showFeedback('success', `Service "${deactivatingService.name}" deactivated. Existing bookings remain intact.`);
    } else {
      showFeedback('error', 'Failed to deactivate service.');
    }
    setDeactivatingService(null);
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Toast Feedback */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-sm border shadow-lg flex items-center justify-between text-xs font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-[#465945]/15 border-[#465945]/40 text-[#30251E]'
              : 'bg-[#8C4336]/15 border-[#8C4336]/40 text-[#8C4336]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-[#465945]" />
            ) : (
              <AlertCircle size={16} className="text-[#8C4336]" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#80664F] font-semibold bg-[#D8C3A5]/40 px-2 py-0.5 rounded-xs">
              {business.config.badge} Offerings
            </span>
            <span className="text-xs text-[#80664F] font-mono">
              Currency: {business.currency}
            </span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#30251E] mt-1">
            {business.config.terminology.services} Catalog
          </h1>
          <p className="text-xs text-[#594231] mt-0.5">
            Configure pricing, session cadences, and specialist assignments with historical preservation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            New {business.config.terminology.service}
          </Button>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-[#FAF6F0] border border-[#D8C3A5] p-4 rounded-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2">
            <Input
              type="text"
              placeholder={`Search ${business.config.terminology.services.toLowerCase()} by name, category, or description...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2.5 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              aria-label="Filter by active state"
            >
              <option value="all">All Statuses (Active & Inactive)</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#D8C3A5]/50">
          <span className="text-[#594231]">
            Displaying <strong>{filteredServices.length}</strong> of {services.length} catalogued items
          </span>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              leftIcon={<RotateCcw size={12} />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </section>

      {/* Services List / Table */}
      <Card variant="ivory" padding="none" className="border border-[#D8C3A5] overflow-hidden shadow-xs">
        {filteredServices.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#30251E]">
                <thead className="bg-[#EFE5D5] border-b border-[#D8C3A5] text-[11px] uppercase tracking-wider text-[#594231] font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">{business.config.terminology.service}</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Eligible {business.config.terminology.specialists}</th>
                    <th className="py-3.5 px-4">Attributes</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8C3A5]/40">
                  {filteredServices.map((srv) => {
                    const assignedStaff = getStaffAssignedToService(srv.id, business.id, { staff } as any);

                    return (
                      <tr key={srv.id} className="hover:bg-[#FAF6F0] transition-colors">
                        {/* Name & Description */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-sm text-[#30251E]">{srv.name}</p>
                          <p className="text-[11px] text-[#594231] line-clamp-1 mt-0.5">{srv.description}</p>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#80664F] bg-[#D8C3A5]/30 px-2 py-0.5 rounded-xs border border-[#D8C3A5]/60">
                            {srv.category}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 font-medium text-[#30251E]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} className="text-[#80664F]" />
                            {formatDuration(srv.durationMinutes)}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-editorial text-base font-semibold text-[#30251E]">
                          {formatCurrency(srv.price, business.currency)}
                        </td>

                        {/* Assigned Staff */}
                        <td className="py-3.5 px-4 text-[#594231]">
                          {assignedStaff.length > 0 ? (
                            <span className="text-xs">
                              {assignedStaff.map((s) => s.name.split(' ')[0]).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[#80664F]/60 italic">All Specialists</span>
                          )}
                        </td>

                        {/* Attributes (e.g. Group Capacity, Resource Required) */}
                        <td className="py-3.5 px-4 space-y-1">
                          {srv.maxCapacity > 1 && (
                            <Badge variant="taupe" size="sm">
                              Capacity: {srv.maxCapacity} max
                            </Badge>
                          )}
                          {srv.requiresResource && (
                            <Badge variant="sand" size="sm">
                              Resource Suite Req.
                            </Badge>
                          )}
                          {srv.maxCapacity <= 1 && !srv.requiresResource && (
                            <span className="text-[#80664F]/60 text-[11px]">Individual Session</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {srv.active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-xs bg-[#465945]/15 text-[#30251E] border border-[#465945]/30 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#465945]" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-xs bg-[#8C4336]/10 text-[#8C4336] border border-[#8C4336]/30 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8C4336]" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingService(srv)}
                              className="p-1.5 text-[#4A3B31] hover:bg-[#D8C3A5]/40 rounded-xs transition-colors"
                              title="Edit Service Details"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              onClick={() => handleToggleActive(srv)}
                              className={`p-1.5 rounded-xs transition-colors ${
                                srv.active
                                  ? 'text-[#80664F] hover:bg-[#8C4336]/10 hover:text-[#8C4336]'
                                  : 'text-[#465945] hover:bg-[#465945]/15'
                              }`}
                              title={srv.active ? 'Deactivate Service' : 'Activate Service'}
                            >
                              <Power size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (< 768px) */}
            <div className="md:hidden divide-y divide-[#D8C3A5]/50">
              {filteredServices.map((srv) => {
                const assignedStaff = getStaffAssignedToService(srv.id, business.id, { staff } as any);

                return (
                  <div key={srv.id} className="p-4 space-y-3 bg-[#FAF6F0]/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] tracking-wider block">
                          {srv.category}
                        </span>
                        <h3 className="font-semibold text-base text-[#30251E] mt-0.5">
                          {srv.name}
                        </h3>
                      </div>

                      {srv.active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-xs bg-[#465945]/15 text-[#30251E] border border-[#465945]/30 font-medium shrink-0">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-xs bg-[#8C4336]/10 text-[#8C4336] border border-[#8C4336]/30 font-medium shrink-0">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#594231] leading-relaxed">
                      {srv.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#EFE5D5]/50 p-2.5 rounded-xs border border-[#D8C3A5]/40">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Duration</span>
                        <span className="font-medium text-[#30251E] flex items-center gap-1">
                          <Clock size={12} /> {formatDuration(srv.durationMinutes)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Price</span>
                        <span className="font-editorial text-base font-semibold text-[#30251E]">
                          {formatCurrency(srv.price, business.currency)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-semibold text-[#80664F] block">Staff Assignment</span>
                        <span className="text-xs text-[#594231]">
                          {assignedStaff.length > 0
                            ? assignedStaff.map((s) => s.name).join(', ')
                            : 'Open to all staff'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingService(srv)}
                        leftIcon={<Edit2 size={14} />}
                      >
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(srv)}
                        className={srv.active ? 'text-[#8C4336] border-[#8C4336]/40' : 'text-[#465945] border-[#465945]/40'}
                        leftIcon={<Power size={14} />}
                      >
                        {srv.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFE5D5] flex items-center justify-center text-[#80664F] mx-auto">
              <Tag size={22} className="text-[#B58A55]" />
            </div>
            <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
              {hasActiveFilters ? 'No Matching Services Found' : 'No Services Configured'}
            </h3>
            <p className="text-xs text-[#594231] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your search term or adjusting status and category filters.'
                : `There are currently no items catalogued for ${business.name}.`}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Create First {business.config.terminology.service}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* --- CREATE SERVICE MODAL --- */}
      {isCreateOpen && (
        <CreateServiceModal
          business={business}
          staff={staff}
          categories={categories}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(newSrv) => {
            setIsCreateOpen(false);
            showFeedback('success', `Created service "${newSrv.name}" in catalog.`);
          }}
        />
      )}

      {/* --- EDIT SERVICE MODAL --- */}
      {editingService && (
        <EditServiceModal
          business={business}
          service={editingService}
          staff={staff}
          categories={categories}
          onClose={() => setEditingService(null)}
          onSuccess={(updatedSrv) => {
            setEditingService(null);
            showFeedback('success', `Updated service "${updatedSrv.name}". Existing appointments retain original prices.`);
          }}
        />
      )}

      {/* --- DEACTIVATION CONFIRMATION MODAL --- */}
      {deactivatingService && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setDeactivatingService(null)}
        >
          <div 
            className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-[#8C4336]">
              <div className="w-10 h-10 rounded-full bg-[#8C4336]/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-editorial text-lg font-semibold text-[#30251E]">
                  Deactivate Service?
                </h3>
                <span className="text-xs text-[#80664F]">{deactivatingService.name}</span>
              </div>
            </div>

            <p className="text-xs text-[#594231] leading-relaxed">
              Deactivating this service will immediately prevent clients and staff from selecting it for new reservations.
            </p>

            <div className="p-3 bg-[#EFE5D5]/60 rounded-xs border border-[#D8C3A5]/50 flex items-start gap-2.5 text-xs text-[#594231]">
              <ShieldCheck size={16} className="text-[#465945] shrink-0 mt-0.5" />
              <span>
                <strong>Historical Data Guarantee:</strong> All past and upcoming appointments booked for this service remain completely valid and intact with their original prices and durations.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivatingService(null)}
              >
                Keep Active
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#8C4336] hover:bg-[#72362b] text-[#F4EBDD]"
                onClick={confirmDeactivation}
              >
                Confirm Deactivation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Create Service Modal
// =====================================================================

interface CreateServiceModalProps {
  business: Business;
  staff: Staff[];
  categories: string[];
  onClose: () => void;
  onSuccess: (srv: Service) => void;
}

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({
  business,
  staff,
  categories,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [customCategory, setCustomCategory] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(150);
  const [active, setActive] = useState(true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(staff.map((s) => s.id));
  
  // Industry-specific configuration
  const [isGroupClass, setIsGroupClass] = useState(business.industry === 'fitness');
  const [maxCapacity, setMaxCapacity] = useState(business.industry === 'fitness' ? 8 : 1);
  const [requiresResource, setRequiresResource] = useState(business.config.rules.requiresResourceAssignment);

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStaffToggle = (staffId: string) => {
    if (selectedStaffIds.includes(staffId)) {
      setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staffId));
    } else {
      setSelectedStaffIds([...selectedStaffIds, staffId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Service name is required.');
      return;
    }

    const finalCat = (customCategory.trim() || category).trim();
    if (!finalCat) {
      setValidationError('Category is required.');
      return;
    }

    if (price < 0 || isNaN(price)) {
      setValidationError('Price cannot be negative.');
      return;
    }

    if (durationMinutes <= 0 || isNaN(durationMinutes)) {
      setValidationError('Duration must be greater than zero minutes.');
      return;
    }

    if (maxCapacity < 1 || isNaN(maxCapacity)) {
      setValidationError('Capacity must be at least 1 person.');
      return;
    }

    const created = createService(
      {
        businessId: business.id,
        name: finalName,
        description: description.trim(),
        category: finalCat,
        durationMinutes: Number(durationMinutes),
        price: Number(price),
        maxCapacity: isGroupClass ? Number(maxCapacity) : 1,
        requiresResource,
        active,
      },
      selectedStaffIds
    );

    onSuccess(created);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#80664F] font-semibold block">
              {business.config.badge} Catalog
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Add New {business.config.terminology.service}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div role="alert" className="p-3 bg-[#8C4336]/15 border border-[#8C4336]/40 text-[#8C4336] rounded-xs text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Title"
            required
            placeholder="e.g. Master Botanical Hair Therapy"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              required
              placeholder="Detailed description of client experience, techniques, or expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="custom">+ New Category...</option>
              </select>
            </div>

            {category === 'custom' && (
              <div>
                <Input
                  label="New Category Name"
                  placeholder="e.g. Executive Series"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Duration (Minutes) *
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={50}>50 minutes</option>
                <option value={60}>60 minutes (1 hr)</option>
                <option value={75}>75 minutes (1 hr 15m)</option>
                <option value={90}>90 minutes (1.5 hrs)</option>
                <option value={120}>120 minutes (2 hrs)</option>
                <option value={240}>240 minutes (Half Day)</option>
                <option value={480}>480 minutes (Full Day)</option>
              </select>
            </div>

            <div>
              <Input
                label={`Price (${business.currency}) *`}
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Industry Configuration Specifics */}
          <div className="p-3 bg-[#EFE5D5]/60 rounded-xs border border-[#D8C3A5]/50 space-y-2.5">
            <span className="text-[10px] uppercase font-semibold text-[#80664F] tracking-wider block">
              Industry Specifics ({business.industry})
            </span>

            {business.industry === 'fitness' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGroupClass}
                    onChange={(e) => setIsGroupClass(e.target.checked)}
                    className="accent-[#30251E]"
                  />
                  <span>Group Athletic Class</span>
                </label>
                {isGroupClass && (
                  <Input
                    label="Max Class Capacity"
                    type="number"
                    min={1}
                    max={50}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  />
                )}
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresResource}
                  onChange={(e) => setRequiresResource(e.target.checked)}
                  className="accent-[#30251E]"
                />
                <span>Requires dedicated room / treatment suite / studio bay</span>
              </label>
            )}
          </div>

          {/* Specialist Eligibility */}
          {staff.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-2">
                Eligible {business.config.terminology.specialists}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#FAF6F0] border border-[#D8C3A5] rounded-xs">
                {staff.map((st) => {
                  const isChecked = selectedStaffIds.includes(st.id);
                  return (
                    <label key={st.id} className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer hover:bg-[#EFE5D5]/50 p-1 rounded-2xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleStaffToggle(st.id)}
                        className="accent-[#30251E]"
                      />
                      <span className="truncate">{st.name} ({st.title})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#30251E]"
              />
              <span>Active immediately in catalog</span>
            </label>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Create Service
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: Edit Service Modal
// =====================================================================

interface EditServiceModalProps {
  business: Business;
  service: Service;
  staff: Staff[];
  categories: string[];
  onClose: () => void;
  onSuccess: (srv: Service) => void;
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({
  business,
  service,
  staff,
  categories,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [category, setCategory] = useState(service.category);
  const [durationMinutes, setDurationMinutes] = useState(service.durationMinutes);
  const [price, setPrice] = useState(service.price);
  const [maxCapacity, setMaxCapacity] = useState(service.maxCapacity);
  const [requiresResource, setRequiresResource] = useState(service.requiresResource);
  const [active, setActive] = useState(service.active);

  const initialStaffIds = useMemo(() => {
    return staff.filter((s) => s.serviceIds?.includes(service.id)).map((s) => s.id);
  }, [staff, service.id]);

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(initialStaffIds);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStaffToggle = (staffId: string) => {
    if (selectedStaffIds.includes(staffId)) {
      setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staffId));
    } else {
      setSelectedStaffIds([...selectedStaffIds, staffId]);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalName = name.trim();
    if (!finalName) {
      setValidationError('Service name cannot be empty.');
      return;
    }

    if (price < 0 || isNaN(price)) {
      setValidationError('Price cannot be negative.');
      return;
    }

    if (durationMinutes <= 0 || isNaN(durationMinutes)) {
      setValidationError('Duration must be greater than zero.');
      return;
    }

    const updated: Service = {
      ...service,
      name: finalName,
      description: description.trim(),
      category: category.trim(),
      durationMinutes: Number(durationMinutes),
      price: Number(price),
      maxCapacity: Number(maxCapacity),
      requiresResource,
      active,
    };

    const ok = updateService(updated, selectedStaffIds);
    if (ok) {
      onSuccess(updated);
    } else {
      setValidationError('Failed to update service in storage.');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF6F0] border border-[#D8C3A5] rounded-sm max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D8C3A5] pb-3">
          <div>
            <span className="font-mono text-[10px] text-[#80664F] block">
              ID: {service.id}
            </span>
            <h2 className="font-editorial text-2xl font-semibold text-[#30251E]">
              Edit {business.config.terminology.service}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[#D8C3A5]/40 rounded-xs text-[#4A3B31]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {validationError && (
          <div role="alert" className="p-3 bg-[#8C4336]/15 border border-[#8C4336]/40 text-[#8C4336] rounded-xs text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Historical Price Preservation Assurance Banner */}
        <div className="p-3 bg-[#EFE5D5]/70 rounded-xs border border-[#D8C3A5]/60 flex items-start gap-2.5 text-xs text-[#594231]">
          <Info size={16} className="text-[#80664F] shrink-0 mt-0.5" />
          <span>
            <strong>Historical Integrity:</strong> Changing this price updates future bookings only. Existing appointments in the ledger will preserve their originally agreed price snapshot.
          </span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Service Title"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#FAF6F0] text-[#30251E] text-xs p-3 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] bg-[#FAF6F0] text-[#30251E] text-xs px-3 py-2 rounded-sm border border-[#D8C3A5] focus:border-[#B58A55] outline-none"
              />
            </div>

            <div>
              <Input
                label="Duration (Min) *"
                type="number"
                min={15}
                step={5}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>

            <div>
              <Input
                label={`Price (${business.currency}) *`}
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Industry attributes */}
          <div className="p-3 bg-[#EFE5D5]/50 rounded-xs border border-[#D8C3A5]/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#80664F] block mb-1">
                Capacity Limit
              </label>
              <input
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full min-h-[38px] bg-[#FAF6F0] text-[#30251E] px-2.5 py-1.5 rounded-sm border border-[#D8C3A5] text-xs outline-none"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer pt-3">
                <input
                  type="checkbox"
                  checked={requiresResource}
                  onChange={(e) => setRequiresResource(e.target.checked)}
                  className="accent-[#30251E]"
                />
                <span>Requires Resource / Suite</span>
              </label>
            </div>
          </div>

          {/* Specialist eligibility */}
          {staff.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#4A3B31] block mb-2">
                Eligible {business.config.terminology.specialists}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#FAF6F0] border border-[#D8C3A5] rounded-xs">
                {staff.map((st) => {
                  const isChecked = selectedStaffIds.includes(st.id);
                  return (
                    <label key={st.id} className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer hover:bg-[#EFE5D5]/50 p-1 rounded-2xs">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleStaffToggle(st.id)}
                        className="accent-[#30251E]"
                      />
                      <span className="truncate">{st.name} ({st.title})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#D8C3A5] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[#30251E] cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-[#30251E]"
              />
              <span>Active in public catalog</span>
            </label>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
