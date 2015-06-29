/**
 * Module dependencies
 */

var _ = require('lodash');

module.exports = function generateAdCombinations() {
    arr = _.reduce(arguments, function(a, b) {
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
            });
        }));
    }, [ [] ]);

    a = [];
    arr.forEach(function(n) {
      a.push(_.zipObject(['title', 'caption', 'image'], n))
    })
    return a;
};
