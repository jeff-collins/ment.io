'use strict';

describe('mentio-menu', function () {
    var $compile, $rootScope, $templateCache, mentionRuleScope, menuScope, searchSpy, mockItems;

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
        var mentionableTextAreaScope = mentionableTextArea.scope();
        mentionableTextAreaScope.$apply();

        var mentionMenu = angular.element('<mentio-menu bind="textArea" ng-model="atVar2" ng-cloak>' +
            '<mentio-rule trigger-char="@" items="people" template="/people-mentions.tpl" ' +
            'search="searchPeople(term)" select="getPeopleTextRaw(item)"></mentio-rule>' +
            '</mentio-menu>');

        $compile(mentionMenu)($scope);
        var mentionMenuScope = mentionMenu.scope();
        mentionMenuScope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.hide) {
                mentionRuleScope = cs;
            }
            if(cs.query) {
                menuScope = cs;
            }
        }

        mockItems = [ { id: 1 }, { id: 2 } ];

        mentionRuleScope.search = function (object) {
            if (object.term === 'foo') {
                mentionRuleScope.items = mockItems;
            } else {
                mentionRuleScope.items = [];
            }
        };

        searchSpy = spyOn(mentionRuleScope, 'search');
        searchSpy.andCallThrough();
    }));

    it('should show mentio for valid search term', function () {
        expect(mentionRuleScope.hide).toBeTruthy();

        menuScope.atVar = 'foo';
        menuScope.query('@');
        menuScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'foo' });
        expect(mentionRuleScope.items).toEqual(mockItems);
        expect(mentionRuleScope.hide).toBeFalsy();
    });

    it('should hide mentio for invalid search term', function () {
        expect(mentionRuleScope.hide).toBeTruthy();

        menuScope.atVar = 'fox';
        menuScope.query('@');
        menuScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'fox' });
        expect(mentionRuleScope.items).toEqual([]);
        expect(mentionRuleScope.hide).toBeTruthy();
    });
});