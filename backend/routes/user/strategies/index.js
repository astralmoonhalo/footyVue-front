const express = require("express");
const router = express.Router();
const { Strategy, User } = require("../../../db");
const isSubscribed = require("@root/middlewares/isSubscribed");

router.get("/", async (req, res) => {
  const { mode, page, filterBy, sortBy, search } = req.query;
  const types = {
    "in-play-alerts": "in-play",
    "pre-match-alerts": "pre-match",
  };
  console.log("index, strategues", req.query);
  const type = types[req.query.type];
  //const { } = req.params;
  const user_id = req.user.user._id;
  const [total, strategies] = await Strategy.findAll(
    type,
    user_id,
    page,
    mode,
    filterBy,
    sortBy,
    search
  );
  res.json({ total, strategies });
});

router.get("/strike-rates", async (req, res) => {
  try {
    const user_id = req.user.user._id;
    const user_stategies = await Strategy.getUserStrategies(user_id);
    const other_stategies = await Strategy.getOtherStrategies(user_id);
    res.json({
      user_stategies,
      other_stategies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.use("/", isSubscribed);

router.post("/exclude-league/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { league_id } = req.body;
    const user_id = req.user.user._id;

    console.log('request-----id===='+id);

    await Strategy.excludeLeague(id, user_id, league_id);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/update-leagues/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { leagues } = req.body;
    const user_id = req.user.user._id;
    if (leagues.length > 2000) {
      return res.status(404).send({ message: "Not found" });
    }

    await Strategy.updateLeagues(id, user_id, leagues);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/trust/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    await Strategy.trust(id, user_id);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/untrust/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    await Strategy.untrust(id, user_id);
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/toggle-active/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    const strategy = await Strategy.toggle(id, user_id);
    res.send(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/clone/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    const strategy = await Strategy.import(id, user_id);
    res.send({ strategy, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/import/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    const strategy = await Strategy.import(id, user_id);
    res.send(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    await Strategy.deleteByStrategyId(id, user_id);
    res.send({ success: true, message: "Strategy deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.post("/update-hitrate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user._id;
    await Strategy.updateHitrate(id, user_id);
    res.send({ success: true, message: "Strategy deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.get("/id", async (req, res) => {
  try {
    const { id } = req.query;
    const user_id = req.user.user._id;
    const strategy = await Strategy.findByStrategyId(id, user_id);
    res.json(strategy);
  } catch (err) {
    console.error(err);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
});

router.use("/in-play-alerts", require("./in-play"));
router.use("/pre-match-alerts", require("./prematch"));
router.use("/picks", require("./picks"));

module.exports = router;
