import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './css/dashboard.css';

function CustomerDashboard() {
    const [user, setUser] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Fetch user and customer data on component mount
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/user-profile', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await response.json();

            // Check if user is customer (role = 0)
            if (userData.role !== 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'You do not have permission to access this page.',
                    confirmButtonColor: '#d33',
                }).then(() => {
                    navigate('/login');
                });
                return;
            }

            setUser(userData);

            // Fetch customer-specific data
            const customerResponse = await fetch('http://localhost:3000/api/customer-profile', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                setCustomerData(customerData);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load user data. Please login again.',
                confirmButtonColor: '#d33',
            }).then(() => {
                navigate('/login');
            });
        }
    };

    const handleLogout = async () => {
        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: 'You will be logged out of your account.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, logout'
            });

            if (result.isConfirmed) {
                const response = await fetch('http://localhost:3000/api/logout', {
                    method: 'POST',
                    credentials: 'include',
                });

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Logged Out',
                        text: 'You have been successfully logged out.',
                        confirmButtonColor: '#3085d6',
                    }).then(() => {
                        navigate('/login');
                    });
                }
            }
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/login');
        }
    };

    const renderDashboardContent = () => {
        switch (activeMenu) {
            case 'dashboard':
                return <DashboardOverview user={user} customerData={customerData} />;
            case 'buy-goats':
                return <BuyGoats />;
            case 'my-goats':
                return <MyGoats />;
            case 'sell-goat':
                return <SellGoat />;
            case 'profile':
                return <ProfileSettings user={user} customerData={customerData} onUpdate={fetchUserData} />;
            default:
                return <DashboardOverview user={user} customerData={customerData} />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <div className="sidebar-header">
                    <h2>Digi Goat</h2>
                    <p>Welcome, {user?.username}!</p>
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('dashboard')}
                    >
                        <i className="fas fa-tachometer-alt"></i>
                        Dashboard
                    </button>

                    {/* Show Buy Goats only if can_buy is true */}
                    {customerData?.can_buy && (
                        <button
                            className={`nav-item ${activeMenu === 'buy-goats' ? 'active' : ''}`}
                            onClick={() => setActiveMenu('buy-goats')}
                        >
                            <i className="fas fa-shopping-cart"></i>
                            Buy Goats
                        </button>
                    )}

                    <button
                        className={`nav-item ${activeMenu === 'my-goats' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('my-goats')}
                    >
                        <i className="fas fa-list"></i>
                        My Goats
                    </button>

                    {/* Show Sell Goat only if can_sell is true */}
                    {customerData?.can_sell && (
                        <button
                            className={`nav-item ${activeMenu === 'sell-goat' ? 'active' : ''}`}
                            onClick={() => setActiveMenu('sell-goat')}
                        >
                            <i className="fas fa-plus-circle"></i>
                            Sell a Goat
                        </button>
                    )}

                    <button
                        className={`nav-item ${activeMenu === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveMenu('profile')}
                    >
                        <i className="fas fa-user-cog"></i>
                        Profile Settings
                    </button>

                    <button
                        className="nav-item logout-btn"
                        onClick={handleLogout}
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="dashboard-main">
                <div className="main-header">
                    <h1>{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1).replace('-', ' ')}</h1>
                </div>

                <div className="main-content">
                    {renderDashboardContent()}
                </div>
            </div>
        </div>
    );
}

// Dashboard Overview Component
function DashboardOverview({ user, customerData }) {
    return (
        <div className="dashboard-overview">
            <div className="overview-cards">
                <div className="overview-card">
                    <div className="card-icon">
                        <i className="fas fa-user-circle"></i>
                    </div>
                    <div className="card-content">
                        <h3>Profile Status</h3>
                        <p className={`status ${user?.verified ? 'verified' : 'unverified'}`}>
                            {user?.verified ? 'Verified' : 'Unverified'}
                        </p>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="card-icon">
                        <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="card-content">
                        <h3>Buy Permission</h3>
                        <p className={`status ${customerData?.can_buy ? 'enabled' : 'disabled'}`}>
                            {customerData?.can_buy ? 'Enabled' : 'Disabled'}
                        </p>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="card-icon">
                        <i className="fas fa-tag"></i>
                    </div>
                    <div className="card-content">
                        <h3>Sell Permission</h3>
                        <p className={`status ${customerData?.can_sell ? 'enabled' : 'disabled'}`}>
                            {customerData?.can_sell ? 'Enabled' : 'Disabled'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h3>Recent Activity</h3>
                <p>Welcome to your Digi Goat dashboard! Here you can manage your goat buying and selling activities.</p>
            </div>
        </div>
    );
}

// Buy Goats Component
function BuyGoats() {
    const [goats, setGoats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAvailableGoats();
    }, []);

    const fetchAvailableGoats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/goats-for-sale', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setGoats(data);
            }
        } catch (error) {
            console.error('Error fetching goats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading available goats...</div>;
    }

    return (
        <div className="buy-goats">
            <h3>Available Goats for Purchase</h3>
            {goats.length === 0 ? (
                <p>No goats available for purchase at the moment.</p>
            ) : (
                <div className="goats-grid">
                    {goats.map(goat => (
                        <div key={goat.id} className="goat-card">
                            <img src={goat.photo || '/placeholder-goat.jpg'} alt={goat.name} />
                            <div className="goat-info">
                                <h4>{goat.name}</h4>
                                <p>Price: ₹{goat.price}</p>
                                <p>Breed: {goat.breed}</p>
                                <button className="buy-btn">Buy Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// My Goats Component
function MyGoats() {
    const [myGoats, setMyGoats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyGoats();
    }, []);

    const fetchMyGoats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/my-goats', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setMyGoats(data);
            }
        } catch (error) {
            console.error('Error fetching my goats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading your goats...</div>;
    }

    return (
        <div className="my-goats">
            <h3>My Goats</h3>
            {myGoats.length === 0 ? (
                <p>You haven't registered any goats yet.</p>
            ) : (
                <div className="goats-list">
                    {myGoats.map(goat => (
                        <div key={goat.id} className="goat-item">
                            <img src={goat.photo || '/placeholder-goat.jpg'} alt={goat.name} />
                            <div className="goat-details">
                                <h4>{goat.name}</h4>
                                <p>Breed: {goat.breed}</p>
                                <p>Age: {goat.age} months</p>
                                <p>Status: {goat.status}</p>
                            </div>
                            <div className="goat-actions">
                                <button className="edit-btn">Edit</button>
                                <button className="delete-btn">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Sell Goat Component
function SellGoat() {
    const [formData, setFormData] = useState({
        name: '',
        breed: '',
        age: '',
        price: '',
        description: '',
        photo: ''
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3000/api/add-goat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Goat Added!',
                    text: 'Your goat has been successfully added for sale.',
                    confirmButtonColor: '#3085d6',
                });
                setFormData({
                    name: '',
                    breed: '',
                    age: '',
                    price: '',
                    description: '',
                    photo: ''
                });
            } else {
                throw new Error('Failed to add goat');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to add goat. Please try again.',
                confirmButtonColor: '#d33',
            });
        }
    };

    return (
        <div className="sell-goat">
            <h3>Add Goat for Sale</h3>
            <form onSubmit={handleSubmit} className="sell-form">
                <div className="form-group">
                    <label>Goat Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Breed</label>
                    <input
                        type="text"
                        name="breed"
                        value={formData.breed}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Age (months)</label>
                    <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Photo URL</label>
                    <input
                        type="url"
                        name="photo"
                        value={formData.photo}
                        onChange={handleInputChange}
                    />
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="4"
                    ></textarea>
                </div>

                <button type="submit" className="submit-btn">Add Goat</button>
            </form>
        </div>
    );
}

// Profile Settings Component
function ProfileSettings({ user, customerData, onUpdate }) {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        address: customerData?.address || '',
        photo: customerData?.photo || ''
    });

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:3000/api/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Profile Updated!',
                    text: 'Your profile has been successfully updated.',
                    confirmButtonColor: '#3085d6',
                });
                onUpdate(); // Refresh user data
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update profile. Please try again.',
                confirmButtonColor: '#d33',
            });
        }
    };

    return (
        <div className="profile-settings">
            <h3>Profile Settings</h3>
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Address</label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows="3"
                    ></textarea>
                </div>

                <div className="form-group">
                    <label>Profile Photo URL</label>
                    <input
                        type="url"
                        name="photo"
                        value={formData.photo}
                        onChange={handleInputChange}
                    />
                </div>

                <button type="submit" className="submit-btn">Update Profile</button>
            </form>
        </div>
    );
}

export default CustomerDashboard;