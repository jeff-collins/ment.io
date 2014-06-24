'use strict';

describe('mentio-menu', function () {
    var $compile, $rootScope, $templateCache, ruleScope, menuScope, searchSpy, mockItems;

    beforeEach(module('mentio'));

    beforeEach(inject(function (_$compile_, _$rootScope_, _$templateCache_) {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $templateCache = _$templateCache_;

        $templateCache.put('/people-mentions.tpl',
                '<div>' +
                '<li mentio-menu-item="person" ng-repeat="person in items">' +
                '   <img ng-src="{{person._source.imageUrl}}"><p class="name">{{person._source.name}}</p>' +
                '   <p>{{person._source.bio.substring(0,30)}}</p>' +
                '</li>' +
                '</ul>' +
                '</div>');

        var $scope = $rootScope.$new();
        var mentionableTextArea = angular.element('<div><textarea ng-model="textArea" ng-trim="false"></textarea>' +
            '<span>Mentioned: {{atVar}}</span></div>');

        $compile(mentionableTextArea)($scope);

        var mentionMenu = angular.element('<mentio-menu bind="textArea" ng-model="atVar2" ng-cloak>' +
            '<mentio-rule trigger-char="@" items="people" template="/people-mentions.tpl" ' +
            'search="searchPeople(term)" select="getPeopleTextRaw(item)"></mentio-rule>' +
            '</mentio-menu>');

        $compile(mentionMenu)($scope);
        $scope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        // but there is no real way access the menu scope and rule scope
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.hide) {
                ruleScope = cs;
            }
            if(cs.query) {
                menuScope = cs;
            }
        }

        mockItems = [ { id: 1 }, { id: 2 } ];

        ruleScope.search = function (object) {
            if (object.term === 'foo') {
                ruleScope.items = mockItems;
            } else {
                ruleScope.items = [];
            }
        };

        searchSpy = spyOn(ruleScope, 'search');
        searchSpy.andCallThrough();
    }));

    it('should show mentio for valid search term', function () {
        expect(ruleScope.hide).toBeTruthy();

        menuScope.atVar = 'foo';
        menuScope.query('@');
        menuScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'foo' });
        expect(ruleScope.items).toEqual(mockItems);
        expect(ruleScope.hide).toBeFalsy();
    });

    it('should hide mentio for invalid search term', function () {
        expect(ruleScope.hide).toBeTruthy();

        menuScope.atVar = 'fox';
        menuScope.query('@');
        menuScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'fox' });
        expect(ruleScope.items).toEqual([]);
        expect(ruleScope.hide).toBeTruthy();
    });
});