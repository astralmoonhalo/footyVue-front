const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const StreakSchema = new Schema(
  {
    market: { type: String, unique: true, index: true },
    title: String,
    subtitle: String,
    description: String,
  },
  { strict: false }
);
const Streak = mongoose.model("Streak", StreakSchema);

Streak.findForAdmin = function () {
  return this.find();
};

Streak.deleteByAdmin = function (id) {
  return this.deleteOne({ id });
};

Streak.createByAdmin = function (body) {
  var { market, title, subtitle, description, header } = body;
  return this.create({
    market,
    title,
    subtitle,
    header,
    description,
  });
};

Streak.editByAdmin = function (body) {
  var { market, title, subtitle, header, description } = body;
  return this.findOneAndUpdate(
    { market },
    {
      market,
      title,
      subtitle,
      description,
      header,
    }
  );
};

Streak.findByMarket = function (market) {
  return this.findOne({
    market,
  });
};

module.exports = Streak;
