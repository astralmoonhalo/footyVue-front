const mongoose = require("mongoose")
const moment = require('moment');

const schema = mongoose.Schema({
    fixture_id: Number,
    away_id: Number,
    away_logo: String,
    away_name: String,
    country_name: String,
    date: Date,
    fixture_name: String,
    flag_emoji: String,
    home_id: Number,
    home_logo: String,
    home_name: String,
    id: Number,
    iso: String,
    probability: Object,
    status: String,
    time: String,
    ft_score:Number,
    ht_score:Number,
    timestamp:Number,
    home_position:String,
    away_position:String,
})


module.exports = mongoose.model("fixture", schema)
