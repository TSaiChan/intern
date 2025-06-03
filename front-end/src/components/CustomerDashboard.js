import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FaEdit } from 'react-icons/fa';

function CustomerDashboard() {
    const context = useOutletContext();
    const { profile, setProfile } = context || {};
    const [isEditing, setIsEditing] = useState(false);
    const [editAddress, setEditAddress] = useState(profile?.address || '');
    const [editCanBuy, setEditCanBuy] = useState(profile?.can_buy || false);
    const [editCanSell, setEditCanSell] = useState(false);

    // Show loading if context is not ready
    if (!context || !profile) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const handleEditProfile = () => {
        setEditAddress(profile?.address || '');
        setEditCanBuy(profile?.can_buy || false);
        setEditCanSell(false);
        setIsEditing(true);
    };

    const handleSaveProfile = () => {
        if (!editAddress.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Address Required',
                text: 'Please provide a valid address.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('address', editAddress);
        formData.append('can_buy', editCanBuy.toString());
        formData.append('can_sell', editCanSell.toString());

        fetch('http://localhost:3000/api/customer/profile', {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setProfile({ ...profile, address: editAddress, can_buy: editCanBuy, can_sell: editCanSell });
                    setIsEditing(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'Profile Updated',
                        text: 'Your profile has been updated successfully.',
                        confirmButtonColor: '#3085d6',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: data.message || 'Failed to update profile. Please try again.',
                        confirmButtonColor: '#3085d6',
                    });
                }
            })
            .catch((err) => {
                console.error('Error updating profile:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: 'An error occurred while updating your profile.',
                    confirmButtonColor: '#3085d6',
                });
            });
    };

    const handleCancelEdit = () => {
        setEditAddress(profile?.address || '');
        setEditCanBuy(profile?.can_buy || false);
        setEditCanSell(false);
        setIsEditing(false);
    };

    let canSellDisplay;
    if (profile?.can_sell) {
        canSellDisplay = 'Approved';
    } else if (profile?.can_sell_status === 'pending') {
        canSellDisplay = 'Pending Approval';
    } else if (profile?.can_sell_status === 'rejected') {
        canSellDisplay = 'Rejected';
    } else {
        canSellDisplay = 'Not Requested';
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-bold text-gray-800">Customer Dashboard</h2>
                <button
                    onClick={handleEditProfile}
                    className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                    <FaEdit className="mr-2" />
                    Edit Profile
                </button>
            </div>

            <div className="mb-6">
                <h3 className="text-2xl font-semibold text-gray-700">
                    Welcome, {profile?.username || 'User'}!
                </h3>
                <p className="text-gray-500">Manage your goats and explore the Digi Goat platform.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Profile Overview</h3>
                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-700 font-medium">Address:</label>
                            <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 font-medium mr-2">Can Buy:</label>
                            <input
                                type="checkbox"
                                checked={editCanBuy}
                                onChange={(e) => setEditCanBuy(e.target.checked)}
                                className="h-5 w-5 text-blue-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 font-medium mr-2">Request to Sell:</label>
                            {profile?.can_sell ? (
                                <span className="text-gray-700">Approved</span>
                            ) : profile?.can_sell_status === 'pending' ? (
                                <span className="text-gray-700">Pending Approval</span>
                            ) : profile?.can_sell_status === 'rejected' ? (
                                <span className="text-gray-700">Rejected</span>
                            ) : (
                                <input
                                    type="checkbox"
                                    checked={editCanSell}
                                    onChange={(e) => setEditCanSell(e.target.checked)}
                                    className="h-5 w-5 text-blue-500"
                                />
                            )}
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleSaveProfile}
                                disabled={!editAddress.trim()}
                                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${editAddress.trim()
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-gray-700">
                            <strong className="font-medium">Name:</strong> {profile?.username || 'N/A'}
                        </p>
                        <p className="text-gray-700">
                            <strong className="font-medium">Email:</strong> {profile?.email || 'N/A'}
                        </p>
                        <p className="text-gray-700">
                            <strong className="font-medium">Address:</strong> {profile?.address || 'Not set'}
                        </p>
                        <p className="text-gray-700">
                            <strong className="font-medium">Can Buy:</strong> {profile?.can_buy ? 'Yes' : 'No'}
                        </p>
                        <p className="text-gray-700">
                            <strong className="font-medium">Can Sell:</strong> {canSellDisplay}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CustomerDashboard;