import createError from "../utils/createError.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

// Create a new conversation between buyer and seller
export const createConversation = async (req, res, next) => {
  const newConversation = new Conversation({
    id: req.isSeller ? req.userId + req.body.to : req.body.to + req.userId,
    sellerId: req.isSeller ? req.userId : req.body.to,
    buyerId: req.isSeller ? req.body.to : req.userId,
    readBySeller: req.isSeller,
    readByBuyer: !req.isSeller,
  });

  try {
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      id: newConversation.id
    });

    if (existingConversation) {
      return res.status(200).send(existingConversation);
    }

    const savedConversation = await newConversation.save();
    res.status(201).send(savedConversation);
  } catch (err) {
    next(err);
  }
};

// Get all conversations for the current user (different for buyer and seller)
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find(
      req.isSeller
        ? { sellerId: req.userId }
        : { buyerId: req.userId }
    ).sort({ updatedAt: -1 });
    
    res.status(200).send(conversations);
  } catch (err) {
    next(err);
  }
};

// Get a single conversation by ID
export const getSingleConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return next(createError(404, "Conversation not found"));
    }
    
    // Check if user is part of this conversation
    if (
      conversation.sellerId !== req.userId &&
      conversation.buyerId !== req.userId
    ) {
      return next(createError(403, "You can only view your own conversations"));
    }
    
    res.status(200).send(conversation);
  } catch (err) {
    next(err);
  }
};

// Update conversation (mark as read)
export const updateConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return next(createError(404, "Conversation not found"));
    }
    
    // Check if user is part of this conversation
    if (
      conversation.sellerId !== req.userId &&
      conversation.buyerId !== req.userId
    ) {
      return next(createError(403, "You can only update your own conversations"));
    }
    
    const updatedConversation = await Conversation.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          ...(req.isSeller ? { readBySeller: true } : { readByBuyer: true }),
        },
      },
      { new: true }
    );

    res.status(200).send(updatedConversation);
  } catch (err) {
    next(err);
  }
};

// Delete a conversation (optional)
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ id: req.params.id });
    
    if (!conversation) {
      return next(createError(404, "Conversation not found"));
    }
    
    // Check if user is part of this conversation
    if (
      conversation.sellerId !== req.userId &&
      conversation.buyerId !== req.userId
    ) {
      return next(createError(403, "You can only delete your own conversations"));
    }
    
    // Delete the conversation
    await Conversation.findOneAndDelete({ id: req.params.id });
    
    // Delete all messages in this conversation
    await Message.deleteMany({ conversationId: req.params.id });
    
    res.status(200).send("Conversation has been deleted");
  } catch (err) {
    next(err);
  }
};