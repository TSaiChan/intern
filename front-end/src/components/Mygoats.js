import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import './css/login.css';

function MyGoats() {
    const [goats, setGoats] = useState([]);
    const [filteredGoats, setFilteredGoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [healthRecords, setHealthRecords] = useState({});
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

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
                    fetchHealthRecords(goat.id, token);
                });
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching goats:', err);
                setError('Failed to load goats.');
                setLoading(false);
            });
    }, [navigate]);

    const fetchHealthRecords = (goatId, token) => {
        fetch(`http://localhost:3000/api/customer/goats/${goatId}/health`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                console.log(`Health records for goat ${goatId}:`, data);
                setHealthRecords((prev) => ({ ...prev, [goatId]: data }));
            })
            .catch((err) => {
                console.error(`Error fetching health records for goat ${goatId}:`, err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load health records.',
                    confirmButtonColor: '#3085d6',
                });
            });
    };

    useEffect(() => {
        const filtered = goats.filter((goat) => {
            const goatName = `Goat #${goat.goat_number} - ${goat.breed}`.toLowerCase();
            return goatName.includes(searchTerm.toLowerCase());
        });
        setFilteredGoats(filtered);
        setCurrentPage(1);
    }, [goats, searchTerm]);

    const totalPages = Math.ceil(filteredGoats.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentGoats = filteredGoats.slice(startIndex, endIndex);

    const handleSearch = () => {
        console.log('Searching for:', searchTerm);
    };

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

                fetch(`http://localhost:3000/api/customer/goats/${goatId}/deactivate`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
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
                        setHealthRecords((prev) => {
                            const updated = { ...prev };
                            delete updated[goatId];
                            return updated;
                        });
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

    const handleViewHealthRecords = (goat) => {
        const records = healthRecords[goat.id] || [];
        if (records.length === 0) {
            Swal.fire({
                icon: 'info',
                title: `Health Records for Goat #${goat.goat_number} - ${goat.breed}`,
                text: 'No health records found.',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Add Health Record',
                cancelButtonText: 'Close',
            }).then((result) => {
                if (result.isConfirmed) {
                    handleAddHealthRecord(goat);
                }
            });
            return;
        }

        const html = `
      <div style="text-align: left; max-height: 400px; overflow-y: auto;">
        ${records
                .map(
                    (record) => `
          <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
            <p><strong>Date Checked:</strong> ${new Date(record.date_checked).toLocaleDateString()}</p>
            <p><strong>Type:</strong> ${record.health_type}</p>
            <p><strong>Description:</strong> ${record.description || 'N/A'}</p>
            <p><strong>Veterinarian:</strong> ${record.veterinarian || 'N/A'}</p>
            <p><strong>Next Due Date:</strong> ${record.next_due_date ? new Date(record.next_due_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Status:</strong> ${record.status}</p>
            <button class="swal2-confirm swal2-styled" style="background-color: #3085d6; margin-right: 10px;" onclick="Swal.close(); document.dispatchEvent(new CustomEvent('editHealthRecord', { detail: { id: ${record.id}, goatId: ${goat.id} } }));">Edit</button>
            <button class="swal2-cancel swal2-styled" style="background-color: #d33;" onclick="Swal.close(); document.dispatchEvent(new CustomEvent('deleteHealthRecord', { detail: { id: ${record.id}, goatId: ${goat.id} } }));">Delete</button>
          </div>
        `
                )
                .join('')}
      </div>
    `;
        Swal.fire({
            icon: 'info',
            title: `Health Records for Goat #${goat.goat_number} - ${goat.breed}`,
            html,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Close',
            showCancelButton: true,
            cancelButtonColor: '#6b7280',
            cancelButtonText: 'Add Health Record',
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                handleAddHealthRecord(goat);
            }
        });
    };

    const handleAddHealthRecord = (goat) => {
        Swal.fire({
            title: `Add Health Record for Goat #${goat.goat_number} - ${goat.breed}`,
            html: `
        <div style="text-align: left; max-width: 400px; margin: 0 auto;">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Date Checked:</label>
              <input type="date" id="date_checked" class="swal2-input" style="width: 100%; padding: 8px; border-radius: 4px;" max="${new Date().toISOString().split('T')[0]}">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Health Type:</label>
              <select id="health_type" class="swal2-select" style="width: 100%; padding: 8px; border-radius: 4px;">
                <option value="" disabled hidden>Select</option>
                <option value="vaccination">Vaccination</option>
                <option value="checkup">Checkup</option>
                <option value="deworming">Deworming</option>
              </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Description:</label>
              <textarea id="description" class="swal2-textarea" placeholder="Enter description (optional)" style="width: 100%; padding: 8px; border-radius: 4px; resize: vertical;"></textarea>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Veterinarian:</label>
              <input type="text" id="veterinarian" class="swal2-input" placeholder="Enter veterinarian name (optional)" style="width: 100%; padding: 8px; border-radius: 4px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Next Due Date:</label>
              <input type="date" id="next_due_date" class="swal2-input" placeholder="Select next due date (optional)" style="width: 100%; padding: 8px; border-radius: 4px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Status:</label>
              <select id="status" class="swal2-select" style="width: 100%; padding: 8px; border-radius: 4px;">
                <option value="" disabled hidden>Select</option>
                <option value="Healthy">Healthy</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      `,
            didOpen: () => {
                // Force the dropdowns to select the placeholder option
                document.getElementById('health_type').value = '';
                document.getElementById('status').value = '';
            },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Add',
            preConfirm: () => {
                const date_checked = document.getElementById('date_checked').value;
                const health_type = document.getElementById('health_type').value;
                const description = document.getElementById('description').value;
                const veterinarian = document.getElementById('veterinarian').value;
                const next_due_date = document.getElementById('next_due_date').value;
                const status = document.getElementById('status').value;

                if (!date_checked || !health_type || !status) {
                    Swal.showValidationMessage('Please fill in Date Checked, Health Type, and Status');
                    return false;
                }
                return { date_checked, health_type, description, veterinarian, next_due_date, status, goat_id: goat.id };
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                fetch('http://localhost:3000/api/customer/goats/health', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(result.value),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error('Failed to add health record');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Health Record Added',
                            text: data.message,
                            confirmButtonColor: '#3085d6',
                        });
                        fetchHealthRecords(goat.id, token);
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

    const handleEditHealthRecord = useCallback((healthId, goatId) => {
        const record = healthRecords[goatId]?.find((r) => r.id === healthId);
        if (!record) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Health record not found.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        Swal.fire({
            title: `Edit Health Record for Goat`,
            html: `
        <div style="text-align: left; max-width: 400px; margin: 0 auto;">
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Date Checked:</label>
              <input type="date" id="date_checked" class="swal2-input" value="${record.date_checked.split('T')[0]}" style="width: 100%; padding: 8px; border-radius: 4px;" max="${new Date().toISOString().split('T')[0]}">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Health Type:</label>
              <select id="health_type" class="swal2-select" style="width: 100%; padding: 8px; border-radius: 4px;">
                <option value="" disabled hidden>Select</option>
                <option value="vaccination" ${record.health_type === 'vaccination' ? 'selected' : ''}>Vaccination</option>
                <option value="checkup" ${record.health_type === 'checkup' ? 'selected' : ''}>Checkup</option>
                <option value="deworming" ${record.health_type === 'deworming' ? 'selected' : ''}>Deworming</option>
              </select>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Description:</label>
              <textarea id="description" class="swal2-textarea" style="width: 100%; padding: 8px; border-radius: 4px; resize: vertical;">${record.description || ''}</textarea>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Veterinarian:</label>
              <input type="text" id="veterinarian" class="swal2-input" value="${record.veterinarian || ''}" style="width: 100%; padding: 8px; border-radius: 4px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Next Due Date:</label>
              <input type="date" id="next_due_date" class="swal2-input" value="${record.next_due_date ? record.next_due_date.split('T')[0] : ''}" style="width: 100%; padding: 8px; border-radius: 4px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-weight: 500; color: #333;">Status:</label>
              <select id="status" class="swal2-select" style="width: 100%; padding: 8px; border-radius: 4px;">
                <option value="" disabled hidden>Select</option>
                <option value="Healthy" ${record.status === 'Healthy' ? 'selected' : ''}>Healthy</option>
                <option value="Needs Attention" ${record.status === 'Needs Attention' ? 'selected' : ''}>Needs Attention</option>
                <option value="Critical" ${record.status === 'Critical' ? 'selected' : ''}>Critical</option>
              </select>
            </div>
          </div>
        </div>
      `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Update',
            preConfirm: () => {
                const date_checked = document.getElementById('date_checked').value;
                const health_type = document.getElementById('health_type').value;
                const description = document.getElementById('description').value;
                const veterinarian = document.getElementById('veterinarian').value;
                const next_due_date = document.getElementById('next_due_date').value;
                const status = document.getElementById('status').value;

                if (!date_checked || !health_type || !status) {
                    Swal.showValidationMessage('Please fill in Date Checked, Health Type, and Status');
                    return false;
                }
                return { date_checked, health_type, description, veterinarian, next_due_date, status, goat_id: goatId };
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                fetch(`http://localhost:3000/api/customer/goats/health/${healthId}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(result.value),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error('Failed to update health record');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Health Record Updated',
                            text: data.message,
                            confirmButtonColor: '#3085d6',
                        });
                        fetchHealthRecords(goatId, token);
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
    }, [healthRecords, fetchHealthRecords]);

    const handleDeleteHealthRecord = useCallback((healthId, goatId) => {
        Swal.fire({
            icon: 'warning',
            title: 'Are you sure?',
            text: 'This action will permanently delete the health record!',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                const token = localStorage.getItem('token');
                fetch(`http://localhost:3000/api/customer/goats/health/${healthId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error('Failed to delete health record');
                        }
                        return res.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Health Record Deleted',
                            text: data.message,
                            confirmButtonColor: '#3085d6',
                        });
                        fetchHealthRecords(goatId, token);
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
    }, [fetchHealthRecords]);

    useEffect(() => {
        const handleEdit = (e) => handleEditHealthRecord(e.detail.id, e.detail.goatId);
        const handleDelete = (e) => handleDeleteHealthRecord(e.detail.id, e.detail.goatId);
        document.addEventListener('editHealthRecord', handleEdit);
        document.addEventListener('deleteHealthRecord', handleDelete);
        return () => {
            document.removeEventListener('editHealthRecord', handleEdit);
            document.removeEventListener('deleteHealthRecord', handleDelete);
        };
    }, [handleEditHealthRecord, handleDeleteHealthRecord]);

    const handleBack = () => {
        navigate('/customer-dashboard');
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
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
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleBack}
                        className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                    >
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by goat name..."
                            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                        <button
                            onClick={handleSearch}
                            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search
                        </button>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center drop-shadow-md">
                    My Goats
                </h2>

                {filteredGoats.length === 0 ? (
                    <div className="text-center text-gray-800">
                        <p>No goats found.</p>
                        <button
                            onClick={() => navigate('/sell-goat')}
                            className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            List a Goat for Sale
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {currentGoats.map((goat) => (
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
                                                className="flex-1 py-2 px-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center gap-1"
                                                title="View Details"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleEdit(goat)}
                                                className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-1"
                                                title="Edit Listing"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(goat.id, goat.is_active)}
                                                className={`flex-1 py-2 px-3 text-white rounded-md ${goat.is_active
                                                    ? 'bg-orange-600 hover:bg-orange-700'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                    } transition flex items-center justify-center gap-1`}
                                                title={goat.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={goat.is_active ? "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                                </svg>
                                                {goat.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(goat.id)}
                                                className="flex-1 py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center justify-center gap-1"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => handleViewHealthRecords(goat)}
                                                className="flex-1 py-2 px-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center justify-center gap-1"
                                                title="Health Records"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                Health
                                            </button>
                                            <button
                                                onClick={() => handleAddHealthRecord(goat)}
                                                className="flex-1 py-2 px-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition flex items-center justify-center gap-1"
                                                title="Add Health Record"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add Health
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`py-2 px-4 rounded-md transition ${currentPage === 1
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    Previous
                                </button>

                                {[...Array(totalPages)].map((_, index) => (
                                    <button
                                        key={index + 1}
                                        onClick={() => handlePageChange(index + 1)}
                                        className={`py-2 px-4 rounded-md transition ${currentPage === index + 1
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`py-2 px-4 rounded-md transition ${currentPage === totalPages
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        <div className="text-center text-gray-600 mt-4">
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredGoats.length)} of {filteredGoats.length} goats
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MyGoats;