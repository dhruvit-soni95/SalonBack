const express = require("express");
require("dotenv").config();

const Schedule = require("../models/Schedule");
const router = express.Router();


const BARBER_ID = "barber-001"; // static

// GET schedule
router.get("/schedule", async (req, res) => {
  const schedule = await Schedule.findOne({ barberId: BARBER_ID });
  res.json(schedule);
});

// CREATE or UPDATE schedule
router.post("/schedule", async (req, res) => {
  const data = req.body;

  const updated = await Schedule.findOneAndUpdate(
    { barberId: BARBER_ID },
    { $set: data },
    { new: true, upsert: true }
  );

  res.json(updated);
});





module.exports = router;