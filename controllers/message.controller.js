import createError from "../utils/createError.js";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import axios from "axios"; // Import axios for making HTTP requests

// export const createMessage = async (req, res, next) => {
//   const newMessage = new Message({
//     conversationId: req.body.conversationId,
//     userId: req.userId,
//     desc: req.body.desc,
//   });
  
//   try {
//     const savedMessage = await newMessage.save();
    
//     // Get the conversation to find the other participant
//     const conversation = await Conversation.findOne({ id: req.body.conversationId });
//     if (!conversation) {
//       return next(createError(404, "Conversation not found"));
//     }
    
//     // Update conversation
//     await Conversation.findOneAndUpdate(
//       { id: req.body.conversationId },
//       {
//         $set: {
//           readBySeller: req.isSeller,
//           readByBuyer: !req.isSeller,
//           lastMessage: req.body.desc,
//         },
//       },
//       { new: true }
//     );

//     // Determine who should receive the notification
//     const receiverId = req.isSeller 
//       ? conversation.buyerId 
//       : conversation.sellerId;
    
//     // Notify the socket server about the new message (optional)
//     // This is a fallback if users aren't connected to the socket server
//     try {
//       // This would be an internal notification to your socket server
//       // You could also use Redis pub/sub or another messaging system for this
//       const socketPort = process.env.SOCKET_PORT || 3001;
//       await axios.post(`http://localhost:${socketPort}/notify`, {
//         type: "newMessage",
//         data: {
//           message: savedMessage,
//           conversationId: req.body.conversationId,
//           sender: req.userId,
//           receiver: receiverId
//         }
//       });
//     } catch (socketErr) {
//       // Just log the error, but don't fail the request
//       console.error("Failed to notify socket server:", socketErr);
//     }

//     res.status(201).send(savedMessage);
//   } catch (err) {
//     next(err);
//   }
// };

export const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id });
    res.status(200).send(messages);
  } catch (err) {
    next(err);
  }
};


export const createMessage = async (req, res, next) => {
  const newMessage = new Message({
    conversationId: req.body.conversationId,
    userId: req.userId,
    desc: req.body.desc,
  });
  
  try {
    const savedMessage = await newMessage.save();
    
    // Update conversation's lastMessage and timestamps
    await Conversation.findOneAndUpdate(
      { id: req.body.conversationId },
      {
        $set: {
          readBySeller: req.isSeller,
          readByBuyer: !req.isSeller,
          lastMessage: req.body.desc,
        },
      },
      { new: true }
    );

    res.status(201).send(savedMessage);
  } catch (err) {
    next(err);
  }
};

// export const getMessages = async (req, res, next) => {
//   try {
//     const messages = await Message.find({ 
//       conversationId: req.params.id 
//     }).sort({ createdAt: 1 }); // Sort by creation time ascending (oldest first)
    
//     res.status(200).send(messages);
//   } catch (err) {
//     next(err);
//   }
// };