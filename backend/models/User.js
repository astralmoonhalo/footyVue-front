const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const moment = require("moment");
const { sendTemplateEmail } = require("@root/mailers");
const { sendySubscribe, sendyUnsubscribe } = require("@root/mailers/sendy");
const Transaction = require("./Transaction");

const SubscriptionSchema = new Schema(
  {
    name: { type: String },
    price: { type: String },
    days: { type: String },
    trial: { type: Boolean, default: true },
    email: { type: String, unique: true, lowercase: true },
    // plan_id: { type: Number },
    // order_id: { type: Number },
    // subscription_id: { type: Number },
    start_date: { type: Date },
    end_date: { type: Date, index: true, required: false },
    status: { type: String, index: true },
    update_url: { type: String },
    cancel_url: { type: String },
    gateway: { type: String },
    platform_user_id: { type: String },
  },
  {
    strict: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const UserSchema = new Schema(
  {
    id: { type: Number, unique: true },
    subscription: SubscriptionSchema,
    email: { type: String, unique: true, index: true, lowercase: true },
    password: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    utcoffset: { type: Number },
    locale: { type: String, default: "en" },
    avatar_id: { type: Number, default: 0 },
    id: { type: Number, index: true },
    power: { type: Number, default: 1 },
    seen_intro: { type: Boolean, default: false },
    phone: { type: String, index: true },
  },
  {
    strict: false,
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

UserSchema.pre("save", function (next) {
  var user = this;
  // only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) return next();
  user.password = bcrypt.hashSync(user.password, 10);
  next();
});

const User = mongoose.model("User", UserSchema);
const Plan = require("./Plan");

User.prototype.isValidPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

User.findAppUsers = async function (role) {
  const matchQuery = { phone: { $ne: null, $exists: true } };
  switch (role) {
    case "pro":
      Object.assign(matchQuery, {
        "subscription.plan_id": 1,
      });
      break;
    case "trial":
      Object.assign(matchQuery, {
        "subscription.plan_id": 2,
      });

      break;
    case "free":
      Object.assign(matchQuery, {
        "subscription.plan_id": null,
      });
      break;
    default:
      break;
  }
  const users = await this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $project: {
        phone: 1,
        firstname: 1,
      },
    },
  ]);
  return users;
};

User.findByEmail = function (email) {
  return this.findOne({
    email,
  });
};

// User.syncAllUsers().then((x) => console.log(x));
User.updateProfile = async function (
  user_id,
  { firstname, lastname, avatar_id }
) {
  return this.findByIdAndUpdate(user_id, { firstname, lastname, avatar_id });
};

User.changePassword = function (email, old_password, password) {
  // const password = bcrypt.hashSync(new_password, 10);
  const hashed_password = bcrypt.hashSync(password, 10);
  return this.findOneAndUpdate(
    { email, password: old_password },
    { password: hashed_password }
  );
};

User.updatePassword = function (user_id, password) {
  const hashed_password = bcrypt.hashSync(password, 10);
  return this.findByIdAndUpdate(user_id, { password: hashed_password });
};

User.hideIntroForever = function (user_id) {
  return this.findOneAndUpdate(user_id, { seen_intro: true });
};

User.signup = async function (user_data) {
  const session = await mongoose.startSession();

  await session.withTransaction(async () => {
    const plan = await Plan.findOne({ id: 2 }).lean();
    const subscription = {
      plan_id: plan.id,
      // email: user.email,
      start_date: moment().toDate(),
      end_date: moment().add(plan.days, "days").toDate(),
      status: "active",
      ...plan,
    };
    const user = (
      await User.create([{ ...user_data, subscription }], {
        session,
      })
    )[0];

    console.log("USER", user);
    await sendySubscribe({
      email: user.email,
      name: user.firstname,
      list: process.env.SENDY_7_DAY_LIST_ID,
    });
    await sendySubscribe({
      email: user.email,
      name: user.firstname,
      list: process.env.SENDY_8_DAY_LIST_ID,
    });
    await sendTemplateEmail({
      receiverEmail: user.email,
      Template: "WELCOME",
      TemplateData: { name: user.firstname },
    });
  });
};

User.findForAdmin = function () {
  return this.find(
    {},
    {
      id: 1,
      email: 1,
      firstname: 1,
      lastname: 1,
      phone: 1,

      subscription: 1,
      created_at: 1,
      updated_at: 1,
    }
  );
};

//console.log("END DATE", moment("2021-10-11", "YYYY-MM-DD").endOf("day"))

User.issueSubByAdmin = async function ({
  email,
  plan_id,
  order_id,
  start_date,
  end_date,
  subscription_id,
}) {
  const Plan = require("./Plan");
  const plan = await Plan.findOne({ id: Number(plan_id) }).lean();
  const user = await User.findOneAndUpdate(
    { email },
    {
      subscription: {
        //user_id: user.id,
        plan_id: plan.id,
        email,
        order_id,
        subscription_id,
        start_date: start_date || moment().toDate(),
        end_date: end_date
          ? moment(end_date).endOf("day").subtract(1, "minute").toDate()
          : moment().add(plan.days, "days").toDate(),
        status: "active",
        ...plan,
      },
    },
    { new: true }
  );
  if (order_id) {
    await Transaction.findOneAndUpdate({ order_id }, { status: "success" });
  }
  if (!plan.trial) {
    await sendySubscribe({
      email: user.email,
      name: user.firstname,
      list: process.env.SENDY_PRO_LIST_ID,
    });
    await sendyUnsubscribe({
      email: user.email,
      list: process.env.SENDY_8_DAY_LIST_ID,
    });
  }
};

User.updateExpiryByAdmin = function ({ email, end_date }) {
  end_date = moment.utc(end_date).toDate();
  return this.findOneAndUpdate(
    { email },
    { "subscription.end_date": end_date }
  );
};

User.deleteSubByAdmin = function ({ email }) {
  return this.findOneAndUpdate({ email }, { subscription: null });
};

User.updateSubscription = function (order_id, data) {
  return this.updateOne({ order_id }, data);
};

// User.updateMany({}, { $unset : { telegram : 1} }).then((x) => console.log(x));
// User.findOne({ id: 21 }, { _id: 1 }).then(async (user) => {
//   const Strategy = require("./Strategy");
//   await Strategy.updateMany({ user_id: 21 }, { _user_id: user._id });
// });

// User.find({}, { _id: 1, id: 1 })
//   .lean()
//   .then((users) => {
//     //savehmap to json
//     const json = JSON.stringify(users);
//     //write to file
//     const fs = require("fs");
//     fs.writeFile("./users_hmap.json", json, (err) => {
//       if (err) {
//         console.log(err);
//       }
//     });
//   });

//convert all user emails to lower case

//mongo find where email field is not a string
// User.find({ email: { $type: "string" } }, { _id: 1, email: 1 }).then(
//   async (users) => {
//     console.log(users);
//   }
// );

// find duplicate emails
// User.find({ email: { $exists: true } }, { _id: 1, email: 1 }).then(
//   async (users) => {
//     const emails = users.map((user) => user.email);
//     const uniqueEmails = [...new Set(emails)];
//     const duplicates = emails.filter((email) =>
//       uniqueEmails.includes(email) ? false : true
//     );
//     console.log(duplicates);
//   }
// );

//count each email
// User.aggregate([
//   { $group: { _id: "$email", count: { $sum: 1 } } },
//   { $match: { count: { $gt: 0 } } },
// ]).then(async (users) => {
//   console.log(users);
// });

module.exports = User;
