module.exports = {


  friendlyName: 'get-campaign-details',


  description: 'get data about a specific ad set.',


  extendedDescription: 'get data about a specific ad set',
  cacheable: true,

  inputs: {
    adCampaignId: {
      example: '31231321312',
      description: 'an adcampaign is an ad set',
      required: true
    },

    accessToken: {
      example: 'CAACEdEose0cBACBhZA7DJbYapwM7oZBt1EWhPiGqibBZAZAZCZCe6IOkfDRzrs1jyZCS93zSuj9GaNQQtxbny0jeSCqyBNaQUl3ocDiD3lO4GSboFm5B7NogSHFzTGYw0rdpndDKolQcfsS5nYeYwZAIKXF1WPzgGaGxNIDh36oZBHuazcN3WSNmL9jGyO9YmYlZBmZCcigBuMFvtXj4XlzNWyb',
      description: 'this is the facebook issued access token for a given user and app pair',
      required: true
    },
  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'The Facebook API returned an error (i.e. a non-2xx status code)',
    },


    success: {

      description: 'Here are the ad sets for the inputted campaign',
    },

  },


  fn: function (inputs,exits) {
    // fetch ad set information
    var async = require('async');
    var doJSONRequest = require('../lib/do-request');

    // GET ad accounts/ and send the api token as a header
    doJSONRequest({
      method: 'get',
      url: ['/v2.3/', inputs.adCampaignId ].join(""),
      data: {
        'access_token': inputs.accessToken,
        'fields' : 'targeting,id,daily_budget,campaign_status,insights{ctr,reach, spend, clicks}'
      },
      headers: {},
    },

    function (err, responseBody) {
      if (err) { return exits.error(err); }
      rb = responseBody;
      var countries  = require('country-data').countries;
      var lookup  = require('country-data').lookup;

      // PARSE GENDER !
      if (typeof rb.targeting.gender == 'undefined'){
        rb.targeting.gender = 'all';
      } else if (rb.targeting.gender == 1) {
        rb.targeting.gender = 'male';
      } else {
        rb.targeting.gender = 'female';
      }

      locationsArray =[];
      locations = rb.targeting.geo_locations;
      if (typeof rb.targeting.geo_locations !== 'undefined'){
        if (typeof locations.countries !== 'undefined') {
          countryList = []
          for (i = 0; i < locations.countries.length; i++) {
            tempCountry = lookup.countries({
              alpha2 : locations.countries[i]
            })[0].name
            locationsArray.push(tempCountry);
          }
        }

        if (typeof locations.cities !== 'undefined') {
          cleanedList = [];
          for ( var i = 0; i < locations.cities.length; i++) {
            locationsArray.push(locations.cities[i].name);
          }
        }
        if (typeof locations.regions !== 'undefined') {
          cleanedList = [];
          for ( var i = 0; i < locations.regions.length; i++) {
            locationsArray.push(locations.regions[i].name);
          }
        }
      }

      interestsArray =[]
      if (typeof rb.targeting.interests !== 'undefined'){
        rb.targeting.interests.forEach(function(value) {
          interestsArray.push(value.name);
        });
      }

      var newArray = [];
      newArray.push({
        'id' : rb.id,
        'status' : rb.campaign_status,
        "targeting" : {
          'age_min' : rb.targeting.age_min,
          'age_max' : rb.targeting.age_max,
          'gender'  : rb.targeting.gender,
          'interests' : interestsArray,
          'locations' : locationsArray,
          }
      })

      if (typeof rb.insights == 'undefined'){
        return exits.error({'error' : 'campaign has not run yet'})
      }

      newArray.push({
        'clicks' : rb.insights.data[0].clicks || {},
        'daily_budget' : rb.daily_budget || {},
        'people' : rb.insights.data[0].reach || {},
        'ctr' : rb.insights.data[0].ctr || {}
      })

      if (rb.campaign_status == "ACTIVE" && rb.daily_budget > 0) {
        newArray[0].status = 'ACTIVE';
      } else {
        newArray[0].status = 'INCREASE DAILY SPEND TO RESUME';
      }
      resultJson = { "adset" : newArray[0] };

      // fetch all ads for the ad set
      doJSONRequest({
        method: 'get',
        url: ['/v2.3/', resultJson.adset.id, '/adgroups' ].join(""),
        data: {
         'access_token': inputs.accessToken,
         'fields' : "creative,adgroup_status,insights{cpc,impressions,clicks}"
        },
        headers: {},
      },

        function (err, response) {
          if (err) { return exits.error(err); }

          // sort by performance


          response.data.sort(function(a,b){
            return b.insights.data[0].impressions - a.insights.data[0].impressions;
          })

          cleanedResponse = [];
          for (i = 0; i < response.data.length; i++)
            cleanedResponse.push({
              "id": response.data[i].id,
              "status" : response.data[i].adgroup_status,
              "cpc" : response.data[i].insights.data[0].cpc,
              "clicks" : response.data[i].insights.data[0].clicks,
              "impressions" : response.data[i].insights.data[0].impressions
            })
          resultJson.ads = cleanedResponse;


      // variables
      // counter for the next async.each function
      var countChoco = 0;
      arrayAds = [];
      // create the array of ad ids and their index in the resultJson so we can fetch more data on each, and return the data to the correct position in the resultJson
      for (var i = 0; i<resultJson.ads.length; i++){
        arrayAds.push({ "id": resultJson.ads[i].id, "index" : i } );
      }

      async.each(arrayAds, function(ad, callbacktwo){
        function callbacktwo(result){
          return exits.success(result);
        }
        doJSONRequest({
          method: 'get',
          url: ['/v2.2/', ad.id ].join(""),
          data: {
            'access_token': inputs.accessToken,
            'fields' : 'adcreatives{image_url,object_story_spec}'
          },
          headers: {},
          },
          function (err, responseBody) {
            if (err) { return exits.error(err); }
            rb = responseBody.adcreatives.data;
            resultJson.ads[ad.index].image_url = rb[0].image_url;
            resultJson.ads[ad.index].title = rb[0].object_story_spec.link_data.name;
            resultJson.ads[ad.index].tagline = rb[0].object_story_spec.link_data.message;

            countChoco++;
            if (countChoco == arrayAds.length) {
              callbacktwo(resultJson);
            }
          }
        ) // end of doJSONRequest
      }) // end of async each
    }) // end function (err, responseBody)
          }) // end of doJsonRequest()
  } // end fn function
} // end of script
