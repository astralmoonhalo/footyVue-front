const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const RuleSchema = new Schema(
  {
    active: Boolean,
    inplay_only: Boolean,
    direct: Boolean,
    min: Number,
    max: Number,
    step: Number,
    type: String,
    code: String,
    label: String,
    description: String,
    category: String,
    has_team: Boolean,
    overall: String,
    home: String,
    away: String,
  },
  { strict: false }
);
const Rule = mongoose.model("Rule", RuleSchema);

Rule.findAllPreMatch = function () {
  return this.find(
    {
      active: true,
      category: { $ne: "stats" },
      inplay_only: { $ne: true },
    },
    {
      id: 1,
      code: 1,
      label: 1,
      type: 1,
      min: 1,
      max: 1,
      step: 1,
      direct: 1,
      description: 1,
      category: 1,
      active: 1,
    }
  ).sort({ priority: 1 });
};


// Rule.updateMany({ active: 1 }, { $set: { active: true } }).then(x=>console.log(x));
// Rule.updateMany({ active: 1 }, { $set: { active: true } }).then(x=>console.log(x));
Rule.findAllInPlay = function () {
  return this.find(
    {
      active: true,
      category: { $in: ["stats", "odds"] },
      inplay_only: { $ne: true },
    },
    {
      id: 1,
      code: 1,
      label: 1,
      description: 1,
      category: 1,
      active: 1,
      has_team: 1,
    }
  ).sort({ priority: 1 });
};

Rule.bulkCreate = function (items) {
  items = items.map((item) => {
    const {
      id,
      code,
      label,
      type,
      min,
      max,
      step,
      inplay_only,
      description,
      direct,
      category,
      active,
      has_team,
      overall,
      home,
      away,
    } = item;
    return {
      id,
      code,
      label,
      type,
      min,
      max,
      step,
      inplay_only,
      description,
      direct,
      category,
      active,
      has_team,
      overall,
      home,
      away,
    };
  });
  return this.insertMany(items, { ordered: false });
};

module.exports = Rule;
