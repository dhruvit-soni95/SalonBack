const mongoose = require("mongoose");


const liveCustomerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId, // same as Booking ID
  userName: String,
  barber: String,
  estimatedStart: Date,
  duration: Number,
  breakDeltaMinutes: Number,
  isLocal: Boolean,
  queueIndex: Number,
  isChild: Boolean, // ✅ ADD THIS
});

const liveQueueSchema = new mongoose.Schema({
  updatedAt: { type: Date, default: Date.now },
  queue: [liveCustomerSchema],
});

module.exports = mongoose.model("LiveQueue", liveQueueSchema);
