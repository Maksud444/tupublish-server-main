const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();

// Save file temporarily to "uploads" folder
const upload = multer({ dest: "uploads/" });

// Replace with your ImgBB API Key
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY";

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const base64Image = Buffer.from(fileData).toString("base64");

    const form = new FormData();
    form.append("image", base64Image);

    const imgbbRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      form,
      { headers: form.getHeaders() }
    );

    // Clean up temp file
    fs.unlinkSync(filePath);

    res.status(200).json({ url: imgbbRes.data.data.url });
  } catch (err) {
    console.error("Upload Error:", err.message);
    res.status(500).json({ error: "Failed to upload image to ImgBB" });
  }
});

module.exports = router;