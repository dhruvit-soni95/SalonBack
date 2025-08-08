const mongoose = require("mongoose");

// ====== Schemas ======
const usersSchema = new mongoose.Schema({
  phone: String,
  name: String,
  email: String,
  otp: String,
  otpExpiresAt: Date,
});
module.exports = mongoose.model("User", usersSchema);
