import User from "../models/user.model.js";
import createError from "../utils/createError.js";

// DELETE USER
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    // Only allow the user to delete their own account
    if (req.userId !== user._id.toString()) {
      return next(createError(403, "You can delete only your account!"));
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).send("User has been deleted.");
  } catch (err) {
    next(err);
  }
};

// GET USER
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    // Optional: Hide sensitive fields
    const { password, ...userWithoutPassword } = user._doc;

    res.status(200).send(userWithoutPassword);
  } catch (err) {
    next(err);
  }
};
