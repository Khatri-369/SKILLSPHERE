import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyProposals, respondToNegotiation, withdrawProposal, clearProposalErrors } from '../features/proposalSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Briefcase, DollarSign, Clock, AlertCircle, FileText, Check, X, Ban } from 'lucide-react';

/**
 * FreelancerProposals Component
 * Renders the proposals list submitted by the logged-in freelancer.
 * Supports reviewing counter-offers from clients and withdrawing active applications.
 */
const FreelancerProposals = () => {
  const dispatch = useDispatch();
  const { myProposals, loading, error } = useSelector((state) => state.proposal);
  const [selectedProposal, setSelectedProposal] = useState(null);

  useEffect(() => {
    dispatch(fetchMyProposals());
    return () => {
      dispatch(clearProposalErrors());
    };
  }, [dispatch]);

  const handleNegotiationResponse = (proposalId, action) => {
    dispatch(respondToNegotiation({ proposalId, action })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        // Refresh local details if modal is open
        if (selectedProposal && selectedProposal._id === proposalId) {
          setSelectedProposal(res.payload.data);
        }
        dispatch(fetchMyProposals());
      }
    });
  };

  const handleWithdraw = (proposalId) => {
    if (window.confirm('Are you sure you want to withdraw this proposal?')) {
      dispatch(withdrawProposal(proposalId)).then((res) => {
        if (res.meta.requestStatus === 'fulfilled') {
          if (selectedProposal && selectedProposal._id === proposalId) {
            setSelectedProposal(res.payload.data);
          }
          dispatch(fetchMyProposals());
        }
      });
    }
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
      ) : myProposals.length === 0 ? (
        <div className="glass-panel p-12 text-center text-gray-400 rounded-3xl">
          You haven't submitted any proposals yet. Check Search Gigs to apply!
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
                {myProposals.map((proposal) => (
                  <tr key={proposal._id} className="hover:bg-white/5 transition-all">
                    <td className="p-4">
                      <div className="font-extrabold text-white">{proposal.gig?.title || 'Unknown Gig'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{proposal.gig?.category}</div>
                    </td>
                    <td className="p-4 text-emerald-400 font-bold">₹{proposal.bidAmount}</td>
                    <td className="p-4 text-gray-300 font-semibold">{proposal.estimatedTime}</td>
                    <td className="p-4">
                      <Badge status={getStatusStyle(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setSelectedProposal(proposal)}
                        className="rounded-xl"
                      >
                        Details
                      </Button>
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
          onClose={() => setSelectedProposal(null)}
          title={`Proposal details: ${selectedProposal.gig?.title}`}
        >
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

            {/* Actions for Pending proposals */}
            {selectedProposal.status === 'Pending' && (
              <div className="pt-4 border-t border-glassBorder">
                <Button
                  variant="secondary"
                  onClick={() => handleWithdraw(selectedProposal._id)}
                  className="w-full rounded-xl flex items-center justify-center gap-1.5 text-red-400 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/40"
                >
                  <Ban className="h-4 w-4" /> Withdraw Application
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedProposal(null)} className="rounded-xl px-6">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FreelancerProposals;
