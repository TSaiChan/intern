import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './css/login.css';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'An unknown error occurred during login.');
      }

      const data = await response.json();

      if (data.verified !== 1) {
        return Swal.fire({
          icon: 'warning',
          title: 'Email Not Verified',
          text: 'Please verify your email before logging in.',
          confirmButtonColor: '#3085d6',
        });
      }

      if (data.active !== 1) {
        return Swal.fire({
          icon: 'error',
          title: 'Account Inactive',
          text: 'Your account is inactive. Please contact support.',
          confirmButtonColor: '#3085d6',
        });
      }

      localStorage.setItem('token', data.token);

      Swal.fire({
        icon: 'success',
        title: `Welcome, ${data.username}!`,
        text: 'You have successfully logged in.',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        const groupId = Number(data.group_id);
        if (groupId === 0) {
          navigate('/admin-dashboard');
        } else if (groupId === 1) {
          navigate('/customer-dashboard');
        } else {
          navigate('/');
        }
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: err.message,
        confirmButtonColor: '#3085d6',
      });
    }
  };

  return (
    <div className="flex font-poppins items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-5 space-y-5 bg-white rounded-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800">Log In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-group">
            <label htmlFor="email" className="block text-md text-gray-700 mb-2">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="input-group input"
            />
          </div>
          <div className="relative input-group">
            <label htmlFor="password" className="block text-md text-gray-700 mb-2">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="input-group input"
            />
            <span
              className="absolute top-11 right-4 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </span>
          </div>
          <button type="submit" className="login-button">Log In</button>
        </form>
        <p className="toggle-container">
          Don’t have an account?{' '}
          <Link to="/register" className="toggle-text">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;