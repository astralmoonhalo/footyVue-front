const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const BookmakerSchema = new Schema({}, { strict: false });
const Bookmaker = mongoose.model("Bookmaker", BookmakerSchema);

module.exports = Bookmaker;
