import express from "express";
import { deleteUser, getUser } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.delete("/:id", verifyToken, deleteUser);
router.get("/:id", getUser);
router.put("/:id", verifyToken, async (req, res, next) => {
  try {
    if (req.userId !== req.params.id) {
      return next(createError(403, "You can only update your own account!"));
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).send(updatedUser);
  } catch (err) {
    next(err);
  }
});
export default router;