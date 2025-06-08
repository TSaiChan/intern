const db = require('../config/db');

const updateCustomerProfile = (req, res) => {
    const userId = req.user.userId;
    const { address, can_buy, can_sell } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    if (!address) {
        return res.status(400).json({ message: 'Address is required' });
    }

    if (!photo && req.method === 'POST') {
        return res.status(400).json({ message: 'Profile photo is required' });
    }

    const canBuy = can_buy === 'true' || can_buy === true;
    const requestCanSell = can_sell === 'true' || can_sell === true;

    db.query('SELECT * FROM customers WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            console.error('DB error while checking profile:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }

        const profileExists = results.length > 0;
        const currentCanSell = profileExists ? results[0].can_sell : false;
        const currentPhoto = profileExists ? results[0].photo : null;

        const handleProfile = () => {
            const updatePhoto = photo || currentPhoto;

            if (profileExists) {
                db.query(
                    'UPDATE customers SET address = ?, can_buy = ?, photo = ? WHERE user_id = ?',
                    [address, canBuy, updatePhoto, userId],
                    (err) => {
                        if (err) {
                            console.error('DB error while updating profile:', err);
                            return res.status(500).json({ message: 'Failed to update profile', error: err.message });
                        }
                        res.json({ success: true, message: 'Profile updated successfully' });
                    }
                );
            } else {
                db.query(
                    'INSERT INTO customers (user_id, address, can_buy, can_sell, photo) VALUES (?, ?, ?, ?, ?)',
                    [userId, address, canBuy, false, photo],
                    (err) => {
                        if (err) {
                            console.error('DB error while creating profile:', err);
                            return res.status(500).json({ message: 'Failed to create profile', error: err.message });
                        }
                        res.status(201).json({ success: true, message: 'Profile created successfully' });
                    }
                );
            }
        };

        if (requestCanSell && !currentCanSell) {
            db.query(
                'SELECT * FROM seller_requests WHERE user_id = ? AND status = ?',
                [userId, 'pending'],
                (err, requests) => {
                    if (err) {
                        console.error('DB error while checking seller_requests:', err);
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }

                    if (requests.length > 0) {
                        handleProfile();
                    } else {
                        db.query(
                            'INSERT INTO seller_requests(user_id, status) VALUES (?, ?)',
                            [userId, 'pending'],
                            (err) => {
                                if (err) {
                                    console.error('DB error while creating can_sell request:', err);
                                    return res.status(500).json({ message: 'Failed to create can_sell request', error: err.message });
                                }
                                handleProfile();
                            }
                        );
                    }
                }
            );
        } else {
            handleProfile();
        }
    });
};

const getCustomerProfile = (req, res) => {
    const userId = req.user.userId;

    db.query(
        'SELECT group_id, username, email, verified, active FROM users WHERE id = ?',
        [userId],
        (err, userResults) => {
            if (err) {
                console.error('DB error while fetching user:', err);
                return res.status(500).json({ message: 'Failed to fetch user data' });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const userData = userResults[0];

            db.query(
                'SELECT * FROM customers WHERE user_id = ?',
                [userId],
                (err, customerResults) => {
                    if (err) {
                        console.error('DB error while fetching profile:', err);
                        return res.status(500).json({ message: 'Failed to fetch profile' });
                    }

                    if (customerResults.length === 0) {
                        return res.status(404).json({
                            message: 'Profile not found',
                            group_id: userData.group_id,
                            username: userData.username,
                            email: userData.email,
                            verified: userData.verified,
                        });
                    }

                    db.query(
                        'SELECT status FROM seller_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                        [userId],
                        (err, requestResults) => {
                            if (err) {
                                console.error('DB error while fetching seller_requests:', err);
                                return res.status(500).json({ message: 'Failed to fetch seller_requests', error: err.message });
                            }

                            const profile = {
                                ...customerResults[0],
                                group_id: userData.group_id,
                                username: userData.username,
                                email: userData.email,
                                verified: userData.verified,
                                can_sell_status: requestResults.length > 0 ? requestResults[0].status : null,
                            };
                            res.json(profile);
                        }
                    );
                }
            );
        }
    );
};

// New endpoint for admin to fetch customer profile by user_id
const getCustomerProfileById = (req, res) => {
    const userId = req.params.userId;

    db.query(
        'SELECT group_id, username, email, verified, active FROM users WHERE id = ?',
        [userId],
        (err, userResults) => {
            if (err) {
                console.error('DB error while fetching user:', err);
                return res.status(500).json({ message: 'Failed to fetch user data', error: err.message });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            const userData = userResults[0];

            db.query(
                'SELECT * FROM customers WHERE user_id = ?',
                [userId],
                (err, customerResults) => {
                    if (err) {
                        console.error('DB error while fetching profile:', err);
                        return res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
                    }

                    if (customerResults.length === 0) {
                        return res.status(404).json({
                            message: 'Profile not found',
                            group_id: userData.group_id,
                            username: userData.username,
                            email: userData.email,
                            verified: userData.verified,
                        });
                    }

                    db.query(
                        'SELECT status FROM seller_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                        [userId],
                        (err, requestResults) => {
                            if (err) {
                                console.error('DB error while fetching seller_requests:', err);
                                return res.status(500).json({ message: 'Failed to fetch seller_requests', error: err.message });
                            }

                            const profile = {
                                ...customerResults[0],
                                group_id: userData.group_id,
                                username: userData.username,
                                email: userData.email,
                                verified: userData.verified,
                                can_sell_status: requestResults.length > 0 ? requestResults[0].status : null,
                            };
                            res.json(profile);
                        }
                    );
                }
            );
        }
    );
};

const getGoatCount = (req, res) => {
    const userId = req.user.userId;

    db.query(
        'SELECT COUNT(*) as count FROM goats WHERE user_id = ?',
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching goat count:', err);
                return res.status(500).json({ message: 'Failed to fetch goat count', error: err.message });
            }
            res.json({ success: true, count: results[0].count });
        }
    );
};

const getPendingCanSellRequests = (req, res) => {
    db.query(
        'SELECT csr.id, csr.user_id, csr.status, csr.created_at, u.username, u.email ' +
        'FROM seller_requests csr ' +
        'JOIN users u ON csr.user_id = u.id ' +
        'WHERE csr.status = ?',
        ['pending'],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching pending requests:', err);
                return res.status(500).json({ message: 'Failed to fetch pending requests', error: err.message });
            }
            res.json(results);
        }
    );
};

// Updated endpoint to fetch all can_sell requests with pagination
const getAllCanSellRequests = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Query to get the total count of requests
    db.query(
        'SELECT COUNT(*) as total FROM seller_requests',
        (err, countResults) => {
            if (err) {
                console.error('DB error while fetching request count:', err);
                return res.status(500).json({ message: 'Failed to fetch request count', error: err.message });
            }

            const totalRequests = countResults[0].total;
            const totalPages = Math.ceil(totalRequests / limit);

            // Query to get paginated requests
            db.query(
                'SELECT csr.id, csr.user_id, csr.status, csr.created_at, u.username, u.email ' +
                'FROM seller_requests csr ' +
                'JOIN users u ON csr.user_id = u.id ' +
                'LIMIT ? OFFSET ?',
                [limit, offset],
                (err, results) => {
                    if (err) {
                        console.error('DB error while fetching all can_sell requests:', err);
                        return res.status(500).json({ message: 'Failed to fetch can_sell requests', error: err.message });
                    }

                    res.json({
                        requests: results,
                        currentPage: page,
                        totalPages: totalPages,
                        totalRequests: totalRequests,
                    });
                }
            );
        }
    );
};

const handleCanSellRequest = (req, res) => {
    const { requestId, action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const newCanSellValue = action === 'approve' ? 1 : 0;

    db.query(
        'SELECT user_id FROM seller_requests WHERE id = ? AND status = ?',
        [requestId, 'pending'],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching request:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Request not found or already processed' });
            }

            const userId = results[0].user_id;

            db.query(
                'UPDATE seller_requests SET status = ? WHERE id = ?',
                [newStatus, requestId],
                (err) => {
                    if (err) {
                        console.error('DB error while updating request:', err);
                        return res.status(500).json({ message: 'Failed to update request', error: err.message });
                    }

                    db.query(
                        'UPDATE customers SET can_sell = ? WHERE user_id = ?',
                        [newCanSellValue, userId],
                        (err) => {
                            if (err) {
                                console.error('DB error while updating customer:', err);
                                return res.status(500).json({ message: 'Failed to update customer', error: err.message });
                            }
                            res.json({ success: true, message: `Request ${newStatus} successfully` });
                        }
                    );
                }
            );
        }
    );
};

// New functions for goat management
const registerGoat = (req, res) => {
    const userId = req.user.userId;
    const {
        goat_number,
        breed,
        dob,
        weight,
        health_status,
        minimum_price,
        maximum_price,
        price,
    } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Validation
    if (!goat_number || !breed || !dob || !weight || !health_status || !minimum_price || !maximum_price) {
        return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if goat_number is unique
    db.query(
        'SELECT * FROM goats WHERE goat_number = ?',
        [goat_number],
        (err, results) => {
            if (err) {
                console.error('DB error while checking goat_number:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length > 0) {
                return res.status(400).json({ message: 'Goat number must be unique' });
            }

            // Check if user has can_sell permission
            db.query(
                'SELECT can_sell FROM customers WHERE user_id = ?',
                [userId],
                (err, customerResults) => {
                    if (err) {
                        console.error('DB error while checking customer:', err);
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (customerResults.length === 0 || !customerResults[0].can_sell) {
                        return res.status(403).json({ message: 'You are not authorized to sell goats' });
                    }

                    // Insert the goat
                    db.query(
                        `INSERT INTO goats (user_id, goat_number, breed, dob, weight, health_status, minimum_price, maximum_price, price, is_active, image_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
                        [
                            userId,
                            goat_number,
                            breed,
                            dob,
                            weight,
                            health_status,
                            minimum_price,
                            maximum_price,
                            price || null,
                            image_url,
                        ],
                        (err) => {
                            if (err) {
                                console.error('DB error while registering goat:', err);
                                return res.status(500).json({ message: 'Failed to register goat', error: err.message });
                            }
                            res.status(201).json({ success: true, message: 'Goat registered successfully' });
                        }
                    );
                }
            );
        }
    );
};

const getUserGoats = (req, res) => {
    const userId = req.user.userId;

    db.query(
        'SELECT * FROM goats WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching goats:', err);
                return res.status(500).json({ message: 'Failed to fetch goats', error: err.message });
            }
            res.json(results);
        }
    );
};

const updateGoat = (req, res) => {
    const userId = req.user.userId;
    const goatId = req.params.id;
    const {
        goat_number,
        breed,
        dob,
        weight,
        health_status,
        minimum_price,
        maximum_price,
        price,
    } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Check if the goat belongs to the user and is active
    db.query(
        'SELECT * FROM goats WHERE id = ? AND user_id = ? AND is_active = 1',
        [goatId, userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching goat:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Goat not found or not editable' });
            }

            const existingGoat = results[0];

            // Check if goat_number is unique (if changed)
            if (goat_number && goat_number !== existingGoat.goat_number) {
                db.query(
                    'SELECT * FROM goats WHERE goat_number = ? AND id != ?',
                    [goat_number, goatId],
                    (err, results) => {
                        if (err) {
                            console.error('DB error while checking goat_number:', err);
                            return res.status(500).json({ message: 'Database error', error: err.message });
                        }
                        if (results.length > 0) {
                            return res.status(400).json({ message: 'Goat number must be unique' });
                        }
                        updateGoatRecord();
                    }
                );
            } else {
                updateGoatRecord();
            }

            function updateGoatRecord() {
                const updatedImageUrl = image_url || existingGoat.image_url;
                db.query(
                    `UPDATE goats 
           SET goat_number = ?, breed = ?, dob = ?, weight = ?, health_status = ?, 
               minimum_price = ?, maximum_price = ?, price = ?, image_url = ?
           WHERE id = ?`,
                    [
                        goat_number || existingGoat.goat_number,
                        breed || existingGoat.breed,
                        dob || existingGoat.dob,
                        weight || existingGoat.weight,
                        health_status || existingGoat.health_status,
                        minimum_price || existingGoat.minimum_price,
                        maximum_price || existingGoat.maximum_price,
                        price || existingGoat.price,
                        updatedImageUrl,
                        goatId,
                    ],
                    (err) => {
                        if (err) {
                            console.error('DB error while updating goat:', err);
                            return res.status(500).json({ message: 'Failed to update goat', error: err.message });
                        }
                        res.json({ success: true, message: 'Goat updated successfully' });
                    }
                );
            }
        }
    );
};

const deactivateGoat = (req, res) => {
    const userId = req.user.userId;
    const goatId = req.params.id;

    db.query(
        'SELECT * FROM goats WHERE id = ? AND user_id = ? AND is_active = 1',
        [goatId, userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching goat:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Goat not found or already inactive' });
            }

            db.query(
                'UPDATE goats SET is_active = 0 WHERE id = ?',
                [goatId],
                (err) => {
                    if (err) {
                        console.error('DB error while deactivating goat:', err);
                        return res.status(500).json({ message: 'Failed to deactivate goat', error: err.message });
                    }
                    res.json({ success: true, message: 'Goat deactivated successfully' });
                }
            );
        }
    );
};

const purchaseGoat = (req, res) => {
    const buyerId = req.user.userId;
    const { goat_id, price } = req.body;

    // Validate the goat
    db.query(
        'SELECT * FROM goats WHERE id = ? AND is_active = 1',
        [goat_id],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching goat:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Goat not found or not available for purchase' });
            }

            const goat = results[0];
            const sellerId = goat.user_id;

            // Check if buyer has can_buy permission
            db.query(
                'SELECT can_buy FROM customers WHERE user_id = ?',
                [buyerId],
                (err, buyerResults) => {
                    if (err) {
                        console.error('DB error while checking buyer:', err);
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (buyerResults.length === 0 || !buyerResults[0].can_buy) {
                        return res.status(403).json({ message: 'You are not authorized to buy goats' });
                    }

                    // Record the purchase
                    db.query(
                        'INSERT INTO purchases (goat_id, buyer_id, seller_id, price, purchase_date) VALUES (?, ?, ?, ?, NOW())',
                        [goat_id, buyerId, sellerId, price],
                        (err) => {
                            if (err) {
                                console.error('DB error while recording purchase:', err);
                                return res.status(500).json({ message: 'Failed to record purchase', error: err.message });
                            }

                            // Mark the goat as inactive
                            db.query(
                                'UPDATE goats SET is_active = 0 WHERE id = ?',
                                [goat_id],
                                (err) => {
                                    if (err) {
                                        console.error('DB error while updating goat:', err);
                                        return res.status(500).json({ message: 'Failed to update goat status', error: err.message });
                                    }
                                    res.json({ success: true, message: 'Goat purchased successfully' });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    updateCustomerProfile,
    getCustomerProfile,
    getCustomerProfileById,
    getGoatCount,
    getPendingCanSellRequests,
    getAllCanSellRequests,
    handleCanSellRequest,
    registerGoat,
    getUserGoats,
    updateGoat,
    deactivateGoat,
    purchaseGoat,
};