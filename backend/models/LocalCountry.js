const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const LocalCountrySchema = new Schema({}, { strict: false });
const LocalCountry = mongoose.model("LocalCountry", LocalCountrySchema);

LocalCountry.findForAdmin = function () {
  return this.find().sort({ name: 1 });
};

LocalCountry.deleteByAdmin = function (id) {
  return this.deleteOne({ id });
};

LocalCountry.createByAdmin = function (body) {
  var { name, payment_url, currency, pro_price } = body;
  return this.create({
    name,
    payment_url,
    currency,
    pro_price,
  });
};

LocalCountry.editByAdmin = function (body) {
  var { id, name, payment_url, currency, pro_price } = body;
  return this.findOneAndUpdate(
    { id },
    {
      name,
      payment_url,
      currency,
      pro_price,
    }
  );
};

module.exports = LocalCountry;
