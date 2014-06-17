(function () {

  'use strict';

angular.module('mentio-demo', ['mentio'])

	.controller('mentio-demo-ctrl', function ($scope, $http) {
  

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
		  
			$scope.getText = function(item) {
				return '[~<b>' + item._source.title + '</b>]';
		    };

			$scope.getTextRaw = function(item) {
				return '@' + item._source.title;
		    };

		    $scope.theTextArea = 'Type an @ and some text';
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