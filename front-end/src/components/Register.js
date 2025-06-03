import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './css/login.css';

function Registeration() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [attempts, setAttempts] = useState(0);
  const [tooManyRequests, setTooManyRequests] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
    group_id: '',
  });

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhoneNumber = (phone) => /^\d{10}$/.test(phone);

  const handleSendOtp = async () => {
    if (!isValidEmail(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (attempts >= 3) {
      setTooManyRequests(true);
      setCooldownTime(60);
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/users/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpExpired(false);
        setTimerActive(true);
        setTimeLeft(120);
        setAttempts((prev) => prev + 1);
        Swal.fire({
          icon: 'success',
          title: 'OTP Sent',
          text: 'OTP sent to your email.',
          confirmButtonColor: '#3085d6',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'OTP Failed',
          text: data.message || 'Failed to send OTP.',
          confirmButtonColor: '#3085d6',
        });
        if (data.message.includes('Too many OTP requests')) {
          setTooManyRequests(true);
          setCooldownTime(data.waitTime || 60);
        }
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to send OTP. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid OTP',
        text: 'Please enter the OTP.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/users/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
        setTimerActive(false);
        Swal.fire({
          icon: 'success',
          title: 'OTP Verified',
          text: 'Email verified! Please complete registration.',
          confirmButtonColor: '#3085d6',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid OTP',
          text: data.message || 'Invalid or expired OTP.',
          confirmButtonColor: '#3085d6',
        });
        setOtp('');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to verify OTP. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, phone_number, password, confirmPassword, group_id } = formData;

    if (!name || !phone_number || !password || !confirmPassword || group_id === '') {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Form',
        text: 'Please fill all fields.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!isValidPhoneNumber(phone_number)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Phone Number',
        text: 'Please enter a valid 10-digit phone number.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters long.',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    try {
      const payload = { ...formData, email, group_id: Number(formData.group_id) };
      const res = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          text: 'Please log in to continue.',
          confirmButtonColor: '#3085d6',
        }).then(() => navigate('/'));
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: data.message || 'An unknown error occurred.',
          confirmButtonColor: '#3085d6',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to register. Please try again.',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  useEffect(() => {
    let interval;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      setOtpExpired(true);
      setOtp('');
      Swal.fire({
        icon: 'error',
        title: 'OTP Expired',
        text: 'OTP has expired. Please request a new one.',
        confirmButtonColor: '#3085d6',
      });
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    let cooldownInterval;
    if (tooManyRequests && cooldownTime > 0) {
      cooldownInterval = setInterval(() => {
        setCooldownTime((prevTime) => {
          if (prevTime === 1) {
            setTooManyRequests(false);
            setAttempts(0);
            Swal.fire({
              icon: 'info',
              title: 'Cooldown Ended',
              text: 'You can now request a new OTP.',
              confirmButtonColor: '#3085d6',
            });
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownInterval);
  }, [tooManyRequests, cooldownTime]);

  return (
    <div className="flex font-poppins items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-5 space-y-5 bg-white rounded-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800">Register</h1>

        {!otpVerified ? (
          <>
            <div className="input-group">
              <label htmlFor="email" className="block text-md text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-group input"
                placeholder="you@example.com"
                disabled={tooManyRequests}
              />
            </div>

            <button
              onClick={handleSendOtp}
              className="login-button"
              disabled={(timerActive && !otpExpired) || tooManyRequests}
            >
              Send OTP
            </button>

            {otpSent && (
              <>
                <div className="input-group">
                  <label htmlFor="otp" className="block text-md text-gray-700 mb-2">Enter OTP</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="input-group input"
                    placeholder="Enter OTP"
                    disabled={tooManyRequests || otpExpired}
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  className="login-button"
                  disabled={tooManyRequests || otpExpired}
                >
                  Verify OTP
                </button>
                {timerActive && !otpExpired && (
                  <div className="text-center mt-4">
                    <p>Time left to enter OTP: <span>{timeLeft}</span> seconds</p>
                  </div>
                )}
              </>
            )}

            {tooManyRequests && (
              <div className="text-center mt-4">
                <p>Too many requests. Please wait <span>{cooldownTime}</span> seconds.</p>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-xl font-semibold text-center">Complete your registration</h3>

            <div className="input-group">
              <label htmlFor="name" className="block text-md text-gray-700 mb-2">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="input-group input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone_number" className="block text-md text-gray-700 mb-2">Phone Number</label>
              <input
                id="phone_number"
                name="phone_number"
                type="text"
                value={formData.phone_number}
                onChange={handleChange}
                required
                placeholder="1234567890"
                className="input-group input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="block text-md text-gray-700 mb-2">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-group input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword" className="block text-md text-gray-700 mb-2">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-group input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="group_id" className="block text-md text-gray-700 mb-2">Select Role</label>
              <select
                id="group_id"
                name="group_id"
                value={formData.group_id}
                onChange={handleChange}
                required
                className="input-group input"
              >
                <option value="" disabled hidden>Select Role</option>
                <option value="1">User</option>
                <option value="0">Admin</option>
              </select>
            </div>

            <button type="submit" className="login-button">Register</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Registeration;