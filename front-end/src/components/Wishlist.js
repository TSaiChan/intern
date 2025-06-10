"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import "./css/login.css";

function Wishlist() {
    const [wishlistGoats, setWishlistGoats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingIds, setRemovingIds] = useState(new Set());
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            Swal.fire({
                icon: "error",
                title: "Unauthorized",
                text: "Please log in to view your wishlist.",
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

        fetchWishlist();
    }, [navigate]);

    const fetchWishlist = () => {
        const token = localStorage.getItem("token");
        fetch("http://localhost:3000/api/wishlist", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setWishlistGoats(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(`Failed to load wishlist: ${err.message}`);
                setLoading(false);
            });
    };

    const handleRemoveFromWishlist = (goatId) => {
        if (removingIds.has(goatId)) return;

        Swal.fire({
            icon: "question",
            title: "Remove from Wishlist",
            text: "Are you sure you want to remove this goat from your wishlist?",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, remove it!",
        }).then((result) => {
            if (!result.isConfirmed) return;
            setRemovingIds((prev) => new Set(prev).add(goatId));

            const token = localStorage.getItem("token");
            fetch(`http://localhost:3000/api/wishlist/${goatId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (!res.ok) return res.json().then((d) => { throw new Error(d.message); });
                    return res.json();
                })
                .then(() => {
                    setWishlistGoats((prev) => prev.filter((goat) => goat.id !== goatId));
                    Swal.fire({
                        icon: "success",
                        title: "Removed",
                        text: "Goat removed from wishlist successfully!",
                        confirmButtonColor: "#3085d6",
                    });
                })
                .catch((err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Remove Failed",
                        text: err.message,
                        confirmButtonColor: "#3085d6",
                    });
                })
                .finally(() => {
                    setRemovingIds((prev) => {
                        const copy = new Set(prev);
                        copy.delete(goatId);
                        return copy;
                    });
                });
        });
    };

    const handleBack = () => navigate("/customer-dashboard");

    if (loading) return <div className="text-center p-10">Loading wishlist...</div>;
    if (error) return <div className="text-center text-red-500 p-10">{error}</div>;

    return (
        <div className="text-center p-10">
            <button
                onClick={handleBack}
                className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition mb-6"
            >
                Back
            </button>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">My Wishlist</h2>
            {wishlistGoats.length === 0 ? (
                <p className="text-gray-600">Your wishlist is empty.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistGoats.map((goat) => (
                        <div key={goat.id} className="bg-white p-4 rounded-lg shadow-md">
                            <h3 className="text-lg font-bold">Goat #{goat.goat_number} - {goat.breed}</h3>
                            <p>Weight: {goat.weight} kg</p>
                            <p>Price Range: ${goat.minimum_price} - ${goat.maximum_price}</p>
                            <div className="mt-4">
                                <button
                                    onClick={() => handleRemoveFromWishlist(goat.id)}
                                    disabled={removingIds.has(goat.id)}
                                    className={`px-3 py-1 rounded text-white w-full ${removingIds.has(goat.id)
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-red-600 hover:bg-red-700"
                                        }`}
                                >
                                    {removingIds.has(goat.id) ? "Removing..." : "Remove from Wishlist"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Wishlist;