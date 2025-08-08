const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const authUserRoute = require('./routes/user');
const bookingUserRoute = require('./routes/booking');
const scheduleRoute = require('./routes/schedule');
const serviceRoute = require('./routes/services');


// ====== MongoDB Connection ======
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use("/api/auth", authUserRoute)
app.use("/api/book", bookingUserRoute)
app.use("/api/maintain/days", scheduleRoute)
app.use("/api/maintain/services", serviceRoute)

// ====== Start Server ======
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});
