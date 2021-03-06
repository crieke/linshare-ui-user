/**
 * Authentication service
 * @namespace LinShare.authentication
 */
(function() {
  'use strict';
  angular
    .module('linshare.authentication')
    .factory('authenticationRestService', authenticationRestService);

  authenticationRestService.$inject = ['_', '$cookies', '$location', '$log', '$q', '$window', 'authService',
    'lsAppConfig', 'Restangular', 'ServerManagerService'
  ];

  /**
   * @namespace authenticationRestService
   * @desc Service to interact with User Authentication object by REST
   * @memberOf Linshare.authentication
   */
  function authenticationRestService(_, $cookies, $location, $log, $q, $window, authService, lsAppConfig, Restangular,
    ServerManagerService) {
    var
      deferred = $q.defer(),
      handler = ServerManagerService.responseHandler,
      restUrl = 'authentication',
      service = {
        checkAuthentication: checkAuthentication,
        getCurrentUser: getCurrentUser,
        login: login,
        logout: logout,
        version: version
      };

    return service;

    ////////////

    /**
     * @name checkAuthentication
     * @desc Check user authorization
     * @param {boolean} hideError - Determine if the error shall be hidden to the user
     * @param {boolean} ignoreAuthModule - Determine if the auth module should be ignored
     * @memberOf Linshare.authentication.authenticationRestService
     */
    function checkAuthentication(hideError, ignoreAuthModule) {
      $log.debug('AuthenticationRestService : checkAuthentication');
      return handler(Restangular.all(restUrl).withHttpConfig({
          ignoreAuthModule: ignoreAuthModule
      }).customGET('authorized'), undefined, hideError)
      .then(function(userLoggedIn) {
        deferred.resolve(userLoggedIn);
        return (userLoggedIn);
      }).catch(function(error) {
        deferred.reject(error);
        $log.debug('current user not authenticated', error);
        return error;
      });
    }

    /**
     * @name getCurrentUser
     * @desc get the current user connected
     * @return {Promise}
     * @memberOf Linshare.authentication.authenticationRestService
     */
    function getCurrentUser() {
      $log.debug('AuthenticationRestService : getCurrentUser');
      return deferred.promise;
    }

    /**
     * @name login
     * @desc Login system of the App
     * @param {string} login - Login of the user
     * @param {string} password - Password of the user
     * @return {Promise} server response
     * @memberOf Linshare.authentication.authenticationRestService
     */
    function login(login, password) {
      deferred = $q.defer();
      $log.debug('AuthenticationRestService : login');
      /* globals Base64 */
      handler(Restangular.all(restUrl).withHttpConfig({
        ignoreAuthModule: true
      }).customGET('authorized', {}, {
        Authorization: 'Basic ' + Base64.encode(login + ':' + password)
      })).then(function(user) {
        authService.loginConfirmed(user);
        deferred.resolve(user);
      }).catch(function(error) {
        deferred.reject(error);
      });

      return deferred.promise;
    }

    /**
     * @name logout
     * @desc Logout system of the App
     * @memberOf Linshare.authentication.authenticationRestService
     */
    function logout() {
      $log.debug('AuthenticationRestService : logout');

      $q.all([
        ServerManagerService.getHeaders(),
        handler(Restangular.all(restUrl).withHttpConfig().customGET('logout'))
      ])
      .then(function(promises) {
        var
          headers = promises[0],
          headersLogoutUrl = headers['x-linshare-post-logout-url'],
          location;

        if (headersLogoutUrl) {
          if (_.startsWith(headersLogoutUrl, 'http')) {
            $log.debug('AuthenticationRestService : logout - Using X-LINSHARE-POST-LOGOUT-URL for redirection');
            location = headersLogoutUrl;
          }
        }
        if (_.isUndefined(location) && lsAppConfig.postLogoutUrl) {
          $log.debug('AuthenticationRestService : logout - Using lsAppConfig.postLogoutUrl for redirection');
          location = lsAppConfig.postLogoutUrl;
        }
        if (_.isUndefined(location)) {
          $log.debug('AuthenticationRestService : logout - Using current location root for redirection');
          var absUrl = $location.absUrl();
          location = absUrl.split('#')[0];
        }

        authService.loginCancelled();
        $log.debug('Authentication logout: success');
        $window.location.href = location;
      }).catch(function(error) {
        $log.error('Authentication logout : failed', error.status);
      });
    }

    /**
     * @name version
     * @desc Get the version of the core API
     * @return {Promise} server response
     * @memberOf Linshare.authentication.authenticationRestService
     */
    function version() {
      $log.debug('AuthenticationRestService : version');
      return handler(Restangular.one(restUrl, 'version').get());
    }
  }
})();
