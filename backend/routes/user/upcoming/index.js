const express = require("express")
const Strategy = require('./m_Strategy');
const Fixture = require('./m_Fixture');
const moment = require('moment');
const StrategyFormatter = require("../../../formatters/StrategyFormatter");
const { ObjectId } = require("mongodb");
const router = express.Router()
const fomatter = new StrategyFormatter();


router.get("/strategy_count", async(req, res) => {
    console.log('strategy_count');
    await Strategy.count({
        user_id: ObjectId('6181a1476a8b1f99203adb3a'),
        active: true,
        type: "pre-match"
    }).exec(function(err, count) {
        console.log('success'+count);
        res.send({ "count": count });
    });
});

router.get("/strategies/:id/:page/:timestamp", async(req, res) => {
    console.log('page', req.params.page);
    console.log('strategy');
    console.log('date',req.params.timestamp);
    
    let start_timestamp = Number(req.params.timestamp);

    let strategyList = [];
    await Strategy.find({
        user_id: ObjectId("6181a1476a8b1f99203adb3a"),
        active: true,
        type: "pre-match"
    }).select({ "id": 1, "title": 1, "note": 1 }).skip((req.params.page - 1) * 5).limit(5).exec(async function(err, strategies) {
        console.log(1);
        await strategies.forEach(async(d) => {
            const strategy = await Strategy.findOne({ id: d.id });
            const query = fomatter.format(strategy);
            console.log(Number(start_timestamp)+86400+'-------'+start_timestamp);
            await Fixture.find({timestamp: { 
                $gte: start_timestamp,
                $lte: start_timestamp+86400,
            }} ).find(query).limit(10).exec(function(err, fixtures) {
                console.log('2');
                strategyList.push({ "id": d.id, "title": d.title, "note": d.note, "fixtures": fixtures, "view_count": 0, "selected_date": start_timestamp*1000 });
                if (strategyList.length === strategies.length) {
                    res.send(strategyList);
                }
            })

        });
        console.log(3);

    });

});



router.post("/fixtures", async(req, res) => {
    let start_timestamp = Number(req.body.current_timestamp);
    console.log('query');
    console.log('-----------------------------',req.body.current_timestamp);
    const strategy = await Strategy.findOne({ id: req.body.strategy_id });
    const query = fomatter.format(strategy);
    const fixtures = await Fixture.find({timestamp: { 
                $gte: start_timestamp,
                $lte: start_timestamp+86400,
            }} ).find(query).select({
        "fixture_id": 1,
        "away_id": 1,
        "away_logo": 1,
        "away_name": 1,
        "country_name": 1,
        "date": 1,
        "fixture_name": 1,
        "home_id": 1,
        "home_logo": 1,
        "home_name": 1,
        "id": 1,
        "iso": 1,
        "probability": 1,
        "status": 1,
        "time": 1,
        "ft_score": 1,
        "ht_score": 1,
        "timestamp": 1,
        "home_position": 1,
        "away_position": 1
        
    }).skip(req.body.view_count * 10).limit(10).catch(e => {
        console.log(e);
    });
    res.send(fixtures);
})

module.exports = router


// .find({'timestamp': { 
//     $gte:String(start_timestamp),
//     $lte: String(start_timestamp+86400),
// }} )