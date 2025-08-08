const express = require("express");
require("dotenv").config();

const ServiceCategory = require("../models/Service");
const router = express.Router();


// GET all categories with services
router.get("/categories", async (req, res) => {
  const categories = await ServiceCategory.find();
  res.json(categories);
});

// POST create category
router.post("/categories", async (req, res) => {
  const { category } = req.body;
  const exists = await ServiceCategory.findOne({ category });
  if (exists) return res.status(400).json({ error: "Category exists" });
  const newCat = new ServiceCategory({ category, services: [] });
  await newCat.save();
  res.json({ success: true });
});

// DELETE category
router.delete("/categories/:id", async (req, res) => {
  await ServiceCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// POST add service
router.post("/services/:categoryId/add", async (req, res) => {
  const { name, price, duration } = req.body;
  const category = await ServiceCategory.findById(req.params.categoryId);
  category.services.push({ name, price, duration });
  await category.save();
  res.json({ success: true });
});

// PUT edit service
router.put("/services/:categoryId/edit/:serviceId", async (req, res) => {
  const { name, price, duration } = req.body;
  const category = await ServiceCategory.findById(req.params.categoryId);
  const service = category.services.id(req.params.serviceId);
  service.name = name;
  service.price = price;
  service.duration = duration;
  await category.save();
  res.json({ success: true });
});

// DELETE service
router.delete("/services/:categoryId/delete/:serviceId", async (req, res) => {
  try {
    const { categoryId, serviceId } = req.params;

    const category = await ServiceCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.services = category.services.filter(
      (service) => service._id.toString() !== serviceId
    );

    await category.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// router.delete("/services/:categoryId/delete/:serviceId", async (req, res) => {
//   const category = await ServiceCategory.findById(req.params.categoryId);
//   category.services.id(req.params.serviceId).remove();
//   await category.save();
//   res.json({ success: true });
// });





router.post("/seed-services", async (req, res) => {
  try {
    const data = [
      {
        category: "main",
        services: [
          { name: "Adult (16–64)", price: 27, duration: 30 },
          { name: "Youth (12–15)", price: 23, duration: 30 },
          { name: "Kids (0–11)", price: 20, duration: 25 },
          { name: "Senior (65+)", price: 22, duration: 20 },
          { name: "Buzz Cut", price: 20, duration: 20 },
        ],
      },
      {
        category: "addons",
        services: [
          { name: "Back of the Neck Shave", price: 5, duration: 5 },
          { name: "Beard Trim", price: 10, duration: 15 },
          { name: "Hair Tattoo", price: 5, duration: 10 },
          { name: "Straight Razor Skin Fade", price: 7, duration: 7 },
          { name: "Waxing (Eyebrow, Ears, Nose)", price: 10, duration: 10 },
          { name: "Hair Color", price: 30, duration: 45 },
        ],
      },
      {
        category: "extras",
        services: [
          { name: "Head Shave", price: 30, duration: 40 },
          { name: "Face Shave", price: 30, duration: 40 },
          { name: "Goatee Shave", price: 30, duration: 40 },
          { name: "Beard Grooming", price: 27, duration: 30 },
          { name: "Scrub Massage on Face", price: 25, duration: 35 },
        ],
      },
      {
        category: "combos",
        services: [
          { name: "Haircut + Beard Trim", price: 35, duration: 45 },
          { name: "Haircut + Shave", price: 55, duration: 55 },
          { name: "Haircut + Hair Color", price: 50, duration: 50 },
        ],
      },
    ];

    await ServiceCategory.deleteMany(); // Clear previous data
    await ServiceCategory.insertMany(data);
    res.send({ message: "Services seeded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Seeding failed");
  }
});





router.get("/services", async (req, res) => {
  try {
    const categories = await ServiceCategory.find({});
    const response = {
      main: [],
      addons: [],
      extras: [],
      combos: [],
    };

    categories.forEach(cat => {
      response[cat.category] = cat.services;
    });

    res.json(response);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});





module.exports = router;