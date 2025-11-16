// Load environment variables
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve landing page HTML

// MongoDB setup
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Subscriber schema
const subscriberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
});

const Subscriber = mongoose.model("Subscriber", subscriberSchema);

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Nodemailer connection error:", error);
  } else {
    console.log("Nodemailer ready to send emails");
  }
});

// API endpoint
app.post("/api/subscribe", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).send({ message: "Email is required" });

    // Check if email already subscribed
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .send({ success: false, message: "Email already subscribed" });
    }

    // Save to MongoDB
    const subscriber = new Subscriber({ name, email });
    await subscriber.save();

    // Send PDF via email
    const pdfPath = path.join(
      __dirname,
      "public/assets/Boost-Productivity-Guide.pdf"
    );

    const mailOptions = {
      from: `"Your Name" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Free Productivity Guide",
      text: `Hi ${
        name || ""
      },\n\nThanks for subscribing! Here’s your free PDF guide.`,
      attachments: [
        {
          filename: "Boost-Productivity-Guide.pdf",
          path: pdfPath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send({
      success: true,
      message: "Thanks! Check your inbox for the PDF.",
    });
  } catch (err) {
    console.error("Error in /api/subscribe:", err);

    if (err.code === 11000) {
      return res
        .status(400)
        .send({ success: false, message: "Email already subscribed" });
    }

    res.status(500).send({
      success: false,
      message: err.message || "Server error. Please try again later.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
