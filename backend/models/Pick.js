const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");
const { ObjectId } = require("mongoose").Types;

const PickSchema = new Schema(
  {
    id: { type: Number, unique: true },
    strategy_id: { type: ObjectId, index: true },
    user_id: { type: ObjectId, index: true },
    // user_id: { type: ObjectId, index: true },
    fixture_id: { type: Number, index: true },
    league_id: { type: Number, index: true },
    type: { type: String, index: true },
    status: { type: String, index: true },
    is_public: { type: Boolean, index: true, default: false },
    home_name: String,
    away_name: String,
    corners: String,
    goals: String,
    minute: Number,
    extra_minute: Number,
    strike: Boolean,
  },
  {
    strict: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

PickSchema.index({ strategy_id: 1, fixture_id: 1 }, { unique: true });
const Pick = mongoose.model("Pick", PickSchema);

// Pick.updateMany(
//   { user_id: 1 },
//   { user_id: ObjectId("6181a1476a8b1f99203adb36") }
// ).then((vis) => console.log(vis));

Pick.recalcStrike = async function (strategy_id, user_id) {
  const Strategy = require("./Strategy");

  const hits = await Pick.countDocuments({
    strategy_id,
    status: "sent",
    strike: true,
  });
  // const miss = await Pick.countDocuments({
  //   strategy_id,
  //   status: "sent",
  //   strike: false
  // });
  const total = await Pick.countDocuments({
    strategy_id,
    status: "sent",
    // strike: false
  });
  const strike_rate = (hits / total) * 100 || 0;
  const strategy = await Strategy.findOneAndUpdate(
    {
      _id: strategy_id,
      user_id,
    },
    { strike_rate }
  );
  return strike_rate;
};

//Update strike for a pick
Pick.updateStrike = async function (pick_id, strike, user_id) {
  const pick = await Pick.findOneAndUpdate(
    { _id: pick_id, user_id: ObjectId(user_id) },
    { strike },
    { new: true }
  );
  return await Pick.recalcStrike(pick.strategy_id, user_id);
};

//Update strike for a pick
Pick.clearStrike = async function (strategy_id, user_id) {
  await Pick.updateMany(
    { strategy_id, user_id: ObjectId(user_id) },
    { strike: null }
  );
  return await Pick.recalcStrike(strategy_id, user_id);
};

//Delete picks from a league
Pick.deletePicksByLeague = async function (strategy_id, league_id, user_id) {
  await Pick.deleteMany({
    strategy_id,
    league_id,
    user_id: ObjectId(user_id),
  });
  await Pick.recalcStrike(strategy_id, user_id);
};

//Cancel all pending alerts
Pick.cancelAlerts = async function (strategy_id, user_id) {
  // console.log(strategy_id, user_id);
  await Pick.deleteMany({
    strategy_id: ObjectId(strategy_id),
    user_id: ObjectId(user_id),
    status: "waiting",
  });
};

Pick.findWithFixture = function (
  strategy_id,
  user_id,
  date = new Date(),
  page = 1
) {
  const startOfDay = moment(date).startOf("day").unix();
  const endOfDay = moment(date).endOf("day").unix();

  const params = [
    {
      $match: {
        strategy_id: ObjectId(strategy_id),
        status: "sent",
        user_id: ObjectId(user_id),
        // sending_time: { $gte: startOfDay, $lte: endOfDay }
      },
    },

    {
      $sort: { updated_at: -1 },
    },
    // {
    //   $limit: 1000,
    // },
    {
      $lookup: {
        from: "fixtures",
        localField: "fixture_id",
        foreignField: "fixture_id",
        as: "fixture",
        pipeline: [
          {
            $project: {
              league_id: 1,
              league_name: 1,
              home_name: 1,
              away_name: 1,
              home_logo: 1,
              away_logo: 1,
              ht_score: "$result.ht_score",
              ft_score: "$result.ft_score",
              ht_corner: "$result.ht_corner",
              ft_corner: "$result.ft_corner",
              fixture_id: 1,
              country_name: 1,
              iso: 1,
              timestamp: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$fixture",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  // console.log(JSON.stringify(params, null, 2));
  return Pick.aggregate(params);
};

Pick.export = async function (strategy_id, user_id) {
  const params = [
    {
      $match: {
        strategy_id: Number(strategy_id),
        status: "sent",
        user_id: ObjectId(user_id),
        // sending_time: { $gte: startOfDay, $lte: endOfDay }
      },
    },

    {
      $sort: { updated_at: -1 },
    },
    {
      $project: {
        fixture_id: 1,
        minute: 1,

        sending_time: 1,
        status: 1,
        type: 1,
        // missed: 1,
        strike: 1,
        extra_minute: 1,
      },
    },
    // {
    //   $limit: 50,
    // },
    {
      $lookup: {
        from: "fixtures",
        localField: "fixture_id",
        foreignField: "fixture_id",
        as: "fixture",
        pipeline: [
          {
            $project: {
              fixture_name: 1,
              country_name: 1,
              league_name: 1,
              league_progress: 1,
              timestamp: 1,
              status: 1,
              on_bet365: 1,
              home_goals: "$result.home_goals",
              away_goals: "$result.away_goals",
              ht_score: "$result.ht_score",
              ft_score: "$result.ft_score",
              total_cards: "$result.total_cards",
              cards_1h: "$result.cards_1h",
              cards_2h: "$result.cards_2h",
              home_yellow_cards: "$result.home_yellow_cards",
              home_red_cards: "$result.home_red_cards",
              away_yellow_cards: "$result.away_yellow_cards",
              away_red_cards: "$result.away_red_cards",
              total_corners: "$result.total_corners",
              ht_corner: "$result.ht_corner",
              ft_corner: "$result.ft_corner",
              corners_1h: "$result.corners_1h",
              corners_2h: "$result.corners_2h",
              home_corners: "$result.home_corners",
              home_corners_1h: "$result.home_corners_1h",
              home_corners_2h: "$result.home_corners_2h",
              away_corners_1h: "$result.away_corners_1h",
              away_corners_2h: "$result.away_corners_2h",
              away_corners: "$result.away_corners",
              home_name: 1,
              away_name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$fixture",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  const picks = await Pick.aggregate(params);

  return picks.map((pick) => {
    const merged = { ...pick, ...pick.fixture };
    delete merged.fixture;
    delete merged.fixture_id;
    delete merged._id;
    merged.ko_time = moment(merged.timestamp * 1000).format("lll");
    delete merged.timestamp;
    // merged.missed = merged.missed || "";
    merged.extra_minute = merged.extra_minute || "";
    // delete merged.updated_at;
    // delete merged.created_at;
    merged.sending_time = moment(merged.sending_time * 1000).format("lll");
    return merged;
  });
};

Pick.exportInPlay = async function (strategy_id, user_id) {
  const params = [
    {
      $match: {
        strategy_id: Number(strategy_id),
        status: "sent",
        user_id: ObjectId(user_id),
        // sending_time: { $gte: startOfDay, $lte: endOfDay }
      },
    },

    {
      $sort: { updated_at: -1 },
    },
    {
      $project: {
        fixture_id: 1,
        minute: 1,

        sending_time: 1,
        status: 1,
        type: 1,
        // missed: 1,
        strike: 1,
        extra_minute: 1,
      },
    },
    // {
    //   $limit: 50,
    // },
    {
      $lookup: {
        from: "fixtures",
        localField: "fixture_id",
        foreignField: "fixture_id",
        as: "fixture",
        pipeline: [
          {
            $project: {
              fixture_name: 1,
              country_name: 1,
              league_name: 1,
              league_progress: 1,
              timestamp: 1,
              status: 1,
              on_bet365: 1,
              home_goals: "$result.home_goals",
              away_goals: "$result.away_goals",
              ht_score: "$result.ht_score",
              ft_score: "$result.ft_score",
              total_cards: "$result.total_cards",
              cards_1h: "$result.cards_1h",
              cards_2h: "$result.cards_2h",
              home_yellow_cards: "$result.home_yellow_cards",
              home_red_cards: "$result.home_red_cards",
              away_yellow_cards: "$result.away_yellow_cards",
              away_red_cards: "$result.away_red_cards",
              total_corners: "$result.total_corners",
              ht_corner: "$result.ht_corner",
              ft_corner: "$result.ft_corner",
              corners_1h: "$result.corners_1h",
              corners_2h: "$result.corners_2h",
              home_corners: "$result.home_corners",
              home_corners_1h: "$result.home_corners_1h",
              home_corners_2h: "$result.home_corners_2h",
              away_corners_1h: "$result.away_corners_1h",
              away_corners_2h: "$result.away_corners_2h",
              away_corners: "$result.away_corners",
              home_name: 1,
              away_name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$fixture",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  const picks = await Pick.aggregate(params);

  return picks.map((pick) => {
    const merged = { ...pick, ...pick.fixture };
    delete merged.fixture;
    delete merged.fixture_id;
    delete merged._id;
    merged.ko_time = moment(merged.timestamp * 1000).format("lll");
    delete merged.timestamp;
    // merged.missed = merged.missed || "";
    merged.extra_minute = merged.extra_minute || "";
    // delete merged.updated_at;
    // delete merged.created_at;
    merged.sending_time = moment(merged.sending_time * 1000).format("lll");
    return merged;
  });
};
// Pick.findWithFixture(69).then(picks => {
//   console.log("MAIKI", picks);
// });
Pick.getSent = function (matchQuery) {
  return this.find(matchQuery, {
    _id: 1,
    fixture_id: 1,
    sending_time: 1,
    league_id: 1,
    home_name: 1,
    away_name: 1,
  })
    .sort({ sending_time: -1 })
    .limit(4);
};

Pick.sentToUser = function (user_id) {
  const matchQuery = {
    user_id: ObjectId(user_id),
    status: "sent",
  };
  return this.getSent(matchQuery);
};

Pick.sentToOthers = function (user_id) {
  const matchQuery = {
    user_id: { $ne: ObjectId(user_id) },
    is_public: true,
    status: "sent",
  };
  return this.getSent(matchQuery);
};

Pick.getTodaysCount = function () {
  const startOfDay = moment.utc().startOf("day").unix();
  const endOfDay = moment.utc().endOf("day").unix();
  return this.count({
    sending_time: { $gte: startOfDay, $lte: endOfDay },
    status: "sent",
  });
};

Pick.deleteById = async function (_id, user_id) {
  try {
    const pick = await this.findOneAndDelete({
      _id,
      user_id: ObjectId(user_id),
    });
    await Pick.recalcStrike(pick.strategy_id, user_id);
  } catch (err) {
    console.log("DELETEBY ID", err, _id);
    return null;
  }
};

// Pick.find({ sending_time: { $exists: false } }).then(picks => {
//   picks.forEach(async pick => {
//     await Pick.findOneAndUpdate(
//       { _id: pick._id },
//       { sending_time: moment.utc(pick.updated_at).unix() }
//     );
//   });
// });

async function missedToPicks() {
  console.log("missing");
  const picks = await Pick.find(
    {
      sending_time: {
        $lte: moment.utc().subtract(5, "minutes").unix(),
      },
      type: "pre-match",
      status: { $in: ["waiting", "in-progress"] },
      // user_id: { $in: [734, 1] }
    },
    { _id: 1 }
  );

  const ids = picks.map((pick) => pick._id);
  const missed = await Pick.updateMany(
    { _id: { $in: ids } },
    { missed: true, status: "sent" }
  );
  return missed;
}

// async function updateUserIds() {
//   const users = require("../../users_hmap.json");
//   for (var user of users) {
//     console.log(
//       user._id,
//       await Pick.updateMany(
//         {
//           user_id: user.id,
//         },
//         { user_id: ObjectId(user._id) }
//       )
//     );
//   }
// }
// const Queue = require("async-parallel-queue");

// // create a queue with 10 concurrency (10 tasks will run in parallel)
// const queue = new Queue({ concurrency: 50 });

// async function updateStrategyIds() {
//   const strategies = require("../../strategies_hmap.json");

//   const fn = queue.fn(async (strategy) => {
//     const res = await Pick.updateMany(
//       {
//         strategy_id: strategy.id,
//       },
//       { strategy_id: ObjectId(strategy._id) }
//     );
//     return console.log("INSERTED", res, strategy._id);
//   });

//   for (var strategy of strategies) {
//     console.log(strategy._id, fn(strategy));
//   }
//   await queue.waitIdle();
//   queue.start();
// }
// updateUserIds();
// updateStrategyIds();
// missedToPicks().then(() => {
//   setInterval(() => {
//     try {
//       missedToPicks().then((x) => console.log(x));
//     } catch (error) {
//       console.log(error);
//     }
//   }, 1000 * 60 * 5);
// });

// setTimeout(() => {
//   Pick.export(298, 1).then((picks) => {
//     console.log(picks);
//   });
// }, 3000);
module.exports = Pick;
