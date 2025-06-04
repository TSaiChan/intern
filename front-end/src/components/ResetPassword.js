import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import './css/login.css'; // Reusing the same CSS

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);
    const navigate = useNavigate();

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Reset Link',
                text: 'The reset link is invalid or incomplete.',
                confirmButtonColor: '#3085d6',
            }).then(() => {
                navigate('/');
            });
            return;
        }

        // Verify the reset token
        const verifyToken = async () => {
            setIsValidating(true);
            try {
                const response = await fetch(
                    `http://localhost:3000/api/verify-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
                );

                if (response.ok) {
                    setIsValidToken(true);
                } else {
                    const data = await response.json();
                    throw new Error(data.message || 'Invalid or expired reset token');
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Reset Link',
                    text: err.message,
                    confirmButtonColor: '#3085d6',
                }).then(() => {
                    navigate('/');
                });
            } finally {
                setIsValidating(false);
            }
        };

        verifyToken();
    }, [token, email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Validation
        if (!newPassword || !confirmPassword) {
            setIsLoading(false);
            Swal.fire({
                icon: 'error',
                title: 'Missing Fields',
                text: 'Please fill in all fields.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setIsLoading(false);
            Swal.fire({
                icon: 'error',
                title: 'Passwords Don\'t Match',
                text: 'Please ensure both passwords are identical.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (newPassword.length < 6) {
            setIsLoading(false);
            Swal.fire({
                icon: 'error',
                title: 'Password Too Short',
                text: 'Password must be at least 6 characters long.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    email,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password Reset Successful',
                    text: 'Your password has been reset successfully. You can now log in with your new password.',
                    confirmButtonColor: '#3085d6',
                }).then(() => {
                    navigate('/');
                });
            } else {
                throw new Error(data.message || 'Failed to reset password');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Reset Failed',
                text: err.message,
                confirmButtonColor: '#3085d6',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div className="flex font-poppins items-center justify-center min-h-screen">
                <div className="w-full max-w-md p-5 space-y-5 bg-white rounded-2xl text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Validating reset link...</p>
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return null; // Component will redirect if token is invalid
    }

    return (
        <div className="flex font-poppins items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-5 space-y-5 bg-white rounded-2xl">
                <h1 className="text-4xl font-bold text-center text-gray-800">Reset Password</h1>
                <p className="text-center text-gray-600 text-sm">
                    Enter your new password for: <strong>{email}</strong>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative input-group">
                        <label htmlFor="newPassword" className="block text-md text-gray-700 mb-2">
                            New Password
                        </label>
                        <input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Enter new password"
                            className="input-group input"
                            disabled={isLoading}
                            minLength="6"
                        />
                        <span
                            className="absolute top-11 right-4 text-gray-500 cursor-pointer"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </span>
                    </div>

                    <div className="relative input-group">
                        <label htmlFor="confirmPassword" className="block text-md text-gray-700 mb-2">
                            Confirm New Password
                        </label>
                        <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm new password"
                            className="input-group input"
                            disabled={isLoading}
                            minLength="6"
                        />
                        <span
                            className="absolute top-11 right-4 text-gray-500 cursor-pointer"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="login-button disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <p className="toggle-container text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
                    >
                        Back to Login
                    </button>
                </p>
            </div>
        </div>
    );
}

export default ResetPassword;