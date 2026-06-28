import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyGigs, createGig, editGig, deleteGig, publishGig, closeGig, clearGigErrors } from '../features/gigSlice';
import { fetchProposalsForGig, acceptProposal, rejectProposal, negotiateProposal, clearProposalErrors } from '../features/proposalSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  XCircle,
  Eye,
  ArrowLeft,
  Briefcase,
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  CheckCircle2,
  X,
  MessageSquare,
  Clock,
  User,
} from 'lucide-react';

const CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'Design',
  'Writing',
  'Marketing',
  'Data Science',
  'Video & Animation',
  'Music & Audio',
  'Other',
];

/**
 * ClientGigs — Full gig management page for Client users.
 * Provides gig CRUD operations and proposal review/management.
 */
const ClientGigs = () => {
  const dispatch = useDispatch();
  const { gigs, loading: gigsLoading, error: gigsError } = useSelector((state) => state.gigs);
  const { proposals, loading: proposalLoading, error: proposalError } = useSelector((state) => state.proposal);

  // View state
  const [view, setView] = useState('list'); // 'list' | 'proposals'
  const [selectedGig, setSelectedGig] = useState(null);

  // Create/Edit modal
  const [showGigModal, setShowGigModal] = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [gigForm, setGigForm] = useState({
    title: '',
    description: '',
    budget: '',
    category: 'Web Development',
    location: 'Remote',
    deadline: '',
    skillsRequired: '',
  });

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Negotiate modal
  const [negotiateTarget, setNegotiateTarget] = useState(null);
  const [negotiateForm, setNegotiateForm] = useState({
    counterBidAmount: '',
    counterTime: '',
    clientNotes: '',
  });

  // Success flash
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load gigs on mount ──
  useEffect(() => {
    dispatch(fetchMyGigs());
    return () => {
      dispatch(clearGigErrors());
      dispatch(clearProposalErrors());
    };
  }, [dispatch]);

  // ── Flash helper ──
  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // ── Gig Form Handlers ──
  const openCreateModal = () => {
    setEditingGig(null);
    setGigForm({
      title: '',
      description: '',
      budget: '',
      category: 'Web Development',
      location: 'Remote',
      deadline: '',
      skillsRequired: '',
    });
    setShowGigModal(true);
  };

  const openEditModal = (gig) => {
    setEditingGig(gig);
    setGigForm({
      title: gig.title || '',
      description: gig.description || '',
      budget: gig.budget || '',
      category: gig.category || 'Web Development',
      location: gig.location || 'Remote',
      deadline: gig.deadline ? new Date(gig.deadline).toISOString().split('T')[0] : '',
      skillsRequired: gig.skillsRequired ? gig.skillsRequired.join(', ') : '',
    });
    setShowGigModal(true);
  };

  const handleGigFormChange = (e) => {
    setGigForm({ ...gigForm, [e.target.name]: e.target.value });
  };

  const handleGigSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearGigErrors());

    const formData = new FormData();
    formData.append('title', gigForm.title);
    formData.append('description', gigForm.description);
    formData.append('budget', Number(gigForm.budget));
    formData.append('category', gigForm.category);
    formData.append('location', gigForm.location);
    formData.append('deadline', gigForm.deadline);
    if (gigForm.skillsRequired.trim()) {
      formData.append('skillsRequired', gigForm.skillsRequired);
    }

    let result;
    if (editingGig) {
      result = await dispatch(editGig({ gigId: editingGig._id, gigData: formData }));
    } else {
      result = await dispatch(createGig(formData));
    }

    if (result.meta.requestStatus === 'fulfilled') {
      setShowGigModal(false);
      dispatch(fetchMyGigs());
      flash(editingGig ? 'Gig updated successfully!' : 'Gig created successfully!');
    }
  };

  // ── Gig Action Handlers ──
  const handlePublish = async (gigId) => {
    const result = await dispatch(publishGig(gigId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchMyGigs());
      flash('Gig published!');
    }
  };

  const handleClose = async (gigId) => {
    const result = await dispatch(closeGig(gigId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchMyGigs());
      flash('Gig closed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const result = await dispatch(deleteGig(deleteTargetId));
    if (result.meta.requestStatus === 'fulfilled') {
      setDeleteTargetId(null);
      dispatch(fetchMyGigs());
      flash('Gig deleted.');
    }
  };

  // ── Proposal View ──
  const openProposals = (gig) => {
    setSelectedGig(gig);
    setView('proposals');
    dispatch(fetchProposalsForGig(gig._id));
  };

  const backToList = () => {
    setView('list');
    setSelectedGig(null);
    dispatch(clearProposalErrors());
  };

  // ── Proposal Action Handlers ──
  const handleAccept = async (proposalId) => {
    const result = await dispatch(acceptProposal(proposalId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchProposalsForGig(selectedGig._id));
      flash('Proposal accepted!');
    }
  };

  const handleReject = async (proposalId) => {
    const result = await dispatch(rejectProposal(proposalId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchProposalsForGig(selectedGig._id));
      flash('Proposal rejected.');
    }
  };

  const openNegotiateModal = (proposal) => {
    setNegotiateTarget(proposal);
    setNegotiateForm({
      counterBidAmount: proposal.bidAmount || '',
      counterTime: proposal.estimatedTime || '',
      clientNotes: '',
    });
  };

  const handleNegotiateSubmit = async (e) => {
    e.preventDefault();
    if (!negotiateTarget) return;
    const result = await dispatch(
      negotiateProposal({
        proposalId: negotiateTarget._id,
        negotiationData: {
          counterBidAmount: Number(negotiateForm.counterBidAmount),
          counterTime: negotiateForm.counterTime,
          clientNotes: negotiateForm.clientNotes,
        },
      })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      setNegotiateTarget(null);
      dispatch(fetchProposalsForGig(selectedGig._id));
      flash('Counter-offer sent!');
    }
  };

  // ── Helpers ──
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ═══════════════════════════════════════════
  // PROPOSALS VIEW
  // ═══════════════════════════════════════════
  if (view === 'proposals' && selectedGig) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Success flash */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-semibold text-center">
            {successMsg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center space-x-4">
          <button onClick={backToList} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{selectedGig.title}</h2>
            <p className="text-xs text-gray-500">
              Proposals received · Budget: ₹{selectedGig.budget} · <Badge status={selectedGig.status}>{selectedGig.status}</Badge>
            </p>
          </div>
        </div>

        {proposalLoading && <LoadingSpinner size="large" className="min-h-[30vh]" />}
        {proposalError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{proposalError}</div>
        )}

        {!proposalLoading && proposals.length === 0 && (
          <div className="glass-panel p-10 text-center rounded-2xl">
            <User className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No proposals received for this gig yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {proposals.map((p) => (
            <div key={p._id} className="glass-panel rounded-2xl p-5 space-y-3 border border-glassBorder hover:border-white/10 transition-all">
              {/* Freelancer info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {p.freelancer?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.freelancer?.name}</p>
                    <p className="text-2xs text-gray-500 truncate">{p.freelancer?.email}</p>
                  </div>
                </div>
                <Badge status={p.status}>{p.status}</Badge>
              </div>

              {/* Bid details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 text-sm">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-gray-300">Bid: <span className="text-white font-bold">₹{p.bidAmount}</span></span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">Delivery: <span className="text-white font-medium">{p.estimatedTime}</span></span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed bg-white/2 p-3 rounded-xl">{p.description}</p>

              {/* Negotiation info */}
              {p.status === 'Negotiating' && p.negotiation && (
                <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-purple-400">Counter-offer sent</p>
                  <p className="text-gray-400">Amount: ₹{p.negotiation.counterBidAmount} · Time: {p.negotiation.counterTime}</p>
                  {p.negotiation.clientNotes && <p className="text-gray-500 italic">"{p.negotiation.clientNotes}"</p>}
                </div>
              )}

              {/* Actions */}
              {(p.status === 'Pending' || p.status === 'Negotiating') && (
                <div className="flex items-center space-x-2 pt-1">
                  <Button variant="success" className="text-xs py-1.5 px-3" onClick={() => handleAccept(p._id)} disabled={proposalLoading}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button variant="danger" className="text-xs py-1.5 px-3" onClick={() => handleReject(p._id)} disabled={proposalLoading}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                  {p.status === 'Pending' && (
                    <Button variant="secondary" className="text-xs py-1.5 px-3" onClick={() => openNegotiateModal(p)} disabled={proposalLoading}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Negotiate
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Negotiate Modal */}
        <Modal isOpen={!!negotiateTarget} onClose={() => setNegotiateTarget(null)} title="Send Counter-Offer">
          <form onSubmit={handleNegotiateSubmit} className="space-y-4">
            <Input
              label="Counter Bid Amount (₹)"
              type="number"
              name="counterBidAmount"
              value={negotiateForm.counterBidAmount}
              onChange={(e) => setNegotiateForm({ ...negotiateForm, counterBidAmount: e.target.value })}
              required
            />
            <Input
              label="Counter Delivery Time"
              name="counterTime"
              value={negotiateForm.counterTime}
              onChange={(e) => setNegotiateForm({ ...negotiateForm, counterTime: e.target.value })}
              placeholder="e.g. 7 days"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes (optional)</label>
              <textarea
                name="clientNotes"
                value={negotiateForm.clientNotes}
                onChange={(e) => setNegotiateForm({ ...negotiateForm, clientNotes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm glass-input placeholder-gray-500 font-medium transition-all resize-none"
                placeholder="Explain your counter-offer..."
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={proposalLoading}>
              {proposalLoading ? 'Sending...' : 'Send Counter-Offer'}
            </Button>
          </form>
        </Modal>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // GIGS LIST VIEW (default)
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success flash */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-semibold text-center">
          {successMsg}
        </div>
      )}

      {/* Error banner */}
      {gigsError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{gigsError}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">My Gigs</h2>
          <p className="text-xs text-gray-500 mt-0.5">{gigs.length} gig{gigs.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="text-xs">
          <Plus className="h-4 w-4 mr-1.5" /> Create New Gig
        </Button>
      </div>

      {gigsLoading && <LoadingSpinner size="large" className="min-h-[30vh]" />}

      {!gigsLoading && gigs.length === 0 && (
        <div className="glass-panel p-12 text-center rounded-3xl">
          <Briefcase className="h-12 w-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-md font-bold text-white mb-1">No Gigs Yet</h3>
          <p className="text-sm text-gray-400 mb-6">Create your first gig to start hiring talented freelancers.</p>
          <Button variant="primary" onClick={openCreateModal} className="mx-auto">
            <Plus className="h-4 w-4 mr-1.5" /> Create Your First Gig
          </Button>
        </div>
      )}

      {/* Gig Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gigs.map((gig) => (
          <div key={gig._id} className="glass-panel rounded-2xl p-5 space-y-4 border border-glassBorder hover:border-white/10 transition-all group">
            {/* Title + Status */}
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-bold text-white leading-snug flex-1 mr-3 group-hover:text-blue-300 transition-colors">{gig.title}</h3>
              <Badge status={gig.status}>{gig.status}</Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{gig.description}</p>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                <span>₹{gig.budget}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Tag className="h-3.5 w-3.5 text-blue-400" />
                <span>{gig.category}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>{formatDate(gig.deadline)}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-purple-400" />
                <span>{gig.location || 'Remote'}</span>
              </div>
            </div>

            {/* Skills */}
            {gig.skillsRequired && gig.skillsRequired.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {gig.skillsRequired.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-2xs text-gray-400 border border-white/5">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-glassBorder">
              {gig.status === 'Published' && (
                <Button variant="secondary" className="text-2xs py-1.5 px-2.5" onClick={() => openProposals(gig)}>
                  <Eye className="h-3 w-3 mr-1" /> Proposals
                </Button>
              )}
              {gig.status === 'Draft' && (
                <Button variant="success" className="text-2xs py-1.5 px-2.5" onClick={() => handlePublish(gig._id)} disabled={gigsLoading}>
                  <Send className="h-3 w-3 mr-1" /> Publish
                </Button>
              )}
              {gig.status === 'Published' && (
                <Button variant="danger" className="text-2xs py-1.5 px-2.5" onClick={() => handleClose(gig._id)} disabled={gigsLoading}>
                  <XCircle className="h-3 w-3 mr-1" /> Close
                </Button>
              )}
              {(gig.status === 'Draft' || gig.status === 'Published') && (
                <Button variant="secondary" className="text-2xs py-1.5 px-2.5" onClick={() => openEditModal(gig)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              )}
              <Button variant="danger" className="text-2xs py-1.5 px-2.5" onClick={() => setDeleteTargetId(gig._id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create / Edit Gig Modal ── */}
      <Modal isOpen={showGigModal} onClose={() => setShowGigModal(false)} title={editingGig ? 'Edit Gig' : 'Create New Gig'}>
        <form onSubmit={handleGigSubmit} className="space-y-4">
          <Input
            label="Title"
            name="title"
            value={gigForm.title}
            onChange={handleGigFormChange}
            placeholder="e.g. Build a responsive e-commerce website"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={gigForm.description}
              onChange={handleGigFormChange}
              rows={4}
              required
              className="w-full px-4 py-3 rounded-xl text-sm glass-input placeholder-gray-500 font-medium transition-all resize-none"
              placeholder="Describe the project scope, deliverables, and expectations..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget (₹)"
              type="number"
              name="budget"
              value={gigForm.budget}
              onChange={handleGigFormChange}
              placeholder="5000"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={gigForm.category}
                onChange={handleGigFormChange}
                className="w-full px-4 py-3 rounded-xl text-sm glass-input font-medium transition-all cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-gray-900 text-white">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Location"
              name="location"
              value={gigForm.location}
              onChange={handleGigFormChange}
              placeholder="Remote"
            />
            <Input
              label="Deadline"
              type="date"
              name="deadline"
              value={gigForm.deadline}
              onChange={handleGigFormChange}
              required
            />
          </div>

          <Input
            label="Skills Required"
            name="skillsRequired"
            value={gigForm.skillsRequired}
            onChange={handleGigFormChange}
            placeholder="React, Node.js, MongoDB (comma separated)"
          />

          {gigsError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs">{gigsError}</div>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={gigsLoading}>
            {gigsLoading ? 'Saving...' : editingGig ? 'Save Changes' : 'Create Gig'}
          </Button>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal isOpen={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} title="Confirm Delete">
        <div className="space-y-4 text-center">
          <Trash2 className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-sm text-gray-300">Are you sure you want to permanently delete this gig? This action cannot be undone.</p>
          <div className="flex items-center justify-center space-x-3">
            <Button variant="secondary" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={gigsLoading}>
              {gigsLoading ? 'Deleting...' : 'Delete Gig'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClientGigs;
