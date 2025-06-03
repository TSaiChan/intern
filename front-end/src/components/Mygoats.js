import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

function MyGoats() {
    const [goats, setGoats] = useState([]);
    const [filteredGoats, setFilteredGoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Filter states
    const [filterBreed, setFilterBreed] = useState('');
    const [filterMinPrice, setFilterMinPrice] = useState('');
    const [filterMaxPrice, setFilterMaxPrice] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Please log in to view your goats.',
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

        fetch('http://localhost:3000/api/customer/goats', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                console.log('MyGoats API response:', data);
                data.forEach((goat) => {
                    console.log(`Goat #${goat.goat_number}: is_active = ${goat.is_active}, type = ${typeof goat.is_active}`);
                });
                setGoats(data);
                setFilteredGoats(data);
                data.forEach((goat) => {
                    if (goat.image_url) {
                        const imageUrl = `http://localhost:3000${goat.image_url}?t=${new Date().getTime()}`;
                        console.log(`Attempting to load image for goat ${goat.goat_number}: ${imageUrl}`);
                        const img = new Image();
                        img.src = imageUrl;
                        img.onload = () => console.log(`Image loaded successfully for goat ${goat.goat_number}: ${imageUrl}`);
                        img.onerror = () => console.error(`Failed to load image for goat ${goat.goat_number}: ${imageUrl}`);
                    } else {
                        console.log(`No image_url for goat ${goat.goat_number}`);
                    }
                });
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching goats:', err);
                setError('Failed to load goats.');
                setLoading(false);
            });
    }, [navigate]);

    useEffect(() => {
        let filtered = [...goats];

        if (filterBreed) {
            filtered = filtered.filter((goat) =>
                goat.breed?.toLowerCase().includes(filterBreed.toLowerCase())
            );
        }

        if (filterMinPrice) {
            filtered = filtered.filter(
                (goat) => parseFloat(goat.minimum_price) >= parseFloat(filterMinPrice)
            );
        }
        if (filterMaxPrice) {
            filtered = filtered.filter(
                (goat) => parseFloat(goat.maximum_price) <= parseFloat(filterMaxPrice)
            );
        }

        if (filterStatus !== 'all') {
            const isActive = filterStatus === 'active';
            filtered = filtered.filter((goat) => {
                if (typeof goat.is_active === 'boolean') {
                    return goat.is_active === isActive;
                } else if (typeof goat.is_active === 'string') {
                    return goat.is_active.toLowerCase() === (isActive ? 'active' : 'inactive');
                } else if (typeof goat.is_active === 'number') {
                    return goat.is_active === (isActive ? 1 : 0);
                }
                return false;
            });
        }

        console.log('Filtered goats:', filtered);
        setFilteredGoats(filtered);
    }, [goats, filterBreed, filterMinPrice, filterMaxPrice, filterStatus]);

    const handleEdit = (goat) => {
        navigate('/sell-goat', { state: { goat } });
    };

    const handleViewDetails = (goat) => {
        Swal.fire({
            icon: 'info',
            title: `Goat #${goat.goat_number} - ${goat.breed}`,
            html: `
        <div style="text-align: left;">
          <p><strong>Date of Birth:</strong> ${new Date(goat.dob).toLocaleDateString()}</p>
          <p><strong>Weight:</strong> ${goat.weight} kg</p>
          <p><strong>Health Status:</strong> ${goat.health_status}</p>
          <p><strong>Minimum Price:</strong> $${goat.minimum_price}</p>
          <p><strong>Maximum Price:</strong> $${goat.maximum_price}</p>
          ${goat.price ? `<p><strong>Fixed Price:</strong> $${goat.price}</p>` : ''}
          <p><strong>Status:</strong> ${goat.is_active ? 'Active' : 'Inactive'}</p>
          ${goat.image_url ? `<img src="http://localhost:3000${goat.image_url}" alt="Goat Photo" style="max-width: 300px; margin-top: 10px;" />` : '<p>No image available</p>'}
        </div>
      `,
            confirmButtonColor: '#3085d6',
        });
    };

    const handleToggleStatus = (goatId, currentStatus) => {
        Swal.fire({
            icon: 'question',
            title: `Are you sure?`,
            text: `This will ${currentStatus ? 'deactivate' : 'activate'} the goat listing.`,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${currentStatus ? 'deactivate' : 'activate'}!`,
        }).then((result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                const newStatus = !currentStatus;

                fetch(`http://localhost:3000/api/customer/goats/${goatId}/status`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ is_active: newStatus }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error('Failed to toggle goat status');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: `Goat ${newStatus ? 'Activated' : 'Deactivated'}`,
                            text: data.message,
                            confirmButtonColor: '#3085d6',
                        });
                        setGoats(goats.map((goat) => (goat.id === goatId ? { ...goat, is_active: newStatus } : goat)));
                        setFilteredGoats(filteredGoats.map((goat) => (goat.id === goatId ? { ...goat, is_active: newStatus } : goat)));
                    })
                    .catch((err) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: err.message,
                            confirmButtonColor: '#3085d6',
                        });
                    });
            }
        });
    };

    const handleDelete = (goatId) => {
        Swal.fire({
            icon: 'warning',
            title: 'Are you sure?',
            text: 'This action will permanently delete the goat listing!',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                fetch(`http://localhost:3000/api/customer/goats/${goatId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error('Failed to delete goat');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Goat Deleted',
                            text: data.message,
                            confirmButtonColor: '#3085d6',
                        });
                        setGoats(goats.filter((goat) => goat.id !== goatId));
                        setFilteredGoats(filteredGoats.filter((goat) => goat.id !== goatId));
                    })
                    .catch((err) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: err.message,
                            confirmButtonColor: '#3085d6',
                        });
                    });
            }
        });
    };

    const handleResetFilters = () => {
        setFilterBreed('');
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterStatus('all');
        setFilteredGoats(goats);
    };

    const handleBack = () => {
        navigate('/customer-dashboard');
    };

    if (loading) return <div className="text-center p-10 text-gray-600">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div
            className="min-h-screen bg-cover bg-center p-6 font-sans"
            style={{
                backgroundImage: `url('/images/index.jpg')`,
            }}
        >
            <div className="max-w-6xl mx-auto bg-white bg-opacity-95 rounded-xl shadow-lg p-6 backdrop-blur-md">
                <div className="flex justify-start mb-4">
                    <button
                        onClick={handleBack}
                        className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                    >
                        Back
                    </button>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center drop-shadow-md">
                    My Goats
                </h2>

                {/* Filtering Section */}
                <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow-inner">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 drop-shadow-sm">
                        Filter Goats
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="filterBreed" className="block text-sm font-medium text-gray-800">
                                Breed
                            </label>
                            <input
                                id="filterBreed"
                                type="text"
                                value={filterBreed}
                                onChange={(e) => setFilterBreed(e.target.value)}
                                placeholder="Enter breed"
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            />
                        </div>
                        <div>
                            <label htmlFor="filterMinPrice" className="block text-sm font-medium text-gray-800">
                                Min Price
                            </label>
                            <input
                                id="filterMinPrice"
                                type="number"
                                step="0.01"
                                value={filterMinPrice}
                                onChange={(e) => setFilterMinPrice(e.target.value)}
                                placeholder="Min price"
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            />
                        </div>
                        <div>
                            <label htmlFor="filterMaxPrice" className="block text-sm font-medium text-gray-800">
                                Max Price
                            </label>
                            <input
                                id="filterMaxPrice"
                                type="number"
                                step="0.01"
                                value={filterMaxPrice}
                                onChange={(e) => setFilterMaxPrice(e.target.value)}
                                placeholder="Max price"
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            />
                        </div>
                        <div>
                            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-800">
                                Status
                            </label>
                            <select
                                id="filterStatus"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleResetFilters}
                        className="mt-4 py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                    >
                        Reset Filters
                    </button>
                </div>

                {filteredGoats.length === 0 ? (
                    <div className="text-center text-gray-800">
                        <p>No goats match your filters.</p>
                        <button
                            onClick={() => navigate('/sell-goat')}
                            className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            List a Goat for Sale
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredGoats.map((goat) => (
                            <div
                                key={goat.id}
                                className="bg-white rounded-xl shadow-md overflow-visible hover:shadow-lg transition-shadow duration-300 flex flex-col min-w-[280px]"
                            >
                                <div className="relative w-full pt-[75%]">
                                    {goat.image_url ? (
                                        <img
                                            src={`http://localhost:3000${goat.image_url}?t=${new Date().getTime()}`}
                                            alt={`Goat #${goat.goat_number || 'N/A'} - ${goat.breed || 'N/A'}`}
                                            className="absolute top-0 left-0 w-full h-full object-contain p-4 bg-gray-100"
                                            onError={(e) => {
                                                console.error(`Failed to load image for goat ${goat.goat_number}: http://localhost:3000${goat.image_url}`);
                                                e.target.src = 'https://via.placeholder.com/300x225?text=Goat+Image+Not+Found';
                                            }}
                                            onLoad={() => console.log(`Successfully loaded image for goat ${goat.goat_number}: http://localhost:3000${goat.image_url}`)}
                                        />
                                    ) : (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-gray-200 text-gray-600">
                                            No Image Available
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="p-4 flex-1"
                                    style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                                >
                                    <div>
                                        <h3
                                            style={{
                                                color: 'black',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                visibility: 'visible',
                                                display: 'block',
                                                width: '100%',
                                                minHeight: '30px',
                                                lineHeight: '1.2',
                                                marginBottom: '12px',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                                position: 'relative',
                                                zIndex: 1,
                                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                border: '1px solid black',
                                                padding: '4px',
                                            }}
                                        >
                                            {console.log(`Rendering goat: Number = ${goat.goat_number}, Breed = ${goat.breed}`)}
                                            {goat.goat_number && goat.breed
                                                ? `Goat #${goat.goat_number} - ${goat.breed}`
                                                : 'Goat Name Unavailable'}
                                        </h3>
                                        <p
                                            style={{
                                                color: '#374151',
                                                fontSize: '14px',
                                                visibility: 'visible',
                                                display: 'block',
                                                width: '100%',
                                                marginBottom: '12px',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                            }}
                                        >
                                            <strong>DOB:</strong> {goat.dob ? new Date(goat.dob).toLocaleDateString() : 'N/A'}
                                        </p>
                                        <p
                                            style={{
                                                color: '#374151',
                                                fontSize: '14px',
                                                visibility: 'visible',
                                                display: 'block',
                                                width: '100%',
                                                marginBottom: '12px',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                            }}
                                        >
                                            <strong>Status:</strong>{' '}
                                            <span className={goat.is_active ? 'text-green-600' : 'text-red-600'}>
                                                {goat.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleViewDetails(goat)}
                                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handleEdit(goat)}
                                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                                        >
                                            Edit Listing
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(goat.id, goat.is_active)}
                                            className={`flex-1 py-2 px-4 text-white rounded-md ${goat.is_active
                                                    ? 'bg-orange-600 hover:bg-orange-700'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                } transition`}
                                        >
                                            {goat.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(goat.id)}
                                            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyGoats;