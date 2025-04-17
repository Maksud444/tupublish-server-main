import express from "express";
import {
  createGig,
  deleteGig,
  getGig,
  getGigs
} from "../controllers/gig.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// POST - Create a new gig (requires authentication)
router.post("/", verifyToken, createGig);

// DELETE - Delete a gig by ID (requires authentication)
router.delete("/:id", verifyToken, deleteGig);

// GET - Get a specific gig by ID
router.get("/single/:id", getGig);

// GET - Get all gigs
router.get("/", getGigs);

export default router;
