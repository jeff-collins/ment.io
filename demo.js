(function () {

  'use strict';

angular.module('mentio-demo', ['mentio'])

	.controller('mentio-demo-ctrl', function ($scope, $http) {

			$scope.macros = {
          		'brb': 'Be right back',
          		'omw': 'On my way',
          		'(smile)' : '<img src="http://a248.e.akamai.net/assets.github.com/images/icons/emoji/smile.png" height="20" width="20">'
        	};

			$scope.searchProducts = function(term) {
				var prodList = [];
		        $http.get('productdata.json').success(function (response) {
		        	angular.forEach(response, function(item) {
		        		if (item._source.title.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
		            		prodList.push(item);		
		            	}
		            });
		            $scope.products = prodList;
		       	});
		    };
		  
			$scope.searchPeople = function(term) {
				var peopleList = [];
		        $http.get('peopledata.json').success(function (response) {
		        	angular.forEach(response, function(item) {
		        		if (item._source.name.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
		            		peopleList.push(item);		
		            	}
		            });
		            $scope.people = peopleList;
		       	});
		    };
		  
			$scope.getProductText = function(item) {
				return '[~<b>' + item._source.title + '</b>]';
		    };

			$scope.getProductTextRaw = function(item) {
				return '#' + item._source.title;
		    };

			$scope.getPeopleText = function(item) {
				return '[~<i>' + item._source.name + '</i>]';
		    };

			$scope.getPeopleTextRaw = function(item) {
				return '@' + item._source.name;
		    };
		    $scope.theTextArea = 'Type an @ or # and some text';
	}).directive('contenteditable', ['$sce', function($sce) {
	    return {
	      restrict: 'A', // only activate on element attribute
	      require: '?ngModel', // get a hold of NgModelController
	      link: function(scope, element, attrs, ngModel) {
	        function read() {
	          var html = element.html();
	          // When we clear the content editable the browser leaves a <br> behind
	          // If strip-br attribute is provided then we strip this out
	          if( attrs.stripBr && html === '<br>' ) {
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
	}
    ]);
})();