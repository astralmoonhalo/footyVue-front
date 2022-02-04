const express = require("express")
const { Strategy, Fixture } = require("../../../db");
const StrategyFormatter = require("../../../formatters/StrategyFormatter");
const { ObjectId } = require("mongodb");
const router = express.Router()
const fomatter = new StrategyFormatter();

router.get("/fetch_strategies/:page/:date", async(req, res) => {
    console.log('fetch_strategies');
    let user_id = req.user.user._id;    
    let type = 'pre-match';
    let page = Number(req.params.page);
    let strategyList = [];
    let date = req.params.date;
    let view_count = 1;
    console.log('changepage',page);
    const count = await Strategy.count({type:type, user_id:ObjectId(user_id), active:true});
    
    const strategies = await Strategy.find({type:type, user_id:ObjectId(user_id), active:true}).skip((page - 1) * 5).limit(5);
       
    await strategies.map(async(strategy, index)=>{
        const fixtures = await Fixture.findUpcomingResults(
            strategy,
            "upcoming",
            date,
            view_count
            );            
            strategyList.push({ "_id": strategy._id, "title": strategy.title, "outcome": strategy.outcome, 'leagues':strategy.leagues, "fixtures": fixtures, "view_count": 0, "selected_date": date*1000, "count":count });
            if(strategyList.length==strategies.length){                
                res.send(strategyList);
            }
            
    });                       
}) ;


router.post("/fixtures", async(req, res) => {
    // let user_id = req.user.user._id;        
    let date = req.body.date;
    let view_count = req.body.view_count;
    let strategy_id = req.body.strategy_id;
    console.log(date,view_count,strategy_id);
    const strategy = await Strategy.findOne({ id: strategy_id }).then(async(strategy_v) => {        
        const fixtures = await Fixture.findUpcomingResults(
            strategy_v,
            "upcoming",
            date,
            view_count
            );
        if(fixtures){
            res.send(fixtures);
        }            
    });
});


module.exports = router

