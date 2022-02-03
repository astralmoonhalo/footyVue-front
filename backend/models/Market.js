const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const MarketSchema = new Schema({}, { strict: false });
const Market = mongoose.model("Market", MarketSchema);

module.exports = Market;
