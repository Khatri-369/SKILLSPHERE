import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyProposals, respondToNegotiation, withdrawProposal, updateProposal, clearProposalErrors } from '../features/proposalSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Briefcase, DollarSign, Clock, AlertCircle, FileText, Check, X, Ban, Edit } from 'lucide-react';

/**
 * FreelancerProposals Component
 * Renders the proposals list submitted by the logged-in freelancer.
 * Supports reviewing counter-offers from clients and withdrawing active applications.
 */
const FreelancerProposals = () => {
  const dispatch = useDispatch();
  const { myProposals, loading, error } = useSelector((state) => state.proposal);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editBidAmount, setEditBidAmount] = useState('');
  const [editEstimatedTime, setEditEstimatedTime] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [confirmWithdrawId, setConfirmWithdrawId] = useState(null);

  useEffect(() => {
    dispatch(fetchMyProposals());
    return () => {
      dispatch(clearProposalErrors());
    };
  }, [dispatch]);

  const handleStartEdit = (proposal) => {
    setIsEditing(true);
    setEditBidAmount(proposal.bidAmount);
    setEditEstimatedTime(proposal.estimatedTime);
    setEditDescription(proposal.description);
    setEditSuccessMsg('');
  };

  const handleCloseModal = () => {
    setSelectedProposal(null);
    setIsEditing(false);
    setEditSuccessMsg('');
    setConfirmWithdrawId(null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedProposal) return;

    const formData = new FormData();
    formData.append('bidAmount', Number(editBidAmount));
    formData.append('estimatedTime', editEstimatedTime);
    formData.append('description', editDescription);

    dispatch(updateProposal({ proposalId: selectedProposal._id, formData })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        setEditSuccessMsg('Proposal updated successfully!');
        // Update local selected proposal reference
        setSelectedProposal(res.payload);
        dispatch(fetchMyProposals());
        setTimeout(() => {
          setIsEditing(false);
          setEditSuccessMsg('');
        }, 1500);
      }
    });
  };

  const handleNegotiationResponse = (proposalId, action) => {
    dispatch(respondToNegotiation({ proposalId, action })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        // Refresh local details if modal is open
        if (selectedProposal && selectedProposal._id === proposalId) {
          setSelectedProposal(res.payload);
        }
        dispatch(fetchMyProposals());
      }
    });
  };

  const executeWithdraw = (proposalId) => {
    dispatch(withdrawProposal(proposalId)).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        if (selectedProposal && selectedProposal._id === proposalId) {
          setSelectedProposal(res.payload);
        }
        setConfirmWithdrawId(null);
        dispatch(fetchMyProposals());
      }
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Accepted':
        return 'accepted';
      case 'Rejected':
        return 'closed';
      case 'Negotiating':
        return 'warning';
      case 'Withdrawn':
        return 'closed';
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass-panel p-8 rounded-3xl space-y-4">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">My Submitted Proposals</h2>
        <p className="text-sm text-gray-400">Track application statuses, view negotiations, and confirm contracts.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="large" className="py-16" />
      ) : myProposals.filter((p) => p.status !== 'Withdrawn').length === 0 ? (
        <div className="glass-panel p-12 text-center text-gray-400 rounded-3xl">
          You haven't submitted any active proposals yet. Check Search Gigs to apply!
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-2xl border border-glassBorder">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-glassBorder text-2xs uppercase tracking-wider text-gray-400 font-bold">
                  <th className="p-4">Project / Gig</th>
                  <th className="p-4">Bid Amount</th>
                  <th className="p-4">Delivery Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glassBorder text-sm">
                {myProposals
                  .filter((p) => p.status !== 'Withdrawn')
                  .map((proposal) => (
                    <tr key={proposal._id} className="hover:bg-white/5 transition-all">
                    <td className="p-4">
                      <div className="font-extrabold text-white">{proposal.gig?.title || 'Unknown Gig'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{proposal.gig?.category}</div>
                      {proposal.status === 'Negotiating' && proposal.negotiation && (
                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1 text-left max-w-xs">
                          <span className="text-amber-400 font-extrabold block">⚠️ Counter-Offer Received</span>
                          <span className="text-gray-300 block">Proposed Rate: <span className="text-emerald-400 font-bold">₹{proposal.negotiation.counterBidAmount}</span></span>
                          <span className="text-gray-300 block">Delivery Time: <span className="text-white font-semibold">{proposal.negotiation.counterTime}</span></span>
                          {proposal.negotiation.clientNotes && (
                            <span className="text-gray-400 italic block truncate">"{proposal.negotiation.clientNotes}"</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-emerald-400 font-bold">₹{proposal.bidAmount}</td>
                    <td className="p-4 text-gray-300 font-semibold">{proposal.estimatedTime}</td>
                    <td className="p-4">
                      <Badge status={proposal.status === 'Negotiating' ? 'negotiating' : getStatusStyle(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {proposal.status === 'Negotiating' && (
                          <>
                            <Button
                              variant="success"
                              size="small"
                              onClick={() => handleNegotiationResponse(proposal._id, 'accept')}
                              className="rounded-xl px-3 py-1.5 text-xs font-bold"
                            >
                              Accept Terms
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              onClick={() => handleNegotiationResponse(proposal._id, 'reject')}
                              className="rounded-xl px-3 py-1.5 text-xs font-bold"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {proposal.status === 'Pending' && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => {
                              setSelectedProposal(proposal);
                              handleStartEdit(proposal);
                            }}
                            className="rounded-xl flex items-center gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setSelectedProposal(proposal)}
                          className="rounded-xl"
                        >
                          Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <Modal
          isOpen={!!selectedProposal}
          onClose={handleCloseModal}
          title={isEditing ? `Edit Proposal: ${selectedProposal.gig?.title}` : `Proposal details: ${selectedProposal.gig?.title}`}
        >
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-6 animate-fade-in">
              {editSuccessMsg ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-3 text-emerald-400">
                  <div className="p-3 bg-emerald-500/10 rounded-full">
                    <Check className="h-8 w-8" />
                  </div>
                  <p className="font-extrabold text-lg text-white">{editSuccessMsg}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Bid Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={editBidAmount}
                        onChange={(e) => setEditBidAmount(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Est. Time Frame</label>
                      <input
                        type="text"
                        required
                        value={editEstimatedTime}
                        onChange={(e) => setEditEstimatedTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Cover Letter</label>
                    <textarea
                      required
                      rows="4"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-all text-sm font-semibold"
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-glassBorder">
                    <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} className="w-1/2 rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="w-1/2 rounded-xl">
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-3xs uppercase tracking-wider text-gray-500 font-extrabold block">My Bid</span>
                  <span className="text-md font-black text-emerald-400 flex items-center mt-1">
                    <DollarSign className="h-4 w-4" /> ₹{selectedProposal.bidAmount}
                  </span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <span className="text-3xs uppercase tracking-wider text-gray-500 font-extrabold block">Estimated Delivery</span>
                  <span className="text-md font-black text-white flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1 text-gray-400" /> {selectedProposal.estimatedTime}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-2xs uppercase tracking-wider text-gray-500 font-bold block">Cover Letter Summary</span>
                <p className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-wrap font-medium leading-relaxed">
                  {selectedProposal.description}
                </p>
              </div>

              {selectedProposal.attachments?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-2xs uppercase tracking-wider text-gray-500 font-bold block">Attachments</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedProposal.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-blue-400 flex items-center gap-1 transition-all"
                      >
                        <FileText className="h-4 w-4" /> Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Negotiation Block */}
              {selectedProposal.status === 'Negotiating' && selectedProposal.negotiation && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl space-y-4">
                  <h4 className="text-amber-400 font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-5 w-5" /> Client Counter Terms
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 block font-bold">Proposed Rate:</span>
                      <span className="text-md font-black text-emerald-400">₹{selectedProposal.negotiation.counterBidAmount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-bold">Proposed Delivery:</span>
                      <span className="text-md font-black text-white">{selectedProposal.negotiation.counterTime}</span>
                    </div>
                  </div>
                  {selectedProposal.negotiation.clientNotes && (
                    <div className="text-xs">
                      <span className="text-gray-400 block font-bold mb-1">Client Feedback/Notes:</span>
                      <p className="text-gray-300 italic">{selectedProposal.negotiation.clientNotes}</p>
                    </div>
                  )}
                  {selectedProposal.negotiation.initiatedBy === 'Client' && (
                    <div className="flex gap-4 pt-2">
                      <Button
                        variant="primary"
                        onClick={() => handleNegotiationResponse(selectedProposal._id, 'accept')}
                        className="w-1/2 rounded-xl flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="h-4 w-4" /> Accept Terms
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleNegotiationResponse(selectedProposal._id, 'reject')}
                        className="w-1/2 rounded-xl flex items-center justify-center gap-1"
                      >
                        <X className="h-4 w-4" /> Reject Terms
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions for Pending/Negotiating proposals */}
              {(selectedProposal.status === 'Pending' || selectedProposal.status === 'Negotiating') && (
                <div className="pt-4 border-t border-glassBorder flex gap-4">
                  <Button
                    variant="primary"
                    onClick={() => handleStartEdit(selectedProposal)}
                    className={`rounded-xl flex items-center justify-center gap-1.5 ${
                      selectedProposal.status === 'Pending' ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    <Edit className="h-4 w-4" /> Edit Proposal
                  </Button>
                  {selectedProposal.status === 'Pending' && (
                    <>
                      {confirmWithdrawId === selectedProposal._id ? (
                        <div className="w-1/2 flex gap-2 animate-fade-in">
                          <Button
                            variant="primary"
                            onClick={() => executeWithdraw(selectedProposal._id)}
                            className="w-1/2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmWithdrawId(null)}
                            className="w-1/2 rounded-xl text-xs font-bold"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => setConfirmWithdrawId(selectedProposal._id)}
                          className="w-1/2 rounded-xl flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/40"
                        >
                          <Ban className="h-4 w-4" /> Withdraw Application
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="secondary" onClick={handleCloseModal} className="rounded-xl px-6">
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default FreelancerProposals;
