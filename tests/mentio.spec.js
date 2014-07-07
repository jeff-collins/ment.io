'use strict';

describe('mentio-menu', function () {
    var searchSpy, mentioScope, $scope, $document;

    beforeEach(module('mentio', function($provide) {
        $provide.value('$log', console);
    }));

    beforeEach(inject(function ($compile, $rootScope, $templateCache, _$document_) {
        $document = _$document_;

        $templateCache.put('/people-mentions.tpl', 
                '<div>' +
                '<li mentio-menu-item="person" ng-repeat="person in items">' +
                '   <img ng-src="{{person._source.imageUrl}}"><p class="name">{{person._source.name}}</p>' +
                '   <p>{{person._source.bio.substring(0,30)}}</p>' +
                '</li>' +
                '</ul>' +
                '</div>');

        $scope = $rootScope.$new();

        var mentionableTextArea = angular.element('<div><textarea mentio ' +
            'ng-model="textArea" id="textArea" ng-trim="false"></textarea>' +
            '<span>Mentioned: {{typedTerm}}</span></div>');
        $compile(mentionableTextArea)($scope);
        $document[0].body.appendChild(mentionableTextArea[0]);

        var mentionMenu = angular.element('<mentio-menu mentio-trigger-char="\'@\'" ' +
            'mentio-for="\'textArea\'" mentio-items="mockItems"></mentio-menu>');
        $compile(mentionMenu)($scope);
        $document[0].body.appendChild(mentionMenu[0]);

        $scope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        // but there is no real way access the menu scope and rule scope
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        searchSpy = spyOn(mentioScope.triggerCharMap['@'], 'search');
        searchSpy.andCallThrough();
    }));

    it('should show mentio for valid search term', function () {
        expect(mentioScope.isActive()).toBeFalsy();

        $scope.mockItems = [
            {label: 'test1'}, 
            {label: 'test2'}
        ];

        mentioScope.query('@', 'test');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test' });
        expect(mentioScope.isActive()).toBeTruthy();
        expect(mentioScope.triggerCharMap['@'].isVisible()).toBeTruthy();
    });

});