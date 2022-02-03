const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const UpdateSchema = new Schema({}, { strict: false });
const Update = mongoose.model("Update", UpdateSchema);

Update.findRoadMap = function (page = 1) {
  return this.find({ completed: false })
    .sort({ datetime: 1 })
    .skip(page * 50 - 50)
    .limit(50);
};

Update.findChangeLog = function (page = 1) {
  return this.find({ completed: true })
    .sort({ datetime: -1 })
    .skip(page * 50 - 50)
    .limit(50);
};

Update.toggleCompleted = async function (id) {
  return this.findByIdAndUpdate(
    id,
    [{ $set: { completed: { $eq: [false, "$completed"] } } }],
    { new: true }
  );
};

Update.createOrUpdateByAdmin = function (body) {
  const { _id, title, content, version, datetime, completed } = body;
  body = {
    title,
    content,
    version,
    datetime,
    completed,
  };
  return _id
    ? this.findByIdAndUpdate(_id, body, { new: true })
    : this.create(body);
};

module.exports = Update;
