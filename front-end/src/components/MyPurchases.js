import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

function MyPurchases() {
    const [purchases, setPurchases] = useState([]);
    const [reviewData, setReviewData] = useState({});
    const user = JSON.parse(sessionStorage.getItem("user"));
    console.log("Logged in user:", user);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch("http://localhost:3000/api/customer/purchases", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setPurchases(data);
                } else {
                    console.error("Invalid purchases data:", data);
                }
            })
            .catch((err) => console.error("Error fetching purchases:", err));
    }, []);

    const handleReviewChange = (goatId, field, value) => {
        setReviewData((prev) => ({
            ...prev,
            [goatId]: { ...prev[goatId], [field]: value },
        }));
    };

    const submitReview = async (goatId) => {
        const token = localStorage.getItem("token");
        const { rating, review } = reviewData[goatId] || {};

        if (!rating) {
            Swal.fire("Rating Required", "Please select a rating before submitting.", "warning");
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/ratings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ goat_id: goatId, rating, review }),
            });

            const result = await res.json();

            if (result.success) {
                Swal.fire("Success", "Review submitted successfully!", "success");
            } else {
                Swal.fire("Error", result.message || "Failed to submit review", "error");
            }
        } catch (err) {
            console.error("Error submitting review:", err);
            Swal.fire("Error", "Something went wrong while submitting your review", "error");
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">My Purchased Goats</h2>
            {Array.isArray(purchases) && purchases.length > 0 ? (
                purchases
                    .filter((goat) => goat && goat.goat_id) // FIXED
                    .map((goat) => (
                        <div
                            key={goat.goat_id} // FIXED
                            className="bg-white p-6 rounded-xl shadow-md mb-6 border border-gray-200"
                        >
                            <h3 className="text-xl font-semibold mb-2">{goat.goat_number}</h3>
                            <p className="text-gray-600 mb-2">
                                <strong>Breed:</strong> {goat.breed}
                            </p>
                            <p className="text-gray-600 mb-2">
                                <strong>Purchase Date:</strong>{" "}
                                {new Date(goat.purchase_date).toLocaleDateString()}
                            </p>

                            <div className="mt-4">
                                <label className="block text-gray-700 font-medium mb-1">
                                    Your Rating:
                                </label>
                                <select
                                    value={reviewData[goat.goat_id]?.rating || ""}
                                    onChange={(e) =>
                                        handleReviewChange(goat.goat_id, "rating", parseInt(e.target.value))
                                    }
                                    className="p-2 border rounded-lg w-32"
                                >
                                    <option value="">Select</option>
                                    {[1, 2, 3, 4, 5].map((val) => (
                                        <option key={val} value={val}>
                                            {val} Star{val > 1 ? "s" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-2">
                                <label className="block text-gray-700 font-medium mb-1">
                                    Your Review (optional):
                                </label>
                                <textarea
                                    rows={3}
                                    value={reviewData[goat.goat_id]?.review || ""}
                                    onChange={(e) =>
                                        handleReviewChange(goat.goat_id, "review", e.target.value)
                                    }
                                    className="w-full border rounded-lg p-2"
                                ></textarea>
                            </div>
                            <button
                                onClick={() => submitReview(goat.goat_id)}
                                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                Submit Review
                            </button>
                        </div>
                    ))
            ) : (
                <p className="text-gray-600">You have not purchased any goats yet.</p>
            )}
        </div>
    );
}

export default MyPurchases;
