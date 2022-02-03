require("dotenv").config();
require("./mongo");

const AccountActivationCode = require("./models/AccountActivationCode");
const BetBuilder = require("./models/BetBuilder");
const BettingSystem = require("./models/BettingSystem");
const Bookmaker = require("./models/Bookmaker");
const Broadcast = require("./models/Broadcast");
const Fixture = require("./models/Fixture");
const League = require("./models/League");
const LocalCountry = require("./models/LocalCountry");
const Market = require("./models/Market");
const Outcome = require("./models/Outcome");
const PageVideo = require("./models/PageVideo");
const Pick = require("./models/Pick");
const Plan = require("./models/Plan");
const Rule = require("./models/Rule");
const Strategy = require("./models/Strategy");
const Streak = require("./models/Streak");
const SubscriptionDetail = require("./models/SubscriptionDetail");
const Transaction = require("./models/Transaction");
const Update = require("./models/Update");
const User = require("./models/User");
const Session = require("./models/Session");

module.exports = {
  AccountActivationCode,
  BetBuilder,
  BettingSystem,
  Bookmaker,
  Broadcast,
  Fixture,
  League,
  LocalCountry,
  Market,
  Outcome,
  PageVideo,
  Pick,
  Plan,
  Rule,
  Session,
  Strategy,
  Streak,
  SubscriptionDetail,
  Transaction,
  Update,
  User,
};
