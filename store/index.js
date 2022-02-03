const {
  getPreMatchPreview,
  getInPlayPreview,
} = require("../functions/previews");

function rulesAsObject(rules) {
  const group = {};
  rules.forEach((rule) => {
    const { _id } = rule;
    group[_id] = rule;
  });
  return group;
}

export const state = () => ({
  leagues: [],
  in_play_rules: null,
  outcomes: null,
  leagues_raw: [],
  pre_match_rules: null,
});

export const mutations = {
  setLeagues(state, leagues) {
    state.leagues = leagues;
  },
  setLeaguesRaw(state, leagues) {
    state.leagues_raw = leagues;
  },
  setPreMatchRules(state, rules) {
    state.pre_match_rules = rules;
  },
  setInPlayRules(state, rules) {
    state.in_play_rules = rules;
  },
  setOutcomes(state, outcomes) {
    state.outcomes = outcomes;
  },
};

export const actions = {
  async fetchLeagues({ commit }) {
    try {
      const leagues_raw = await this.$axios.$get("/user/leagues");
      const leagues = leagues_raw.map((league) => {
        return {
          value: league.id,
          text: league["country_name"] + " • " + league["name"],
        };
      });
      commit("setLeagues", leagues);
      commit("setLeaguesRaw", leagues_raw);
      return leagues;
    } catch (error) {
      console.log(error);
    }
  },
  async fetchOutcomes({ commit }, is_bet_builder = false) {
    try {
      const url = is_bet_builder
        ? "/user/bet-builders/outcomes"
        : "/user/outcomes";

      const outcomes = await this.$axios.$get(url);
      commit("setOutcomes", outcomes);
    } catch (error) {
      console.log(error);
    }
  },
  async fetchPreMatchRules({ commit }) {
    try {
      const rules = await this.$axios.$get("/user/rules/pre-match/");
      // console.log(rules);
      commit("setPreMatchRules", rules);
    } catch (error) {
      console.log(error);
    }
  },

  async fetchInPlayRules({ commit }) {
    try {
      const rules = await this.$axios.$get("/user/rules/in-play/");
      commit("setInPlayRules", rules);
    } catch (error) {
      console.log(error);
    }
  },
};

export const getters = {
  lookupPreMatchRules(state) {
    if (state.pre_match_rules) {
      return rulesAsObject(state.pre_match_rules);
    }
  },
  lookupInPlayRules(state) {
    if (state.in_play_rules) {
      return rulesAsObject(state.in_play_rules);
    }
  },
  isPro(state) {
    const user = state.auth.user;
    if (user && user.subscription && user.subscription.trial != true) {
      return true;
    }
  },
  getAvatar(state) {
    if (state.auth && state.auth.user) {
      var avatar_id = state.auth.user.avatar_id;
    } else {
      var avatar_id = 0;
    }
    return `/svg/${avatar_id}.svg`;
  },
  getOutcomeOptions(state) {
    if (state.outcomes) {
      return state.outcomes.map((outcome) => {
        return {
          value: outcome._id,
          text: outcome.label,
        };
      });
    }
  },
  previewPreMatch(state) {
    if (state.pre_match_rules) {
      return getPreMatchPreview(state.setting, state.pre_match_rules);
    }
  },
  previewInPlay(state) {
    if (state.in_play_rules) {
      return getInPlayPreview(state.setting_in_play, state.in_play_rules);
    }
  },
  subscriptionType(state) {
    if (state.auth.user && state.auth.user && state.auth.user.subscription) {
      if (state.auth.user.subscription.trial) {
        return "trial";
      } else {
        return "pro";
      }
    }
  },
};
