import User from "../models/user.model.js";
import createError from "../utils/createError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res, next) => {
  try {
    const { username, email, password, country } = req.body;
    if (!username || !email || !password || !country) {
      return res.status(400).send("All fields are required.");
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send("Username already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      ...req.body,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(200).send("User created successfully");
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    if (!user) return next(createError(400, "User not found"));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return next(createError(400, "Wrong password"));

    const token = jwt.sign(
      { id: user._id, isSeller: user.isSeller },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    const { password, ...info } = user._doc;

    // ✅ Include token in response as well
    res
    .cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "None", // important if frontend and backend are on different origins
      secure: true,
    }) // <-- Send token in response
  } catch (err) {
    console.error("Login error:", err);
    next(createError(400, "Something went wrong"));
  }
};


export const logout = async (req, res) => {
  res.clearCookie("accessToken", {
    sameSite: "Lax",
    secure: false, // change to true in production
  }).status(200).send("User has been logged out.");
};
