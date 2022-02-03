const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PlanSchema = new Schema(
  {
    id: { type: Number, unique: true },
    name: { type: Number, required: true },
    price: { type: Number, required: true },
    days: { type: Number, required: true },
    trial: { type: Boolean, required: true, default: true },
  },
  { strict: false }
);
const Plan = mongoose.model("Plan", PlanSchema);

Plan.findForAdmin = function () {
  return this.find();
};

Plan.createByAdmin = function (body) {
  var { name, price, days, trial } = body;
  return this.create({
    name,
    price,
    days,
    trial,
  });
};

// Plan.create({ name: "Demo" }).then(x=> console.log("HIT", x));
Plan.editByAdmin = function (body) {
  var { _id, name, price, days, trial } = body;
  return this.findByIdAndUpdate(_id, {
    name,
    price,
    days,
    trial,
  });
};

module.exports = Plan;
