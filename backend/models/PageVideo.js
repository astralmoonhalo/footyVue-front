const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PageVideoSchema = new Schema({}, { strict: false });
const PageVideo = mongoose.model("PageVideo", PageVideoSchema);

PageVideo.findByLocation = function (location) {
  return this.findOne({ location });
};

PageVideo.findAllByLocation = function (location) {
  return this.find({ location });
};

PageVideo.findForAdmin = function () {
  return this.find().sort({ location: 1 });
};

PageVideo.createOrUpdateByAdmin = function (body) {
  const { _id, title, location, video_url } = body;
  return _id
    ? this.findByIdAndUpdate(
        _id,
        {
          title,
          location,
          video_url,
        },
        { new: true }
      )
    : this.create({
        title,
        location,
        video_url,
      });
};

module.exports = PageVideo;
