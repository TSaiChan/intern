"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import "./css/login.css";

function BuyGoats() {
    const [goats, setGoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [wishlistLoading, setWishlistLoading] = useState(new Set());
    const [purchasingIds, setPurchasingIds] = useState(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            Swal.fire({
                icon: "error",
                title: "Unauthorized",
                text: "Please log in to buy goats.",
                confirmButtonColor: "#3085d6",
            }).then(() => navigate("/"));
            return;
        }

        let decodedToken;
        try {
            decodedToken = jwtDecode(token);
        } catch (err) {
            localStorage.removeItem("token");
            Swal.fire({
                icon: "error",
                title: "Invalid Token",
                text: "Your session is invalid. Please log in again.",
                confirmButtonColor: "#3085d6",
            }).then(() => navigate("/"));
            return;
        }

        const groupId = Number(decodedToken.group_id);
        if (groupId !== 1) {
            Swal.fire({
                icon: "error",
                title: "Unauthorized",
                text: "Customers only (group_id = 1).",
                confirmButtonColor: "#3085d6",
            }).then(() => navigate("/"));
            return;
        }

        const userId = decodedToken.user_id;

        fetch("http://localhost:3000/api/goats/available", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                const availableGoats = data.filter((goat) => Number(goat.user_id) !== userId);
                setGoats(availableGoats);
                checkWishlistStatus(availableGoats, token);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load goats: ${err.message}`);
                setLoading(false);
            });
    }, [navigate]);

    const checkWishlistStatus = async (goats, token) => {
        const promises = goats.map((goat) =>
            fetch(`http://localhost:3000/api/wishlist/check/${goat.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => res.json())
                .then((data) => ({ goatId: goat.id, inWishlist: data.inWishlist }))
                .catch(() => ({ goatId: goat.id, inWishlist: false }))
        );
        const results = await Promise.all(promises);
        const wishlistSet = new Set();
        results.forEach((r) => {
            if (r.inWishlist) wishlistSet.add(r.goatId);
        });
        setWishlistIds(wishlistSet);
    };

    const handleToggleWishlist = (goat) => {
        if (wishlistLoading.has(goat.id)) return;

        const isInWishlist = wishlistIds.has(goat.id);
        setWishlistLoading((prev) => new Set(prev).add(goat.id));

        const token = localStorage.getItem("token");
        const url = isInWishlist
            ? `http://localhost:3000/api/wishlist/${goat.id}`
            : "http://localhost:3000/api/wishlist";

        const options = {
            method: isInWishlist ? "DELETE" : "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        };

        if (!isInWishlist) options.body = JSON.stringify({ goat_id: goat.id });

        fetch(url, options)
            .then((res) => {
                if (!res.ok) {
                    return res.json().then((data) => {
                        throw new Error(data.message || "Wishlist operation failed");
                    });
                }
                return res.json();
            })
            .then(() => {
                setWishlistIds((prev) => {
                    const updated = new Set(prev);
                    isInWishlist ? updated.delete(goat.id) : updated.add(goat.id);
                    return updated;
                });
                Swal.fire({
                    icon: "success",
                    title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
                    timer: 1500,
                    showConfirmButton: false,
                });
            })
            .catch((err) => {
                Swal.fire({
                    icon: "error",
                    title: "Wishlist Error",
                    text: err.message,
                    confirmButtonColor: "#3085d6",
                });
            })
            .finally(() => {
                setWishlistLoading((prev) => {
                    const updated = new Set(prev);
                    updated.delete(goat.id);
                    return updated;
                });
            });
    };

    const handlePurchase = (goat) => {
        if (purchasingIds.has(goat.id)) return;

        Swal.fire({
            title: `Purchase Goat #${goat.goat_number}`,
            text: `Enter your offer (between $${goat.minimum_price} and $${goat.maximum_price}):`,
            input: "number",
            inputLabel: "Price ($)",
            inputPlaceholder: "Enter price",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            inputValidator: (value) => {
                const price = Number.parseFloat(value);
                if (!value || isNaN(price)) {
                    return "Please enter a valid price!";
                }
                if (price < goat.minimum_price || price > goat.maximum_price) {
                    return `Price must be between $${goat.minimum_price} and $${goat.maximum_price}!`;
                }
                return null;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                const price = Number.parseFloat(result.value);
                setPurchasingIds((prev) => new Set(prev).add(goat.id));

                const token = localStorage.getItem("token");
                fetch("http://localhost:3000/api/purchases", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ goat_id: goat.id, price }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            return res.json().then((data) => {
                                throw new Error(data.message || "Failed to purchase goat.");
                            });
                        }
                        return res.json();
                    })
                    .then(() => {
                        Swal.fire({
                            icon: "success",
                            title: "Goat Purchased",
                            text: "You have successfully purchased the goat!",
                            confirmButtonColor: "#3085d6",
                        }).then(() => {
                            setGoats((prev) => prev.filter((g) => g.id !== goat.id));
                            navigate("/my-goats");
                        });
                    })
                    .catch((err) => {
                        Swal.fire({
                            icon: "error",
                            title: "Purchase Failed",
                            text: err.message,
                            confirmButtonColor: "#3085d6",
                        });
                    })
                    .finally(() => {
                        setPurchasingIds((prev) => {
                            const copy = new Set(prev);
                            copy.delete(goat.id);
                            return copy;
                        });
                    });
            }
        });
    };

    const handleViewDetails = (goat) => {
        Swal.fire({
            title: `Goat #${goat.goat_number} - ${goat.breed}`,
            html: `
        <div style="text-align: left;">
          <p><strong>Weight:</strong> ${goat.weight} kg</p>
          <p><strong>Price Range:</strong> $${goat.minimum_price} - $${goat.maximum_price}</p>
          <p><strong>Health Status:</strong> ${goat.health_status || "N/A"}</p>
          <p><strong>Date of Birth:</strong> ${goat.dob ? new Date(goat.dob).toLocaleDateString() : "N/A"}</p>
        </div>
      `,
            confirmButtonColor: "#3085d6",
        });
    };

    const handleBack = () => navigate("/customer-dashboard");

    if (loading)
        return (
            <div className="text-center p-10">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <p className="text-gray-600 mt-2">Loading...</p>
            </div>
        );

    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    return (
        <div className="text-center p-10">
            <button
                onClick={handleBack}
                className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition mb-6"
            >
                Back
            </button>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Available Goats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {goats.map((goat) => (
                    <div key={goat.id} className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold">Goat #{goat.goat_number} - {goat.breed}</h3>
                        <p>Weight: {goat.weight} kg</p>
                        <p>Price: ${goat.minimum_price} - ${goat.maximum_price}</p>
                        <div className="flex flex-col gap-2 mt-4">
                            <button
                                onClick={() => handleViewDetails(goat)}
                                className="w-full px-3 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"
                            >
                                View Details
                            </button>
                            <button
                                onClick={() => handlePurchase(goat)}
                                disabled={purchasingIds.has(goat.id)}
                                className={`w-full px-3 py-1 rounded text-white transition ${purchasingIds.has(goat.id)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {purchasingIds.has(goat.id) ? "Purchasing..." : "Purchase"}
                            </button>
                            <button
                                onClick={() => handleToggleWishlist(goat)}
                                className={`w-full px-3 py-1 rounded text-white flex items-center justify-center gap-2 ${wishlistIds.has(goat.id)
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-purple-600 hover:bg-purple-700"
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                    />
                                </svg>
                                {wishlistIds.has(goat.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BuyGoats;
