import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { loginUser, fetchCurrentUser } from '../features/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';
import apiClient from '../services/api';
import { Globe, ShieldAlert, Sparkles, Key } from 'lucide-react';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [searchParams] = useSearchParams();
  const { loading, error: reduxError } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // 1. Google OAuth Callback detection
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      setSuccessMessage('Logged in with Google successfully! Redirecting...');
      dispatch(fetchCurrentUser())
        .unwrap()
        .then(() => {
          navigate('/dashboard');
        })
        .catch((err) => {
          setLocalError(err || 'Failed to initialize session');
          localStorage.removeItem('accessToken');
        });
    }
  }, [searchParams, dispatch, navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // 2. Normal login submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    try {
      const action = await dispatch(loginUser(credentials));
      const response = action.payload;

      // Handle raw response for 2FA or success
      if (loginUser.fulfilled.match(action)) {
        // Check if backend returned 2FA required
        if (response && response.is2FARequired) {
          setIs2FARequired(true);
          setSuccessMessage('A 6-digit verification code has been sent to your email.');
        } else {
          navigate('/dashboard');
        }
      } else {
        // Redux rejected
        const errMsg = action.payload || 'Login failed';
        if (errMsg.includes('verify')) {
          setLocalError('Please verify your email before logging in');
        } else {
          setLocalError(errMsg);
        }
      }
    } catch (err) {
      setLocalError(err.message || 'Something went wrong');
    }
  };

  // 3. 2FA Code submission handler
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    setVerifyingOtp(true);

    try {
      const response = await apiClient.post('/auth/verify-2fa', {
        email: credentials.email,
        code: otpCode,
      });

      if (response.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setSuccessMessage('2FA verification successful!');
        dispatch(fetchCurrentUser())
          .unwrap()
          .then(() => {
            navigate('/dashboard');
          });
      }
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired 2FA code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 4. Quick verification developer bypass
  const handleQuickVerify = async () => {
    setLocalError('');
    setSuccessMessage('');
    try {
      const response = await apiClient.post('/auth/quick-verify', {
        email: credentials.email,
      });
      if (response.success) {
        setSuccessMessage('Email verified successfully! You can now log in.');
      }
    } catch (err) {
      setLocalError(err.message || 'Verification bypass failed');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/v1/auth/google';
  };

  const handleGoogleMockLogin = () => {
    window.location.href = 'http://localhost:5000/api/v1/auth/google-mock';
  };

  const activeError = localError || reduxError;

  // Render 2FA entry UI
  if (is2FARequired) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-1">
          <Key className="h-10 w-10 mx-auto text-blue-400 mb-2" />
          <h2 className="text-xl font-black text-white tracking-wider">2-FACTOR VERIFICATION</h2>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Enter the 6-digit code sent to your email</p>
        </div>

        {activeError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center">
            {activeError}
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <Input
            label="Verification Code"
            type="text"
            name="otpCode"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="e.g. 123456"
            maxLength={6}
            required
          />

          <Button type="submit" variant="primary" className="w-full py-3" disabled={verifyingOtp}>
            {verifyingOtp ? 'Verifying...' : 'VERIFY CODE'}
          </Button>

          <Button
            variant="secondary"
            className="w-full text-xs py-2"
            onClick={() => {
              setIs2FARequired(false);
              setOtpCode('');
              setLocalError('');
              setSuccessMessage('');
            }}
          >
            Back to Login
          </Button>
        </form>
      </div>
    );
  }

  // Render main Login UI
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white tracking-wider">WELCOME BACK</h2>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Login to your account</p>
      </div>

      {activeError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center space-y-2">
          <div>{activeError}</div>
          {activeError.toLowerCase().includes('verify') && credentials.email && (
            <button
              type="button"
              onClick={handleQuickVerify}
              className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer block mx-auto hover:scale-105 active:scale-95 transition-all"
            >
              Verify Email Instantly (Local Development Bypass)
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium text-center">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={credentials.email}
          onChange={handleChange}
          placeholder="yourname@example.com"
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />

        <div className="flex justify-end text-xs">
          <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 font-semibold transition-all">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
          {loading ? 'Signing In...' : 'SIGN IN'}
        </Button>
      </form>

      {/* Social / Demo logins */}
      <div className="space-y-2.5 pt-2">
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-2xs uppercase tracking-widest font-bold">Or Connect With</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGoogleMockLogin}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>Demo Google</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Globe className="h-4 w-4 text-red-400" />
            <span>Real Google</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 pt-2">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-all">
          Create Account
        </Link>
      </div>
    </div>
  );
};

export default Login;