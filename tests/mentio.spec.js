'use strict';

describe('mentio-menu', function () {
    var searchSpy, $scope, mentioScope, $compile, $document, mentioUtilService, $window, $timeout;

    beforeEach(module('mentio', function($provide) {
        $provide.value('$log', console);
    }));

    beforeEach(inject(function (_$compile_, $rootScope, $templateCache, _$document_, _$window_, mentioUtil, _$timeout_) {
        $document = _$document_;
        $compile = _$compile_;
        $window = _$window_;
        $timeout = _$timeout_;
        mentioUtilService = mentioUtil;

        $templateCache.put('/people-mentions.tpl',
                '<div>' +
                '<li mentio-menu-item="person" ng-repeat="person in items">' +
                '   <img ng-src="{{person.imageUrl}}"><p class="name">{{person.name}}</p>' +
                '   <p>{{person.bio.substring(0,30)}}</p>' +
                '</li>' +
                '</ul>' +
                '</div>');

        $scope = $rootScope.$new();

        while ($document[0].body.childNodes.length > 0) {
            $document[0].body.removeChild($document[0].body.childNodes[0]);
        }


    }));

    function compareItems(items, mentioMenuScope) {
        var childCount = 0;
        for(var cs = mentioMenuScope.$$childHead; cs; cs = cs.$$nextSibling) {
            expect(cs.item).toEqual(items[childCount])
            childCount++;
        }

        expect(childCount).toEqual(items.length);
    }

    function createMentio(scope, attr) {
        var mentionableTextArea = angular.element('<div><textarea mentio ' +
            'ng-model="textArea" id="textArea" ng-trim="false"></textarea>' +
            '<span>Mentioned: {{typedTerm}}</span></div>');

        // Apply additional attributes to mentio
        if (attr) {
            angular.element(mentionableTextArea.children()[0]).attr(attr);
        }

        $compile(mentionableTextArea)(scope);
        $document[0].body.appendChild(mentionableTextArea[0]);

        scope.$apply();
    }

    function createMentioMenu(scope) {
        scope.mockItemsSource = [
            {label: 'test1'},
            {label: 'test2'}
        ];

        scope.search = function(term) {
            var results = [];
            angular.forEach(scope.mockItemsSource, function(item) {
                if (item.label.toUpperCase().indexOf(term.toUpperCase()) >= 0) {
                    results.push(item);
                }
            });
            scope.mockItems = results;
        };

        var mentioMenu = angular.element('<mentio-menu mentio-trigger-char="\'@\'" ' +
            'mentio-for="\'textArea\'" mentio-search="search(term)" mentio-items="mockItems"></mentio-menu>');
        $compile(mentioMenu)(scope);
        $document[0].body.appendChild(mentioMenu[0]);

        scope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        searchSpy = spyOn(mentioScope.triggerCharMap['@'], 'search');
        searchSpy.andCallThrough();
    }

    it('should show default menu', function () {
        var textarea = angular.element('<textarea mentio mentio-items="mockItems" ng-trim="false">123</textarea>');
        $compile(textarea)($scope);
        $document[0].body.appendChild(textarea[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        $scope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        searchSpy = spyOn(mentioScope.triggerCharMap['@'], 'search');
        searchSpy.andCallThrough();

        expect(mentioScope.isActive()).toBeFalsy();

        mentioScope.query('@', 'test');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test' });
        expect(mentioScope.isActive()).toBeTruthy();
        expect(mentioScope.triggerCharMap['@'].isVisible()).toBeTruthy();
        expect(mentioScope.getActiveMenuScope()).toEqual(mentioScope.triggerCharMap['@']);

        compareItems($scope.mockItems, mentioScope.triggerCharMap['@']);
    });

    it('should show mentio for valid search term', function () {
        createMentio($scope);

        createMentioMenu($scope);

        expect(mentioScope.isActive()).toBeFalsy();

        mentioScope.query('@', 'test');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test' });
        expect(mentioScope.isActive()).toBeTruthy();
        expect(mentioScope.triggerCharMap['@'].isVisible()).toBeTruthy();

        compareItems($scope.mockItems, mentioScope.triggerCharMap['@']);
    });

    it('should show mentio for valid partially matching search term', function () {
        createMentio($scope);

        createMentioMenu($scope);

        expect(mentioScope.isActive()).toBeFalsy();

        mentioScope.query('@', 'test1');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test1' });
        expect(mentioScope.isActive()).toBeTruthy();
        expect(mentioScope.triggerCharMap['@'].isVisible()).toBeTruthy();

        compareItems($scope.mockItems, mentioScope.triggerCharMap['@']);
    });

    it('should trim search term by default', function() {
        createMentio($scope);

        createMentioMenu($scope);

        mentioScope.query('@', 'test1 ');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test1' });
    });

    it('should not trim search term if disabled in the attributes', function() {
        createMentio($scope, {
            "mentio-trim-term": "false"
        });

        createMentioMenu($scope);

        mentioScope.query('@', 'test1 ');
        mentioScope.$apply();

        expect(searchSpy).toHaveBeenCalledWith({ term : 'test1 ' });
    });

    it('should have a working isFirstItemActive method', function() {
        createMentio($scope);
        createMentioMenu($scope);

        mentioScope.query('@', '');
        mentioScope.$apply();

        var menu = mentioScope.getActiveMenuScope();
        expect(menu.isFirstItemActive()).toBe(true);

        menu.activateNextItem();
        expect(menu.isFirstItemActive()).toBe(false);
    });

    it('should have a working isLastItemActive method', function() {
        createMentio($scope);
        createMentioMenu($scope);

        mentioScope.query('@', '');
        mentioScope.$apply();

        var menu = mentioScope.getActiveMenuScope();
        expect(menu.isLastItemActive()).toBe(false);

        menu.activatePreviousItem();
        expect(menu.isLastItemActive()).toBe(true);
    });

    it('should have a working adjustScroll method', function() {
        var menuItemsListEl = {
            scrollTop: 0,
            scrollHeight: 90
        };

        var menuItemEl = {
            offsetHeight: 30
        };

        createMentio($scope);
        createMentioMenu($scope);

        mentioScope.query('@', '');
        mentioScope.$apply();

        var menuScope = mentioScope.getActiveMenuScope();

        menuScope.items = [{ label: 'test1' }, { label: 'test2' }, { label: 'test3' }];
        menuScope.$apply();

        var menuEl = document.querySelector('mentio-menu');
        var querySpy = spyOn(menuEl, 'querySelector').andCallFake(function(sel) {
            if (sel === 'ul') return menuItemsListEl;

            return menuItemEl;
        });

        // First item active
        menuScope.adjustScroll(1);
        expect(menuItemsListEl.scrollTop).toBe(0);

        // Second item active
        menuScope.activateNextItem();
        menuScope.adjustScroll(1);
        expect(menuItemsListEl.scrollTop).toBe(30);

        // Third item active
        menuScope.activateNextItem();
        menuScope.adjustScroll(1);
        expect(menuItemsListEl.scrollTop).toBe(90);

        // Previous (second) item active
        menuScope.activatePreviousItem();
        menuScope.adjustScroll(-1);
        expect(menuItemsListEl.scrollTop).toBe(60);
    });

    it('should return valid coordinates for textarea/input underline position', function () {

        var textarea = angular.element('<textarea ng-trim="false">123</textarea>');
        $compile(textarea)($scope);
        $document[0].body.appendChild(textarea[0]);

        $scope.$apply();

        var coordinates = mentioUtilService.getTextAreaOrInputUnderlinePosition(null, textarea[0], 2);

        expect(coordinates.top).toBeGreaterThan(0);
        expect(coordinates.left).toBeGreaterThan(0);

        var textarea = angular.element('<input type="text" ng-trim="false"></input>');
        $compile(textarea)($scope);
        $document[0].body.appendChild(textarea[0]);

        $scope.$apply();

        var coordinates = mentioUtilService.getTextAreaOrInputUnderlinePosition(null, textarea[0], 2);

        expect(coordinates.top).toBeGreaterThan(0);
        expect(coordinates.left).toBeGreaterThan(0);
    });

    it('should get text preceding current selection', function () {

        var textarea = angular.element('<textarea ng-trim="false">123</textarea>');
        $compile(textarea)($scope);
        $document[0].body.appendChild(textarea[0]);

        $scope.$apply();
        textarea[0].focus();

        var text = mentioUtilService.getTextPrecedingCurrentSelection();

        expect(text).toEqual('');

        textarea[0].selectionStart = 1;
        textarea[0].selectionEnd = 1;

        text = mentioUtilService.getTextPrecedingCurrentSelection();

        expect(text).toEqual('1');

        textarea[0].selectionStart = 2;
        textarea[0].selectionEnd = 2;

        text = mentioUtilService.getTextPrecedingCurrentSelection();

        expect(text).toEqual('12');

        var elem = angular.element('<div contenteditable>abc</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        mentioUtilService.selectElement(null, elem[0], [0], 1);
        text = mentioUtilService.getTextPrecedingCurrentSelection();

        expect(text).toEqual('a');
    });

    it('should get selection info', function () {

        var elem = angular.element('<div contenteditable>123</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        mentioUtilService.selectElement(null, elem[0], [0], 0);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(selectionInfo.path).toEqual([0]);
        expect(selectionInfo.offset).toEqual(0);

        mentioUtilService.selectElement(null, elem[0], [0], 1);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(selectionInfo.path).toEqual([0]);
        expect(selectionInfo.offset).toEqual(1);

        var elem = angular.element('<div contenteditable><span>1<span>2</span>3</span></div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        mentioUtilService.selectElement(null, elem[0], [0,0], 1);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(selectionInfo.path).toEqual([0,0]);
        expect(selectionInfo.offset).toEqual(1);

        mentioUtilService.selectElement(null, elem[0], [0,2], 1);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(selectionInfo.path).toEqual([0,2]);
        expect(selectionInfo.offset).toEqual(1);

        $scope.$apply();
    });

    it('should get caret location', function () {
        var elem = angular.element('<div contenteditable>1234</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();
        elem[0].focus();

        mentioUtilService.selectElement(null, elem[0], [0], 0);

        var coordinates = mentioUtilService.getContentEditableCaretPosition(null, 2);

        expect(coordinates.top).toBeGreaterThan(0);
        expect(coordinates.left).toBeGreaterThan(0);
    });

    it('should paste html', function () {

        var elem = angular.element('<div contenteditable>123</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        mentioUtilService.selectElement(null, elem[0], [0], 0);

        mentioUtilService.pasteHtml(null, 'hi', 1, 1);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(elem[0].innerHTML).toEqual('1hi23');
    });

    it('should pop up a menu', function () {
        var elem = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">@test</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        $scope.$apply();

        mentioUtilService.selectElement(null, elem[0], [0], 5);

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        mentioScope.query('@', 'test');
        mentioScope.$apply();

        expect(mentioScope.isActive()).toBeTruthy();
        var menuScope = mentioScope.triggerCharMap['@'];
        expect(menuScope.isVisible()).toBeTruthy();
        expect(menuScope.menuElement[0].getBoundingClientRect().top > 0);
        expect(menuScope.menuElement.css('display') === 'block');

        mentioScope.$destroy();
        $document[0].body.removeChild(elem[0]);

        var elem = angular.element('<textarea mentio mentio-items="mockItems" ng-trim="false">@test</textarea>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        elem[0].focus();
        elem[0].selectionStart = 5;
        elem[0].selectionEnd = 5;

        mentioScope.query('@', 'test');
        mentioScope.$apply();


        var menuScope = mentioScope.triggerCharMap['@'];
        expect(menuScope.menuElement[0].getBoundingClientRect().top > 0);
        expect(menuScope.menuElement.css('display') === 'block');
    });

    it('should be selected', function () {
        var elem = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">@test</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        $scope.$apply();

        mentioUtilService.resetSelection(null, elem[0], [0], 5);

        var selectionInfo = mentioUtilService.getContentEditableSelectedPath();

        expect(selectionInfo.selected).toEqual(elem[0]);
        expect(selectionInfo.path).toEqual([0]);
        expect(selectionInfo.offset).toEqual(5);

        elem = angular.element('<textarea mentio mentio-items="mockItems" ng-trim="false">@test</textarea>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        mentioUtilService.resetSelection(null, elem[0], [], 0);
        expect($document[0].activeElement).toEqual(elem[0]);
    });

    it('trigger text should be replaced', function () {
        var elem = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">123 @test abc</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        $scope.$apply();

        mentioUtilService.replaceTriggerText(null, elem[0], [0], 9, ['@'], 'foo');
        expect(elem.html()).toEqual('123 foo&nbsp; abc');

        elem = angular.element('<textarea mentio mentio-items="mockItems" ng-trim="false">123 @test abc</textarea>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        elem[0].selectionStart = 9;
        elem[0].selectionEnd = 9;

        mentioUtilService.replaceTriggerText(null, elem[0], [0], 9, ['@'], 'zzz');
        expect(elem.val()).toEqual('123 zzz  abc');
    });

    it('macro text should be replaced', function () {
        var elem = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">123 brb abc</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        var macros = {
            brb: 'Be right back',
            omw: 'On my way'
         };

        $scope.$apply();

        mentioUtilService.replaceMacroText(null, elem[0], [0], 7, macros, 'Be right back');
        expect(elem.html()).toEqual('123 Be right back abc');

        elem = angular.element('<textarea mentio mentio-items="mockItems" ng-trim="false">123 omw abc</textarea>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.$apply();

        elem[0].selectionStart = 7;
        elem[0].selectionEnd = 7;

        mentioUtilService.replaceMacroText(null, elem[0], [0], 7, macros, 'On my way');
        expect(elem.val()).toEqual('123 On my way abc');
    });

    it('should be visible after scroll', function () {
        var first = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">123 brb abc</div>');
        $compile(first)($scope);
        $document[0].body.appendChild(first[0]);

        for (var i = 0; i < 50; i++) {
            var elem = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">123 brb abc</div>');
            $compile(elem)($scope);
            $document[0].body.appendChild(elem[0]);
        }

        var last = angular.element('<div mentio contenteditable mentio-items="mockItems" ng-trim="false">123 brb abc</div>');
        $compile(last)($scope);
        $document[0].body.appendChild(last[0]);

        expect(last[0].getBoundingClientRect().top + last[0].getBoundingClientRect().height > $window.innerHeight)

        mentioUtilService.scrollIntoView(null, last);

        expect(last[0].getBoundingClientRect().top + last[0].getBoundingClientRect().height === $window.innerHeight)

        expect(first[0].getBoundingClientRect().top < 0)

        mentioUtilService.scrollIntoView(null, first);

        expect(first[0].getBoundingClientRect().top === 0)
    });

    it('should replace text', function () {
        var elem = angular.element('<div mentio contenteditable ng-model="test" mentio-macros="macros" ' +
            ' mentio-items="mockItems" ng-trim="false">@test</div>');
        $compile(elem)($scope);
        $document[0].body.appendChild(elem[0]);

        $scope.mockItems = [
            {label: 'test1'},
            {label: 'test2'},
            {label: 'test3'}
         ];

        $scope.macros = {
            brb: 'Be right back',
            omw: 'On my way'
         };

        $scope.$apply();

        mentioUtilService.selectElement(null, elem[0], [0], 5);

        // This is ugly, uses undocumented method to access the child scopes
        for(var cs = $scope.$$childHead; cs; cs = cs.$$nextSibling) {
            if(cs.triggerCharMap) {
                mentioScope = cs;
            }
        }

        $scope.test = "@test";
        mentioScope.query('@', 'test');
        mentioScope.$apply();

        var menuScope = mentioScope.triggerCharMap['@'];

        menuScope.selectItem($scope.mockItems[1]);

        mentioScope.$apply();

        expect(elem.html()).toEqual('@test2&nbsp;');

        $scope.test = "@test";
        elem.html('@test');
        mentioUtilService.selectElement(null, elem[0], [0], 5);
        mentioScope.query('@', 'test');
        mentioScope.$apply();

        var menuScope = mentioScope.triggerCharMap['@'];

        menuScope.selectActive();

        mentioScope.$apply();

        expect(elem.html()).toEqual('@test1&nbsp;');

        elem.html('brb');
        mentioUtilService.selectElement(null, elem[0], [0], 3);
        $scope.test = "brb2";
        mentioScope.$apply();
        $scope.test = "brb";
        mentioScope.$apply();

        $timeout.flush(300);
        expect(elem.html()).toEqual('Be right back');

    });

    it('should remove its menu when destroyed', function () {
        $scope.mockItems = [];
        var element = angular.element('<textarea ng-model="test" mentio mentio-items="mockItems" />');
        $compile(element)($scope);
        $scope.$apply();

        expect(document.getElementsByTagName('mentio-menu').length).toBe(1);
        $scope.$broadcast('$destroy');
        expect(document.getElementsByTagName('mentio-menu').length).toBe(0);
    });
});
