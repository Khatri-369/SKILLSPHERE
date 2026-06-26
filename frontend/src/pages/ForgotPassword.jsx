import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword, clearErrors } from '../features/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, message } = useSelector((state) => state.auth);

  // Flow A: Forgot Password (Request Link)
  const [email, setEmail] = useState('');

  // Flow B: Reset Password (Type New Password)
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    dispatch(clearErrors());
  }, [dispatch, token]);

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    dispatch(forgotPassword(email));
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (passwords.newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    dispatch(resetPassword({ token, newPassword: passwords.newPassword }))
      .unwrap()
      .then(() => {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  // Render the Reset Password form if we have a token
  if (token) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white tracking-wider">RESET PASSWORD</h2>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Enter your new credentials</p>
        </div>

        {(error || localError) && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center animate-fade-in">
            {error || localError}
          </div>
        )}

        {message && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium text-center animate-fade-in">
            {message} Redirecting to login...
          </div>
        )}

        <form onSubmit={handleResetSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            name="newPassword"
            value={passwords.newPassword}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            disabled={loading || !!message}
          />

          <Input
            label="Confirm New Password"
            type="password"
            name="confirmPassword"
            value={passwords.confirmPassword}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            disabled={loading || !!message}
          />

          <Button type="submit" variant="primary" className="w-full py-3" disabled={loading || !!message}>
            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
          </Button>
        </form>

        <div className="text-center text-xs text-gray-400">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-all">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Render the Forgot Password request form (default)
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white tracking-wider font-sans">FORGOT PASSWORD</h2>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Request a reset link via email</p>
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

      <form onSubmit={handleForgotSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="yourname@example.com"
          required
          disabled={loading}
        />

        <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
          {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
        </Button>
      </form>

      <div className="text-center text-xs text-gray-400">
        Already remembered?{' '}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-all">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
