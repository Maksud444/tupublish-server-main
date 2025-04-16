import User from "../models/user.model.js";
import createError from "../utils/createError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export const register = async (req, res, next) => {
  try {
    // Check if required fields are present
    const { username, email, password, country} = req.body;
    if (!username || !email || !password || !country ) {
      return res.status(400).send("All fields (username, email, password, country) are required.");
    }

    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send("Username already exists. Please choose a different one.");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
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
    // Find the user by username
    const user = await User.findOne({ username: req.body.username });
 
    if (!user) return next(createError(400, "User not found"));

    // Validate the password
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return next(createError(400, "Wrong password"));
    

    // Generate a JWT token
    const token = jwt.sign(
      {
        id: user._id,
        isSeller: user.isSeller,
      },
      process.env.JWT_KEY, // Corrected secret key
      { expiresIn: "1h" } // Token expiration time
    );

    // Exclude the password from the response
    const { password, ...info } = user._doc;

    // Send the token as a cookie and user info as the response
    res
      .cookie("accessToken", token, {
        httpOnly: true,
      })
      .status(200)
      .send(info);
  } catch (err) {
    console.error("Error during login:", err); // Log the error for debugging
    next(createError(400, "Something went wrong"));
  }
};

export const logout = async (req, res) => {
  res.clearCookie("accessToken",{
    sameSite: "none",
    secure: true,
  }).status(200).send("User has been logged out.");
};