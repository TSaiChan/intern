const db = require("../config/db");

exports.submitSellerReview = (req, res) => {
    const buyerId = req.user.userId;
    const { seller_id, rating, review } = req.body;

    if (!seller_id || !rating) return res.status(400).json({ message: 'Missing seller ID or rating' });

    db.query(
        'INSERT INTO seller_reviews (buyer_id, seller_id, rating, review) VALUES (?, ?, ?, ?)',
        [buyerId, seller_id, rating, review],
        (err) => {
            if (err) return res.status(500).json({ message: 'DB error', error: err.message });
            res.json({ success: true, message: 'Seller review submitted' });
        }
    );
};

exports.getSellerReviews = (req, res) => {
    const sellerId = req.params.id;

    db.query(
        'SELECT sr.*, u.username FROM seller_reviews sr JOIN users u ON sr.buyer_id = u.id WHERE seller_id = ?',
        [sellerId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Error fetching seller reviews', error: err.message });
            res.json(results);
        }
    );
};
