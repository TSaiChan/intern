require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("./controllers/auth");
const customer = require("./controllers/customer");
const admin = require("./controllers/admin");
const goats = require("./controllers/goats");
const wishlist = require("./controllers/wishlist");
const ratings = require("./controllers/ratings");
const sellerReviews = require("./controllers/sellerReviews");

const db = require("./config/db");

const app = express();

// Configure CORS
const corsOptions = {
  origin: "http://localhost:3001",
  credentials: true,
};
app.use(cors(corsOptions));

// Parse JSON requests
app.use(bodyParser.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadDir));

// Database connection check
db.query("SELECT 1", (err) => {
  if (err) console.log("❌ DB Error:", err);
  else console.log("✅ DB Connected");
});

// Authentication routes
app.post("/api/users/send-otp", auth.sendOtp);
app.post("/api/users/verify-otp", auth.verifyOtp);
app.post("/api/users/register", auth.register);
app.post("/api/login", auth.login);
app.post("/api/logout", auth.logout);

// Forgot Password routes
app.post("/api/forgot-password", auth.forgotPasswordRequest);
app.get("/api/verify-reset-token", auth.verifyResetToken);
app.post("/api/reset-password", auth.resetPassword);

// Customer routes
app.post(
  "/api/customer/profile",
  auth.validateSession,
  auth.isCustomer,
  upload.single("photo"),
  customer.updateCustomerProfile
);
app.put(
  "/api/customer/profile",
  auth.validateSession,
  auth.isCustomer,
  upload.single("photo"),
  customer.updateCustomerProfile
);
app.get("/api/customer/profile", auth.validateSession, auth.isCustomer, customer.getCustomerProfile);
app.get("/api/customer/goats/count", auth.validateSession, auth.isCustomer, customer.getGoatCount);

// Admin can-sell requests
app.get("/api/customer/all-can-sell-requests", auth.validateSession, auth.isAdmin, customer.getAllCanSellRequests);

// Goat routes
app.post("/api/customer/goats", auth.validateSession, auth.isCustomer, upload.single("image"), goats.addGoat);
app.get("/api/customer/goats", auth.validateSession, auth.isCustomer, goats.getMyGoats);
app.put("/api/customer/goats/:id", auth.validateSession, auth.isCustomer, upload.single("image"), goats.updateGoat);
app.patch("/api/customer/goats/:id/deactivate", auth.validateSession, auth.isCustomer, goats.deactivateGoat);
app.post("/api/customer/goats/purchase", auth.validateSession, auth.isCustomer, goats.addPurchase);
app.get("/api/customer/purchases", auth.validateSession, auth.isCustomer, goats.getPurchases);
app.get("/api/goats/available", auth.validateSession, auth.isCustomer, goats.getAvailableGoats);

// Purchase route (compatibility)
app.post("/api/purchases", auth.validateSession, auth.isCustomer, goats.addPurchase);

// Wishlist routes
app.post("/api/wishlist", auth.validateSession, auth.isCustomer, wishlist.addToWishlist);
app.delete("/api/wishlist/:goat_id", auth.validateSession, auth.isCustomer, wishlist.removeFromWishlist);
app.get("/api/wishlist", auth.validateSession, auth.isCustomer, wishlist.getUserWishlist);
app.get("/api/wishlist/check/:goat_id", auth.validateSession, auth.isCustomer, wishlist.checkWishlistStatus);

// Health record routes
app.post("/api/customer/goats/health", auth.validateSession, auth.isCustomer, goats.addHealthRecord);
app.get("/api/customer/goats/:goatId/health", auth.validateSession, auth.isCustomer, goats.getHealthRecords);
app.put("/api/customer/goats/health/:id", auth.validateSession, auth.isCustomer, goats.updateHealthRecord);
app.delete("/api/customer/goats/health/:id", auth.validateSession, auth.isCustomer, goats.deleteHealthRecord);

// Admin health access
app.get("/api/admin/goats/health", auth.validateSession, auth.isAdmin, goats.getAllHealthRecords);

// Admin profile viewing
app.get("/api/customer/profile/:userId", auth.validateSession, auth.isAdmin, customer.getCustomerProfileById);

// Goat Ratings
app.post("/api/ratings", auth.validateSession, auth.isCustomer, ratings.submitGoatRating);
app.get("/api/goats/:id/ratings", ratings.getGoatRatings);

// Seller Reviews
app.post("/api/seller-reviews", auth.validateSession, auth.isCustomer, sellerReviews.submitSellerReview);
app.get("/api/sellers/:id/reviews", sellerReviews.getSellerReviews);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));