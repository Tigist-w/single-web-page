require("dotenv").config();
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const path = require("path");

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Subscriber schema
const subscriberSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
});

const Subscriber =
  mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) console.error("Nodemailer error:", error);
  else console.log("Nodemailer ready to send emails");
});

module.exports = async (req, res) => {
  await connectDB();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already subscribed" });
    }

    const subscriber = new Subscriber({ name, email });
    await subscriber.save();

    const pdfPath = path.join(
      __dirname,
      "../public/assets/Boost-Productivity-Guide.pdf"
    );

    await transporter.sendMail({
      from: `"Your Name" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Free Productivity Guide",
      text: `Hi ${
        name || ""
      },\n\nThanks for subscribing! Here’s your free PDF guide.`,
      attachments: [
        { filename: "Boost-Productivity-Guide.pdf", path: pdfPath },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Thanks! Check your inbox for the PDF.",
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already subscribed" });
    }
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
