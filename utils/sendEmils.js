const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1 create transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "ferne.durgan88@ethereal.email",
      pass: "ZVp2vymuHNKvady5M8",
    },
  });
  // 2 create email options
  const mailOptions = {
    from: "from <kasseimad81@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // 3 send email
  await transporter.sendMail(mailOptions);
  console.log("Email sent");
};
module.exports = sendEmail;
