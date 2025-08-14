const mongoose = require("mongoose");


const serviceSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  duration: Number,
});

const serviceCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true, // optional: normalize case
  },
  services: [serviceSchema],
});


module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);