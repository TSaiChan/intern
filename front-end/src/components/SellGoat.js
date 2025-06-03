import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

function SellGoat() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const isEditing = !!state?.goat;
    const [formData, setFormData] = useState({
        goat_number: isEditing ? state.goat.goat_number : '',
        breed: isEditing ? state.goat.breed : '',
        dob: isEditing ? state.goat.dob.split('T')[0] : '',
        weight: isEditing ? state.goat.weight : '',
        health_status: isEditing ? state.goat.health_status : '',
        minimum_price: isEditing ? state.goat.minimum_price : '',
        maximum_price: isEditing ? state.goat.maximum_price : '',
        price: isEditing ? state.goat.price || '' : '',
        is_active: isEditing ? state.goat.is_active : true,
        image: null,
    });
    const [imagePreview, setImagePreview] = useState(isEditing && state.goat.image_url ? `http://localhost:3000${state.goat.image_url}` : null);

    const [verified, setVerified] = useState(false);
    const [canSell, setCanSell] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Unauthorized',
                text: 'Please log in to access this page.',
                confirmButtonColor: '#3085d6',
            }).then(() => navigate('/'));
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            console.log('User ID from token:', decodedToken.userId);
        } catch (err) {
            console.error('Error decoding token:', err);
        }

        fetch('http://localhost:3000/api/customer/profile', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch profile');
                }
                return res.json();
            })
            .then((data) => {
                console.log('Profile API response in SellGoat:', data);
                console.log('Type of verified:', typeof data.verified, 'Value:', data.verified);
                console.log('Type of can_sell:', typeof data.can_sell, 'Value:', data.can_sell);

                const isVerified = Boolean(Number(data.verified));
                const canSellPermission = Boolean(Number(data.can_sell));

                if (isVerified && canSellPermission) {
                    setVerified(true);
                    setCanSell(true);
                } else if (!isVerified) {
                    setMessage('You must complete KYC before listing goats for sale.');
                } else if (!canSellPermission) {
                    setMessage('You need permission to sell goats. Update your profile to enable selling.');
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching profile:', err);
                setMessage('Failed to verify customer info.');
                setLoading(false);
            });
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            setFormData((prev) => ({ ...prev, image: file }));
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setImagePreview(null);
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        }
        setMessage('');
    };

    const validateForm = () => {
        const {
            goat_number,
            breed,
            dob,
            weight,
            health_status,
            minimum_price,
            maximum_price,
            price,
            image,
        } = formData;

        if (
            !goat_number.trim() ||
            !breed.trim() ||
            !dob ||
            !weight ||
            !health_status.trim() ||
            !minimum_price ||
            !maximum_price ||
            (!image && !isEditing)
        ) {
            setMessage('All required fields must be filled.');
            return false;
        }
        if (new Date(dob) > new Date()) {
            setMessage('Date of birth cannot be in the future.');
            return false;
        }
        if (parseFloat(weight) <= 0) {
            setMessage('Weight must be greater than 0.');
            return false;
        }
        if (parseFloat(minimum_price) <= 0 || parseFloat(maximum_price) <= 0) {
            setMessage('Prices must be greater than 0.');
            return false;
        }
        if (parseFloat(minimum_price) > parseFloat(maximum_price)) {
            setMessage('Minimum price cannot exceed maximum price.');
            return false;
        }
        if (price && price.trim() !== '' && parseFloat(price) <= 0) {
            setMessage('Fixed price must be greater than 0 if provided.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        const token = localStorage.getItem('token');
        const formDataToSend = new FormData();

        for (const key in formData) {
            if (key === 'image' && formData[key]) {
                formDataToSend.append('image', formData[key]);
            } else if (formData[key] !== '') {
                formDataToSend.append(key, formData[key]);
            }
        }

        try {
            const url = isEditing
                ? `http://localhost:3000/api/customer/goats/${state.goat.id}`
                : 'http://localhost:3000/api/customer/goats';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formDataToSend,
            });

            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: isEditing ? 'Goat Updated' : 'Goat Registered',
                    text: isEditing ? 'The goat listing has been updated.' : 'Your goat has been successfully listed for sale.',
                    confirmButtonColor: '#3085d6',
                }).then(() => navigate('/my-goats'));
            } else {
                setMessage(data.message || 'Failed to register goat. Ensure goat number is unique.');
            }
        } catch (err) {
            setMessage('Network error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center p-10 text-gray-600">Loading...</div>;

    if (!verified) {
        return <div className="text-center p-10 text-red-500">{message}</div>;
    }

    if (!canSell) {
        return <div className="text-center p-10 text-yellow-500">{message}</div>;
    }

    return (
        <div
            className="min-h-screen bg-cover bg-center p-6 font-sans"
            style={{
                backgroundImage: `url('/images/index.jpg')`,
            }}
        >
            <div className="max-w-3xl mx-auto bg-white bg-opacity-95 rounded-xl shadow-lg p-6 backdrop-blur-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6 drop-shadow-md">
                    {isEditing ? 'Edit Goat Listing' : 'Register a Goat for Sale'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" noValidate>
                    <div>
                        <label htmlFor="goat_number" className="block text-sm font-medium text-gray-700">
                            Goat Number
                        </label>
                        <input
                            id="goat_number"
                            name="goat_number"
                            type="text"
                            value={formData.goat_number}
                            onChange={handleChange}
                            placeholder="Unique goat identifier"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="breed" className="block text-sm font-medium text-gray-700">
                            Breed
                        </label>
                        <input
                            id="breed"
                            name="breed"
                            type="text"
                            value={formData.breed}
                            onChange={handleChange}
                            placeholder="Goat breed"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                            Date of Birth
                        </label>
                        <input
                            id="dob"
                            name="dob"
                            type="date"
                            value={formData.dob}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                            Weight (kg)
                        </label>
                        <input
                            id="weight"
                            name="weight"
                            type="number"
                            step="0.1"
                            value={formData.weight}
                            onChange={handleChange}
                            placeholder="Weight in kilograms"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="health_status" className="block text-sm font-medium text-gray-700">
                            Health Status
                        </label>
                        <input
                            id="health_status"
                            name="health_status"
                            type="text"
                            value={formData.health_status}
                            onChange={handleChange}
                            placeholder="General health information"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="minimum_price" className="block text-sm font-medium text-gray-700">
                            Minimum Price
                            <span className="ml-2 text-gray-500 text-xs">
                                (e.g., $50-$100, based on breed and weight)
                            </span>
                        </label>
                        <input
                            id="minimum_price"
                            name="minimum_price"
                            type="number"
                            step="0.01"
                            value={formData.minimum_price}
                            onChange={handleChange}
                            placeholder="Minimum bid or price"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="maximum_price" className="block text-sm font-medium text-gray-700">
                            Maximum Price
                            <span className="ml-2 text-gray-500 text-xs">
                                (e.g., $150-$300, based on market value)
                            </span>
                        </label>
                        <input
                            id="maximum_price"
                            name="maximum_price"
                            type="number"
                            step="0.01"
                            value={formData.maximum_price}
                            onChange={handleChange}
                            placeholder="Maximum expected price"
                            required
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                            Fixed Price (Optional)
                        </label>
                        <input
                            id="price"
                            name="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Fixed sale price"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <input
                                name="is_active"
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            Active Listing
                        </label>
                    </div>
                    <div className="col-span-2">
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                            Upload Goat Image
                        </label>
                        <input
                            id="image"
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleChange}
                            required={!isEditing}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                        {imagePreview && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">Image Preview:</p>
                                <img
                                    src={imagePreview}
                                    alt="Goat Preview"
                                    className="mt-2 max-w-full h-auto rounded-md shadow-md"
                                    style={{ maxHeight: '200px' }}
                                />
                            </div>
                        )}
                    </div>
                    {message && (
                        <p className="col-span-2 text-red-500 text-sm" role="alert" aria-live="assertive">
                            {message}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`col-span-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition ${submitting ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {submitting ? 'Submitting...' : isEditing ? 'Update Goat' : 'Register Goat'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SellGoat;