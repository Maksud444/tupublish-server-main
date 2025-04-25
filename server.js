// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Routes
import userRoute from "./routes/user.route.js";
import gigRoute from "./routes/gig.route.js";
import orderRoute from "./routes/order.route.js"; 
import reviewRoute from "./routes/review.route.js";
import conversationRoute from "./routes/conversation.route.js";
import messageRoute from "./routes/message.route.js";
import authRoute from "./routes/auth.route.js";
import Message from "./models/message.model.js";
import Conversation from "./models/conversation.model.js";
import adminRoute from "./routes/admin.route.js";

dotenv.config();
const app = express();

// Create HTTP server with Express
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://tupublish.com",
      "https://www.tupublish.com",
      "http://tupublish.com",
      "http://www.tupublish.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Database configuration
mongoose.set("strictQuery", true);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO, {
      serverSelectionTimeoutMS: 5000,  // 5 seconds timeout
      socketTimeoutMS: 45000           // 45 seconds socket timeout
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);  // Exit process on connection failure
  }
};

const allowedOrigins = [
  "http://localhost:5173",
  "https://tupublish.com",
  "https://www.tupublish.com",
  "http://tupublish.com",
  "http://www.tupublish.com",
];

app.use(cors({
  origin: function (origin, callback) {
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/gigs", gigRoute);
app.use("/api/orders", orderRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/admin", adminRoute);

// Global error handler
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "Internal Server Error"
  });
});

// ===== SOCKET.IO IMPLEMENTATION =====

// Map to store active users
const activeUsers = new Map();

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error"));
    }

    socket.userId = decoded.id;
    socket.isSeller = decoded.isSeller;
    next();
  });
});

// Handle socket connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Add user to active users
  activeUsers.set(socket.userId, socket.id);
  
  // Emit active status to all connected clients
  io.emit("userStatus", {
    userId: socket.userId,
    status: "online"
  });
  
  // Join user to their own room for private messages
  socket.join(socket.userId);
  
  // Handle new message
  socket.on("sendMessage", (data) => {
    console.log("Message received:", data);
    const { conversationId, desc, receiverId } = data;
    
    // Create message object to send
    const messageData = {
      conversationId: conversationId,
      message: {
        _id: `server_${Date.now()}`, // Temporary ID, will be replaced with real one
        conversationId: conversationId,
        userId: socket.userId || data.senderId,
        desc: desc,
        createdAt: new Date().toISOString(),
      },
      senderId: socket.userId || data.senderId,
    };
    
    // Broadcast to receiver's room
    if (receiverId) {
      console.log(`Emitting message to receiver: ${receiverId}`);
      socket.to(receiverId).emit("newMessage", messageData);
    }
    
    // Also emit to sender for confirmation (not necessary but helps debugging)
    socket.emit("messageSent", { 
      status: "delivered",
      messageData 
    });
  });
  
  // Handle typing status
  socket.on("typing", (data) => {
    const { conversationId, receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        conversationId,
        userId: socket.userId,
        isTyping: true
      });
    }
  });
  
  socket.on("stopTyping", (data) => {
    const { conversationId, receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        conversationId,
        userId: socket.userId,
        isTyping: false
      });
    }
  });
  
  // Handle read receipts
  socket.on("messageRead", async (data) => {
    const { conversationId, senderId } = data;
    
    try {
      await Conversation.findOneAndUpdate(
        { id: conversationId },
        {
          $set: {
            ...(socket.isSeller ? { readBySeller: true } : { readByBuyer: true }),
          },
        },
        { new: true }
      );
      
      // Notify the sender that their message was read
      const senderSocketId = activeUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReadStatus", {
          conversationId,
          readBy: socket.userId
        });
      }
    } catch (error) {
      console.error("Message read status error:", error);
    }
  });
  
  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    
    // Remove user from active users
    activeUsers.delete(socket.userId);
    
    // Emit offline status to all connected clients
    io.emit("userStatus", {
      userId: socket.userId,
      status: "offline"
    });
  });
});

// Start server after DB connection
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} with Socket.io integration`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
