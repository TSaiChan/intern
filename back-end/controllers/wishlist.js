const db = require("../config/db")

const addToWishlist = (req, res) => {
    try {
        const { goat_id } = req.body
        const userId = req.user.userId

        if (!goat_id) {
            return res.status(400).json({ success: false, message: "Goat ID is required" })
        }

        // Check if goat exists and is available
        const checkGoatQuery = "SELECT * FROM goats WHERE id = ? AND is_active = 1"
        db.query(checkGoatQuery, [goat_id], (err, results) => {
            if (err) {
                console.error("Database error:", err)
                return res.status(500).json({ success: false, message: "Database error" })
            }

            if (results.length === 0) {
                return res.status(404).json({ success: false, message: "Goat not found or not available" })
            }

            const goat = results[0]

            // Check if user is not the owner
            if (goat.user_id === userId) {
                return res.status(400).json({ success: false, message: "You cannot add your own goat to wishlist" })
            }

            // Check if already in wishlist
            const checkWishlistQuery = "SELECT id FROM wishlist WHERE user_id = ? AND goat_id = ?"
            db.query(checkWishlistQuery, [userId, goat_id], (err, wishlistResults) => {
                if (err) {
                    console.error("Database error:", err)
                    return res.status(500).json({ success: false, message: "Database error" })
                }

                if (wishlistResults.length > 0) {
                    return res.status(400).json({ success: false, message: "Goat is already in your wishlist" })
                }

                // Add to wishlist
                const insertQuery = "INSERT INTO wishlist (user_id, goat_id) VALUES (?, ?)"
                db.query(insertQuery, [userId, goat_id], (err, result) => {
                    if (err) {
                        console.error("Database error:", err)
                        return res.status(500).json({ success: false, message: "Failed to add to wishlist" })
                    }

                    res.status(201).json({ success: true, message: "Goat added to wishlist successfully" })
                })
            })
        })
    } catch (error) {
        console.error("Add to wishlist error:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const removeFromWishlist = (req, res) => {
    try {
        const { goat_id } = req.params
        const userId = req.user.userId

        if (!goat_id) {
            return res.status(400).json({ success: false, message: "Goat ID is required" })
        }

        // Remove from wishlist
        const deleteQuery = "DELETE FROM wishlist WHERE user_id = ? AND goat_id = ?"
        db.query(deleteQuery, [userId, goat_id], (err, result) => {
            if (err) {
                console.error("Database error:", err)
                return res.status(500).json({ success: false, message: "Database error" })
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Goat not found in wishlist" })
            }

            res.json({ success: true, message: "Goat removed from wishlist successfully" })
        })
    } catch (error) {
        console.error("Remove from wishlist error:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const getUserWishlist = (req, res) => {
    try {
        const userId = req.user.userId

        const query = `
      SELECT 
        g.*,
        w.added_at,
        u.username as seller_name
      FROM wishlist w
      JOIN goats g ON w.goat_id = g.id
      JOIN users u ON g.user_id = u.id
      WHERE w.user_id = ? AND g.is_active = 1
      ORDER BY w.added_at DESC
    `

        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("Database error:", err)
                return res.status(500).json({ success: false, message: "Database error" })
            }

            res.json(results)
        })
    } catch (error) {
        console.error("Get user wishlist error:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const checkWishlistStatus = (req, res) => {
    try {
        const { goat_id } = req.params
        const userId = req.user.userId

        if (!goat_id) {
            return res.status(400).json({ success: false, message: "Goat ID is required" })
        }

        const query = "SELECT id FROM wishlist WHERE user_id = ? AND goat_id = ?"
        db.query(query, [userId, goat_id], (err, results) => {
            if (err) {
                console.error("Database error:", err)
                return res.status(500).json({ success: false, message: "Database error" })
            }

            res.json({ inWishlist: results.length > 0 })
        })
    } catch (error) {
        console.error("Check wishlist status error:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getUserWishlist,
    checkWishlistStatus,
}