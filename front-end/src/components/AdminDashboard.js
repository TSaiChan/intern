import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

import { FaTachometerAlt, FaSignOutAlt } from 'react-icons/fa';

function AdminDashboard() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRequests, setTotalRequests] = useState(0);
    const limit = 10; // Number of requests per page
    const navigate = useNavigate();

    const fetchRequests = (page) => {
        setLoading(true);
        const token = localStorage.getItem('token');
        fetch(`http://localhost:3000/api/customer/all-can-sell-requests?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);
                }
                return res.json();
            })
            .then((data) => {
                console.log('Fetched requests:', data);
                setRequests(data.requests || []);
                setCurrentPage(data.currentPage);
                setTotalPages(data.totalPages);
                setTotalRequests(data.totalRequests);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching requests:', err.message);
                setError(`Failed to load requests: ${err.message}`);
                setLoading(false);
            });
    };

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
            console.log('Decoded Token:', decodedToken);
        } catch (err) {
            console.error('Token decode error:', err);
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
        if (groupId !== 0) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Admins only (group_id = 0).',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        fetchRequests(currentPage);
    }, [navigate, currentPage]);

    const handleRequestAction = (requestId, action) => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/api/customer/handle-can-sell-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ requestId, action }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! Status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Request Processed',
                        text: `Request has been ${action}d.`,
                        confirmButtonColor: '#3085d6',
                    });
                    fetchRequests(currentPage); // Refresh the current page
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Action Failed',
                        text: data.message || 'Failed to process request.',
                        confirmButtonColor: '#3085d6',
                    });
                }
            })
            .catch((err) => {
                console.error('Error processing request:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: `Failed to process request: ${err.message}`,
                    confirmButtonColor: '#3085d6',
                });
            });
    };

    const handleViewProfile = (userId) => {
        const token = localStorage.getItem('token');
        fetch(`http://localhost:3000/api/customer/profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP error! Status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                Swal.fire({
                    icon: 'info',
                    title: 'Customer Profile',
                    html: `
            <div style="text-align: left;">
              <p><strong>Username:</strong> ${data.username}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Address:</strong> ${data.address || 'Not provided'}</p>
              <p><strong>Can Buy:</strong> ${data.can_buy ? 'Yes' : 'No'}</p>
              <p><strong>Can Sell:</strong> ${data.can_sell ? 'Yes' : 'No'}</p>
              <p><strong>Can Sell Status:</strong> ${data.can_sell_status || 'None'}</p>
              <p><strong>Verified:</strong> ${data.verified ? 'Yes' : 'No'}</p>
              ${data.photo ? `<img src="http://localhost:3000${data.photo}" alt="Profile Photo" style="max-width: 200px; margin-top: 10px;" />` : ''}
            </div>
          `,
                    confirmButtonColor: '#3085d6',
                });
            })
            .catch((err) => {
                console.error('Error fetching profile:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch customer profile.',
                    confirmButtonColor: '#3085d6',
                });
            });
    };

    if (loading) return <div className="text-center p-10 text-gray-600">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="flex font-poppins min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
            <div className="w-64 bg-blue-900 text-white p-6 shadow-lg">
                <h3 className="text-2xl font-bold mb-8 tracking-wide">Digi Goat Admin</h3>
                <ul className="space-y-4">
                    <li>
                        <button
                            onClick={() => navigate('/admin-dashboard')}
                            className="flex items-center w-full text-left py-3 px-4 bg-blue-700 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                        >
                            <FaTachometerAlt className="mr-3" />
                            Dashboard
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

            <div className="flex-1 p-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
                <h3 className="text-2xl font-semibold text-gray-700 mb-8">Sell Requests</h3>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">All Can Sell Requests</h3>
                    {requests.length === 0 ? (
                        <p className="text-gray-700">No requests found.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="p-3 text-gray-700 font-semibold">User ID</th>
                                            <th className="p-3 text-gray-700 font-semibold">Username</th>
                                            <th className="p-3 text-gray-700 font-semibold">Email</th>
                                            <th className="p-3 text-gray-700 font-semibold">Requested At</th>
                                            <th className="p-3 text-gray-700 font-semibold">Status</th>
                                            <th className="p-3 text-gray-700 font-semibold">Actions</th>
                                            <th className="p-3 text-gray-700 font-semibold">Profile</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((request) => (
                                            <tr key={request.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3">{request.user_id}</td>
                                                <td className="p-3">{request.username}</td>
                                                <td className="p-3">{request.email}</td>
                                                <td className="p-3">{new Date(request.created_at).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-sm ${request.status === 'approved'
                                                                ? 'bg-green-100 text-green-700'
                                                                : request.status === 'rejected'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                            }`}
                                                    >
                                                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="p-3 space-x-2">
                                                    {request.status === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleRequestAction(request.id, 'approve')}
                                                                className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors duration-200"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRequestAction(request.id, 'reject')}
                                                                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors duration-200"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-500">No action needed</span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <button
                                                        onClick={() => handleViewProfile(request.user_id)}
                                                        className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                                    >
                                                        View Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-gray-600">
                                    Showing {requests.length} of {totalRequests} requests
                                </div>
                                <div className="space-x-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg ${currentPage === 1
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                            } transition-colors duration-200`}
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-600">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className={`px-4 py-2 rounded-lg ${currentPage === totalPages
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                            } transition-colors duration-200`}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;