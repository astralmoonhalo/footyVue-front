<template>
  <GeneralPage :pageTitle="pageTitle" :pageDescription="pageDescription">
    <template v-slot:pageButton>
      <b-button
        class="footy-button"
        variant="primary"
        block
        :disabled="!$store.getters.subscriptionType"
        :to="`/pre-match-alerts/create`"
      >
        <PlusIcon class="icon-left" />

        <span class="text"> Add a new strategy </span>
      </b-button>
    </template>
    <template v-slot:howItWorks>
      <HowItWorks :location="'pre-match-alerts'" />
    </template>

    <div class="strategy-list-table-wrapper">
      <LoadMore v-if="upcoming_loadingState" />
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
                    {{ loading ? "Just a second please..." : "Desired outcome: "+strategy["outcome"].label}}
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
                          
              <UpgradeToPro
                message="Upgrade to Pro to gain access to upcoming fixtures matching your strategy"
                :showUpgrade="showUpgrade"
              >
                <div style="min-height: 100px">
                  <div
                    v-for="(league, league_id) in $groupFixturesByLeague(strategy['fixtures'])"
                    :key="league_id + 'league'"
                    class="mb-4"
                  >
                    <div
                      class="text-uppercase pl-2 wrap-on-mobile mb-3 league-name-inner-strategy"
                      block
                    >
                      <div class="country-content">
                        <span class="flag-icon mr-2" :class="league.flagicon"></span>
                        <span class="country-text">
                          {{ league.name }}
                        </span>
                      </div>
                      <b-button
                        class="text-warning"
                        size="sm"
                        variant="transparent"
                        @click="promptExcludeLeague(league.league_id, strategy_index)"
                        v-show="league.league_id"
                      >
                        EXCLUDE LEAGUE
                      </b-button>                      
                    </div>
                    <FixtureStatsWrapper
                      :fixture="fixture"
                      :stat="selected_stat"
                      :scroller="selected_scroller"
                      v-for="fixture in league.fixtures"
                      :key="fixture.id"
                      :liveMode="false"
                      :hideFavorite="true"
                      @showstats="showStats(fixture)"
                      @closestats="closeStats"
                      :statshidden="selected_fixture == null"
                    >
                    </FixtureStatsWrapper>                                      
                  </div>

                  <ModalOnMobile
                    v-model="show_fixture_details"
                    v-if="show_fixture_details"
                  >
                    <FixtureDetails
                      :initialFixture="selected_fixture"
                      v-if="selected_fixture"
                      @closestats="closeStats"
                      class="fixture-details-box"
                      :selected_scroller="selected_scroller"
                      :liveMode="false"
                    >
                    </FixtureDetails>
                  </ModalOnMobile>
                  
                </div>
              </UpgradeToPro>              
              <div class="d-flex mt-2 mb-5" style="justify-content: center">
                <b-button
                  class="footy-button mr-2"
                  variant="primary"
                  :disabled="!activeViewLess(strategy_index)"
                  @click="viewLess(strategy_index)"
                  v-if="strategy['fixtures'].length!=0"
                >
                    <DeleteIcon class="icon-left" />
                    <span class="text"> Load Less </span>
                </b-button>
                <b-button
                  class="footy-button"
                  variant="primary"
                  :disabled="strategy['fixtures'].length%10==0?false:true"
                  @click="viewMore(strategy_index)"
                  v-if="strategy['fixtures'].length!=0"
                >
                  <PlusIcon class="icon-left" />
                  <span class="text"> Load More </span>
                </b-button>
                <span v-if="strategy['fixtures'].length==0" class="strategy-header-description">
                  {{loading_fixtures==null?'No more upcoming futures for this date.':''}}
                </span>
              </div>
              <div :class="loading_fixtures==strategy_index?'':'hidden'" class="overlay-region" >
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
          ></b-pagination>
        </div>        
      </b-overlay>            
      <FixtureScrollPicker v-model="selected_scroller" />      
    </div>
    <PromptModal
      v-model="showPrompt"
      @accepted="excludeLeague(exclude_league_id)"
    />
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
  name: "Upcoming",
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
    includedLeagues: Object,
  },

  data() {
    return {
      pageTitle: "Upcoming",
      pageDescription:"This page shows you all the upcoming picks for all your active strategies all on one page.",
      perPage: 5,
      currentPage: 1,
      strategy_count: 0,
      strategies: [],
      fixtures: [],
      loading: false,
      loading_fixtures: null,
      upcoming_loadingState: false,
      selected_date: new Date(),
      selected_scroller: "stats_scroller",
      date_strategy_id: '',
      selected_stat: "ft_result",
      stat: "ft_result",            
      show_fixture_details: false,
      type: "pre-match-alerts",
      selected_fixture: null,
      initialized: false,
      showUpgrade: false,
      showPrompt: false,
      exclude_league_id:null,
      s_index: 0,
      date_viewMode: false
    };
  },
  
  mounted() {        
    //get UTC Date.
    var date = new Date().toUTCString();    
    //get the strategy count by user_id
    this.upcoming_loadingState = true;
    this.$axios
      .get("user/upcoming/fetch_strategies/"+ this.currentPage+'/'+this.$moment(this.selected_date).unix())
      .then((response) => {
        console.log('response.data=',response.data);
        this.strategy_count = response.data[0].count;
        this.upcoming_loadingState=false
        this.strategies = response.data;        
      })
      .catch((error) => {
        console.log(error);
        this.errored = true;
      })
      .finally();      
  },
   watch: {    
    strategies(){
      this.upcoming_loadingState=false;
    },    
    
    currentPage() {
      this.changedPage();
    },
  },
   
  methods: {
    async showStats(fixture) {
      this.show_fixture_details = true;
      this.selected_fixture = fixture;
    },

    closeStats() {
      this.show_fixture_details = false;
      this.selected_fixture = null;
    },

    async excludeLeague(league_id) {
      const strategy = await this.$axios.$post(
        "/user/strategies/exclude-league/" + this.strategies[this.s_index]._id,
        { league_id }
      );
      var index = this.strategies[this.s_index].leagues.indexOf(league_id);
      if (index !== -1) {
        this.strategies[this.s_index].leagues.splice(index, 1);
      }
    },

    async promptExcludeLeague(league_id, index) {
      this.showPrompt = true;
      this.exclude_league_id = league_id;
      this.s_index = index;
    },

    getFlag(iso) {
      this.upcoming_loadingState = false;
      return iso ? "flag-icon-" + iso : "flag-icon-un";
    },

    activeViewLess: function (strategy_index) {
      const idx = strategy_index;
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
      this.date_viewMode = true;
      this.strategies[index]["fixtures"] = [];
      this.viewMore(index);
    },

    /**
     * function that called when page is changed
     *
     */
    changedPage:function() {
      // this.loading = true;
      this.upcoming_loadingState = true;
      this.strategies = [];      
      //get strategies by user_id and page
      this.$axios
        .get("user/upcoming/fetch_strategies/"+ this.currentPage+'/'+this.$moment(this.selected_date).unix())
      .then((response) => {
        console.log('response.data=',response.data);
        this.strategies = response.data;
      })
      .catch((error) => {
        console.log(error);
        this.errored = true;
      })
      .finally(() => this.upcoming_loadingState = false);
    },

    /**
     * function for view less
     * @param{Number} strategy_id
     */
    viewLess: function (strategy_index) {
      const idx = strategy_index;      
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
      this.loading_fixtures = strategy_index;
      if(!this.date_viewMode){                
        this.strategies[strategy_index]["view_count"] =
        this.strategies[strategy_index]["view_count"] + 1;
      }      
      //get index by strategy_id                      
      // get data by strategy_id and view_count.
      this.$axios
        .post("user/upcoming/fixtures", {
          strategy_id: this.strategies[strategy_index]._id,
          view_count: this.strategies[strategy_index]["view_count"],
          date: this.$moment(this.strategies[strategy_index]['selected_date']).unix()
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
        .finally(() => (this.loading_fixtures = null, this.date_viewMode = false)); //deactive loading        
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
      font-size: 30px;
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

@media screen and (min-width: $lg) {
  .is_hit {
    border-left: 4px solid $primary;
  }
  .not_hit {
    border-left: 4px solid $red;
  }
}
@media screen and (max-width: $lg) {
  .is_hit {
    border-top: 4px solid $primary;
  }
  .not_hit {
    border-top: 4px solid $red;
  }
}

</style>
