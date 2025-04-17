import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  // Support both token from cookie and Authorization header
  const token =
    req.cookies?.accessToken || // From cookie
    (req.headers.authorization && req.headers.authorization.split(" ")[1]); // From Authorization: Bearer <token>

  if (!token) return next(createError(401, "You are not authenticated!"));

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) return next(createError(403, "Token is not valid!"));

    // Attach user info to the request object
    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    next();
  });
};
