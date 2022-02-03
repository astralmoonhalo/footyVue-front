const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const OutcomeSchema = new Schema(
  {
    id: { type: Number, required: true },
    code: { type: String, required: true },
    label: { type: String, required: true },
    active: Boolean,
    is_bet_builder: Boolean,
  },
  { strict: false }
);
const Outcome = mongoose.model("Outcome", OutcomeSchema);

Outcome.findActive = function () {
  return this.find({ active: true }).sort({ label: 1 });
};

Outcome.bulkCreate = function (items) {
  items = items.map((item) => {
    const { id, code, is_bet_builder, active, label } = item;
    return {
      id,
      code,
      is_bet_builder,
      label,
      active,
    };
  });
  return this.insertMany(items);
};

Outcome.findBetBuilders = function () {
  return this.find({
    is_bet_builder: true,
    active: true,
  });
};

// Outcome.find({}, { _id: 1, id: 1 })
//   .lean()
//   .then((outcomes) => {
//     //savehmap to json
//     const json = JSON.stringify(outcomes);
//     //write to file
//     const fs = require("fs");
//     fs.writeFile("./outcomes_hmap.json", json, (err) => {
//       if (err) {
//         console.log(err);
//       }
//     });
//   });
module.exports = Outcome;
