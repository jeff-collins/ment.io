'use strict';

angular.module('mentio-demo', ['mentio', 'ngRoute'])

    .config(function($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'examples.html',
                tab: 'examples',
                title: 'Ment.io examples'
            })
            .when('/documentation', {
                templateUrl: 'documentation.html',
                tab: 'documentation',
                title: 'Ment.io Documentation'
            })
            .when('/examples', {
                templateUrl: 'examples.html',
                tab: 'examples',
                title: 'Ment.io examples'
            });
    })

    .run(function ($rootScope) {
        $rootScope.$on('$routeChangeSuccess', function (event, current) {
            if (current.$$route) {
                $rootScope.title = current.$$route.title;
            }
        });
    })

    .controller('mentio-demo-ctrl', function ($scope, $http, $q) {

        $scope.macros = {
            'brb': 'Be right back',
            'omw': 'On my way',
            '(smile)' : '<img src="http://a248.e.akamai.net/assets.github.com/images/icons/emoji/smile.png"' +
                ' height="20" width="20">'
        };

        $scope.searchProducts = function(term) {
            var prodList = [];

            return $http.get('productdata.json').then(function (response) {
                angular.forEach(response.data, function(item) {
                    if (item._source.title.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                        prodList.push(item);
                    }
                });

                $scope.products = prodList;
                return $q.when(prodList);
            });
        };

        $scope.searchPeople = function(term) {
            var peopleList = [];
            return $http.get('peopledata.json').then(function (response) {
                angular.forEach(response.data, function(item) {
                    if (item._source.name.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                        peopleList.push(item);
                    }
                });
                $scope.people = peopleList;
                return $q.when(peopleList);
            });
        };

        $scope.getProductText = function(item) {
            return '[~<strong>' + item._sku + '</strong>]';
        };

        $scope.getProductTextRaw = function(item) {
            return '#' + item._sku;
        };

        $scope.getPeopleText = function(item) {
            return '[~<i>' + item._source.name + '</i>]';
        };

        $scope.getPeopleTextRaw = function(item) {
            return '@' + item._source.name;
        };
        $scope.theTextArea = 'Type an @ or # and some text';
    })

    .directive('contenteditable', ['$sce', function($sce) {
        return {
            restrict: 'A', // only activate on element attribute
            require: '?ngModel', // get a hold of NgModelController
            link: function(scope, element, attrs, ngModel) {
                function read() {
                    var html = element.html();
                    // When we clear the content editable the browser leaves a <br> behind
                    // If strip-br attribute is provided then we strip this out
                    if (attrs.stripBr && html === '<br>') {
                        html = '';
                    }
                    ngModel.$setViewValue(html);
                }

                if(!ngModel) return; // do nothing if no ng-model

                // Specify how UI should be updated
                ngModel.$render = function() {
                    element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
                };

                // Listen for change events to enable binding
                element.on('blur keyup change', function() {
                    scope.$apply(read);
                });
                read(); // initialize

                // Write data to the model
            }
        };
    }])
    .filter('unsafe', function($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    })
    .filter('words', function () {
        return function (input, words) {
            if (isNaN(words)) {
                return input;
            }
            if (words <= 0) {
                return '';
            }
            if (input) {
                var inputWords = input.split(/\s+/);
                if (inputWords.length > words) {
                    input = inputWords.slice(0, words).join(' ') + '\u2026';
                }
            }
            return input;
        };
    });
