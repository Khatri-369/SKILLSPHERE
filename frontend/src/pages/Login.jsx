import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../features/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const { loading, error } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(credentials)).unwrap().then(() => {
      navigate('/dashboard');
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white tracking-wider">WELCOME BACK</h2>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Login to your account</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium text-center">
          {error}
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

      <div className="text-center text-xs text-gray-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-all">
          Create Account
        </Link>
      </div>
    </div>
  );
};

export default Login;
