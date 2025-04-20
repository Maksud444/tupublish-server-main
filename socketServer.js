import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "./models/message.model.js";
import Conversation from "./models/conversation.model.js";

dotenv.config();

// Connect to MongoDB
mongoose.set("strictQuery", true);
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log("✅ Socket Server: Connected to MongoDB");
  } catch (error) {
    console.error("❌ Socket Server: MongoDB connection error:", error);
    process.exit(1);
  }
};

// Create HTTP server
const socketServer = http.createServer();

// Create Socket.io server
const io = new Server(socketServer, {
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

// Start the socket server
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

const startSocketServer = async () => {
  try {
    await connectDB();
    socketServer.listen(SOCKET_PORT, () => {
      console.log(`🚀 Socket Server running on port ${SOCKET_PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start socket server:", error);
    process.exit(1);
  }
};

startSocketServer();