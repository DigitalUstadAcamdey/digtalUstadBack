const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.username;
    this.url = url;
    this.from = `Digital Ustad Academy <${process.env.EMAIL_FROM}>`;
  }
  newTransport() {
    // TODO: don't forget the actual transport

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  async send(template, subject) {
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );
    //Defined email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: htmlToText(html , {
        wordwrap:130
      }),
    };

    // Create the transporter and send email
    try {
      await this.newTransport().sendMail(mailOptions);
      console.log(`Email sent to ${this.to}`);
    } catch (err) {
      console.error("Email sending failed:", err);
      throw err
    }
  }

  async sendWelcome() {
    await this.send("welcome", "مرحبا بك في Digital Ustad Academy");
  }
  async resetPassword() {
    await this.send("resetPassword", "إعادة تعيين كلمة المرور الخاصة بك في منصتنا Digital Ustad Academy");
  }
  async sendEmailVerification() {
    await this.send("emailVerification", "تحقق من بريدك الإلكتروني في Digital Ustad Academy");
  }
};
