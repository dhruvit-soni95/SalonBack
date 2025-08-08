const mongoose = require("mongoose");


const scheduleSchema = new mongoose.Schema({
  barberId: { type: String, required: true }, // static if only 1 barber
  openingHours: {
    type: Map,
    of: {
      open: String,  // e.g., "09:00"
      close: String, // e.g., "18:00"
    },
    default: {
      Monday: { open: "09:00", close: "18:00" },
      Tuesday: { open: "09:00", close: "18:00" },
      Wednesday: { open: "09:00", close: "18:00" },
      Thursday: { open: "09:00", close: "18:00" },
      Friday: { open: "09:00", close: "18:00" },
      Saturday: { open: "10:00", close: "16:00" },
      Sunday: { open: null, close: null }, // closed
    }
  },
  offDays: [String], // ["Sunday"]
  accidentalLeaves: [String], // ["2025-08-01"]
  specialClosures: [String],  // ["2025-08-15"]
}, { timestamps: true });

module.exports = mongoose.model("Schedule", scheduleSchema);