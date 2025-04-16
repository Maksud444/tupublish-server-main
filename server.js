// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// Routes
import userRoute from "./routes/user.route.js";
import gigRoute from "./routes/gig.route.js";
import orderRoute from "./routes/order.route.js"; 
import reviewRoute from "./routes/review.route.js";
import conversationRoute from "./routes/conversation.route.js";
import messageRoute from "./routes/message.route.js";
import authRoute from "./routes/auth.route.js";

dotenv.config();
const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://tupublish.com",
      "https://www.tupublish.com",
      "http://tupublish.com",
      "http://www.tupublish.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

// Database connection
mongoose.set("strictQuery", true);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://tupublish.com",
      "https://www.tupublish.com",
      "http://tupublish.com",
      "http://www.tupublish.com"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/gigs", gigRoute);
app.use("/api/orders", orderRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error"
  });
});

// WebSocket logic
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`📥 User joined conversation: ${conversationId}`);
  });

  socket.on("sendMessage", (messageData) => {
    const { conversationId } = messageData;
    io.to(conversationId).emit("receiveMessage", messageData);
    console.log(`📤 Message sent to ${conversationId}:`, messageData.desc);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Start the server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(8800, () => {
      console.log("🚀 Server running on port 8800");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
