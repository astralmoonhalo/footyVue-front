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
            v-for="(strategy, strategy_index) in strategies"
            :key="strategy.id"
            class="strategy-card mt-5"
          >
          <b-row class="founds-container" no-gutters>
               <b-col md="6" sm="12" class="d-flex" style="flex-direction:column;justify-content:flex-start;">
                    <h1 class="strategy-header-title">
                    {{ loading ? "Loading Strategies..." : strategy["title"] }}
                    </h1>
                    <span class="text-warning strategy-header-description">
                    {{ loading ? "Just a second please..." : strategy["note"] }}
                    </span>
                </b-col>
                <b-col md="6" sm="12">
                    <section class="">
                    <div class="filter-items-wrapper scroll-on-mobile column-gap-10">
                        <FixtureDatePicker                           
                          :minDate="new Date()"
                          :buttonText="$moment(strategy['selected_date']).format('LL')"
                           v-model="strategies[strategy_index]['selected_date']"
                           v-if="!liveMode"       
                           @input="selectStrategyDate(strategy_index)"             
                           />                           
                        <FixtureStatPicker v-model="selected_stat" v-if="!liveMode"/>         
                    </div>
                    </section>
                </b-col>
            </b-row>
            <hr />
            <div class="strategy-body">
              <div
                class="strategy-play-info mt-4"
                v-for="(fixture, index) in strategy['fixtures']"
                :key="fixture.fixture_id"
              >
                <div
                     v-if="index==0?true:strategies[strategy_index]['fixtures'][index].country_name!==strategies[strategy_index]['fixtures'][index-1].country_name"          
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
                    :scroller="selected_scroller"
                    :liveMode="liveMode"
                    @showstats="showStats(fixture)"
                    @closestats="closeStats"
                    showingDetails
                    :statshidden="!show_fixture_details"
                  >
                  </FixtureStatsWrapper>
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
                  :disabled="strategy.fixture.length%10==0?false:true"
                  @click="viewMore(strategy_index)"
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
      <FixtureScrollPicker v-model="selected_scroller" />
      <LoadMore v-if="loading_date_fixtures" />
    </div>
  </GeneralPage>
</template>

<script>
import GeneralPage from "~/components/GeneralPage";
import FixtureScrollPicker from "~/components/fixtures-page/FixtureScrollPicker.vue";
import FixtureStatPicker from "~/components/fixtures-page/FixtureStatPicker.vue";
import FixtureDatePicker from "~/components/fixtures-page/FixtureDatePicker.vue";

import HowItWorks from "~/components/HowItWorks";
import PlusIcon from "~/static/icons/plus.svg";
import DeleteIcon from "~/static/icons/dash-lg.svg";

export default {
  name: "UpComing",
  components: {
    FixtureScrollPicker,
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
      selected_date: new Date(),
      selected_scroller: "stats_scroller",
      date_strategy_id: '',
      selected_stat: "ft_result",
      stat: "ft_result",      
      loading_date_fixtures: true,    
    };
  },
  mounted() {    
    //get UTC Date.
    var date = new Date().toUTCString();
    console.log(date);
    //get the strategy count by user_id
    this.$axios
      .get("user/upcoming/strategy_count")
      .then((response) => {
        this.strategy_count = response.data["count"];
        this.loading_date_fixtures = true;
        //init strategies by current page
        this.$axios
          .get(
            "user/upcoming/strategies/21/" +
              this.currentPage+'/'+this.$moment(this.selected_date.setHours(0,0,0,0)).unix()
          )
          .then((response) => {            
            this.strategies = response.data;
          })
          .catch((error) => {
            console.log(error);
            this.errored = true;
          })
          .finally(() => this.loading = false);
      })
      .catch((error) => {
        console.log(error);
        this.errored = true;
      })
      .finally(() => this.loading = false);
  },

  methods: {
    async showStats(fixture) {
      this.show_fixture_details = true;
      this.selected_fixture = fixture;
    },
    getFlag(iso) {
      this.loading_date_fixtures = false;
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
    // this function called when datepicker selected.
    selectStrategyDate(index){    
      this.date_strategy_id = index;
      this.getResults(index);
    },

    getResults(index){                                  
      this.loading_date_fixtures = true;
      this.strategies[index]["fixtures"] = [];
      this.viewMore(index);
    },

    WithoutTime(dateTime) {
    var date = new Date(dateTime.getTime());
    date.setHours(0, 0, 0, 0);
    return date;
    },
    /**
     * function that called when page is changed
     *
     */
    changedPage: function () {
      this.loading = true;
      this.loading_date_fixtures = true;
      //get strategies by user_id and page
      this.$axios
        .get(
          "user/upcoming/strategies/21/" +
            this.currentPage+'/'+this.date_strategy_id==''?this.$moment(new Date()).unix():this.$moment(this.strategies[idx]['selected_date']).unix()
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
    viewMore: function (strategy_index) {
      //active loading
      if(!this.loading_date_fixtures){
        this.loading_fixtures = true;
        this.strategies[strategy_index]["view_count"] =
        this.strategies[strategy_index]["view_count"] + 1;
      }      
      //get index by strategy_id
      // const idx = this.strategies.findIndex((d) => d.id === strategy_id);                
      // get data by strategy_id and view_count.
      this.$axios
        .post("user/upcoming/fixtures", {
          strategy_id: this.strategies[strategy_index].id,
          view_count: this.strategies[strategy_index]["view_count"],
          current_timestamp: this.$moment(this.strategies[strategy_index]['selected_date']).unix()
        })
        .then((response) => {
          //add fixtures to strategy's fixtures
          this.strategies[strategy_index]["fixtures"] = this.strategies[strategy_index][
            "fixtures"
          ].concat(response.data);            
        })
        .catch((error) => {
          console.log(error);
          this.errored = true;
        })
        .finally(() => (this.loading_fixtures = false, this.loading_date_fixtures = false)); //deactive loading        
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
