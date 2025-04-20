import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  // Get token from Authorization header or from cookies
  const token = 
    req.cookies.accessToken || 
    (req.headers.authorization && req.headers.authorization.split(" ")[1]); // From Authorization: Bearer <token>

  if (!token) return next(createError(401, "You are not authenticated!"));
console.log(token)
  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      console.error("JWT Verification Error:", err); // Log the error for debugging
      return next(createError(403, "Token is not valid!"));
    }
    console.log(payload);
    req.userId = payload.id;
    req.isSeller = payload.isSeller;
    next();
  });
};
