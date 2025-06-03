import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

function CompleteProfile() {
    const [formData, setFormData] = useState({
        address: '',
        photo: null,
        can_buy: false,
        can_sell: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profileExists, setProfileExists] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Please log in to access your profile.',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        let decodedToken;
        try {
            decodedToken = jwtDecode(token);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Token',
                text: 'Your session is invalid. Please log in again.',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        const groupId = Number(decodedToken.group_id);
        if (groupId !== 1) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Customers only (group_id = 1).',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        fetch('http://localhost:3000/api/customer/profile', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.message === 'Profile not found') {
                    setProfileExists(false);
                    setLoading(false);
                } else {
                    setProfileExists(true);
                    setFormData({
                        address: data.address || '',
                        photo: null,
                        can_buy: !!data.can_buy,
                        can_sell: !!data.can_sell,
                    });
                    setLoading(false);
                }
            })
            .catch((err) => {
                setError('Failed to load profile.');
                setLoading(false);
            });
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.address.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Address Required',
                text: 'Please provide a valid address.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (!formData.photo && !profileExists) {
            Swal.fire({
                icon: 'warning',
                title: 'Photo Required',
                text: 'Please upload a profile photo.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const token = localStorage.getItem('token');
        const formDataToSend = new FormData();
        formDataToSend.append('address', formData.address);
        if (formData.photo) {
            formDataToSend.append('photo', formData.photo);
        }
        formDataToSend.append('can_buy', formData.can_buy.toString());
        formDataToSend.append('can_sell', formData.can_sell.toString());

        for (let pair of formDataToSend.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        try {
            const res = await fetch('http://localhost:3000/api/customer/profile', {
                method: profileExists ? 'PUT' : 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formDataToSend,
            });

            const data = await res.json();
            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: formData.can_sell ? 'Profile Updated & Seller Request Sent' : 'Profile Updated',
                    text: formData.can_sell
                        ? 'Your request to sell goats has been submitted and is awaiting admin approval.'
                        : 'Your profile has been updated.',
                    confirmButtonColor: '#3085d6',
                }).then(() => navigate('/customer-dashboard'));
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: data.message || 'Failed to update profile.',
                    confirmButtonColor: '#3085d6',
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Failed to update profile. Please try again.',
                confirmButtonColor: '#3085d6',
            });
        }
    };

    const isButtonDisabled = !formData.address.trim() || (!formData.photo && !profileExists);

    if (loading) return <div className="text-center p-10">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="flex font-poppins items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-5 space-y-5 bg-white rounded-2xl">
                <h1 className="text-4xl font-bold text-center text-gray-800">Complete Your Profile</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-group">
                        <label htmlFor="address" className="block text-md text-gray-700 mb-2">
                            Address
                        </label>
                        <input
                            id="address"
                            name="address"
                            type="text"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Your address"
                            className="input w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="photo" className="block text-md text-gray-700 mb-2">
                            Upload Photo
                        </label>
                        <input
                            id="photo"
                            name="photo"
                            type="file"
                            accept="image/*"
                            onChange={handleChange}
                            className="input w-full p-2 border rounded-lg"
                            required={!profileExists}
                        />
                    </div>
                    <div className="input-group">
                        <label className="block text-md text-gray-700 mb-2">
                            <input
                                name="can_buy"
                                type="checkbox"
                                checked={formData.can_buy}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            I want to buy goats
                        </label>
                    </div>
                    <div className="input-group">
                        <label className="block text-md text-gray-700 mb-2">
                            <input
                                name="can_sell"
                                type="checkbox"
                                checked={formData.can_sell}
                                onChange={handleChange}
                                className="mr-2"
                            />
                            I want to sell goats (requires admin approval)
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={isButtonDisabled}
                        className={`login-button w-full py-2 rounded-lg transition-colors duration-200 ${isButtonDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        Save Profile
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CompleteProfile;