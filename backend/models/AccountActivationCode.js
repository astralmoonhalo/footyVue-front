const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");
const { sendTemplateEmail } = require("@root/mailers");

const AccountActivationCodeSchema = new Schema(
  {
    expires_at: Date,
  },
  { strict: false }
);
const AccountActivationCode = mongoose.model(
  "AccountActivationCode",
  AccountActivationCodeSchema
);

AccountActivationCode.validate = function ({ email, code }) {
  // console.log(email, code, "LAORA");
  return this.findOne({
    email,
    code,
    expires_at: { $gt: new Date() },
  });
};

function genCode() {
  return ("" + Math.random()).substring(2, 8);
}
AccountActivationCode.generateCode = async function ({ email, name }) {
  const code = genCode();
  const expires_at = moment().add(15, "minutes").toDate();

  const activation = await this.create({
    email,
    code,
    expires_at,
  });
  await sendTemplateEmail({
    receiverEmail: email,
    Template: "ACCOUNT_ACTIVATION",
    TemplateData: { name, code },
  });
  // console.log(mail);
  return activation;
};

module.exports = AccountActivationCode;
