const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  userName: String,
  userPhone: String,
  userEmail: String,
  services: [
    {
      name: String,
      price: Number,
      duration: Number,
    },
  ],
  barber: String,
  duration: Number,
  estimatedStart: Date,
  estimatedEnd: Date,
  breakDeltaMinutes: {
    type: Number,
    default: 0,
  },
  queueIndex: {
    type: Number,
    default: 0,
  },
  status: { type: String, default: "queued" },
  source: { type: String, default: "online" },
  priorityOverride: { type: Boolean, default: false },
  isChild: { type: Boolean, default: false }, // ✅ Add this
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", bookingSchema);