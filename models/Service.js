// const mongoose = require("mongoose");


// const serviceSchema = new mongoose.Schema({
//   name: String,
//   description: String,
//   price: Number,
//   duration: Number,
// });

// const serviceCategorySchema = new mongoose.Schema({
//   category: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//     lowercase: true, // optional: normalize case
//   },
//   services: [serviceSchema],
// });


// module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);

const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  duration: Number,
  isChild: {
    type: Boolean,
    default: false, // false means normal service
  }
});

const serviceCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  services: [serviceSchema],
});

module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);
