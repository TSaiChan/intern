// File: controllers/ratings.js
const db = require("../config/db");

exports.submitGoatRating = async (req, res) => {
    const { goat_id, rating, review } = req.body;
    const user_id = req.user.id;

    try {
        const existing = await db.query(
            "SELECT * FROM ratings WHERE user_id = $1 AND goat_id = $2",
            [user_id, goat_id]
        );

        if (existing.rows.length > 0) {
            await db.query(
                "UPDATE ratings SET rating = $1, review = $2, created_at = CURRENT_TIMESTAMP WHERE user_id = $3 AND goat_id = $4",
                [rating, review, user_id, goat_id]
            );
        } else {
            await db.query(
                "INSERT INTO ratings (user_id, goat_id, rating, review) VALUES ($1, $2, $3, $4)",
                [user_id, goat_id, rating, review]
            );
        }

        res.json({ success: true, message: "Rating submitted" });
    } catch (err) {
        console.error("Rating Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getGoatRatings = async (req, res) => {
    const goat_id = req.params.id;
    try {
        const ratings = await db.query(
            `SELECT r.*, u.username FROM ratings r
             JOIN users_login u ON r.user_id = u.user_id
             WHERE r.goat_id = $1
             ORDER BY r.created_at DESC`,
            [goat_id]
        );
        res.json(ratings.rows);
    } catch (err) {
        console.error("Get Ratings Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch ratings" });
    }
};

exports.submitSellerReview = async (req, res) => {
    const { seller_id, rating, review } = req.body;
    const buyer_id = req.user.id;

    try {
        const existing = await db.query(
            "SELECT * FROM seller_reviews WHERE buyer_id = $1 AND seller_id = $2",
            [buyer_id, seller_id]
        );

        if (existing.rows.length > 0) {
            await db.query(
                "UPDATE seller_reviews SET rating = $1, review = $2, created_at = CURRENT_TIMESTAMP WHERE buyer_id = $3 AND seller_id = $4",
                [rating, review, buyer_id, seller_id]
            );
        } else {
            await db.query(
                "INSERT INTO seller_reviews (buyer_id, seller_id, rating, review) VALUES ($1, $2, $3, $4)",
                [buyer_id, seller_id, rating, review]
            );
        }

        res.json({ success: true, message: "Review submitted" });
    } catch (err) {
        console.error("Seller Review Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getSellerReviews = async (req, res) => {
    const seller_id = req.params.id;
    try {
        const reviews = await db.query(
            `SELECT sr.*, u.username FROM seller_reviews sr
             JOIN users_login u ON sr.buyer_id = u.user_id
             WHERE sr.seller_id = $1
             ORDER BY sr.created_at DESC`,
            [seller_id]
        );
        res.json(reviews.rows);
    } catch (err) {
        console.error("Get Seller Reviews Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch seller reviews" });
    }
};