import createError from "../utils/createError.js";
import Order from "../models/order.model.js";
import Gig from "../models/gig.model.js";
import Stripe from "stripe";

export const intent = async (req, res, next) => {
  try {
    const stripe = new Stripe(process.env.STRIPE);
    
    if (!req.params.id) {
      return next(createError(400, "Gig ID is required"));
    }

    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(createError(404, "Gig not found"));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: gig.price * 100,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    const newOrder = new Order({
      gigId: gig._id,
      img: gig.cover,
      title: gig.title,
      buyerId: req.userId,
      sellerId: gig.userId,
      price: gig.price,
      payment_intent: paymentIntent.id,
    });

    await newOrder.save();

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Payment intent error:", err);
    next(err.status ? err : createError(500, "Error creating payment intent"));
  }
};

export const getOrders = async (req, res, next) => {
  
  try {
    if (!req.userId) {
      return next(createError(401, "You must be logged in"));
    }

    const orders = await Order.find({
      ...({ buyerId: req.userId }),
    }).sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for user ${req.userId} (isSeller: ${req.isSeller})`);

    res.status(200).json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    next(createError(500, "Error fetching orders"));
  }
};

export const confirm = async (req, res, next) => {
  try {
    if (!req.body.payment_intent) {
      return next(createError(400, "Payment intent is required"));
    }

    const updatedOrders = await Order.updateMany(
      {
        payment_intent: req.body.payment_intent,
      },
      {
        $set: {
          isCompleted: true,
        },
      }
    );

    if (updatedOrders.matchedCount === 0) {
      return next(createError(404, "No orders found with this payment intent"));
    }

    const orders = await Order.find({ payment_intent: req.body.payment_intent });

    res.status(200).json({ 
      message: `${updatedOrders.modifiedCount} orders have been confirmed`, 
      orders: orders 
    });
  } catch (err) {
    console.error("Confirm order error:", err);
    next(createError(500, "Error confirming orders"));
  }
};