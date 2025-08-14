const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const User = require("../models/User");
const router = express.Router();


// twilio.js
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOTP = async (phone, otp) => {
  return await client.messages.create({
    body: `🧾Jaysh Barbershop, Your verification code is: ${otp}`,
    from: process.env.TWILIO_PHONE,
    to: `+1${phone}`,
  });
};


// const { Vonage } = require('@vonage/server-sdk');
// const vonage = new Vonage({
//   apiKey: "8f848bd3",
//   apiSecret: "fEPi2hM5fTBBrcvl",
// });

// const sendOTP = async (from, to, text)  => {
//     await vonage.sms.send({to, from, text})
//         .then(resp => { console.log('Message sent successfully'); console.log(resp); })
//         .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
// };




router.get("/users/:phone", async (req, res) => {
  const phone = req.params.phone;
  try {
    let user = await User.findOne({ phone });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    if (user) {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = new User({ phone, otp, otpExpiresAt }); // temp user without name/email
      await user.save();
    }

    await sendOTP(phone, otp);
    // await sendOTP("Jayesh Barber Shop",`1${phone}`, `Your OTP is ${otp}`);

    res.json({ exists: !!user.name, user }); // don’t send OTP in production
  } catch (err) {
    console.error("Phone check error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



router.post("/users", async (req, res) => {
  const { phone, name } = req.body;
  // const { phone, name, email } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ error: "All fields required" });
  }
  // if (!phone || !name || !email) {
  //   return res.status(400).json({ error: "All fields required" });
  // }

  try {
    let user = await User.findOne({ phone });

    if (user && user.name) {
      return res.status(409).json({ error: "Phone already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      // Update existing phone entry with name/email + new OTP
      user.name = name;
      // user.email = email;
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = new User({ phone, name, email, otp, otpExpiresAt });
      await user.save();
    }

    // await sendOTP(phone, otp, "91");
    await sendOTP(phone, otp);
    // await sendOTP("Jayesh Barber Shop",`1${phone}`, `Your OTP is ${otp}`);

    res.status(201).json({ user }); // don't send OTP here
  } catch (error) {
    console.error("Create user failed:", error);
    res.status(500).json({ error: "Server error" });
  }
});



router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: "Phone required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: twilioPhone,
      to: `+91${phone}`,
    });

    let user = await User.findOne({ phone });

    if (user) {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
    } else {
      user = new User({ phone, otp, otpExpiresAt });
      await user.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Twilio OTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});


router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: "Phone and OTP required" });
  }

  try {
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (
      user.otp !== otp ||
      !user.otpExpiresAt ||
      new Date() > user.otpExpiresAt
    ) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Clear OTP after successful verification
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ success: true, userExists: !!user.name, user });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});


module.exports = router;