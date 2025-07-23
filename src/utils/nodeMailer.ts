import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "annibaba009@gmail.com",
      pass: "ogbl xbva pxao prss",
    },
  });

  const mailOptions = {
    from: "BAV-IT <annibaba009@gmail.com>",
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent sendmaill file");
  }
};

export default sendEmail;
