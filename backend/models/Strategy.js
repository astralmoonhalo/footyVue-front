const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const fs = require("fs");
const { ObjectId } = require("mongoose").Types;
// rule_id
// :
// 60
// values
// :
// Array
// comparator
// :
// "="
// value
// :
// 1
// team
// :
// "home"
// location
// :
// "home"
const PreMatchRuleSchema = new Schema(
  {
    rule_id: { type: ObjectId, ref: "Rule" },
    rule: { type: Object },
    values: { type: Array },
    comparator: { type: String },
    value: { type: Number },
    team: { type: String },
    location: { type: String },
  },
  {
    strict: false,
    // timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const InPlayRuleSchema = new Schema(
  {
    first_rule_id: { type: ObjectId, ref: "Rule" },
    second_rule_id: { type: ObjectId, ref: "Rule" },
    first_code: { type: String },
    second_code: { type: String },
    first_category: { type: String },
    second_category: { type: String },
    first_subcategory: { type: String },
    second_subcategory: { type: String },
    comparator: { type: String },
    value: { type: Number },
    odds_value: { type: Number },
    first_team: { type: String },
    second_team: { type: String },
    timer: { type: Object },
  },
  {
    strict: false,
    // timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const StrategySchema = new Schema(
  {
    active: { type: Boolean, index: true },
    is_preset: { type: Boolean, index: true, default: false },
    is_public: { type: Boolean, index: true, default: false },
    user_id: { type: Number, index: true },
    user_id: { type: ObjectId, index: true },
    _user: { type: Object },
    trusted: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    type: { type: String, index: true },
    outcome_id: { type: ObjectId, index: true },
    outcome: { type: Object },
    preset_id: { type: ObjectId, index: true },
    strategy_prematch_rules: [PreMatchRuleSchema],
    strategy_inplay_rules: [InPlayRuleSchema],
    title: String,
    note: String,
    timer: Object,
    leagues: Array,
    hit_rate: { type: Number, default: 0.0 },
    strike_rate: { type: Number, default: 0.0 },
    fixtures_found: { type: Number, default: 0 },
    picks_sent: { type: Number, default: 0 },
    last_checked: { type: Date },
  },
  {
    strict: false,
    // toJSON: { virtuals: true },
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Strategy = mongoose.model("Strategy", StrategySchema);

const Outcome = require("./Outcome");

// Strategy.updateMany(
//   { user_id: 1 },
//   { $set: { user_id: "6181a1476a8b1f99203adb36" } }
// ).then((masti) => console.log(masti));

const Pick = require("./Pick");
const User = require("./User");
const Rule = require("./Rule");
const uuid = require("uuid");
const axios = require("axios");

// Strategy.findByStrategyId = function(filter_id, page = 1) {
//   return this.find({
//     user_id
//   })
//     .sort({ created_at: -1 })
//     .limit(limit);
// };

const strategy_public_fields = {
  id: 1,
  slug: 1,
  title: 1,
  is_public: 1,
  is_preset: 1,
  timer: 1,
  note: 1,
  type: 1,
  picks_sent: 1,
  hit_rate: 1,
  strike_rate: 1,
  outcome: 1,
  outcome_id: 1,
  leagues: 1,
  trusted: 1,
  preset_id: 1,
  active: 1,
  user_id: 1,
};

const strategy_admin_fields = {
  id: 1,
  title: 1,
  is_public: 1,
  is_preset: 1,
  timer: 1,
  note: 1,
  picks_sent: 1,
  fixtures_found: 1,
  type: 1,
  hit_rate: 1,
  strike_rate: 1,
  outcome_id: 1,
  outcome: 1,
  leagues: 1,
  trusted: 1,
  active: 1,
  user_id: 1,
  preset_id: 1,
  created_at: 1,
  updated_at: 1,
};

function formatPreMatchRules(strategy) {
  return strategy.toObject().strategy_prematch_rules.map((x) => {
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

function formatInPlayRules(strategy) {
  return strategy.toObject().strategy_inplay_rules.map((x) => {
    return {
      ...x,
      first_code: x.first_rule_id.code,
      second_code: x.second_rule_id ? x.second_rule_id.code : null,
      first_rule_id: x.first_rule_id._id,
      second_rule_id: x.second_rule_id ? x.second_rule_id._id : null,
    };
  });
}

Strategy.createOrUpdate = async function (body, type, user_id, preset_id) {
  var {
    _id,
    title,
    strategy_prematch_rules,
    strategy_inplay_rules,
    outcome_id,
    is_public,
    timer,
    note,
    leagues,
  } = body;
  user_id = ObjectId(user_id);
  if (type === "in-play" && !strategy_inplay_rules.length) {
    throw new Error("Strategy in-play rules are required");
  }
  if (type === "pre-match" && !strategy_prematch_rules.length) {
    throw new Error("Strategy prematch rules are required");
  }

  const outcome = await Outcome.findById(outcome_id);
  const user = await User.findById(user_id, {
    _id: 1,
    email: 1,
    firstname: 1,
    lastname: 1,
    utcoffset: 1,
    locale: 1,
    id: 1,
    subscription: 1,
    phone: 1,
  });
  const session = await Strategy.startSession();
  return await session.withTransaction(async () => {
    var strategy;
    if (_id) {
      strategy = await Strategy.findOneAndUpdate(
        { _id, user_id },
        {
          title,
          is_public,
          strategy_prematch_rules,
          strategy_inplay_rules,
          timer,
          note,
          leagues,
          type,
          outcome,
          user,
          outcome_id,
        },
        { new: true, upsert: true }
      );
    } else {
      strategy = await Strategy.create({
        title,
        is_public,
        timer,
        note,
        strategy_prematch_rules,
        strategy_inplay_rules,
        leagues,
        type,
        user,
        outcome,
        outcome_id,
        preset_id,
        user_id,
        slug: uuid.v4(),
      });
    }
    await strategy.populate("strategy_prematch_rules.rule_id");
    strategy.strategy_prematch_rules = formatPreMatchRules(strategy);
    if (type == "in-play") {
      await strategy.populate("strategy_inplay_rules.first_rule_id");
      await strategy.populate("strategy_inplay_rules.second_rule_id");
      strategy.strategy_inplay_rules = formatInPlayRules(strategy);
    }
    await strategy.save();
    return strategy;
  });
};

Strategy.seedRestore = async function (body, type, user_id) {
  var { _id, strategy_prematch_rules, strategy_inplay_rules, outcome_id } =
    body;
  user_id = ObjectId(user_id);
  if (type === "in-play" && !strategy_inplay_rules.length) {
    throw new Error("Strategy in-play rules are required");
  }
  if (type === "pre-match" && !strategy_prematch_rules.length) {
    throw new Error("Strategy prematch rules are required");
  }

  const outcome = await Outcome.findById(outcome_id);
  const user = await User.findById(user_id, {
    _id: 1,
    email: 1,
    firstname: 1,
    lastname: 1,
    utcoffset: 1,
    locale: 1,
    id: 1,
    subscription: 1,
    phone: 1,
  });
  const session = await Strategy.startSession();
  return await session.withTransaction(async () => {
    var strategy;
    if (_id) {
      strategy = await Strategy.findOneAndUpdate(
        { _id, user_id },
        {
          ...body,
          user,
          outcome,
        },
        { new: true, upsert: true }
      );
    } else {
      strategy = await Strategy.create({
        ...body,
        user,
        outcome,
      });
    }
    await strategy.populate("strategy_prematch_rules.rule_id");
    strategy.strategy_prematch_rules = formatPreMatchRules(strategy);
    if (type == "in-play") {
      await strategy.populate("strategy_inplay_rules.first_rule_id");
      await strategy.populate("strategy_inplay_rules.second_rule_id");
      strategy.strategy_inplay_rules = formatInPlayRules(strategy);
    }
    await strategy.save();
    return strategy;
  });
};

Strategy.reschedule = async function (strategy_id) {
  try {
    const config = { headers: {} };
    const url = process.env.CANCEL_PREMATCH_ALERTS_ENDPOINT + strategy_id;
    const res = await axios.put(url, {}, config);
    // console.log(res.data, "LAMBDA TRIGGERED");
  } catch (error) {
    console.log("Reschedule Error", error);
  }
};

Strategy.findByStrategyId = async function (_id, user_id, user_is_pro = false) {
  if (user_is_pro) {
    return this.findOne({ _id, is_preset: { $in: true } });
  } else {
    return this.findOne({
      $or: [
        {
          _id,
          user_id: ObjectId(user_id),
        },
        {
          _id,
          is_public: true,
        },
      ],
    });
  }
};

// Strategy.findByStrategyIdWithRule = async function (_id, trx) {
//   return this.findOne(
//     {
//       _id,
//     },
//     strategy_admin_fields
//   );
// };

Strategy.findAll = async function (
  type,
  user_id,
  page = 1,
  mode,
  filterBy = "all",
  sortBy = "status",
  search
) {
  page = Math.max(Number(page || 1), 0);
  const perPage = 20;
  const skip = (page - 1) * perPage;
  const matchQuery = { type };
  const sortQuery = {};
  const projectQuery = {
    hit_rate: 1,
    id: 1,
    title: 1,
    strike_rate: 1,
    picks_sent: 1,
    trusted: 1,
    updated_at: 1,
    outcome: 1,
    active: 1,
    slug: 1,
  };
  user_id = new ObjectId(user_id);
  switch (filterBy) {
    case "active":
      Object.assign(matchQuery, { active: { $in: [1, true] } });
      break;
    case "inactive":
      Object.assign(matchQuery, { active: { $in: [0, false] } });
      break;
  }
  if (search) {
    Object.assign(matchQuery, {
      $or: [{ title: { $regex: search, $options: "i" } }],
    });
  }
  // const query = this.aggregate([
  //   {
  //     $match: extraParams,
  //   },
  //   {
  //     $project: ,
  //   },
  // ]);

  // { column: "trusted", order: "desc" },

  switch (mode) {
    case "explore-alerts":
      Object.assign(matchQuery, {
        is_public: { $in: [1, true] },
        preset_id: null,
        is_preset: { $nin: [1, true] },
        user_id: { $ne: user_id },
      });
      break;
    case "preset-alerts":
      Object.assign(matchQuery, {
        is_preset: { $in: [1, true] },
        is_public: { $in: [1, true] },
      });
      break;
    default:
      // await this.updateHitrates(user_id, type);
      Object.assign(matchQuery, {
        user_id,
      });
  }

  switch (sortBy) {
    case "picks_sent":
      Object.assign(sortQuery, { picks_sent: -1 });
      break;
    case "hit_rate":
      if (type == "in-play") {
        Object.assign(sortQuery, { strike_rate: -1 });
      } else {
        Object.assign(sortQuery, { hit_rate: -1 });
      }
      break;
    case "name":
      Object.assign(sortQuery, { title: 1 });
      break;
    case "updated_at":
      Object.assign(sortQuery, { updated_at: -1 });
      break;
    default:
      Object.assign(sortQuery, { trusted: -1 });
  }

  const [total, strategies] = await Promise.all([
    this.countDocuments(matchQuery),
    this.aggregate([
      {
        $match: matchQuery,
      },
      {
        $sort: sortQuery,
      },
      {
        $skip: skip,
      },
      {
        $limit: perPage,
      },
      {
        $project: projectQuery,
      },
    ]),
  ]);

  return [total, strategies];
};

Strategy.findAllByAdmin = function (type, user_id, page = 1) {
  page = Math.max(Number(page), 0);
  const perPage = 10;
  const skip = (page - 1) * perPage;
  user_id = ObjectId(user_id);
  const matchQuery = {
    type,
    user_id,
  };
  const sortQuery = {
    trusted: -1,
    picks_sent: -1,
  };
  const projectQuery = {
    title: 1,
    is_public: 1,
    is_preset: 1,
    hit_rate: 1,
    trusted: 1,
    active: 1,
  };
  return this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $sort: sortQuery,
    },
    {
      $skip: skip,
    },
    {
      $limit: perPage,
    },
    {
      $project: projectQuery,
    },
  ]);
};

Strategy.findActiveByAdmin = function (type, user_id, page = 1) {
  user_id = ObjectId(user_id);
  page = Math.max(Number(page), 0);
  const perPage = 100;
  const skip = (page - 1) * perPage;
  const matchQuery = {
    is_preset: { $in: [true, 1] },
  };
  if (type) {
    matchQuery.type = type;
  }
  const sortQuery = {
    trusted: -1,
    picks_sent: -1,
  };
  const projectQuery = {
    id: 1,
    title: 1,
  };
  return this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $sort: sortQuery,
    },
    {
      $skip: skip,
    },
    {
      $limit: perPage,
    },
    {
      $project: projectQuery,
    },
  ]);
};

Strategy.getTotalCount = function () {
  return this.count();
};

Strategy.getUserStrategies = function (user_id, limit = 4) {
  user_id = ObjectId(user_id);
  const matchQuery = {
    user_id,
  };
  const sortQuery = {
    picks_sent: -1,
  };
  const projectQuery = {
    ...strategy_public_fields,
  };
  return this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $sort: sortQuery,
    },
    {
      $limit: limit,
    },
    {
      $project: projectQuery,
    },
  ]);
};

Strategy.getOtherStrategies = function (user_id, limit = 4) {
  user_id = ObjectId(user_id);
  const matchQuery = {
    user_id: { $ne: user_id },
    is_public: true,
    picks_sent: { $gt: 10 },
    preset_id: null,
  };
  const sortQuery = {
    strike_rate: -1,
  };
  const projectQuery = {
    ...strategy_public_fields,
  };
  return this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $sort: sortQuery,
    },
    {
      $limit: limit,
    },
    {
      $project: projectQuery,
    },
  ]);
};

Strategy.trust = function (_id, user_id) {
  user_id = ObjectId(user_id);
  return this.findOneAndUpdate(
    {
      _id,
      user_id,
    },
    {
      $set: {
        trusted: true,
      },
    },
    {
      new: true,
    }
  );
};

Strategy.untrust = function (_id, user_id) {
  user_id = ObjectId(user_id);
  return this.findOneAndUpdate(
    {
      _id,
      user_id,
    },
    {
      $set: {
        trusted: false,
      },
    },
    {
      new: true,
    }
  );
};

Strategy.updateLeagues = function (_id, user_id, leagues) {
  user_id = ObjectId(user_id);
  return this.findOneAndUpdate(
    {
      _id,
      user_id,
    },
    {
      $set: {
        leagues,
      },
    },
    {
      new: true,
    }
  );
};

Strategy.excludeLeague = function (_id, user_id, league_id) {
  user_id = ObjectId(user_id);
  return this.findOneAndUpdate(
    {
      _id,
      user_id,
    },
    {
      $pull: {
        leagues: {
          league_id,
        },
      },
    },
    {
      new: true,
    }
  );
};

Strategy.togglePresetByAdmin = async function (id) {
  return this.findByIdAndUpdate(
    id,
    [{ $set: { is_preset: { $eq: [false, "$is_preset"] } } }],
    {
      new: true,
    }
  );
};

Strategy.togglePublicByAdmin = async function (id) {
  return this.findByIdAndUpdate(
    id,
    [{ $set: { is_public: { $eq: [false, "$is_public"] } } }],
    {
      new: true,
    }
  );
};

Strategy.toggle = async function (_id, user_id) {
  user_id = ObjectId(user_id);
  await Pick.cancelAlerts(_id, user_id);

  const strategy = await this.findOneAndUpdate(
    { _id, user_id },
    [{ $set: { active: { $eq: [false, "$active"] } } }],
    {
      new: true,
    }
  );
  if (strategy.type == "pre-match" && strategy.active) {
    await Strategy.reschedule(strategy._id);
  }
};

Strategy.import = async function (id, user_id, user_is_pro) {
  user_id = ObjectId(user_id);
  const strategy = await Strategy.findByStrategyId(id, user_id, user_is_pro);
  if (!strategy) {
    throw new Error("Strategy not found");
  }
  const preset_id = strategy.is_preset ? strategy._id : undefined;
  const {
    strategy_prematch_rules,
    strategy_inplay_rules,
    outcome_id,
    is_public,
    timer,
    note,
    type,
    leagues,
  } = strategy;
  const title = strategy.is_preset
    ? strategy.title
    : `Copy of ${strategy.title}`;

  return await Strategy.createOrUpdate(
    {
      title,
      strategy_prematch_rules,
      strategy_inplay_rules,
      outcome_id,
      is_public,
      timer,
      note,
      leagues,
    },
    type,
    user_id,
    preset_id
  );
};

Strategy.deleteByStrategyId = async function (_id, user_id) {
  user_id = ObjectId(user_id);
  await Pick.cancelAlerts(_id, user_id);
  return this.findOneAndDelete({
    _id,
    user_id,
  });
};

Strategy.findAllPreset = function (type) {
  return this.find({
    is_preset: { $in: [true, 1] },
    active: { $in: [true, 1] },
    type,
  });
};

Strategy.findAllInPlay = function (type) {
  return this.find({
    is_preset: true,
    active: true,
    type,
  });
};

Strategy.findPresetById = function (id) {
  return this.find({
    is_preset: true,
    active: true,
    id,
  });
};

Strategy.search = function (searchText, type) {
  const perPage = 10;
  const matchQuery = {
    $text: {
      $search: searchText,
    },
  };
  if (type == "upcoming") {
    Object.assign(matchQuery, {
      status: { $nin: ["FT", "FT_PEN"] },
      timestamp: { $gte: startOfDay },
    });
  } else {
    Object.assign(matchQuery, {
      status: { $in: ["FT", "FT_PEN"] },
      timestamp: { $lte: endOfDay },
    });
  }
  return this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $sort: {
        timestamp: type == "upcoming" ? 1 : -1,
      },
    },
    {
      $limit: perPage,
    },
    {
      $project: {
        fixture_name: 1,
        league_name: 1,
        timestamp: 1,
        fixture_id: 1,
        iso: 1,
        country_name: 1,
        ft_score: "$result.ft_score",
      },
    },
  ]);
};

Strategy.updateUser = function (changeEvent) {
  const fullDocument = changeEvent.fullDocument;
  const { id: user_id } = fullDocument;
  delete fullDocument.password;
  const strategies = context.services
    .get("mongodb-atlas")
    .db("footyamigo")
    .collection("strategies");
  return strategies.updateMany({ user_id }, { $set: { user: fullDocument } });
};

const Queue = require("async-parallel-queue");

const queue = new Queue({ concurrency: 100 });

async function seedStrategies() {
  // await Strategy.deleteMany({});
  const strategies = require("../../mongoseeders/strategies.json");
  const fn = queue.fn(async (strategy) => {
    try {
      strategy["is_public"] = strategy["is_public"] ? true : false;
      strategy["is_preset"] = strategy["is_preset"] ? true : false;
      strategy["trusted"] = strategy["trusted"] ? true : false;
      strategy["active"] = strategy["active"] ? true : false;
      strategy["user_id"] = strategy["user"]._id;
      strategy["outcome_id"] = strategy["outcome"]._id;
      await Strategy.seedRestore(
        strategy,
        strategy["type"],
        strategy["user_id"]
      );
      console.log("INSERTED", strategy._id);
    } catch (error) {
      console.log("ERROR", strategy["_id"], error);
    }
  });

  for (var strategy of strategies) {
    if (strategy["type"] == "in-play") fn(strategy);
  }
  await queue.waitIdle();
  queue.start();
}
async function seedBetter() {
  const strategy = await Strategy.findOne(
    { "strategy_inplay_rules.first_code": { $exists: false }, type: "in-play" },
    { strategy_inplay_rules: 1 }
  );

  await strategy.populate("strategy_inplay_rules.first_rule_id");
  await strategy.populate("strategy_inplay_rules.second_rule_id");
  strategy.strategy_inplay_rules = formatInPlayRules(strategy);
  console.log("FOUND", await strategy.save());
}

// seedBetter();
// Strategy.find({}, { _id: 1, id: 1 })
//   .lean()
//   .then((strategys) => {
//     //savehmap to json
//     const json = JSON.stringify(strategys);
//     //write to file
//     const fs = require("fs");
//     fs.writeFile("./strategys_hmap.json", json, (err) => {
//       if (err) {
//         console.log(err);
//       }
//     });
//   });

// seedStrategies();
module.exports = Strategy;
