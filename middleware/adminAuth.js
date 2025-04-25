import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";
import User from "../models/user.model.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    // Get token from Authorization header or from cookies
    const token = 
      req.cookies.accessToken || 
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) return next(createError(401, "You are not authenticated!"));

    // Verify token
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
      if (err) {
        return next(createError(403, "Token is not valid!"));
      }
      
      // Check if user exists and is an admin
      const user = await User.findById(payload.id);
      if (!user || !user.isAdmin) {
        return next(createError(403, "You are not authorized as admin!"));
      }
      
      req.userId = payload.id;
      req.isAdmin = user.isAdmin;
      next();
    });
  } catch (err) {
    next(err);
  }
}; 