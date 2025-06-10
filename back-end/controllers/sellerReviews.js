const db = require('../config/db');

// Submit a seller review
const submitSellerReview = (req, res) => {
    const { seller_id, rating, review } = req.body;
    const buyer_id = req.user.userId;

    if (!seller_id || !rating) {
        return res.status(400).json({ success: false, message: 'Seller ID and rating are required' });
    }

    db.query(
        `INSERT INTO seller_reviews (buyer_id, seller_id, rating, review)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)`,
        [buyer_id, seller_id, rating, review],
        (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.status(200).json({ success: true, message: 'Seller review submitted successfully' });
        }
    );
};

// Get all reviews for a seller
const getSellerReviews = (req, res) => {
    const seller_id = req.params.id;
    db.query(
        `SELECT r.rating, r.review, r.created_at, u.username
     FROM seller_reviews r
     JOIN users u ON r.buyer_id = u.id
     WHERE seller_id = ?`,
        [seller_id],
        (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.status(200).json({ success: true, reviews: results });
        }
    );
};

module.exports = {
    submitSellerReview,
    getSellerReviews,
};
