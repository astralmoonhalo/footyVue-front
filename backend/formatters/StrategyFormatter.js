const comparators = {
  "<": "$lt",
  ">": "$gt",
  "=": "$eq",
  "!=": "$ne",
  "<=": "$lte",
  ">=": "$gte",
};

isObject = function (a) {
  return !!a && a.constructor === Object;
};

function flatten(d, parent_key = "", sep = ".") {
  const items = [];

  for (var k in d) {
    const v = d[k];
    const new_key = parent_key ? parent_key + sep + k : k;

    if (isObject(v)) {
      items.push(...flatten(v, new_key, (sep = sep)));
    } else {
      items.push((new_key, v));
    }
  }

  return Object.fromEntries(items);
}

class StrategyFormatter {
  gen_condition(field, operator, value) {
    const sign = comparators[operator];
    return { [field]: { [sign]: Number(value) } };
  }

  gen_between_condition(field, values) {
    const x = values[0];
    const y = values[1];
    return { [field]: { $gte: x, $lte: y } };
  }

  condition_for_probability(rule) {
    const table_name = "probability";
    const column_name = rule["code"];
    const field = `${table_name}.${column_name}`;
    return [[this.gen_between_condition(field, rule["values"])], [field]];
  }

  condition_for_team(rule, team) {
    // console.log(rule);
    var table_name;
    var column_name;

    if (rule["category"] == "h2h") {
      table_name = "h2h_aggregate";
    } else {
      table_name = team;
    }

    if (rule["direct"]) {
      column_name = rule["code"];
    } else {
      column_name = rule[rule["location"]];
    }
    const field = `${table_name}.${column_name}`;

    return [this.gen_between_condition(field, rule["values"]), field];
  }

  condition_for_odds(rule) {
    const table_name = "pre_odds";
    const column_name = rule["code"];
    const operator = rule["comparator"];
    const value = rule["value"];
    const field = `${table_name}.${column_name}`;
    return [[this.gen_condition(field, operator, value)], [field]];
  }

  condition_for_aggregate_stats(rule) {
    // const teams = new Set(["home", "away"]);
    // console.log("team", rule["team"], teams.has(rule["team"]));
    const team = rule["team"];
    switch (team) {
      case "home":
      case "away":
        var [condition, field] = this.condition_for_team(rule, rule["team"]);
        var conditions = [condition];
        var fields = [field];
        break;
      default:
        var [condition_1, field_1] = this.condition_for_team(rule, "home");
        var [condition_2, field_2] = this.condition_for_team(rule, "away");
        var conditions = [condition_1, condition_2];
        var fields = [field_1, field_2];
        if (team == "either") {
          conditions = [{ $or: conditions }];
        }
    }

    return [conditions, fields];
  }

  query_for_pre_match_rules(strategy) {
    const pre_match_conditions = [];
    const pre_match_fields = [];
    for (var rule of strategy["strategy_prematch_rules"]) {
      if (rule["category"] == "probability") {
        var [conditions, fields] = this.condition_for_probability(rule);
      } else if (rule["category"] == "odds") {
        var [conditions, fields] = this.condition_for_odds(rule);
      } else {
        var [conditions, fields] = this.condition_for_aggregate_stats(rule);
      }

      pre_match_conditions.push(...conditions);

      pre_match_fields.push(...fields);
    }

    return [pre_match_conditions, pre_match_fields];
  }

  has_team(code, category) {
    const oddsWithTeam = new Set("dnb", "ht_result", "ft_result");
    if (category == "odds") {
      if (oddsWithTeam.has(code)) {
        return true;
      }
    } else {
      return true;
    }
  }

  parse_single_rule(code, category, table_name, team) {
    const name_map = {
      liveodds: "live_odds",
      preodds: "pre_odds",
      livestats: "stats",
    };
    table_name = name_map[table_name];
    if (category == "statistics" || this.has_team(code, category)) {
      return `${table_name}.${team}.${code}`;
    } else {
      return `${table_name}.${code}`;
    }
  }

  parse_rule(
    first_code,
    second_code,
    first_category,
    second_category,
    first_table_name,
    second_table_name,
    comparator,
    value,
    first_team,
    second_team
  ) {
    const name_map = {
      liveodds: "live_odds",
      preodds: "pre_odds",
      livestats: "stats",
    };

    const symbol = comparators[comparator];

    value = Number(value);
    if (
      first_category == "statistics" ||
      this.has_team(first_code, first_category)
    ) {
      const table_name = name_map[first_table_name];
      const field_1 = `${table_name}.home.${first_code}`;
      const field_2 = `${table_name}.away.${first_code}`;
      var fields = [field_1, field_2];
      if (first_team == "sum_of_teams") {
        const field_combined = { $add: [`$${field_1}`, `$${field_2}`] };
        var conditions = [{ $expr: { [symbol]: [field_combined, value] } }];
        return conditions, fields;
      } else if (first_team == "either_team") {
        var conditions = [
          {
            $or: [
              this.gen_condition(field_1, comparator, value),
              this.gen_condition(field_2, comparator, value),
            ],
          },
        ];
        return [conditions, fields];
      }
      const first_field = this.parse_single_rule(
        first_code,
        first_category,
        first_table_name,
        first_team
      );
      var fields = [first_field];
      if (second_category == "numeric") {
        var second_field = value;
      } else {
        var second_field = this.parse_single_rule(
          second_code,
          second_category,
          second_table_name,
          second_team
        );
        fields.append(second_field);
        second_field = "$" + second_field;
      }

      conditions = [{ $expr: { [symbol]: ["$" + first_field, second_field] } }];
      return [conditions, fields];
    }
  }

  query_for_in_play_rules(strategy) {
    const in_play_conditions = [];
    const in_play_fields = [];
    for (var rule of strategy["strategy_inplay_rules"]) {
      const {
        first_code,
        second_code,
        first_category,
        first_table_name,
        second_table_name,
        second_category,
        comparator,
        value,
        first_team,
        second_team,
      } = rule;

      const [conditions, fields] = this.parse_rule(
        first_code,
        second_code,
        first_category,
        second_category,
        first_table_name,
        second_table_name,
        comparator,
        value,
        first_team,
        second_team
      );
      in_play_conditions.push(...conditions);
      in_play_fields.push(...fields);
    }

    return [in_play_conditions, in_play_fields];
  }

  query_for_in_play_timer(strategy) {
    const timer = strategy["timer"];
    const from_minute = timer["from"];
    const to_minute = timer["to"];
    const time = timer["time"];
    const minute = timer["minute"];

    const time_map = {
      disabled: { minute: { $ne: -1 } },
      atMinuteX: { minute: { $eq: minute } },
      xMinutesAgo: { minute: { $eq: { $sub: ["$minute", minute] } } },
      betweenMinutesXandY: { minute: { $gte: from_minute, $lte: to_minute } },
      pastXminutes: { minute: { $gte: { $sub: ["$minute", minute] } } },
      sinceMinuteX: { minute: { $gte: minute } },
      untilMinuteX: { minute: { $lte: minute } },
      during1stHalf: { minute: { $lte: 45 } },
      during2ndHalf: { minute: { $gt: 45 } },
      atHalfTime: { status: { $eq: "HT" } },
      atFullTime: { minute: { $eq: 90 } },
    };
    return time_map[time];
  }

  query_for_leagues(strategy) {
    return { league_id: { $in: strategy["leagues"] } };
  }

  format(strategy) {
    // #picks = list(picks_table.find({"strategy_id": strategy["id"]}, {"fixture_id": 1}))
    // strategy[""]
    const [pre_match_conditions, pre_match_fields] =
      this.query_for_pre_match_rules(strategy);

    const fields = pre_match_fields;
    const league_conditions = [this.query_for_leagues(strategy)];
    const conditions = pre_match_conditions;
    if (strategy["type"] == "in-play") {
      const [in_play_conditions, in_play_fields] =
        this.query_for_in_play_rules(strategy);

      const timer_conditions = [this.query_for_in_play_timer(strategy)];
      const extra_conditions = [
        { status: { $in: ["LIVE", "HT", "PEN_LIVE", "BREAK", "ET"] } },
      ];
      conditions.push(...timer_conditions);
      conditions.push(...extra_conditions);
      conditions.push(...in_play_conditions);

      fields.push(...in_play_fields);
    }
    // console.log(strategy);
    conditions.push(...league_conditions);
    const WHERE = conditions;

    const query = { $and: WHERE };

    return query;
  }
}


module.exports = StrategyFormatter;