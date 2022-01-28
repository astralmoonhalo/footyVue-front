<template>
  <GeneralPage :pageTitle="pageTitle" :pageDescription="pageDescription">
    <template v-slot:pageButton>
      <b-button
        class="footy-button"
        variant="primary"
        block
        :disabled="!$store.getters.subscriptionType"
        :to="`/${strategyType}/create`"
      >
        <PlusIcon class="icon-left" />

        <span class="text"> Add a new strategy </span>
      </b-button>
    </template>
    <template v-slot:howItWorks>
      <HowItWorks :location="strategyType" />
    </template>

    <div class="strategy-list-table-wrapper">
      <b-overlay :show="loading" rounded="lg">
        <div class="up-coming-body">
          <div
            v-for="strategy in strategies"
            :key="strategy.id"
            class="strategy-card mt-5"
          >
          <b-row class="founds-container" no-gutters>
               <b-col md="6" sm="12" class="d-flex" style="flex-direction:column;justify-content:flex-start;">
                    <h1 class="strategy-header-title">
                    {{ loading ? "" : strategy["title"] }}
                    </h1>
                    <span class="strategy-header-description">
                    {{ loading ? "" : strategy["note"] }}
                    </span>
                </b-col>
                <b-col md="6" sm="12">
                    <section class="">
                    <div class="filter-items-wrapper scroll-on-mobile column-gap-10">
                        <FixtureDatePicker v-model="selected_date" v-if="!liveMode">
                        <FixtureStatPicker v-model="selected_stat" v-if="!liveMode"/>                    >
                    </div>
                    </section>
                </b-col>
            </b-row>
            <hr />
            <div class="strategy-body">
              <div
                class="strategy-play-info mt-4"
                v-for="fixture in strategy['fixtures']"
                :key="fixture.fixture_id"
              >
                <div 
                    class="strategy-play-info-header d-flex mb-3"                    
                    style="justify-content: space-between">
                  <div class="strategy-play-info-title d-flex" >
                    <span
                      class="flag-icon mr-1"
                      :class="getFlag(fixture.iso)"                      
                    ></span>
                    <span class="ml-2">{{ fixture.country_name }}</span>
                  </div>
                  <div class="strategy-play-info-action">EXCLUDE LEAGUE</div>
                </div>
                <div class="strategy-play-info-body">
                  <FixtureStatsWrapper
                    :fixture="fixture"
                    :stat="selected_stat"
                    :scroller="'probability_scroller'"
                    :liveMode="liveMode"
                    @showstats="showStats(fixture)"
                    @closestats="closeStats"
                    showingDetails
                    :statshidden="!show_fixture_details"
                  >
                  </FixtureStatsWrapper>
                  <!-- <div class="strategy-play-info-item">
                    <div class="play-time-level">
                      <span class="mr-3">{{ fixture.time }}</span
                      ><span>{{ fixture.fixture_name }}</span>
                    </div>
                    <div class="play-content">
                      <div>
                        <div class="team">
                          <img
                            class="team-mark"
                            v-bind:src="fixture.away_logo"
                          />
                          {{ fixture.away_name }}
                        </div>
                        <div class="team">
                          <img
                            class="team-mark"
                            v-bind:src="fixture.home_logo"
                          />
                          {{ fixture.home_name }}
                        </div>
                      </div>
                      <div class="d-flex">
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">Home Win</span>
                          <b-button
                            size="sm"
                            class="opt-value bg-red"
                            variant="danger"
                            >{{
                              fixture.probability.home_win_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">Draw</span>
                          <b-button size="sm" class="opt-value bg-orange"
                            >{{
                              fixture.probability.draw_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">Away Win</span>
                          <b-button size="sm" class="opt-value bg-green"
                            >{{
                              fixture.probability.away_win_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">BTTS</span>
                          <b-button size="sm" class="opt-value bg-orange"
                            >{{
                              fixture.probability.btts_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">+2.5 Goals</span>
                          <b-button size="sm" class="opt-value bg-green"
                            >{{
                              fixture.probability.o25_goals_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <span class="opt-name">+0.5 Home Goals</span>
                          <b-button
                            size="sm"
                            class="opt-value bg-green"
                            style="width: 120px"
                            >{{
                              fixture.probability.o05_home_goals_probability
                            }}
                            %</b-button
                          >
                        </div>
                        <div class="play-info-opt mr-4">
                          <b-button
                            size="sm"
                            class="opt-arrow-btn"
                            variant="warning"
                          >
                            <b-icon icon="arrow-left"></b-icon>
                          </b-button>
                          <b-button
                            size="sm"
                            class="opt-arrow-btn mt-1"
                            variant="warning"
                          >
                            <b-icon icon="arrow-right"></b-icon>
                          </b-button>
                        </div>
                        <b-button size="lg" class="opt-status">Stats</b-button>
                      </div>
                    </div>
                  </div> -->
                </div>
              </div>
              <div class="d-flex mt-2 mb-5" style="justify-content: center">
                <b-button
                  class="footy-button mr-2"
                  variant="primary"
                  :disabled="!activeViewLess(strategy['id'])"
                  @click="viewLess(strategy['id'])"
                >
                    <DeleteIcon class="icon-left" />
                    <span class="text"> Load Less </span>
                </b-button>
                <b-button
                  class="footy-button"
                  variant="primary"
                  @click="viewMore(strategy['id'])"
                >
                  <PlusIcon class="icon-left" />
                  <span class="text"> Load More </span>
                </b-button>
              </div>
              <div :class="loading_fixtures?'':'hidden'" class="overlay-region" >
                <b-spinner
                  variant="success"
                  type="grow"
                  label="Spinning"
                ></b-spinner>
              </div>
            </div>
          </div>
          <b-pagination
            v-model="currentPage"
            :total-rows="strategy_count"
            :per-page="perPage"
            aria-controls="my-table"
            class="mt-3"
            @change="changedPage"
          ></b-pagination>
        </div>
      </b-overlay>
    </div>
  </GeneralPage>
</template>

<script>
import GeneralPage from "~/components/GeneralPage";

import FixtureStatPicker from "~/components/fixtures-page/FixtureStatPicker.vue";
import FixtureDatePicker from "~/components/fixtures-page/FixtureDatePicker.vue";

import HowItWorks from "~/components/HowItWorks";
import PlusIcon from "~/static/icons/plus.svg";
import DeleteIcon from "~/static/icons/dash-lg.svg";

export default {
  name: "UpComing",
  components: {
    GeneralPage,
    HowItWorks,
    PlusIcon,
    DeleteIcon,
    FixtureStatPicker,
    FixtureDatePicker,
  },
  props: {
    msg: String,
  },

  data() {
    return {
      pageTitle: "UpComing",
      pageDescription:"This page shows you all the upcoming picks for all your active strategies all on one page.",
      perPage: 5,
      currentPage: 1,
      strategy_count: 0,
      strategies: [],
      fixtures: [],
      loading: true,
      loading_fixtures: false,
    };
  },
  mounted() {
    //get UTC Date.
    var date = new Date().toUTCString();
    console.log(date);
    //get the strategy count by user_id
    this.$axios
      .get("https://footy-amigo-backend.herokuapp.com/api/strategy_count")
      .then((response) => {
        this.strategy_count = response.data["count"];
        //init strategies by current page
        this.$axios
          .get(
            "https://footy-amigo-backend.herokuapp.com/api/strategies/21/" +
              this.currentPage
          )
          .then((response) => {
            this.strategies = response.data;
          })
          .catch((error) => {
            console.log(error);
            this.errored = true;
          })
          .finally(() => (this.loading = false));
      })
      .catch((error) => {
        console.log(error);
        this.errored = true;
      })
      .finally(() => (this.loading = false));
  },
  methods: {
    getFlag(iso) {
      return iso ? "flag-icon-" + iso : "flag-icon-un";
    },
    activeViewLess: function (strategy_id) {
      const idx = this.strategies.findIndex((d) => d.id === strategy_id);
      if (idx === -1) return false;
      if (this.strategies[idx]["view_count"] > 0) {
        return true;
      }
      return false;
    },
    /**
     * function that called when page is changed
     *
     */
    changedPage: function () {
      this.loading = true;
      //get strategies by user_id and page
      this.$axios
        .get(
          "https://footy-amigo-backend.herokuapp.com/api/strategies/21/" +
            this.currentPage
        )
        .then((response) => {
          this.strategies = response.data;
        })
        .catch((error) => {
          console.log(error);
          this.errored = true;
        })
        .finally(() => (this.loading = false));
    },

    /**
     * function for view less
     * @param{Number} strategy_id
     */
    viewLess: function (strategy_id) {
      const idx = this.strategies.findIndex((d) => d.id === strategy_id);
      //if the count of fixtures for strategy is more than 20 remove 10 data from the last
      if (this.strategies[idx]["fixtures"].length >= 20) {
        console.log(this.strategies[idx]["view_count"] * 10);
        this.strategies[idx]["fixtures"] = this.strategies[idx][
          "fixtures"
        ].splice(10, this.strategies[idx]["view_count"] * 10);
        console.log(this.strategies[idx]["fixtures"].length);
      } else {
        // but if the count of fixtures for strategy is less then 20, remove count-10 data ex: count:17 ---------remove 7
        console.log("<");
        this.strategies[idx]["fixtures"] = this.strategies[idx][
          "fixtures"
        ].splice(this.strategies[idx]["fixtures"].length - 10, 10);
      }
      this.strategies[idx]["view_count"] =
        this.strategies[idx]["view_count"] - 1;
    },

    /**
     * function for view more
     * @param{Number} strategy_id
     */
    viewMore: function (strategy_id) {
      //active loading
      this.loading_fixtures = true;
      //get index by strategy_id
      const idx = this.strategies.findIndex((d) => d.id === strategy_id);
      this.strategies[idx]["view_count"] =
        this.strategies[idx]["view_count"] + 1;
      // get data by strategy_id and view_count.
      this.$axios
        .post("https://footy-amigo-backend.herokuapp.com/api/fixtures", {
          strategy_id: strategy_id,
          view_count: this.strategies[idx]["view_count"],
        })
        .then((response) => {
          //add fixtures to strategy's fixtures
          this.strategies[idx]["fixtures"] = this.strategies[idx][
            "fixtures"
          ].concat(response.data);
        })
        .catch((error) => {
          console.log(error);
          this.errored = true;
        })
        .finally(() => (this.loading_fixtures = false)); //deactive loading
    },
  },
};
</script>


<style lang="scss">
@use "sass:map";
@import "~/assets/scss/colors";
@import "~/assets/scss/breakpoints";
.strategy-list-table-wrapper {
  font-weight: 500;
  .fixed-bottom {
    background: #60b15ad3 !important;
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    color: #ffffff !important;
  }
  .btn.nuxt-link-exact-active.nuxt-link-active {
    background: $primary;
    color: white;
    svg {
      filter: grayscale(1) brightness(0) invert(1);
    }
  }

  .strategy-header-title{
      font-size: 40px;
      font-family: Colfax;
      font-weight: 600;
      @media(max-width:768px){
          font-size: 25px;
      }
  }

  .strategy-play-info-action{
      font-size: 12px;
      color: #E4AF5E;
  }
  .overlay-region{
      width:100%;
      display: flex;
      justify-content: center;
  }
  .hidden{
      display: none;
  }
  
}

</style>
