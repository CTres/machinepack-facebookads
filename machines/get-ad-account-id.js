module.exports = {


  friendlyName: 'get ad account id',


  description: 'get ad account ids for a given user with an access token',


  extendedDescription: 'retrieves the ad acount id for a given user',
  cacheable: true,

  inputs: {
    fbUserId: {
      example: '509501',
      description: 'facebook user id',
      required: true
    },

    accessToken: {
      example: 'CAACEdEose0cBACBhZA7DJbYapwM7oZBt1EWhPiGqibBZAZAZCZCe6IOkfDRzrs1jyZCS93zSuj9GaNQQtxbny0jeSCqyBNaQUl3ocDiD3lO4GSboFm5B7NogSHFzTGYw0rdpndDKolQcfsS5nYeYwZAIKXF1WPzgGaGxNIDh36oZBHuazcN3WSNmL9jGyO9YmYlZBmZCcigBuMFvtXj4XlzNWyb',
      description: 'this is the facebook issued access token for a given user and app pair',
      required: true
    }
  },


  defaultExit: 'success',


  exits: {

    success: {
      description: 'This is the top ad account associated with the user.',
    },

    error: {
      description: 'The Facebook API returned an error (i.e. a non-2xx status code)',
    },
  },


  fn: function (inputs,exits) {
    err = "forced error";
    return exits.error(err);
  }
};
