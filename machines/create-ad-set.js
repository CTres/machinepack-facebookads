module.exports = {
  friendlyName: 'create-ad-set',


  description: 'create an ad set and the creative',


  extendedDescription: 'return a paused campaign',
  cacheable: true,

  inputs: {
    adAccount: {
      example: "12314231231232",
      description: 'facebook user ad account',
      required: true,
    },
    fbUserId: {
      example: "509503",
      description: 'facebook user id',
      required: true,
    },
    campaignGroupId: {
      example: "3213213124",
      description: 'woo campaign group id',
      required: true,
    },
    fbPageId: {
      example: "2313212421",
      description: 'fb page for the ad',
      required: true,
    },
    accessToken: {
      example: 'CAACEdEose0cBACBhZA7DJbYapwM7oZBt1EWhPiGqibBZAZAZCZCe6IOkfDRzrs1jyZCS93zSuj9GaNQQtxbny0jeSCqyBNaQUl3ocDiD3lO4GSboFm5B7NogSHFzTGYw0rdpndDKolQcfsS5nYeYwZAIKXF1WPzgGaGxNIDh36oZBHuazcN3WSNmL9jGyO9YmYlZBmZCcigBuMFvtXj4XlzNWyb',
      description: 'this is the facebook issued access token for a given user and app pair',
      required: true,
    },
    images: {
      example: ["1jk3l21", "1231231kjld123"],
      description: 'an array of image_hashes returned by facebook',
      required: true,
    },
    titles: {
      example: ["this is a sample title", "second sample title"],
      description: 'an array of title strings',
      required: true,
    },
    captions: {
      example: ["test caption","second test caption"],
      description: 'an array of caption strings',
      required: true,
    },
    url: {
      example: "http://www.example.com",
      description: 'url target of the ad campaign',
      required: true,
    },
    gender: {
      example: 1,
      description: 'integer',
      required: true,
    },
    locations: {
      example: {},
      description: 'a dictionary of locations',
      required: true,
    },
    interests: {
      example: [],
      description: 'an array of interests as strings',
      required: true,
    },
    age_min: {
      example: "18",
      description: 'minimum age',
      required: true,
    },
    age_max: {
      example: "19",
      description: 'maximum age',
      required: true,
    },
  },


  defaultExit: 'success',

  exits: {

    error: {
      description: 'The Facebook API returned an error (i.e. a non-2xx status code)',
    },

    success: {
      description: 'campaign is now created',
    },

  },

  fn: function (inputs,exits) {
    // VARIABLES
    var doJSONRequest = require('../lib/do-request');
    var async = require('async');
    var generateAdCombinations = require('../lib/generateAdCombinations');

    // VARIABLE CLEANING
    // prefix ad account with act_
    account = ['act_', inputs.adAccount].join("");
    if (inputs.gender == 0) {
      inputs.gender = [];
    } else if (inputs.gender == 1) {
      inputs.gender = [1];
    } else {
      inputs.gender = [2];
    }

    // create the AD SET
    return doJSONRequest({
      method: 'post',
      url: ['/v2.3/', account, '/adcampaigns' ].join(""),
      data: {
        'name' : ['AdRocket', ' - ', Date.now()].join(""),
        'campaign_group_id' : inputs.campaignGroupId,
        'campaign_status' : 'PAUSED',
        'bid_type' : 'ABSOLUTE_OCPM' ,
        'bid_info' : {"REACH" : 100, "CLICKS" : 200},
        'daily_budget' : '2500',
        // 'end_time': 0,
        'access_token': inputs.accessToken, // trying no start time to see if it goes immediately and no problems
        'targeting' : {
          'page_types': ['feed'],
          'geo_locations': inputs.locations,
          'genders': [2],
          'interests': inputs.interests,
          'age_min' : inputs.age_min,
          'age_max': inputs.age_max,
          },
      },
      headers: {},
    },

    function (err, responseBody) {
      if (err) { return exits.error(err); }


      // CREATE THE AD CREATIVES

      adSetId = responseBody.id;

      // GENERATING THE AD CREATIVE COMBINATIONS
      adCollection = generateAdCombinations(inputs.titles, inputs.captions, inputs.images)

      // CREATE AD CREATIVE AND AD AND ASSIGN TO AD SET
      ads = []; // store the AdIds in this array
      countChoco = 0;

      async.each(adCollection, function(creative, callback){
        function callback(result){
          if (err) { return exits.error(err);
          } else {
          return exits.success(result);
          }
        };

        return doJSONRequest({
          method: 'post',
          url: ['/v2.3/', account, '/adcreatives' ].join(""),
          data: {
            'access_token' : inputs.accessToken,
            'name' : 'test ad',
            'object_story_spec' : {
              "page_id" : inputs.fbPageId,
              "link_data" : {
                "message" : creative.title,
                "link" : inputs.url,
                "caption" : creative.caption,
                "image_hash" : creative.image,
              }
            }
          },
          headers: {},
        },
        // Response from Ad Set Creation
        function (err, responseBody) {
          if (err) {
            console.log(err);
            return exits.error(err); }
          // Variables
          adCreativeId = responseBody.id;

          // Now go create the ad, tying the ad creative together with the ad set

          return doJSONRequest({
            method: 'post',
            url: ['/v2.3/', account, '/adgroups' ].join(""),
            data: {
              'campaign_id': adSetId,
              'name' : ['AdRocket', '-', Date.now()].join(""),
              'access_token' : inputs.accessToken,
              'creative' : {
                'creative_id' : adCreativeId,
              }
            },
            headers: {},
          },
          function (err, responseBody) {
            if (err) {
              console.log(err);
              return exits.error(err); }

            countChoco++;
            ads.push(responseBody.id);
            if (countChoco == adCollection.length) {
              callback(ads);
            }
          })
        }
        )
      });
    })
  } // module exports
}
