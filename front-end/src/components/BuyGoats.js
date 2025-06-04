import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

function BuyGoats() {
    const [goats, setGoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [purchasingIds, setPurchasingIds] = useState(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Please log in to buy goats.',
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

        const userId = decodedToken.user_id;
        console.log('Current User ID:', userId);

        fetch('http://localhost:3000/api/goats/available', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                console.log('API Response Status:', res.status, res.statusText);
                if (!res.ok) {
                    throw new Error(`HTTP error! Status: ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                console.log('API Response Data:', data);
                data.forEach((goat) => {
                    console.log(
                        `Goat ID: ${goat.id}, Number: ${goat.goat_number}, Breed: ${goat.breed}, is_active: ${goat.is_active}, user_id: ${goat.user_id} (type: ${typeof goat.user_id})`
                    );
                });
                const availableGoats = data.filter((goat) => Number(goat.user_id) !== userId);
                console.log('Available Goats after filtering:', availableGoats);
                setGoats(availableGoats);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching goats:', err);
                setError(`Failed to load goats: ${err.message}`);
                setLoading(false);
            });
    }, [navigate]);

    const handlePurchase = (goat) => {
        if (purchasingIds.has(goat.id)) return;

        // Prompt user to enter a price
        Swal.fire({
            title: `Purchase Goat #${goat.goat_number}`,
            text: `Enter your offer (between $${goat.minimum_price} and $${goat.maximum_price}):`,
            input: 'number',
            inputLabel: 'Price ($)',
            inputPlaceholder: 'Enter price',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            inputValidator: (value) => {
                const price = parseFloat(value);
                if (!value || isNaN(price)) {
                    return 'Please enter a valid price!';
                }
                if (price < goat.minimum_price || price > goat.maximum_price) {
                    return `Price must be between $${goat.minimum_price} and $${goat.maximum_price}!`;
                }
                return null;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const price = parseFloat(result.value);
                setPurchasingIds((prev) => new Set(prev).add(goat.id));

                const token = localStorage.getItem('token');
                fetch('http://localhost:3000/api/purchases', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ goat_id: goat.id, price }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            return res.json().then((data) => {
                                throw new Error(data.message || 'Failed to purchase goat.');
                            });
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Goat Purchased',
                            text: 'You have successfully purchased the goat!',
                            confirmButtonColor: '#3085d6',
                        }).then(() => {
                            setGoats(goats.filter((g) => g.id !== goat.id));
                            navigate('/my-goats');
                        });
                    })
                    .catch((err) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Purchase Failed',
                            text: err.message || 'Failed to purchase goat. Please try again.',
                            confirmButtonColor: '#3085d6',
                        });
                    })
                    .finally(() => {
                        setPurchasingIds((prev) => {
                            const copy = new Set(prev);
                            copy.delete(goat.id);
                            return copy;
                        });
                    });
            }
        });
    };

    const handleViewDetails = (goat) => {
        Swal.fire({
            icon: 'info',
            title: `Goat #${goat.goat_number} Details`,
            html: `
        <div style="text-align: left;">
          <p><strong>Breed:</strong> ${goat.breed || 'N/A'}</p>
          <p><strong>Date of Birth:</strong> ${goat.dob ? new Date(goat.dob).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Weight:</strong> ${goat.weight ? `${goat.weight} kg` : 'N/A'}</p>
          <p><strong>Health Status:</strong> ${goat.health_status || 'N/A'}</p>
          <p><strong>Minimum Price:</strong> $${goat.minimum_price || 'N/A'}</p>
          <p><strong>Maximum Price:</strong> $${goat.maximum_price || 'N/A'}</p>
          ${goat.price ? `<p><strong>Fixed Price:</strong> $${goat.price}</p>` : ''}
          <p><strong>Status:</strong> ${goat.is_active ? 'Active' : 'Inactive'}</p>
          ${goat.image_url ? `<img src="http://localhost:3000${goat.image_url}" alt="Goat Photo" style="max-width: 300px; margin-top: 10px;" />` : '<p>No image available</p>'}
        </div>
      `,
            confirmButtonColor: '#3085d6',
        });
    };

    const handleBack = () => {
        navigate('/customer-dashboard');
    };

    if (loading)
        return (
            <div className="text-center p-10">
                <svg
                    className="animate-spin h-8 w-8 text-blue-600 mx-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <p className="text-gray-600 mt-2">Loading...</p>
            </div>
        );

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
                    Buy Goats
                </h2>
                {goats.length === 0 ? (
                    <div className="text-center text-gray-800">
                        <p>No goats available for purchase.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goats.map((goat) => (
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
                                            loading="lazy"
                                            onError={(e) => {
                                                console.error('Failed to load goat image:', e);
                                                e.target.src = 'https://via.placeholder.com/300x225?text=Goat+Image+Not+Found';
                                            }}
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
                                                marginBottom: '8px',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                            }}
                                        >
                                            <strong>Weight:</strong> {goat.weight ? `${goat.weight} kg` : 'N/A'}
                                        </p>
                                        <p
                                            style={{
                                                color: '#374151',
                                                fontSize: '14px',
                                                visibility: 'visible',
                                                display: 'block',
                                                width: '100%',
                                                marginBottom: '8px',
                                                overflowWrap: 'break-word',
                                                whiteSpace: 'normal',
                                            }}
                                        >
                                            <strong>Price Range:</strong> ${goat.minimum_price} - ${goat.maximum_price}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleViewDetails(goat)}
                                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handlePurchase(goat)}
                                            disabled={purchasingIds.has(goat.id)}
                                            className={`flex-1 py-2 px-4 text-white rounded-md ${purchasingIds.has(goat.id)
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                        >
                                            {purchasingIds.has(goat.id) ? 'Purchasing...' : 'Purchase'}
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

export default BuyGoats;