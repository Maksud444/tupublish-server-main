import Gig from "../models/gig.model.js";
import createError from "../utils/createError.js";

export const createGig = async (req, res, next) => {
  // Only allow sellers to create a gig
  if (!req.isSeller) {
    return next(createError(403, "Only sellers can create a gig!"));
  }

  // Create a new gig object with the userId and the gig details from the body
  const newGig = new Gig({
    userId: req.userId, // This comes from the decoded JWT payload
    ...req.body, // Spread the rest of the gig data from the request body
  });

  try {
    const savedGig = await newGig.save(); // Save gig to the database
    res.status(201).json(savedGig); // Return the saved gig with a 201 status
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
};

export const deleteGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id); // Find the gig by ID
    if (!gig) return next(createError(404, "Gig not found!")); // Gig not found

    // Only allow the owner of the gig to delete it
    if (gig.userId !== req.userId) {
      return next(createError(403, "You can delete only your gig!"));
    }

    await Gig.findByIdAndDelete(req.params.id); // Delete the gig
    res.status(200).json("Gig has been deleted!"); // Return a success message
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
};

export const getGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id); // Find the gig by ID
    if (!gig) return next(createError(404, "Gig not found!")); // Gig not found

    res.status(200).json(gig); // Return the gig data
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
};

export const getGigs = async (req, res, next) => {
  const q = req.query;
  const filters = {
    ...(q.userId && { userId: q.userId }), // Filter by userId if provided
    ...(q.cat && { cat: q.cat }), // Filter by category if provided
    ...(q.min || q.max) && {
      price: {
        ...(q.min && { $gt: q.min }), // Filter by minimum price
        ...(q.max && { $lt: q.max }), // Filter by maximum price
      },
    },
    ...(q.search && { title: { $regex: q.search, $options: "i" } }), // Filter by title search
  };

  try {
    const gigs = await Gig.find(filters).sort({ [q.sort]: -1 }); // Fetch and sort gigs
    res.status(200).json(gigs); // Return the gigs data
  } catch (err) {
    next(err); // Pass the error to the global error handler
  }
};
