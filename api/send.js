import nodemailer from "nodemailer";

export default async (req, res) => {
  const { email } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your Free Guide",
    text: "Here is your guide.",
  });

  res.status(200).json({ message: "Email sent!" });
};
