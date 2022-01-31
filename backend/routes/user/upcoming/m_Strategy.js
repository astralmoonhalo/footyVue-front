const { ObjectId } = require("mongodb")
const mongoose = require("mongoose")

const schema = mongoose.Schema({
    id: Number,
    active: Boolean,
    is_public: Boolean,
    leagues: Array,
    note: String,
    strategy_prematch_rules: Array,
    timer: Object,
    title: String,
    type: String,
    user_id: ObjectId,
    fixtures: Array,

})

module.exports = mongoose.model("strategy", schema)