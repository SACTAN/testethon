angular.module('app.services', []).factory('Shipwreck', function($resource) {
  return $resource('http://192.168.0.103:9999/api/v1/shipwrecks/:id', { id: '@id' }, {
    update: {
      method: 'PUT'
    }
  });
}).service('popupService',function($window){
    this.showPopup=function(message){
        return $window.confirm(message);
    }
});
