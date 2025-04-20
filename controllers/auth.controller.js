import User from "../models/user.model.js";
import createError from "../utils/createError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res, next) => {
  try {
    const { username, email, password, country } = req.body;
    if (!username || !email || !password || !country) {
      return next(createError(400, "All fields are required"));
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(createError(400, "Username already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      ...req.body,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    if (!user) return next(createError(404, "User not found"));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return next(createError(401, "Wrong password"));

    const token = jwt.sign(
      { id: user._id, isSeller: user.isSeller },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    const { password, ...userWithoutPassword } = user._doc;

    res
      .cookie("accessToken", token, {
        httpOnly: true,
        sameSite: "None", // important if frontend and backend are on different origins
        secure: true,
      })
      .status(200)
      .json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error("Login error:", err);
    next(createError(500, "Something went wrong"));
  }
};

export const logout = async (req, res, next) => {
  try {
    res
      .clearCookie("accessToken", {
        sameSite: "None",
        secure: true, // should be true in production
      })
      .status(200)
      .json({ message: "User has been logged out" });
  } catch (err) {
    next(createError(500, "Logout failed"));
  }
};
