import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../features/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Client',
  });
  const { loading, error, message } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser(formData)).unwrap().then(() => {
      // Clear forms
      setFormData({ name: '', email: '', password: '', role: 'Client' });
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white tracking-wider">JOIN SKILLSPHERE</h2>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Create a new account</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center animate-fade-in">
          {error}
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium text-center animate-fade-in">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
        />

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 6 characters"
          required
        />

        {/* Role Selection Tabs */}
        <div className="space-y-1.5 w-full">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            I WANT TO JOIN AS A
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'Client' })}
              className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                formData.role === 'Client'
                  ? 'bg-blue-600 border-blue-500/30 text-white'
                  : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Client (Hire)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'Freelancer' })}
              className={`py-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                formData.role === 'Freelancer'
                  ? 'bg-blue-600 border-blue-500/30 text-white'
                  : 'bg-black/20 border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Freelancer (Work)
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
          {loading ? 'Creating Account...' : 'REGISTER'}
        </Button>
      </form>

      <div className="text-center text-xs text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-all">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default Register;
