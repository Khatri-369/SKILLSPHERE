import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfileMe, createProfile, updateProfile, clearProfileErrors } from '../features/profileSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { User, DollarSign, Award, BookOpen, Clock, Globe, Plus, Trash2, CheckCircle2 } from 'lucide-react';

/**
 * MyProfile Component
 * Renders the profile page for freelancers. Allows editing the bio/rates/skills
 * and managing their professional experience timeline.
 */
const MyProfile = () => {
  const dispatch = useDispatch();
  const { myProfile, loading, error } = useSelector((state) => state.profile);

  // Form states
  const [skills, setSkills] = useState('');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [hourlyRate, setHourlyRate] = useState('');
  const [availability, setAvailability] = useState('Available');
  const [certificates, setCertificates] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [languages, setLanguages] = useState('');
  const [experienceTimeline, setExperienceTimeline] = useState([]);

  // New experience entry state
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpDuration, setNewExpDuration] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    dispatch(fetchProfileMe());
    return () => {
      dispatch(clearProfileErrors());
    };
  }, [dispatch]);

  // Load existing profile details into form state
  useEffect(() => {
    if (myProfile) {
      setSkills(myProfile.skills?.join(', ') || '');
      setSkillLevel(myProfile.skillLevel || 'Intermediate');
      setHourlyRate(myProfile.hourlyRate || '');
      setAvailability(myProfile.availability || 'Available');
      setCertificates(myProfile.certificates?.join(', ') || '');
      setPortfolio(myProfile.portfolio?.join(', ') || '');
      setLanguages(myProfile.languages?.join(', ') || '');
      setExperienceTimeline(myProfile.experienceTimeline || []);
    }
  }, [myProfile]);

  const handleAddExperience = (e) => {
    e.preventDefault();
    if (!newExpTitle || !newExpCompany || !newExpDuration) return;

    const newExp = {
      title: newExpTitle,
      company: newExpCompany,
      duration: newExpDuration,
      description: newExpDesc,
    };

    setExperienceTimeline([...experienceTimeline, newExp]);
    setNewExpTitle('');
    setNewExpCompany('');
    setNewExpDuration('');
    setNewExpDesc('');
  };

  const handleRemoveExperience = (index) => {
    setExperienceTimeline(experienceTimeline.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedData = {
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      skillLevel,
      hourlyRate: Number(hourlyRate),
      availability,
      certificates: certificates.split(',').map((c) => c.trim()).filter(Boolean),
      portfolio: portfolio.split(',').map((p) => p.trim()).filter(Boolean),
      languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
      experienceTimeline,
    };

    const action = myProfile ? updateProfile(formattedData) : createProfile(formattedData);
    dispatch(action).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    });
  };

  if (loading && !myProfile) {
    return <LoadingSpinner size="large" className="min-h-[50vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Freelancer Profile</h2>
            <p className="text-sm text-gray-400">Configure your public metadata, hourly rate, and portfolio details.</p>
          </div>
          {myProfile?.verificationBadge && (
            <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-sm bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-4.5 w-4.5" /> Verified
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
            Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Hourly Rate (₹/hr)
              </label>
              <Input
                type="number"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. 500"
              />
            </div>

            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Experience Level
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> Languages (comma separated)
              </label>
              <Input
                type="text"
                placeholder="e.g. English, Hindi, Spanish"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> Core Skills (comma separated)
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. React, Redux, Node.js, TailwindCSS"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Certificates (comma separated links)
              </label>
              <Input
                type="text"
                placeholder="e.g. AWS Certified, Scrum Master"
                value={certificates}
                onChange={(e) => setCertificates(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="block text-2xs uppercase tracking-wider text-gray-500 font-bold mb-2 flex items-center gap-1">
                Portfolio Links (comma separated URLs)
              </label>
              <Input
                type="text"
                placeholder="e.g. github.com/user, user.dev"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Experience Timeline Management */}
          <div className="space-y-4 pt-4 border-t border-glassBorder">
            <h3 className="text-md font-extrabold text-white uppercase tracking-wider">Experience Timeline</h3>

            {/* List of existing experiences */}
            {experienceTimeline.length === 0 ? (
              <p className="text-sm text-gray-500">No experiences listed. Add one below!</p>
            ) : (
              <div className="space-y-3">
                {experienceTimeline.map((exp, idx) => (
                  <div key={idx} className="flex justify-between items-start bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-sm font-extrabold text-white">{exp.title}</h4>
                      <p className="text-xs text-gray-400 font-bold">{exp.company} &bull; {exp.duration}</p>
                      {exp.description && <p className="text-xs text-gray-500 mt-1">{exp.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(idx)}
                      className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-gray-500 transition-all"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add experience form box */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
              <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Add Experience Entry</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="text"
                  placeholder="Job Title (e.g. Senior Architect)"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="rounded-xl py-2"
                />
                <Input
                  type="text"
                  placeholder="Company Name (e.g. Google)"
                  value={newExpCompany}
                  onChange={(e) => setNewExpCompany(e.target.value)}
                  className="rounded-xl py-2"
                />
                <Input
                  type="text"
                  placeholder="Duration (e.g. 2 years)"
                  value={newExpDuration}
                  onChange={(e) => setNewExpDuration(e.target.value)}
                  className="rounded-xl py-2"
                />
              </div>
              <textarea
                placeholder="Description of work performed..."
                value={newExpDesc}
                onChange={(e) => setNewExpDesc(e.target.value)}
                rows="2"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-xs font-semibold"
              />
              <Button type="button" variant="secondary" onClick={handleAddExperience} className="flex items-center gap-1 text-xs py-1.5 px-3 rounded-lg">
                <Plus className="h-4 w-4" /> Add to Timeline
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-glassBorder flex justify-end">
            <Button type="submit" variant="primary" loading={loading} className="px-8 rounded-xl">
              Save Profile Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyProfile;
