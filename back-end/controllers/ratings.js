const db = require("../config/db");

// Submit or update a rating
exports.submitGoatRating = async (req, res) => {
    const user_id = req.user?.userId;
    const { goat_id, rating, review } = req.body;

    if (!user_id || !goat_id || !rating) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // Check if user purchased this goat
        db.query(
            "SELECT * FROM purchases WHERE buyer_id = ? AND goat_id = ?",
            [user_id, goat_id],
            (err, purchaseCheck) => {
                if (err) {
                    console.error("DB error:", err);
                    return res.status(500).json({ success: false, message: "DB error" });
                }

                if (purchaseCheck.length === 0) {
                    return res.status(403).json({ success: false, message: "You haven't purchased this goat." });
                }

                // Check if rating already exists
                db.query(
                    "SELECT * FROM ratings WHERE user_id = ? AND goat_id = ?",
                    [user_id, goat_id],
                    (err, existing) => {
                        if (err) {
                            console.error("DB error:", err);
                            return res.status(500).json({ success: false, message: "DB error" });
                        }

                        if (existing.length > 0) {
                            // Update
                            db.query(
                                "UPDATE ratings SET rating = ?, review = ?, created_at = NOW() WHERE user_id = ? AND goat_id = ?",
                                [rating, review, user_id, goat_id],
                                (err) => {
                                    if (err) {
                                        console.error("DB error:", err);
                                        return res.status(500).json({ success: false, message: "DB error" });
                                    }
                                    return res.json({ success: true, message: "Rating updated successfully" });
                                }
                            );
                        } else {
                            // Insert
                            db.query(
                                "INSERT INTO ratings (user_id, goat_id, rating, review, created_at) VALUES (?, ?, ?, ?, NOW())",
                                [user_id, goat_id, rating, review],
                                (err) => {
                                    if (err) {
                                        console.error("DB error:", err);
                                        return res.status(500).json({ success: false, message: "DB error" });
                                    }
                                    return res.json({ success: true, message: "Rating submitted successfully" });
                                }
                            );
                        }
                    }
                );
            }
        );
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Get all ratings for a goat
exports.getGoatRatings = (req, res) => {
    const goatId = req.params.id;

    db.query(
        "SELECT rating, review, created_at FROM ratings WHERE goat_id = ? ORDER BY created_at DESC",
        [goatId],
        (err, results) => {
            if (err) {
                console.error("DB error while fetching ratings:", err);
                return res.status(500).json({ success: false, message: "DB error" });
            }

            res.json(results);
        }
    );
};
