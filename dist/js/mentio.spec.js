'use strict';

describe('mentio-menu directive', function () {
    var $compile, $rootScope;

    beforeEach(module('mentio'));

    beforeEach(inject(function (_$compile_, _$rootScope_) {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
    }));

    it('should search on items', function () {
        var element, $renderScope, $scope, searchSpy, mockItems;

        mockItems = [
            {
                id: 1
            },
            {
                id: 2
            }
        ];

        $renderScope = $rootScope.$new();

        $renderScope.search = function (term) {
            if (term === 'foo') {
                $renderScope.items = mockItems;
            } else {
                $renderScope.items = [];
            }
        };

        searchSpy = spyOn($renderScope, 'search');
        searchSpy.andCallThrough();

        element = $compile('<div mentio-menu bind="content" items="items"' +
            'search="search(term)" select="select(item)" ng-model="menuContent">')($renderScope);

        $renderScope.$digest();

        $scope = element.isolateScope();

        // TODO: move getAtMentionInfo() into a service so it can be mocked
        $scope.atVar = 'foo';
        expect($scope.hide).toBeTruthy();
        $scope.query();

        $renderScope.$digest();

        expect(searchSpy).toHaveBeenCalledWith('foo');
        expect($scope.items).toEqual(mockItems);
        expect($scope.hide).toBeFalsy();


        /*
         * The menu should not display when the search returns no items
         */
        $scope.atVar = 'bar';
        $scope.query();

        $renderScope.$digest();

        expect(searchSpy.callCount).toBe(2);
        expect($scope.items).toEqual([]);
        expect($scope.hide).toBeTruthy();
    });
});