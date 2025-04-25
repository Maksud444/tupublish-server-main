import express from "express";
import { verifyAdmin } from "../middleware/adminAuth.js";
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUserByAdmin,
  getAllGigs,
  getGigById,
  updateGig,
  deleteGigByAdmin,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getAllReviews,
  getReviewById,
  deleteReviewByAdmin,
  deleteOrderByAdmin
} from "../controllers/admin.controller.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", verifyAdmin, getDashboardStats);

// User management
router.get("/users", verifyAdmin, getAllUsers);
router.get("/users/:id", verifyAdmin, getUserById);
router.put("/users/:id", verifyAdmin, updateUser);
router.delete("/users/:id", verifyAdmin, deleteUserByAdmin);

// Gig management
router.get("/gigs", verifyAdmin, getAllGigs);
router.get("/gigs/:id", verifyAdmin, getGigById);
router.put("/gigs/:id", verifyAdmin, updateGig);
router.delete("/gigs/:id", verifyAdmin, deleteGigByAdmin);

// Order management
router.get("/orders", verifyAdmin, getAllOrders);
router.get("/orders/:id", verifyAdmin, getOrderById);
router.put("/orders/:id", verifyAdmin, updateOrderStatus);
router.delete("/orders/:id", verifyAdmin, deleteOrderByAdmin);

// Review management
router.get("/reviews", verifyAdmin, getAllReviews);
router.get("/reviews/:id", verifyAdmin, getReviewById);
router.delete("/reviews/:id", verifyAdmin, deleteReviewByAdmin);

export default router; 