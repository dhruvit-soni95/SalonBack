const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const User = require("../models/User");
const Booking = require("../models/Booking");
const LiveQueue = require("../models/Livequeue");

const router = express.Router();

// ====== Helper ======
function formatTimeFromMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes * 60) % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ====== Routes ======
// GET all active bookings for a user
router.get("/bookings/user/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;

    const bookings = await Booking.find({
      userPhone: phone,
      status: { $in: ["queued", "ongoing"] }, // active bookings only
    }).sort({ estimatedStart: 1 }); // optional: sort by time

    res.json({ bookings });
  } catch (err) {
    console.error("Error fetching user bookings:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// router.post("/bookings/walk-in", async (req, res) => {
//   try {
//     const {
//       name,
//       phone,
//       // email,
//       services,
//       barber,
//       priority = false,
//     } = req.body;

//     // ✅ Calculate duration from services array (safely)
//     const duration = services.reduce((sum, s) => sum + (s.duration || 0), 0);

//     // ✅ Get current queue for the barber
//     const existingQueue = await Booking.find({
//       status: "queued",
//       barber,
//     }).sort({ queueIndex: 1 });

//     let newQueueIndex = priority ? 0 : existingQueue.length;

//     let estimatedStart;
//     let estimatedEnd;

//     if (priority) {
//       // ✅ Place at the top
//       estimatedStart = new Date();
//       estimatedEnd = new Date(estimatedStart.getTime() + duration * 60000);

//       // ✅ Shift all existing bookings
//       let tempTime = new Date(estimatedEnd.getTime());
//       for (const b of existingQueue) {
//         const bDuration =
//           b.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || b.duration;

//         b.queueIndex += 1;
//         b.estimatedStart = new Date(tempTime);
//         b.estimatedEnd = new Date(tempTime.getTime() + bDuration * 60000);
//         tempTime = new Date(tempTime.getTime() + bDuration * 60000);
//         await b.save();
//       }
//     } else {
//       // ✅ Add to end of queue
//       if (existingQueue.length > 0) {
//         const last = existingQueue[existingQueue.length - 1];
//         const lastDuration =
//           last.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || last.duration;

//         estimatedStart = new Date(
//           last.estimatedStart.getTime() + lastDuration * 60000
//         );
//       } else {
//         estimatedStart = new Date();
//       }

//       estimatedEnd = new Date(estimatedStart.getTime() + duration * 60000);
//     }

//     // ✅ Save walk-in booking
//     const newBooking = await Booking.create({
//       userName: name,
//       userPhone: phone,
//       // userEmail: email,
//       services,
//       barber,
//       duration,
//       estimatedStart,
//       estimatedEnd,
//       queueIndex: newQueueIndex,
//       source: "walk-in",
//       priorityOverride: priority,
//       status: "queued",
//     });

//     res.json({ success: true, booking: newBooking });
//   } catch (err) {
//     console.error("Walk-in booking error:", err);
//     res.status(500).json({ error: "Failed to add walk-in booking" });
//   }
// });

router.post("/bookings/walk-in", async (req, res) => {
  try {
    const {
      name,
      phone,
      services,
      barber,
    } = req.body;

    // ✅ Calculate total duration from services array
    const duration = services.reduce((sum, s) => sum + (s.duration || 0), 0);

    // ✅ Get current queue for the barber (ordered by position)
    const existingQueue = await Booking.find({
      status: "queued",
      barber,
    }).sort({ queueIndex: 1 });

    // ✅ Always put walk-in at the END of the queue
    // const newQueueIndex = existingQueue.length;

    // ✅ Always put walk-in STRICTLY after the last booking in the queue
    const lastBooking = await Booking.findOne({ status: "queued", barber })
      .sort({ queueIndex: -1 })
      .lean();

    const newQueueIndex = lastBooking ? lastBooking.queueIndex + 1 : 0;

    let estimatedStart;
    let estimatedEnd;

    if (existingQueue.length > 0) {
      // ✅ Find last booking in the queue
      const last = existingQueue[existingQueue.length - 1];
      const lastDuration =
        last.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || last.duration;

      // Start right after the last booking ends
      estimatedStart = new Date(
        last.estimatedStart.getTime() + lastDuration * 60000
      );
    } else {
      // ✅ If no one in queue, start now
      estimatedStart = new Date();
    }

    estimatedEnd = new Date(estimatedStart.getTime() + duration * 60000);

    // ✅ Create the new walk-in booking
    const newBooking = await Booking.create({
      userName: name,
      userPhone: phone,
      services,
      barber,
      duration,
      estimatedStart,
      estimatedEnd,
      queueIndex: newQueueIndex,
      source: "walk-in",
      priorityOverride: false, // Always false for walk-ins
      status: "queued",
    });

    res.json({ success: true, booking: newBooking });
  } catch (err) {
    console.error("Walk-in booking error:", err);
    res.status(500).json({ error: "Failed to add walk-in booking" });
  }
});




router.post("/bookings", async (req, res) => {
  const { user, services, barber, isChild } = req.body; // ✅ Accept isChild

  if (!user || !services || !barber) {
    return res.status(400).json({ error: "Missing required data" });
  }

  try {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingBookings = await Booking.find({
      barber,
      createdAt: { $gte: todayStart },
    }).sort({ estimatedStart: 1 });

    let currentTime = now;

    for (let i = 0; i < existingBookings.length; i++) {
      const b = existingBookings[i];
      const start = new Date(b.estimatedStart || b.createdAt);
      const durationMs = (b.duration || 0) * 60000;

      if (start <= now && now < new Date(start.getTime() + durationMs)) {
        const elapsed = now - start;
        const remaining = durationMs - elapsed;
        currentTime = new Date(currentTime.getTime() + remaining);
      } else if (start > now) {
        const startTime = currentTime > start ? currentTime : start;
        currentTime = new Date(startTime.getTime() + durationMs);
      }
    }

    const duration = services.reduce((sum, s) => sum + s.duration, 0);
    const estimatedStart = new Date(currentTime);
    const waitTimeMs = estimatedStart - now;
    const isNow = waitTimeMs <= 10000;
    const formattedWait = isNow
      ? "NOW"
      : formatTimeFromMinutes(waitTimeMs / 60000);

    const lastInQueue = await Booking.findOne({ barber, status: "queued" })
      .sort({ queueIndex: -1 })
      .lean();

    const nextQueueIndex = lastInQueue ? lastInQueue.queueIndex + 1 : 1;

    const newBooking = new Booking({
      userId: user._id,
      userName: user.name,
      userPhone: user.phone,
      userEmail: user.email,
      services,
      barber,
      duration,
      estimatedStart,
      status: "queued",
      queueIndex: nextQueueIndex,
      isChild: isChild || false, // ✅ Save the flag
    });

    await newBooking.save();

    res.status(201).json({
      message: "Booking confirmed",
      estimatedStart,
      estimatedWait: formattedWait,
      duration,
      isNow,
      booking: newBooking,
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Booking failed" });
  }
});



// router.post("/bookings", async (req, res) => {
//   const { user, services, barber, isChild } = req.body;

//   if (!user || !services || !barber) {
//     return res.status(400).json({ error: "Missing required data" });
//   }

//   try {
//     const now = new Date();
//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     // Find today's bookings for this barber
//     const existingBookings = await Booking.find({
//       barber,
//       createdAt: { $gte: todayStart },
//     }).sort({ estimatedStart: 1 });

//     let currentTime = now;

//     // Walk through existing bookings to determine the start time
//     for (let i = 0; i < existingBookings.length; i++) {
//       const b = existingBookings[i];
//       const start = new Date(b.estimatedStart || b.createdAt);
//       const durationMs = (b.duration || 0) * 60000;

//       if (start <= now && now < new Date(start.getTime() + durationMs)) {
//         const elapsed = now - start;
//         const remaining = durationMs - elapsed;
//         currentTime = new Date(currentTime.getTime() + remaining);
//       } else if (start > now) {
//         const startTime = currentTime > start ? currentTime : start;
//         currentTime = new Date(startTime.getTime() + durationMs);
//       }
//     }

//     const duration = services.reduce((sum, s) => sum + s.duration, 0);
//     const estimatedStart = new Date(currentTime);

//     // Check if any queued customers exist for this barber
//     const queuedCount = await Booking.countDocuments({
//       barber,
//       status: "queued",
//     });

//     // If no one is queued, add 20 minutes gap for travel
//     let breakDeltaMinutes = 0;
//     if (queuedCount === 0) {
//       breakDeltaMinutes = 20;
//       estimatedStart.setMinutes(estimatedStart.getMinutes() + 20);
//     }

//     const waitTimeMs = estimatedStart - now;
//     const isNow = waitTimeMs <= 10000;
//     const formattedWait = isNow
//       ? "NOW"
//       : formatTimeFromMinutes(waitTimeMs / 60000);

//     const lastInQueue = await Booking.findOne({ barber, status: "queued" })
//       .sort({ queueIndex: -1 })
//       .lean();

//     const nextQueueIndex = lastInQueue ? lastInQueue.queueIndex + 1 : 1;

//     const newBooking = new Booking({
//       userId: user._id,
//       userName: user.name,
//       userPhone: user.phone,
//       userEmail: user.email,
//       services,
//       barber,
//       duration,
//       estimatedStart,
//       status: "queued",
//       queueIndex: nextQueueIndex,
//       isChild: isChild || false,
//       breakDeltaMinutes, // ✅ Save the break gap if applicable
//     });

//     await newBooking.save();

//     res.status(201).json({
//       message: "Booking confirmed",
//       estimatedStart,
//       estimatedWait: formattedWait,
//       duration,
//       isNow,
//       booking: newBooking,
//     });
//   } catch (error) {
//     console.error("Booking error:", error);
//     res.status(500).json({ error: "Booking failed" });
//   }
// });



// ✅ Get all bookings (for admin/testing)
router.get("/bookingss", async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/api/bookingsss/:phone", async (req, res) => {
  const bookings = await Booking.find({ phone: req.params.phone }); // adjust model
  res.json(bookings);
});


// ✅ Get latest booking by phone and auto-update status
router.get("/bookings/latest/:phone", async (req, res) => {
  try {
    const booking = await Booking.findOne({ userPhone: req.params.phone }).sort(
      { createdAt: -1 }
    );
    if (!booking) {
      return res.json({ booking: null });
    }
    // Auto update status if time passed
    const now = new Date();
    const start = new Date(booking.estimatedStart);
    const end = new Date(start.getTime() + booking.duration * 60000);
    if (now >= end && booking.status !== "completed") {
      booking.status = "completed";
      await booking.save();
    }
    res.json({ booking });
  } catch (err) {
    console.error("Latest booking error:", err);
    res.status(500).json({ error: "Failed to fetch latest booking" });
  }
});


// ==== Auto-complete expired bookings every minute ====
setInterval(async () => {
  const now = new Date();
  try {
    const bookings = await Booking.find({ status: "queued" });

    for (const booking of bookings) {
      const endTime = new Date(
        booking.estimatedStart.getTime() + booking.duration * 60 * 1000
      );

      if (now >= endTime) {
        booking.status = "completed";
        await booking.save();
        // console.log(`Auto-completed booking for ${booking.userName}`);
      }
    }
  } catch (err) {
    console.error("Error in auto-complete loop:", err);
  }
}, 60 * 1000); // Run every minute



router.get("/api/queue", async (req, res) => {
  try {
    const queue = await Booking.find({ status: "queued" }).sort({ queueIndex: 1 }).lean();

    const now = new Date();
    let currentTime = now;

    const runningBooking = queue.find((b) => {
      const start = new Date(b.estimatedStart);
      const end = new Date(start.getTime() + b.duration * 60000);
      return start <= now && now < end;
    });

    if (runningBooking) {
      const start = new Date(runningBooking.estimatedStart);
      const end = new Date(start.getTime() + runningBooking.duration * 60000);
      const remaining = end - now;
      currentTime = new Date(currentTime.getTime() + remaining);
    }

    // Allow a grace period of 2 minutes
    const GRACE_PERIOD_MS = 2 * 60 * 1000;

    const enriched = queue
      .filter((b) => {
        const start = new Date(b.estimatedStart);
        const end = new Date(start.getTime() + b.duration * 60000);
        return now - end < GRACE_PERIOD_MS;
      })
      .map((b) => {
        const est = new Date(b.estimatedStart);
        const waitMs = Math.max(est - now, 0);
        return {
          ...b,
          waitTimeMinutes: Math.ceil(waitMs / 60000),
        };
      });

    res.json({ queue: enriched });
  } catch (err) {
    console.error("Fetch queue failed:", err);
    res.status(500).json({ error: "Failed to fetch queue" });
  }
});

// router.get("/api/queue", async (req, res) => {
//   try {
//     let queue = await Booking.find({ status: "queued" })
//       .sort({ queueIndex: 1 })
//       .lean();

//     const now = new Date();
//     let currentTime = now;

//     // Find running booking (if any) and adjust start time
//     const runningBooking = queue.find((b) => {
//       const start = new Date(b.estimatedStart);
//       const end = new Date(start.getTime() + b.duration * 60000);
//       return start <= now && now < end;
//     });

//     if (runningBooking) {
//       const start = new Date(runningBooking.estimatedStart);
//       const end = new Date(start.getTime() + runningBooking.duration * 60000);
//       const remaining = end - now;
//       currentTime = new Date(currentTime.getTime() + remaining);
//     }

//     // Recalculate estimatedStart/End based on queueIndex order
//     queue = queue.map((b, idx) => {
//       if (idx === 0 && runningBooking) {
//         // If this is the running booking, keep its actual start
//         return b;
//       }
//       const startTime = currentTime;
//       const endTime = new Date(startTime.getTime() + b.duration * 60000);
//       currentTime = endTime;
//       return {
//         ...b,
//         estimatedStart: startTime,
//         estimatedEnd: endTime,
//       };
//     });

//     // Grace period filter
//     const GRACE_PERIOD_MS = 2 * 60 * 1000;
//     const enriched = queue
//       .filter((b) => {
//         const end = new Date(new Date(b.estimatedStart).getTime() + b.duration * 60000);
//         return now - end < GRACE_PERIOD_MS;
//       })
//       .map((b) => {
//         const waitMs = Math.max(new Date(b.estimatedStart) - now, 0);
//         return {
//           ...b,
//           waitTimeMinutes: Math.ceil(waitMs / 60000),
//         };
//       });

//     res.json({ queue: enriched });
//   } catch (err) {
//     console.error("Fetch queue failed:", err);
//     res.status(500).json({ error: "Failed to fetch queue" });
//   }
// });




router.post("/queue/reorder", async (req, res) => {
  try {
    const { queue, remainingTimeMs } = req.body;

    if (!queue || !Array.isArray(queue)) {
      return res.status(400).json({ error: "Invalid queue format" });
    }

    const now = new Date();

    // Fetch full booking objects
    const bookings = await Booking.find({ _id: { $in: queue } });
    const reordered = queue.map((id) =>
      bookings.find((b) => b._id.toString() === id)
    );

    if (reordered.includes(undefined)) {
      return res.status(400).json({ error: "One or more bookings not found" });
    }

    const originalQueue = await Booking.find({ _id: { $in: queue } }).sort({ queueIndex: 1 });
    const originalFirst = originalQueue[0];
    const newFirst = reordered[0];

    // --- Set baseStart time for newFirst ---
    let baseStart;
    let currentTime;

    const isSameFirst =
      originalFirst &&
      newFirst._id.toString() === originalFirst._id.toString();

    if (isSameFirst) {
      baseStart = new Date(originalFirst.estimatedStart);

      if (remainingTimeMs !== undefined && !newFirst.isLocal) {
        currentTime = new Date(baseStart.getTime() + remainingTimeMs);
      } else {
        currentTime = newFirst.isLocal
          ? new Date(baseStart)
          : new Date(baseStart.getTime() + newFirst.duration * 60000);
      }
    } else {
      baseStart = new Date(now);
      newFirst.estimatedStart = baseStart;

      currentTime = newFirst.isLocal
        ? new Date(baseStart)
        : new Date(baseStart.getTime() + newFirst.duration * 60000);
    }

    newFirst.estimatedStart = baseStart;

    // --- Set estimatedStart for remaining bookings ---
    for (let i = 1; i < reordered.length; i++) {
      const breakMs = (reordered[i].breakDeltaMinutes || 0) * 60000;

      reordered[i].estimatedStart = new Date(currentTime.getTime() + breakMs);

      if (!reordered[i].isLocal) {
        currentTime = new Date(reordered[i].estimatedStart.getTime() + reordered[i].duration * 60000);
      } else {
        currentTime = new Date(reordered[i].estimatedStart);
      }
    }

    // --- Save all bookings ---
    for (let i = 0; i < reordered.length; i++) {
      await Booking.findByIdAndUpdate(reordered[i]._id, {
        estimatedStart: reordered[i].estimatedStart,
        queueIndex: i + 1,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Reorder failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});



router.post("/api/cancel-booking", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number is required." });

  try {
    // 1. Find user
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found." });

    // 2. Find the user's active booking
    const booking = await Booking.findOne({
      userId: user._id,
      status: "queued",
    });

    if (!booking) return res.status(404).json({ error: "No active booking found." });

    const { queueIndex, duration, estimatedStart } = booking;

    // 3. Delete the user's booking
    await booking.deleteOne();

    // 4. Update remaining bookings in queue
    const bookingsToUpdate = await Booking.find({
      status: "queued",
      queueIndex: { $gt: queueIndex },
    }).sort({ queueIndex: 1 });

    for (const b of bookingsToUpdate) {
      b.queueIndex -= 1;
      b.estimatedStart = new Date(b.estimatedStart.getTime() - duration * 60 * 1000); // minus canceled duration
      await b.save();
    }

    res.json({ message: "Booking cancelled and queue updated." });
  } catch (err) {
    console.error("Cancel Booking Error:", err);
    res.status(500).json({ error: "Server error while cancelling." });
  }
});


router.delete("/bookings/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the booking to delete
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const { queueIndex, duration, barber } = booking;

    // 2. Delete the booking
    await booking.deleteOne();

    // 3. Find all later bookings in the queue (same barber if applicable)
    const bookingsToUpdate = await Booking.find({
      status: "queued",
      queueIndex: { $gt: queueIndex },
      ...(barber && { barber }), // only filter if barber exists
    }).sort({ queueIndex: 1 });

    // 4. Update queueIndex and estimatedStart
    for (const b of bookingsToUpdate) {
      b.queueIndex -= 1;
      b.estimatedStart = new Date(b.estimatedStart.getTime() - duration * 60 * 1000); // subtract duration in ms
      await b.save();
    }

    res.json({ success: true, message: "Booking deleted and queue updated." });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});



async function rebuildQueue(barber) {
  const queue = await Booking.find({ status: "queued", barber }).sort({ queueIndex: 1 });

  let currentTime = new Date();

  for (let i = 0; i < queue.length; i++) {
    const booking = queue[i];

    const breakMs = (booking.breakDeltaMinutes || 0) * 60 * 1000;

    // ⛔️ Skip updating current customer if service already started
    if (i === 0 && booking.estimatedStart && new Date(booking.estimatedStart) <= new Date()) {
      // Set current time to the current customer's estimatedEnd (includes their break)
      const durationMinutes = booking.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
      const durationMs = durationMinutes * 60 * 1000;
      const estimatedEnd = new Date(new Date(booking.estimatedStart).getTime() + breakMs + durationMs);

      currentTime = new Date(estimatedEnd); // so next customer starts after this
      continue; // do not reset current customer's timing
    }

    // Apply any break for this customer
    currentTime = new Date(currentTime.getTime() + breakMs);

    // Set estimatedStart
    booking.estimatedStart = new Date(currentTime);

    // Calculate duration
    const durationMinutes = booking.services?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
    const durationMs = durationMinutes * 60 * 1000;

    // Set estimatedEnd
    booking.estimatedEnd = new Date(currentTime.getTime() + durationMs);

    // Update current time for next customer
    currentTime = new Date(currentTime.getTime() + durationMs);

    await booking.save();
  }
}



router.post("/queue/add-break", async (req, res) => {
  try {
    const { customerId, breakMinutes } = req.body;

    const booking = await Booking.findById(customerId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Save the break
    booking.breakDeltaMinutes = (booking.breakDeltaMinutes || 0) + breakMinutes;
    await booking.save();

    // Rebuild entire queue
    await rebuildQueue(booking.barber);

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding break:", err);
    res.status(500).json({ error: "Server error" });
  }
});



router.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete
    const deleted = await Booking.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    // ✅ Rebuild queue for this barber
    await rebuildQueue(deleted.barber);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete booking error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});



router.post("/live-queue/save", async (req, res) => {
  try {
    const { queue } = req.body;

    if (!Array.isArray(queue)) {
      return res.status(400).json({ error: "Invalid queue array" });
    }

    await LiveQueue.deleteMany(); // optional: always keep latest only

    await LiveQueue.create({
      queue: queue.map((customer, index) => ({
        _id: customer._id,
        userName: customer.userName,
        barber: customer.barber,
        estimatedStart: customer.estimatedStart,
        duration: customer.duration,
        breakDeltaMinutes: customer.breakDeltaMinutes || 0,
        isLocal: customer.isLocal || false,
        queueIndex: index + 1,
        isChild: customer.isChild || false, // ✅ ADD THIS LINE
      })),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save live queue:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/live-queue/getting", async (req, res) => {
  try {
    const latest = await LiveQueue.findOne().sort({ updatedAt: -1 });
    res.json(latest || { queue: [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});





module.exports = router;