const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const { ObjectId } = mongoose.Types;
const BetBuilderSchema = new Schema(
  {
    rules: [
      {
        rule_id: { type: ObjectId, ref: "Rule", required: true },
        location: { type: String, required: true },
        team: { type: String, required: true },
        comparator: { type: String, required: true },
        value: { type: Number },
        values: Array,
        category: String,
        code: String,
        overall: String,
        home: String,
        label: String,
        away: String,
        direct: Boolean,
      },
    ],
    probabilities: [
      {
        rule_id: { type: ObjectId, ref: "Rule", required: true },
        comparator: { type: String, required: true },
        value: { type: Number, required: true },
        code: String,
        category: String,
        label: String,
      },
    ],
    title: { type: String, required: true },
    leagues: { type: Array, required: true },
    active: { type: Boolean, required: true, default: false },
    outcome: { type: String, required: true },
  },
  {
    strict: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const BetBuilder = mongoose.model("BetBuilder", BetBuilderSchema);
const Rule = require("./Rule");
BetBuilder.findActive = function () {
  return this.find({ active: true });
};

BetBuilder.findForAdmin = function () {
  return this.find().sort({ updated: -1 });
};

BetBuilder.toggleByAdmin = function (id) {
  return this.findByIdAndUpdate(id, [
    { $set: { active: { $eq: [false, "$active"] } } },
  ]);
};

function formatBetBuilderProbabilities(rules) {
  return rules.map((x) => {
    const { code, category, label, direct } = x.rule_id;
    return {
      ...x,
      rule_id: x.rule_id._id,
      code,
      category,
      label,
      direct,
    };
  });
}

function formatBetBuilderRules(probabilities) {
  return probabilities.map((x) => {
    const { code, category, overall, home, label, away, direct } = x.rule_id;
    return {
      ...x,
      rule_id: x.rule_id._id,
      code,
      category,
      overall,
      home,
      label,
      away,
      direct,
    };
  });
}

BetBuilder.createOrUpdateByAdmin = async function (body) {
  const { title, outcome, note, leagues, rules, probabilities, _id, active } =
    body;
  const session = await this.startSession();
  return await session.withTransaction(async () => {
    const bet_builder = _id
      ? await BetBuilder.findByIdAndUpdate(
          _id,
          {
            title,
            outcome,
            note,
            leagues,
            rules,
            active,
            probabilities,
          },
          { new: true }
        )
      : await BetBuilder.create({
          title,
          outcome,
          note,
          leagues,
          rules,
          probabilities,
          active,
        });

    await bet_builder.populate("rules.rule_id");
    await bet_builder.populate("probabilities.rule_id");
    bet_builder.rules = formatBetBuilderRules(bet_builder.toObject().rules);
    bet_builder.probabilities = formatBetBuilderProbabilities(
      bet_builder.toObject().probabilities
    );
    await bet_builder.save();
    return bet_builder;
  });
};

function syncBetBuilders() {
  BetBuilder.deleteMany({}).then((x) => console.log(x));
  const bet_builders = require("../../mongoseeders/betbuilders.json");
  bet_builders.forEach(async (bet_builder) => {
    await BetBuilder.createOrUpdateByAdmin(bet_builder);
  });
}
// syncBetBuilders();
// BetBuilder.updateMany(
//   {
//     active: 1,
//   },
//   { active: true }
// ).then((x) => console.log);

// BetBuilder.updateMany(
//   {
//     "rules.rule_id": 98,
//   },
//   { "rules.rule_id": "61ee94f00a8dcd4cc1bfc67a" }
// ).then((x) => console.log(x));

// Rule.find({}, { _id: 1, id: 1 }).then((rules) => {
//   const hmap = Object.assign({}, ...rules.map((x) => ({ [x.id]: x._id })));
//   console.log(hmap)
//   BetBuilder.find({}, { probabilities: 1, rules: 1 }).then((builders) => {
//     builders.forEach(async (bet_builder) => {
//       bet_builder.rules = bet_builder.toObject().rules.map((rule) => {
//         rule.rule_id = hmap[rule.rule_id];
//         return rule;
//       });
//       bet_builder.probabilities = bet_builder
//         .toObject()
//         .probabilities.map((rule) => {
//           rule.rule_id = hmap[rule.rule_id];
//           return rule;
//         });
//       await bet_builder.save();
//     });
//   });
// });


module.exports = BetBuilder;
