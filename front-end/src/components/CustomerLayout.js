import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import { FaTachometerAlt, FaShoppingCart, FaHorse, FaPlusCircle, FaUserCog, FaSignOutAlt } from 'react-icons/fa';

function CustomerLayout() {
    const [profile, setProfile] = useState(null);
    const [goatCount, setGoatCount] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Please log in to access the dashboard.',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        let decodedToken;
        try {
            decodedToken = jwtDecode(token);
        } catch (err) {
            localStorage.removeItem('token');
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

        // Fetch profile
        fetch('http://localhost:3000/api/customer/profile', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.message === 'Profile not found' || !data.photo) {
                    if (location.pathname !== '/complete-profile') {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Profile Incomplete',
                            text: !data.photo ? 'Please upload a profile photo to complete your profile.' : 'Please complete your profile.',
                            confirmButtonColor: '#3085d6',
                        }).then(() => navigate('/complete-profile'));
                    }
                } else {
                    setProfile(data);
                }
            })
            .catch((err) => {
                console.error('Error fetching profile:', err);
            });

        // Fetch goat count
        fetch('http://localhost:3000/api/customer/goats/count', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setGoatCount(data.count || 0);
                }
            })
            .catch((err) => {
                console.error('Error fetching goat count:', err);
            });
    }, [navigate, location.pathname]);

    const handleSellGoatNavigation = () => {
        if (!profile?.verified) {
            Swal.fire({
                icon: 'warning',
                title: 'KYC Required',
                text: 'You must complete KYC before listing goats for sale.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }
        if (!profile?.can_sell) {
            Swal.fire({
                icon: 'warning',
                title: 'Seller Approval Required',
                text: profile?.can_sell_status === 'pending'
                    ? 'Your seller request is pending admin approval.'
                    : 'You need to request seller permission to list goats.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }
        navigate('/sell-goat');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex font-poppins min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
            {/* Sidebar */}
            <div className="w-64 bg-blue-900 text-white p-6 shadow-lg fixed h-full">
                <h3 className="text-2xl font-bold mb-8 tracking-wide">Digi Goat</h3>
                <ul className="space-y-4">
                    <li>
                        <button
                            onClick={() => navigate('/customer-dashboard')}
                            className={`flex items-center w-full text-left py-3 px-4 rounded-lg transition-colors duration-200 ${isActive('/customer-dashboard')
                                    ? 'bg-blue-700'
                                    : 'hover:bg-blue-700'
                                }`}
                        >
                            <FaTachometerAlt className="mr-3" />
                            Dashboard
                        </button>
                    </li>
                    {profile?.can_buy && (
                        <li>
                            <button
                                onClick={() => navigate('/buy-goats')}
                                className={`flex items-center w-full text-left py-3 px-4 rounded-lg transition-colors duration-200 ${isActive('/buy-goats')
                                        ? 'bg-blue-700'
                                        : 'hover:bg-blue-700'
                                    }`}
                            >
                                <FaShoppingCart className="mr-3" />
                                Buy Goats
                            </button>
                        </li>
                    )}
                    <li>
                        <button
                            onClick={() => navigate('/my-goats')}
                            className={`flex items-center w-full text-left py-3 px-4 rounded-lg transition-colors duration-200 ${isActive('/my-goats')
                                    ? 'bg-blue-700'
                                    : 'hover:bg-blue-700'
                                }`}
                        >
                            <FaHorse className="mr-3" />
                            My Goats
                            <span className="ml-auto bg-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
                                {goatCount}
                            </span>
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={handleSellGoatNavigation}
                            className={`flex items-center w-full text-left py-3 px-4 rounded-lg transition-colors duration-200 ${isActive('/sell-goat')
                                    ? 'bg-blue-700'
                                    : 'hover:bg-blue-700'
                                }`}
                        >
                            <FaPlusCircle className="mr-3" />
                            Sell a Goat
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => navigate('/complete-profile')}
                            className={`flex items-center w-full text-left py-3 px-4 rounded-lg transition-colors duration-200 ${isActive('/complete-profile')
                                    ? 'bg-blue-700'
                                    : 'hover:bg-blue-700'
                                }`}
                        >
                            <FaUserCog className="mr-3" />
                            Profile Settings
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Logged Out',
                                    text: 'You have been logged out.',
                                    confirmButtonColor: '#3085d6',
                                }).then(() => navigate('/'));
                            }}
                            className="flex items-center w-full text-left py-3 px-4 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                        >
                            <FaSignOutAlt className="mr-3" />
                            Logout
                        </button>
                    </li>
                </ul>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ml-64">
                {/* Profile Photo Header */}
                <div className="flex items-center justify-end p-6 bg-white shadow-sm">
                    {profile?.photo && (
                        <img
                            src={`http://localhost:3000${profile.photo}`}
                            alt="Profile"
                            className="w-12 h-12 object-cover rounded-full border-2 border-blue-500 shadow-md"
                            onError={(e) => {
                                console.error('Failed to load image:', e);
                                e.target.style.display = 'none';
                            }}
                        />
                    )}
                </div>

                {/* Page Content */}
                <div className="p-8">
                    <Outlet context={{ profile, setProfile, goatCount, setGoatCount }} />
                </div>
            </div>
        </div>
    );
}

export default CustomerLayout;