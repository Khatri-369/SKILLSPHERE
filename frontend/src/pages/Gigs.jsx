import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { searchGigs, clearGigErrors } from '../features/gigSlice';
import { applyToGig, fetchMyProposals, clearProposalErrors } from '../features/proposalSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Search, SlidersHorizontal, Briefcase, DollarSign, Calendar, Paperclip, Check } from 'lucide-react';

/**
 * Gigs Component
 * Renders the Gig Search and Browse workspace for freelancers.
 * Integrates search filter triggers and allows submitting proposals via a multi-part form modal.
 */
const Gigs = () => {
  const dispatch = useDispatch();
  const { gigs, loading: gigsLoading, error: gigsError } = useSelector((state) => state.gigs);
  const { loading: proposalLoading, error: proposalError, myProposals } = useSelector((state) => state.proposal);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [skills, setSkills] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Proposal modal & form states
  const [selectedGig, setSelectedGig] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFiles, setAttachmentFiles] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial gigs on mount
  useEffect(() => {
    dispatch(searchGigs({ status: 'Published' }));
    dispatch(fetchMyProposals());
    return () => {
      dispatch(clearGigErrors());
      dispatch(clearProposalErrors());
    };
  }, [dispatch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = { status: 'Published' };
    if (search) params.search = search;
    if (category) params.category = category;
    if (minBudget) params.minBudget = Number(minBudget);
    if (maxBudget) params.maxBudget = Number(maxBudget);
    if (skills) params.skills = skills;
    dispatch(searchGigs(params));
  };

  const handleOpenProposal = (gig) => {
    setSelectedGig(gig);
    setBidAmount(gig.budget);
    setEstimatedTime('');
    setDescription('');
    setAttachmentFiles(null);
    setSuccessMsg('');
    dispatch(clearProposalErrors());
  };

  const handleFileChange = (e) => {
    setAttachmentFiles(e.target.files);
  };

  const handleProposalSubmit = (e) => {
    e.preventDefault();
    if (!selectedGig) return;

    const formData = new FormData();
    formData.append('gigId', selectedGig._id);
    formData.append('bidAmount', Number(bidAmount));
    formData.append('estimatedTime', estimatedTime);
    formData.append('description', description);

    if (attachmentFiles) {
      for (let i = 0; i < attachmentFiles.length; i++) {
        formData.append('attachments', attachmentFiles[i]);
      }
    }

    dispatch(applyToGig(formData)).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        setSuccessMsg('Proposal submitted successfully!');
        setTimeout(() => {
          setSelectedGig(null);
          setSuccessMsg('');
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Search */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Search Opportunities</h2>
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <Search className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="Search by keywords or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all font-semibold"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-2xl"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Button type="submit" variant="primary" className="px-8 rounded-2xl">
              Search
            </Button>
          </div>

          {/* Advanced filters toggled */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 animate-fade-in">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-darkBg border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Design">Design</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Writing">Writing</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-1.5">Skills (comma separated)</label>
                <Input
                  type="text"
                  placeholder="e.g. React, Node"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="rounded-xl py-2"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-1.5">Min Budget (₹)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="rounded-xl py-2"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-1.5">Max Budget (₹)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="rounded-xl py-2"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Main Results Listing */}
      {gigsLoading ? (
        <LoadingSpinner size="large" className="py-20" />
      ) : gigsError ? (
        <div className="glass-panel p-8 text-center text-red-400 rounded-3xl font-semibold border border-red-500/20">
          Failed to load gigs: {gigsError}
        </div>
      ) : gigs.filter((gig) => {
        const alreadyApplied = myProposals?.some((p) => {
          const pGigId = typeof p.gig === 'object' ? p.gig?._id : p.gig;
          return pGigId === gig._id && p.status !== 'Withdrawn';
        });
        return !alreadyApplied;
      }).length === 0 ? (
        <div className="glass-panel p-12 text-center text-gray-400 rounded-3xl">
          No published gigs match your current criteria. Adjust filters or check back later!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gigs
            .filter((gig) => {
              const alreadyApplied = myProposals?.some((p) => {
                const pGigId = typeof p.gig === 'object' ? p.gig?._id : p.gig;
                return pGigId === gig._id && p.status !== 'Withdrawn';
              });
              return !alreadyApplied;
            })
            .map((gig) => {
              return (
                <div key={gig._id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-black text-white line-clamp-1">{gig.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge status="info">{gig.category}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-3">{gig.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {gig.skillsRequired?.map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white/5 border border-white/5 text-gray-400 text-3xs rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-glassBorder flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center text-emerald-400 text-sm font-black">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ₹{gig.budget}
                      </div>
                      <div className="flex items-center text-gray-400 text-xs font-semibold">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(gig.deadline).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="primary" size="small" onClick={() => handleOpenProposal(gig)} className="rounded-xl">
                      Apply Now
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Submission Modal */}
      {selectedGig && (
        <Modal isOpen={!!selectedGig} onClose={() => setSelectedGig(null)} title={`Apply: ${selectedGig.title}`}>
          {successMsg ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-emerald-400">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <Check className="h-8 w-8" />
              </div>
              <p className="font-extrabold text-lg text-white">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleProposalSubmit} className="space-y-6">
              {proposalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold">
                  {proposalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Bid Amount (₹)</label>
                  <Input
                    type="number"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Est. Time Frame</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. 2 weeks, 1 month"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2">Proposal Cover Letter</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Explain why you are the best match for this gig..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                  <Paperclip className="h-4 w-4" />
                  Supporting Attachments (Resume, Portfolio PDF, etc.)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 file:cursor-pointer cursor-pointer bg-white/5 p-2 rounded-xl border border-white/10"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-glassBorder">
                <Button type="button" variant="secondary" onClick={() => setSelectedGig(null)} className="w-1/2 rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={proposalLoading} className="w-1/2 rounded-xl">
                  Submit Proposal
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Gigs;
