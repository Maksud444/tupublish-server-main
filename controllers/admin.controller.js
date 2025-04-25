import User from "../models/user.model.js";
import Gig from "../models/gig.model.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import createError from "../utils/createError.js";

// Dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ isSeller: true });
    const totalGigs = await Gig.countDocuments();
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ isCompleted: true });
    const totalRevenue = await Order.aggregate([
      { $match: { isCompleted: true } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]);
    
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
    
    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Fetch buyer and seller names for each order
    const ordersWithNames = await Promise.all(
      recentOrders.map(async (order) => {
        const buyer = await User.findById(order.buyerId);
        const seller = await User.findById(order.sellerId);
        
        return {
          ...order._doc,
          buyerName: buyer ? buyer.username : "Unknown",
          sellerName: seller ? seller.username : "Unknown"
        };
      })
    );
      
    // Get top selling gigs
    const topGigs = await Gig.find()
      .sort({ sales: -1 })
      .limit(5);
    
    // Fetch seller names for each gig
    const gigsWithSellerNames = await Promise.all(
      topGigs.map(async (gig) => {
        const seller = await User.findById(gig.userId);
        
        return {
          ...gig._doc,
          sellerName: seller ? seller.username : "Unknown"
        };
      })
    );
    
    res.status(200).json({
      stats: {
        totalUsers,
        totalSellers,
        totalGigs,
        totalOrders,
        completedOrders,
        revenue
      },
      recentOrders: ordersWithNames,
      topGigs: gigsWithSellerNames
    });
  } catch (err) {
    next(err);
  }
};

// User management
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return next(createError(404, "User not found"));
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    // Don't allow password updates through this endpoint
    if (req.body.password) {
      delete req.body.password;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body },
      { new: true }
    ).select("-password");
    
    if (!updatedUser) return next(createError(404, "User not found"));
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUserByAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError(404, "User not found"));
    
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User has been deleted" });
  } catch (err) {
    next(err);
  }
};

// Gig management
export const getAllGigs = async (req, res, next) => {
  try {
    const gigs = await Gig.find();
    
    // Fetch seller information for each gig
    const formattedGigs = await Promise.all(
      gigs.map(async (gig) => {
        const seller = await User.findById(gig.userId);
        console.log(gig)
        return {
          _id: gig._id,
          title: gig.title,
          desc: gig.desc,
          cat: gig.cat,
          price: gig.price,
          cover: gig.cover,
          images: gig.images,
          shortTitle: gig.shortTitle,
          shortDesc: gig.shortDesc,
          deliveryTime: gig.deliveryTime,
          revisionNumber: gig.revisionNumber,
          features: gig.features,
          sales: gig.sales,
          totalStars: gig.totalStars,
          starNumber: gig.starNumber,
          userId: gig.userId,
          username: seller ? seller.username : "Unknown",
          sellerName: seller ? seller.username : "Unknown",
          userImg: seller ? seller.img : null,
          createdAt: gig.createdAt,
          updatedAt: gig.updatedAt
        };
      })
    );
    
    res.status(200).json(formattedGigs);
  } catch (err) {
    next(err);
  }
};

export const getGigById = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found"));
    
    // Fetch seller information
    const seller = await User.findById(gig.userId);
    
    const formattedGig = {
      _id: gig._id,
      title: gig.title,
      desc: gig.desc,
      cat: gig.cat,
      price: gig.price,
      cover: gig.cover,
      images: gig.images,
      shortTitle: gig.shortTitle,
      shortDesc: gig.shortDesc,
      deliveryTime: gig.deliveryTime,
      revisionNumber: gig.revisionNumber,
      features: gig.features,
      sales: gig.sales,
      totalStars: gig.totalStars,
      starNumber: gig.starNumber,
      userId: gig.userId,
      username: seller ? seller.username : "Unknown",
      sellerName: seller ? seller.username : "Unknown",
      userImg: seller ? seller.img : null,
      createdAt: gig.createdAt,
      updatedAt: gig.updatedAt
    };
    
    res.status(200).json(formattedGig);
  } catch (err) {
    next(err);
  }
};

export const updateGig = async (req, res, next) => {
  try {
    const updatedGig = await Gig.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body },
      { new: true }
    );
    
    if (!updatedGig) return next(createError(404, "Gig not found"));
    res.status(200).json(updatedGig);
  } catch (err) {
    next(err);
  }
};

export const deleteGigByAdmin = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found"));
    
    await Gig.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Gig has been deleted" });
  } catch (err) {
    next(err);
  }
};

// Order management
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    
    // Fetch buyer, seller, and gig information for each order
    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        const buyer = await User.findById(order.buyerId);
        const seller = await User.findById(order.sellerId);
        const gig = await Gig.findById(order.gigId);
        
        return {
          _id: order._id,
          title: order.title,
          gigId: order.gigId,
          gigTitle: gig ? gig.title : "Unknown Gig",
          gigCover: gig ? gig.cover : null,
          img: order.img,
          price: order.price,
          isCompleted: order.isCompleted,
          createdAt: order.createdAt,
          buyerId: order.buyerId,
          buyerName: buyer ? buyer.username : "Unknown",
          buyerImg: buyer ? buyer.img : null,
          sellerId: order.sellerId,
          sellerName: seller ? seller.username : "Unknown",
          sellerImg: seller ? seller.img : null
        };
      })
    );
    
    res.status(200).json(formattedOrders);
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'username email img')
      .populate('sellerId', 'username email img');
      
    if (!order) return next(createError(404, "Order not found"));
    
    const formattedOrder = {
      _id: order._id,
      title: order.title,
      gigId: order.gigId,
      img: order.img,
      price: order.price,
      isCompleted: order.isCompleted,
      createdAt: order.createdAt,
      buyerId: order.buyerId._id,
      buyerName: order.buyerId.username,
      buyerImg: order.buyerId.img,
      sellerId: order.sellerId._id,
      sellerName: order.sellerId.username,
      sellerImg: order.sellerId.img
    };
    
    res.status(200).json(formattedOrder);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { isCompleted } = req.body;
    
    if (isCompleted === undefined) {
      return next(createError(400, "isCompleted status is required"));
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { $set: { isCompleted } },
      { new: true }
    );
    
    if (!updatedOrder) return next(createError(404, "Order not found"));
    res.status(200).json(updatedOrder);
  } catch (err) {
    next(err);
  }
};

export const deleteOrderByAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(createError(404, "Order not found"));
    
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Order has been deleted" });
  } catch (err) {
    next(err);
  }
};

// Review management
export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    
    // Fetch reviewer, gig, and seller information for each review
    const formattedReviews = await Promise.all(
      reviews.map(async (review) => {
        const reviewer = await User.findById(review.userId);
        const gig = await Gig.findById(review.gigId);
        let seller = null;
        
        if (gig) {
          seller = await User.findById(gig.userId);
        }
        
        return {
          _id: review._id,
          gigId: review.gigId,
          gigTitle: gig ? gig.title : "Unknown Gig",
          sellerId: seller ? seller._id : null,
          sellerName: seller ? seller.username : "Unknown",
          sellerImg: seller ? seller.img : null,
          userId: review.userId,
          username: reviewer ? reviewer.username : "Unknown",
          reviewerName: reviewer ? reviewer.username : "Unknown",
          userImg: reviewer ? reviewer.img : null,
          star: review.star,
          desc: review.desc,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt
        };
      })
    );
    
    res.status(200).json(formattedReviews);
  } catch (err) {
    next(err);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(createError(404, "Review not found"));
    
    // Fetch reviewer, gig, and seller information
    const reviewer = await User.findById(review.userId);
    const gig = await Gig.findById(review.gigId);
    let seller = null;
    
    if (gig) {
      seller = await User.findById(gig.userId);
    }
    
    const formattedReview = {
      _id: review._id,
      gigId: review.gigId,
      gigTitle: gig ? gig.title : "Unknown Gig",
      sellerId: seller ? seller._id : null,
      sellerName: seller ? seller.username : "Unknown",
      sellerImg: seller ? seller.img : null,
      userId: review.userId,
      username: reviewer ? reviewer.username : "Unknown",
      reviewerName: reviewer ? reviewer.username : "Unknown",
      userImg: reviewer ? reviewer.img : null,
      star: review.star,
      desc: review.desc,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
    
    res.status(200).json(formattedReview);
  } catch (err) {
    next(err);
  }
};

export const deleteReviewByAdmin = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return next(createError(404, "Review not found"));
    
    // Get the gig to update its ratings
    const gig = await Gig.findById(review.gigId);
    if (gig) {
      // Decrement the total stars and star number
      await Gig.findByIdAndUpdate(review.gigId, {
        $inc: { totalStars: -review.star, starNumber: -1 },
      });
    }
    
    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Review has been deleted" });
  } catch (err) {
    next(err);
  }
}; 