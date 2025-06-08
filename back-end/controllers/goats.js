const db = require('../config/db');

const parseBoolean = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
};

const parseNumber = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
};

const addGoat = (req, res) => {
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
        is_active,
    } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!goat_number || !breed || !dob || !weight || !health_status || !minimum_price || !maximum_price || !image_url) {
        return res.status(400).json({ message: 'All required fields must be provided, including an image' });
    }

    const weightNum = parseNumber(weight);
    const minPriceNum = parseNumber(minimum_price);
    const maxPriceNum = parseNumber(maximum_price);
    const priceNum = price ? parseNumber(price) : null;

    if (weightNum === null || weightNum <= 0) {
        return res.status(400).json({ message: 'Weight must be a valid number greater than 0' });
    }
    if (minPriceNum === null || minPriceNum <= 0 || maxPriceNum === null || maxPriceNum <= 0) {
        return res.status(400).json({ message: 'Prices must be valid numbers greater than 0' });
    }
    if (minPriceNum > maxPriceNum) {
        return res.status(400).json({ message: 'Minimum price cannot exceed maximum price' });
    }
    if (priceNum !== null && priceNum <= 0) {
        return res.status(400).json({ message: 'Fixed price must be greater than 0 if provided' });
    }
    if (new Date(dob) > new Date()) {
        return res.status(400).json({ message: 'Date of birth cannot be in the future' });
    }

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

            db.query('SELECT id FROM goats WHERE goat_number = ?', [goat_number], (err, results) => {
                if (err) {
                    console.error('DB error while checking goat_number:', err);
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                if (results.length > 0) {
                    return res.status(400).json({ message: 'Goat number already exists' });
                }

                db.query(
                    `INSERT INTO goats
           (user_id, goat_number, breed, dob, weight, health_status, minimum_price, maximum_price, price, is_active, image_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        userId,
                        goat_number,
                        breed,
                        dob,
                        weightNum,
                        health_status,
                        minPriceNum,
                        maxPriceNum,
                        priceNum,
                        parseBoolean(is_active),
                        image_url,
                    ],
                    (err) => {
                        if (err) {
                            console.error('DB error while adding goat:', err);
                            return res.status(500).json({ message: 'Failed to register goat', error: err.message });
                        }
                        res.status(201).json({ message: 'Goat registered successfully' });
                    }
                );
            });
        }
    );
};

const getMyGoats = (req, res) => {
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
        is_active,
    } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    db.query('SELECT * FROM goats WHERE id = ? AND user_id = ?', [goatId, userId], (err, results) => {
        if (err) {
            console.error('DB error while checking goat:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Goat not found or you are not authorized to update this goat' });
        }

        const existingGoat = results[0];
        const updatedImage = image_url || existingGoat.image_url;

        const checkGoatNumber = () => {
            if (goat_number && goat_number !== existingGoat.goat_number) {
                db.query('SELECT id FROM goats WHERE goat_number = ? AND id != ?', [goat_number, goatId], (err, results) => {
                    if (err) {
                        console.error('DB error while checking goat_number:', err);
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (results.length > 0) {
                        return res.status(400).json({ message: 'Goat number already exists' });
                    }
                    performUpdate();
                });
            } else {
                performUpdate();
            }
        };

        const performUpdate = () => {
            const weightNum = weight ? parseNumber(weight) : existingGoat.weight;
            const minPriceNum = minimum_price ? parseNumber(minimum_price) : existingGoat.minimum_price;
            const maxPriceNum = maximum_price ? parseNumber(maximum_price) : existingGoat.maximum_price;
            const priceNum = price !== undefined ? parseNumber(price) : existingGoat.price;
            const dobDate = dob ? new Date(dob) : new Date(existingGoat.dob);

            if (weightNum === null || weightNum <= 0) {
                return res.status(400).json({ message: 'Weight must be a valid number greater than 0' });
            }
            if (minPriceNum === null || minPriceNum <= 0 || maxPriceNum === null || maxPriceNum <= 0) {
                return res.status(400).json({ message: 'Prices must be valid numbers greater than 0' });
            }
            if (minPriceNum > maxPriceNum) {
                return res.status(400).json({ message: 'Minimum price cannot exceed maximum price' });
            }
            if (priceNum !== null && priceNum <= 0) {
                return res.status(400).json({ message: 'Fixed price must be greater than 0 if provided' });
            }
            if (dobDate > new Date()) {
                return res.status(400).json({ message: 'Date of birth cannot be in the future' });
            }

            db.query(
                `UPDATE goats SET
          goat_number = ?,
          breed = ?,
          dob = ?,
          weight = ?,
          health_status = ?,
          minimum_price = ?,
          maximum_price = ?,
          price = ?,
          is_active = ?,
          image_url = ?
        WHERE id = ?`,
                [
                    goat_number || existingGoat.goat_number,
                    breed || existingGoat.breed,
                    dob || existingGoat.dob,
                    weightNum,
                    health_status || existingGoat.health_status,
                    minPriceNum,
                    maxPriceNum,
                    priceNum,
                    is_active !== undefined ? parseBoolean(is_active) : existingGoat.is_active,
                    updatedImage,
                    goatId,
                ],
                (err) => {
                    if (err) {
                        console.error('DB error while updating goat:', err);
                        return res.status(500).json({ message: 'Failed to update goat', error: err.message });
                    }
                    res.json({ message: 'Goat updated successfully' });
                }
            );
        };

        checkGoatNumber();
    });
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
                    res.json({ message: 'Goat deactivated successfully' });
                }
            );
        }
    );
};

const getPurchases = (req, res) => {
    const userId = req.user.userId;
    db.query(
        `SELECT p.*, g.goat_number, g.breed, g.weight, g.minimum_price, g.maximum_price, g.price, g.image_url
     FROM purchases p
     JOIN goats g ON p.goat_id = g.id
     WHERE p.buyer_id = ? ORDER BY p.purchase_date DESC`,
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching purchases:', err);
                return res.status(500).json({ message: 'Failed to fetch purchases', error: err.message });
            }
            res.json(results);
        }
    );
};

const addPurchase = (req, res) => {
    const userId = req.user.userId;
    const { goat_id, price } = req.body;

    if (!goat_id || !price) {
        return res.status(400).json({ message: 'Goat ID and price are required' });
    }

    const priceNum = parseNumber(price);
    if (priceNum === null || priceNum <= 0) {
        return res.status(400).json({ message: 'Price must be a valid number greater than 0' });
    }

    db.query('SELECT * FROM goats WHERE id = ? AND is_active = TRUE', [goat_id], (err, results) => {
        if (err) {
            console.error('DB error while checking goat:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Goat not found or inactive' });
        }

        const goat = results[0];
        if (goat.user_id === userId) {
            return res.status(403).json({ message: 'You cannot purchase your own goat' });
        }

        if (priceNum < goat.minimum_price || priceNum > goat.maximum_price) {
            return res.status(400).json({ message: 'Price must be within the goat\'s minimum and maximum price range' });
        }

        db.query('SELECT can_buy FROM customers WHERE user_id = ?', [userId], (err, customerResults) => {
            if (err) {
                console.error('DB error while checking customer:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (customerResults.length === 0 || !customerResults[0].can_buy) {
                return res.status(403).json({ message: 'You are not authorized to buy goats' });
            }

            db.query(
                'INSERT INTO purchases (goat_id, buyer_id, seller_id, price, purchase_date) VALUES (?, ?, ?, ?, NOW())',
                [goat_id, userId, goat.user_id, priceNum],
                (err) => {
                    if (err) {
                        console.error('DB error while adding purchase:', err);
                        return res.status(500).json({ message: 'Failed to record purchase', error: err.message });
                    }

                    db.query(
                        'UPDATE goats SET user_id = ?, is_active = FALSE WHERE id = ?',
                        [userId, goat_id],
                        (err) => {
                            if (err) {
                                console.error('DB error while updating goat status:', err);
                                return res.status(500).json({ message: 'Failed to update goat status', error: err.message });
                            }
                            res.status(201).json({ message: 'Purchase recorded successfully' });
                        }
                    );
                }
            );
        });
    });
};

const getAvailableGoats = (req, res) => {
    const userId = req.user.userId;
    db.query(
        'SELECT * FROM goats WHERE is_active = TRUE AND user_id != ? ORDER BY created_at DESC',
        [userId],
        (err, results) => {
            if (err) {
                console.error('DB error while fetching available goats:', err);
                return res.status(500).json({ message: 'Failed to fetch available goats', error: err.message });
            }
            res.json(results);
        }
    );
};

const addHealthRecord = (req, res) => {
    const userId = req.user.userId;
    const { goat_id, date_checked, health_type, description, veterinarian, next_due_date, status } = req.body;

    if (!goat_id || !date_checked || !health_type || !status) {
        return res.status(400).json({ message: 'Goat ID, date checked, health type, and status are required' });
    }

    if (!['vaccination', 'checkup', 'deworming'].includes(health_type)) {
        return res.status(400).json({ message: 'Health type must be one of: vaccination, checkup, deworming' });
    }

    if (!['Healthy', 'Needs Attention', 'Critical'].includes(status)) {
        return res.status(400).json({ message: 'Status must be one of: Healthy, Needs Attention, Critical' });
    }

    if (new Date(date_checked) > new Date()) {
        return res.status(400).json({ message: 'Date checked cannot be in the future' });
    }

    if (next_due_date && new Date(next_due_date) < new Date(date_checked)) {
        return res.status(400).json({ message: 'Next due date cannot be before date checked' });
    }

    db.query('SELECT * FROM goats WHERE id = ? AND user_id = ?', [goat_id, userId], (err, results) => {
        if (err) {
            console.error('DB error while checking goat:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Goat not found or you are not authorized to add health records for this goat' });
        }

        db.query(
            `INSERT INTO goat_health_records (goat_id, date_checked, health_type, description, veterinarian, next_due_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [goat_id, date_checked, health_type, description || null, veterinarian || null, next_due_date || null, status],
            (err) => {
                if (err) {
                    console.error('DB error while adding health record:', err);
                    return res.status(500).json({ message: 'Failed to add health record', error: err.message });
                }
                res.status(201).json({ message: 'Health record added successfully' });
            }
        );
    });
};

const getHealthRecords = (req, res) => {
    const userId = req.user.userId;
    const goatId = req.params.goatId;

    db.query('SELECT * FROM goats WHERE id = ? AND user_id = ?', [goatId, userId], (err, results) => {
        if (err) {
            console.error('DB error while checking goat:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Goat not found or you are not authorized to view health records for this goat' });
        }

        db.query(
            'SELECT * FROM goat_health_records WHERE goat_id = ? ORDER BY date_checked DESC',
            [goatId],
            (err, healthRecords) => {
                if (err) {
                    console.error('DB error while fetching health records:', err);
                    return res.status(500).json({ message: 'Failed to fetch health records', error: err.message });
                }
                res.json(healthRecords);
            }
        );
    });
};

const updateHealthRecord = (req, res) => {
    const userId = req.user.userId;
    const healthId = req.params.id;
    const { goat_id, date_checked, health_type, description, veterinarian, next_due_date, status } = req.body;

    db.query('SELECT * FROM goats WHERE id = ? AND user_id = ?', [goat_id, userId], (err, results) => {
        if (err) {
            console.error('DB error while checking goat:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Goat not found or you are not authorized to update health records for this goat' });
        }

        db.query('SELECT * FROM goat_health_records WHERE id = ? AND goat_id = ?', [healthId, goat_id], (err, healthResults) => {
            if (err) {
                console.error('DB error while checking health record:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (healthResults.length === 0) {
                return res.status(404).json({ message: 'Health record not found' });
            }

            const existingRecord = healthResults[0];

            if (date_checked && new Date(date_checked) > new Date()) {
                return res.status(400).json({ message: 'Date checked cannot be in the future' });
            }
            if (next_due_date && date_checked && new Date(next_due_date) < new Date(date_checked)) {
                return res.status(400).json({ message: 'Next due date cannot be before date checked' });
            }
            if (health_type && !['vaccination', 'checkup', 'deworming'].includes(health_type)) {
                return res.status(400).json({ message: 'Health type must be one of: vaccination, checkup, deworming' });
            }
            if (status && !['Healthy', 'Needs Attention', 'Critical'].includes(status)) {
                return res.status(400).json({ message: 'Status must be one of: Healthy, Needs Attention, Critical' });
            }

            db.query(
                `UPDATE goat_health_records SET
                 date_checked = ?,
                 health_type = ?,
                 description = ?,
                 veterinarian = ?,
                 next_due_date = ?,
                 status = ?
                 WHERE id = ?`,
                [
                    date_checked || existingRecord.date_checked,
                    health_type || existingRecord.health_type,
                    description !== undefined ? description : existingRecord.description,
                    veterinarian !== undefined ? veterinarian : existingRecord.veterinarian,
                    next_due_date !== undefined ? next_due_date : existingRecord.next_due_date,
                    status || existingRecord.status,
                    healthId,
                ],
                (err) => {
                    if (err) {
                        console.error('DB error while updating health record:', err);
                        return res.status(500).json({ message: 'Failed to update health record', error: err.message });
                    }
                    res.json({ message: 'Health record updated successfully' });
                }
            );
        });
    });
};

const deleteHealthRecord = (req, res) => {
    const userId = req.user.userId;
    const healthId = req.params.id;

    db.query(
        'SELECT gh.*, g.user_id FROM goat_health_records gh JOIN goats g ON gh.goat_id = g.id WHERE gh.id = ? AND g.user_id = ?',
        [healthId, userId],
        (err, results) => {
            if (err) {
                console.error('DB error while checking health record:', err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Health record not found or you are not authorized to delete this record' });
            }

            db.query('DELETE FROM goat_health_records WHERE id = ?', [healthId], (err) => {
                if (err) {
                    console.error('DB error while deleting health record:', err);
                    return res.status(500).json({ message: 'Failed to delete health record', error: err.message });
                }
                res.json({ message: 'Health record deleted successfully' });
            });
        }
    );
};

const getAllHealthRecords = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    db.query(
        'SELECT COUNT(*) as total FROM goat_health_records',
        (err, countResult) => {
            if (err) {
                console.error('DB error while counting health records:', err);
                return res.status(500).json({ message: 'Failed to fetch health records', error: err.message });
            }

            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit);

            db.query(
                `SELECT gh.*, g.goat_number, g.breed 
                 FROM goat_health_records gh 
                 JOIN goats g ON gh.goat_id = g.id 
                 ORDER BY gh.date_checked DESC 
                 LIMIT ? OFFSET ?`,
                [limit, offset],
                (err, results) => {
                    if (err) {
                        console.error('DB error while fetching health records:', err);
                        return res.status(500).json({ message: 'Failed to fetch health records', error: err.message });
                    }
                    res.json({
                        records: results,
                        currentPage: page,
                        totalPages: totalPages,
                        totalRecords: totalRecords,
                    });
                }
            );
        }
    );
};

module.exports = {
    addGoat,
    getMyGoats,
    updateGoat,
    deactivateGoat,
    getPurchases,
    addPurchase,
    getAvailableGoats,
    addHealthRecord,
    getHealthRecords,
    updateHealthRecord,
    deleteHealthRecord,
    getAllHealthRecords,
};