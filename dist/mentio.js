'use strict';

var NON_TRIGGER_CHAR = '2';

angular.module('mentio', [])
    .directive('mentio', ['mentioUtil', '$document', '$compile', '$log', '$timeout',
        function (mentioUtil, $document, $compile, $log, $timeout) {
        return {
            restrict: 'A',
            scope: {
                macros: '=mentioMacros',
                search: '&mentioSearch',
                select: '&mentioSelect',
                items: '=mentioItems',
                typedTerm: '=mentioTypedTerm',
                altId: '=mentioId',
                iframeElement: '=mentioIframeElement',
                requireLeadingSpace: '=mentioRequireLeadingSpace',
                selectNotFound: '=mentioSelectNotFound',
                noTriggerChar: '=mentioNoTriggerChar',
                ngModel: '='
            },
            controller: ["$scope", "$timeout", "$attrs", function($scope, $timeout, $attrs) {

                // The context object contains options for the service.
                // is also writable by the service if noTriggerChar is set.
                // he Service will write a triggerOFfset value that will be used
                // instead of scanning back for a trigger char.  All cases should
                // probably work this way.
                $scope.context = {
                    iframe: $scope.iframeElement,
                    noTriggerChar: $scope.noTriggerChar
                };

                $scope.query = function (triggerChar, triggerText) {
                    console.log('triggerChar=', triggerChar, $scope.triggerCharMap);
                    console.log('triggerText=', triggerText);
                    if ($scope.context) {
                        console.log('triggerOffset=', $scope.context.triggerOffset);
                    }
                    var remoteScope = $scope.triggerCharMap[triggerChar];
                    remoteScope.showMenu();

                    remoteScope.search({
                        term: triggerText.trim()
                    });

                    remoteScope.typedTerm = triggerText.trim();
                };

                $scope.defaultSearch = function(locals) {
                    var results = [];
                    angular.forEach($scope.items, function(item) {
                        if (item.label.toUpperCase().indexOf(locals.term.toUpperCase()) >= 0) {
                            results.push(item);
                        }
                    });
                    $scope.localItems = results;
                };

                $scope.bridgeSearch = function(termString) {
                    var searchFn = $attrs.mentioSearch ? $scope.search : $scope.defaultSearch;
                    searchFn({
                        term: termString
                    });
                };

                $scope.defaultSelect = function(locals) {
                    return $scope.defaultTriggerChar + locals.item.label;
                };

                $scope.bridgeSelect = function(itemVar) {
                    var selectFn = $attrs.mentioSelect ? $scope.select : $scope.defaultSelect;
                    return selectFn({
                        item: itemVar
                    });
                };

                $scope.setTriggerText = function(text) {
                    if ($scope.syncTriggerText) {
                        $scope.typedTerm = text.trim();
                    }
                };

                $scope.replaceText = function (text, hasTrailingSpace) {

                    console.log('$scope.replaceText', text, hasTrailingSpace);
                    mentioUtil.replaceTriggerText($scope.context, $scope.targetElement, $scope.targetElementPath,
                        $scope.targetElementSelectedOffset, $scope.triggerCharSet, text, $scope.requireLeadingSpace,
                        hasTrailingSpace);

                    $scope.hideAll();

                    if (!hasTrailingSpace) {
                        $scope.setTriggerText('');
                        console.log('replaceText delete triggerOffset');
                        delete $scope.context.triggerOffset;
                        if ($scope.isContentEditable()) {
                            console.log('setting bounce filter');
                            $scope.contentEditableMenuPasted = true;
                            var timer = $timeout(function() {
                                $scope.contentEditableMenuPasted = false;
                            }, 200);
                            $scope.$on('$destroy', function() {
                                $timeout.cancel(timer);
                            });
                        }
                        angular.element($scope.targetElement).triggerHandler('change');
                    } else {
                        console.log('not setting bounce filter');
                    }
                };

                $scope.hideAll = function () {
                    for (var key in $scope.triggerCharMap) {
                        if ($scope.triggerCharMap.hasOwnProperty(key)) {
                            $scope.triggerCharMap[key].hideMenu();
                        }
                    }
                };

                $scope.getActiveMenuScope = function () {
                    for (var key in $scope.triggerCharMap) {
                        if ($scope.triggerCharMap.hasOwnProperty(key)) {
                            if ($scope.triggerCharMap[key].visible) {
                                return $scope.triggerCharMap[key];
                            }
                        }
                    }
                    return null;
                };

                $scope.selectActive = function () {
                    for (var key in $scope.triggerCharMap) {
                        if ($scope.triggerCharMap.hasOwnProperty(key)) {
                            if ($scope.triggerCharMap[key].visible) {
                                $scope.triggerCharMap[key].selectActive();
                            }
                        }
                    }
                };

                $scope.isActive = function () {
                    for (var key in $scope.triggerCharMap) {
                        if ($scope.triggerCharMap.hasOwnProperty(key)) {
                            if ($scope.triggerCharMap[key].visible) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                $scope.isContentEditable = function() {
                    return ($scope.targetElement.nodeName !== 'INPUT' && $scope.targetElement.nodeName !== 'TEXTAREA');
                };

                $scope.replaceMacro = function(macro, hasTrailingSpace) {
                    if (!hasTrailingSpace) {
                        $scope.replacingMacro = true;
                        $scope.timer = $timeout(function() {
                            mentioUtil.replaceMacroText($scope.context, $scope.targetElement, 
                                $scope.targetElementPath, $scope.targetElementSelectedOffset, 
                                $scope.macros, $scope.macros[macro]);
                            angular.element($scope.targetElement).triggerHandler('change');
                            $scope.replacingMacro = false;
                        }, 300);
                        $scope.$on('$destroy', function() {
                            $timeout.cancel($scope.timer);
                        });
                    } else {
                        mentioUtil.replaceMacroText($scope.context, $scope.targetElement, $scope.targetElementPath,
                            $scope.targetElementSelectedOffset, $scope.macros, $scope.macros[macro]);
                    }
                };

                $scope.addMenu = function(menuScope) {
                    if (menuScope.parentScope && $scope.triggerCharMap.hasOwnProperty(menuScope.triggerChar)) {
                        return;
                    }
                    console.log('triggerChar=', menuScope.triggerChar);
                    if (menuScope.triggerChar === '(none)') {
                        $scope.triggerCharMap[NON_TRIGGER_CHAR] = menuScope;
                    } else {
                        $scope.triggerCharMap[menuScope.triggerChar] = menuScope;
                        if ($scope.triggerCharSet === undefined) {
                            $scope.triggerCharSet = [];
                        }
                        $scope.triggerCharSet.push(menuScope.triggerChar);
                    }
                    menuScope.setParent($scope);
                };

                $scope.handleEvent = function(activeMenuScope, event) {
                     function stopEvent(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                    }
                    if (event.which === 9 || event.which === 13) {
                        stopEvent(event);
                        activeMenuScope.selectActive();
                        return false;
                    }

                    if (event.which === 27) {
                        stopEvent(event);
                        activeMenuScope.$apply(function () {
                            activeMenuScope.hideMenu();
                        });
                        return false;
                    }

                    if (event.which === 40) {
                        stopEvent(event);
                        activeMenuScope.$apply(function () {
                            activeMenuScope.activateNextItem();
                        });
                        return false;
                    }

                    if (event.which === 38) {
                        stopEvent(event);
                        activeMenuScope.$apply(function () {
                            activeMenuScope.activatePreviousItem();
                        });
                        return false;
                    }

                    if (event.which === 37 || event.which === 39) {
                        stopEvent(event);
                        return false;
                    }
                };

                $scope.$on(
                    'menuCreated', function (event, data) {
                        if (
                            $attrs.id !== undefined ||
                            $attrs.mentioId !== undefined
                        ) 
                        {
                            if (
                                $attrs.id === data.targetElement || 
                                (
                                    $attrs.mentioId !== undefined &&
                                    $scope.altId === data.targetElement
                                )
                            )
                            {
                                $scope.addMenu(data.scope);
                            }
                        }
                    }
                );

                $document.on(
                    'click', function () {
                        if ($scope.isActive()) {
                            $scope.$apply(function () {
                                $scope.hideAll();
                            });
                        }
                    }
                );

                $document.on(
                    'keydown keypress paste', function (event) {
                        var activeMenuScope = $scope.getActiveMenuScope();
                        if (activeMenuScope) {
                            return $scope.handleEvent(activeMenuScope, event);
                        }
                        if ($scope.noTriggerChar) {
                            console.log('keydown trying to get triggerinfo');
                            var mentionInfo = mentioUtil.getTriggerInfo($scope.context, $scope.triggerCharSet, 
                                $scope.requireLeadingSpace, false);
                            console.log('mentionInfo=', mentionInfo);
                        }
                    }
                );
            }],
            link: function (scope, element, attrs) {
                scope.triggerCharMap = {};

                scope.targetElement = element;
                attrs.$set('autocomplete','off');

                if (attrs.mentioItems) {
                    scope.localItems = [];
                    scope.parentScope = scope;
                    var itemsRef = attrs.mentioSearch ? ' mentio-items="items"' : ' mentio-items="localItems"';

                    scope.defaultTriggerChar = scope.noTriggerChar ? '(none)' :
                        (attrs.mentioTriggerChar ? scope.$eval(attrs.mentioTriggerChar) : '@');

                    var html = '<mentio-menu' +
                        ' mentio-search="bridgeSearch(term)"' +
                        ' mentio-select="bridgeSelect(item)"' +
                        itemsRef;

                    if (attrs.mentioTemplateUrl) {
                        html = html + ' mentio-template-url="' + attrs.mentioTemplateUrl + '"';
                    }
                    html = html + ' mentio-trigger-char="\'' + scope.defaultTriggerChar + '\'"' +
                        ' mentio-parent-scope="parentScope"' +
                        '/>';
                    var linkFn = $compile(html);
                    var el = linkFn(scope);

                    element.parent().append(el);

                    scope.$on('$destroy', function() {
                      el.remove();
                    });
                }

                if (attrs.mentioTypedTerm) {
                    scope.syncTriggerText = true;
                }

                function keyHandler(event) {
                    var activeMenuScope = scope.getActiveMenuScope();
                    if (activeMenuScope) {
                        return scope.handleEvent(activeMenuScope, event);
                    }
                }

                scope.$watch(
                    'iframeElement', function(newValue) {
                        if (newValue) {
                            var iframeDocument = newValue.contentWindow.document;
                            iframeDocument.addEventListener('click',
                                function () {
                                    if (scope.isActive()) {
                                        scope.$apply(function () {
                                            scope.hideAll();
                                        });
                                    }
                                }
                            );


                            iframeDocument.addEventListener('keydown', keyHandler, true /*capture*/);
                                            
                            scope.$on ( '$destroy', function() {
                                iframeDocument.removeEventListener ( 'keydown', keyHandler );
                            });                            
                        }
                    }
                );

                scope.$watch(
                    'ngModel',
                    function (newValue) {
                        console.log('newValue=', newValue);

                        /*jshint maxstatements:38 */
                        // yes this function needs refactoring 
                        if (!newValue || newValue === '') {
                            // ignore while setting up
                            return;
                        }
                        if (!scope.noTriggerChar && !scope.triggerCharSet) {
                            $log.error('Error, no mentio-items attribute was provided, ' +
                                'and no separate mentio-menus were specified.  Nothing to do.');
                            return;
                        }

                        if (scope.contentEditableMenuPasted) {
                            console.log('bounced');
                            // don't respond to changes from insertion of the menu content
                            scope.contentEditableMenuPasted = false;
                            return;
                        }

                        if (scope.replacingMacro) {
                            $timeout.cancel(scope.timer);
                            scope.replacingMacro = false;
                        }

                        var isActive = scope.isActive();
                        var isContentEditable = scope.isContentEditable();

                        var mentionInfo = mentioUtil.getTriggerInfo(scope.context, scope.triggerCharSet, 
                            scope.requireLeadingSpace, isActive);

                        /*  Because of the div insertion used to find the caret location in contenteditable,
                            the tags are chopped up in the contenteditable.  May need to 
                            do the caret detection in an offscreen copy.  For now be tolerant of the fact
                            that mentionPosition will tend to change because of this.  Allow processing
                            to proceed if the trigger chars match - which might result in a subtle bug 
                            where the menu pops up again if two of the same trigger chars are used in a row. */
                        var continuing = mentionInfo &&
                            ((isContentEditable && mentionInfo.mentionTriggerChar === scope.currentMentionTriggerChar) ||
                                (!isContentEditable && mentionInfo.mentionPosition === scope.currentMentionPosition));

                        console.log('continuing = ', continuing);

                        if (mentionInfo && (!isActive || (isActive && continuing))) {
                            /** save selection info about the target control for later re-selection */
                            if (mentionInfo.mentionSelectedElement) {
                                scope.targetElement = mentionInfo.mentionSelectedElement;
                                scope.targetElementPath = mentionInfo.mentionSelectedPath;
                                scope.targetElementSelectedOffset = mentionInfo.mentionSelectedOffset;
                            }

                            /* publish to external ngModel */
                            scope.setTriggerText(mentionInfo.mentionText);
                            /* remember current position */
                            scope.currentMentionPosition = mentionInfo.mentionPosition;
                            scope.currentMentionTriggerChar = mentionInfo.mentionTriggerChar;
                            /* perform query */
                            scope.query(mentionInfo.mentionTriggerChar, mentionInfo.mentionText);
                        } else {
                            var currentTypedTerm = scope.typedTerm;
                            scope.setTriggerText('');
                            console.log('watch no triggerinfo delete triggerOffset');
                            delete scope.context.triggerOffset;
                            scope.hideAll();

                            var macroMatchInfo = mentioUtil.getMacroMatch(scope.context, scope.macros);

                            if (macroMatchInfo) {
                                scope.targetElement = macroMatchInfo.macroSelectedElement;
                                scope.targetElementPath = macroMatchInfo.macroSelectedPath;
                                scope.targetElementSelectedOffset = macroMatchInfo.macroSelectedOffset;
                                scope.replaceMacro(macroMatchInfo.macroText, macroMatchInfo.macroHasTrailingSpace);
                            } else if (scope.selectNotFound && currentTypedTerm && currentTypedTerm !== '') {
                                var lastScope = scope.triggerCharMap[scope.currentMentionTriggerChar];
                                if (lastScope) {
                                    // just came out of typeahead state
                                    var text = lastScope.select({
                                        item: {label: currentTypedTerm}
                                    });
                                    if (typeof text.then === 'function') {
                                        /* text is a promise, at least our best guess */
                                        text.then(scope.replaceText);
                                    } else {
                                        scope.replaceText(text, true);
                                    }
                                }
                            }
                        }
                    }
                );
            }
        };
    }])

    .directive('mentioMenu', ['mentioUtil', '$rootScope', '$log', '$window', '$document', 
        function (mentioUtil, $rootScope, $log, $window, $document) {
        return {
            restrict: 'E',
            scope: {
                search: '&mentioSearch',
                select: '&mentioSelect',
                items: '=mentioItems',
                triggerChar: '=mentioTriggerChar',
                forElem: '=mentioFor',
                parentScope: '=mentioParentScope'
            },
            templateUrl: function(tElement, tAttrs) {
                return tAttrs.mentioTemplateUrl || 'mentio-menu.tpl.html';
            },
            controller: ["$scope", function ($scope) {
                $scope.visible = false;

                // callable both with controller (menuItem) and without controller (local)
                this.activate = $scope.activate = function (item) {
                    $scope.activeItem = item;
                };

                // callable both with controller (menuItem) and without controller (local)
                this.isActive = $scope.isActive = function (item) {
                    return $scope.activeItem === item;
                };

                // callable both with controller (menuItem) and without controller (local)
                this.selectItem = $scope.selectItem = function (item) {
                    var text = $scope.select({
                        item: item
                    });
                    if (typeof text.then === 'function') {
                        /* text is a promise, at least our best guess */
                        text.then($scope.parentMentio.replaceText);
                    } else {
                        $scope.parentMentio.replaceText(text);
                    }
                };

                $scope.activateNextItem = function () {
                    var index = $scope.items.indexOf($scope.activeItem);
                    this.activate($scope.items[(index + 1) % $scope.items.length]);
                };

                $scope.activatePreviousItem = function () {
                    var index = $scope.items.indexOf($scope.activeItem);
                    this.activate($scope.items[index === 0 ? $scope.items.length - 1 : index - 1]);
                };

                $scope.selectActive = function () {
                    $scope.selectItem($scope.activeItem);
                };

                $scope.isVisible = function () {
                    return $scope.visible;
                };

                $scope.showMenu = function () {
                    if (!$scope.visible) {
                        $scope.requestVisiblePendingSearch = true;
                    }
                };

                $scope.setParent = function (scope) {
                    $scope.parentMentio = scope;
                    $scope.targetElement = scope.targetElement;
                };
            }],

            link: function (scope, element) {
                element[0].parentNode.removeChild(element[0]);
                $document[0].body.appendChild(element[0]);
                scope.menuElement = element; // for testing

                if (scope.parentScope) {
                    scope.parentScope.addMenu(scope);
                } else {
                    if (!scope.forElem) {
                        $log.error('mentio-menu requires a target element in tbe mentio-for attribute');
                        return;
                    }
                    if (!scope.triggerChar) {
                        $log.error('mentio-menu requires a trigger char');
                        return;
                    }
                    // send own scope to mentio directive so that the menu
                    // becomes attached
                    $rootScope.$broadcast('menuCreated',
                        {
                            targetElement : scope.forElem,
                            scope : scope
                        });
                }

                angular.element($window).bind('resize', function () {
                        if (scope.isVisible()) {
                            var triggerCharSet = [];
                            triggerCharSet.push(scope.triggerChar);
                            mentioUtil.popUnderMention(scope.parentMentio.context, 
                                triggerCharSet, element, scope.requireLeadingSpace);
                        }
                    }
                );

                scope.$watch('items', function (items) {
                    if (items && items.length > 0) {
                        scope.activate(items[0]);
                        if (!scope.visible && scope.requestVisiblePendingSearch) {
                            scope.visible = true;
                            scope.requestVisiblePendingSearch = false;
                        }
                    } else {
                        scope.hideMenu();
                    }
                });

                scope.$watch('isVisible()', function (visible) {
                    // wait for the watch notification to show the menu
                    if (visible) {
                        var triggerCharSet = [];
                        triggerCharSet.push(scope.triggerChar);
                        mentioUtil.popUnderMention(scope.parentMentio.context, 
                            triggerCharSet, element, scope.requireLeadingSpace);
                    }
                });

                scope.hideMenu = function () {
                    scope.visible = false;
                    element.css('display', 'none');
                    console.log('hideMenu delete triggerOffset');
                    delete scope.parentMentio.context.triggerOffset;
                };

            }
        };
    }])

    .directive('mentioMenuItem', function () {
        return {
            restrict: 'A',
            scope: {
                item: '=mentioMenuItem'
            },
            require: '^mentioMenu',
            link: function (scope, element, attrs, controller) {

                scope.$watch(function () {
                    return controller.isActive(scope.item);
                }, function (active) {
                    if (active) {
                        element.addClass('active');
                    } else {
                        element.removeClass('active');
                    }
                });

                element.bind('mouseenter', function () {
                    scope.$apply(function () {
                        controller.activate(scope.item);
                    });
                });

                element.bind('click', function (e) {
                    e.preventDefault();
                    controller.selectItem(scope.item);
                });
            }
        };
    })
    .filter('unsafe', ["$sce", function($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }])
    .filter('mentioHighlight', function() {
        function escapeRegexp (queryToEscape) {
            return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        }

        return function (matchItem, query, hightlightClass) {
            if (query) {
                var replaceText = hightlightClass ?
                                 '<span class="' + hightlightClass + '">$&</span>' :
                                 '<strong>$&</strong>';
                return ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), replaceText);
            } else {
                return matchItem;
            }
        };
    });

'use strict';

var NON_TRIGGER_CHAR = '2';

angular.module('mentio')
    .factory('mentioUtil', ["$window", "$location", "$anchorScroll", "$timeout", function ($window, $location, $anchorScroll, $timeout) {

        // public
        function popUnderMention (ctx, triggerCharSet, selectionEl, requireLeadingSpace) {
            var coordinates;
            var mentionInfo = getTriggerInfo(ctx, triggerCharSet, requireLeadingSpace, false);

            if (mentionInfo !== undefined) {

                if (selectedElementIsTextAreaOrInput(ctx)) {
                    coordinates = getTextAreaOrInputUnderlinePosition(ctx, getDocument(ctx).activeElement,
                        mentionInfo.mentionPosition);
                } else {
                    coordinates = getContentEditableCaretPosition(ctx, mentionInfo.mentionPosition);
                }

                // Move the button into place.
                selectionEl.css({
                    top: coordinates.top + 'px',
                    left: coordinates.left + 'px',
                    position: 'absolute',
                    zIndex: 100,
                    display: 'block'
                });

                $timeout(function(){
                    scrollIntoView(ctx, selectionEl);
                },0);
            } else {
                selectionEl.css({
                    display: 'none'
                });
            }
        }

        function scrollIntoView(ctx, elem)
        {
            // cheap hack in px - need to check styles relative to the element
            var reasonableBuffer = 20;
            var maxScrollDisplacement = 100;
            var clientRect;
            var e = elem[0];
            while (clientRect === undefined || clientRect.height === 0) {
                clientRect = e.getBoundingClientRect();
                if (clientRect.height === 0) {
                    e = e.childNodes[0];
                    if (e === undefined || !e.getBoundingClientRect) {
                        return;
                    }
                }
            }
            var elemTop = clientRect.top;
            var elemBottom = elemTop + clientRect.height;
            if(elemTop < 0) {
                $window.scrollTo(0, $window.pageYOffset + clientRect.top - reasonableBuffer);
            } else if (elemBottom > $window.innerHeight) {
                var maxY = $window.pageYOffset + clientRect.top - reasonableBuffer;
                if (maxY - $window.pageYOffset > maxScrollDisplacement) {
                    maxY = $window.pageYOffset + maxScrollDisplacement;
                }
                var targetY = $window.pageYOffset - ($window.innerHeight - elemBottom);
                if (targetY > maxY) {
                    targetY = maxY;
                }
                $window.scrollTo(0, targetY);
            }
        }

        function selectedElementIsTextAreaOrInput (ctx) {
            var element = getDocument(ctx).activeElement;
            if (element !== null) {
                var nodeName = element.nodeName;
                var type = element.getAttribute('type');
                return (nodeName === 'INPUT' && type === 'text') || nodeName === 'TEXTAREA';
            }
            return false;
        }

        function selectElement (ctx, targetElement, path, offset) {
            var range;
            var elem = targetElement;
            if (path) {
                for (var i = 0; i < path.length; i++) {
                    elem = elem.childNodes[path[i]];
                    if (elem === undefined) {
                        return;
                    }
                    while (elem.length < offset) {
                        offset -= elem.length;
                        elem = elem.nextSibling;
                    }
                    if (elem.childNodes.length === 0 && !elem.length) {
                        elem = elem.previousSibling;
                    }
                }
            }
            var sel = getWindowSelection(ctx);

            range = getDocument(ctx).createRange();
            range.setStart(elem, offset);
            range.setEnd(elem, offset);
            range.collapse(true);
            try{sel.removeAllRanges();}catch(error){}
            sel.addRange(range);
            targetElement.focus();
        }

        function pasteHtml (ctx, html, startPos, endPos) {
            console.log('paste', html, startPos, endPos);
            var range, sel;
            sel = getWindowSelection(ctx);
            range = getDocument(ctx).createRange();
            range.setStart(sel.anchorNode, startPos);
            range.setEnd(sel.anchorNode, endPos);
            range.deleteContents();

            var el = getDocument(ctx).createElement('div');
            el.innerHTML = html;
            var frag = getDocument(ctx).createDocumentFragment(),
                node, lastNode;
            while ((node = el.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }

        function resetSelection (ctx, targetElement, path, offset) {
            var nodeName = targetElement.nodeName;
            if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
                if (targetElement !== getDocument(ctx).activeElement) {
                    targetElement.focus();
                }
            } else {
                selectElement(ctx, targetElement, path, offset);
            }
        }

        // public
        function replaceMacroText (ctx, targetElement, path, offset, macros, text) {
            resetSelection(ctx, targetElement, path, offset);

            var macroMatchInfo = getMacroMatch(ctx, macros);

            if (macroMatchInfo.macroHasTrailingSpace) {
                macroMatchInfo.macroText = macroMatchInfo.macroText + '\xA0';
                text = text + '\xA0';
            }

            if (macroMatchInfo !== undefined) {
                var element = getDocument(ctx).activeElement;
                if (selectedElementIsTextAreaOrInput(ctx)) {
                    var startPos = macroMatchInfo.macroPosition;
                    var endPos = macroMatchInfo.macroPosition + macroMatchInfo.macroText.length;
                    element.value = element.value.substring(0, startPos) + text +
                        element.value.substring(endPos, element.value.length);
                    element.selectionStart = startPos + text.length;
                    element.selectionEnd = startPos + text.length;
                } else {
                    pasteHtml(ctx, text, macroMatchInfo.macroPosition,
                            macroMatchInfo.macroPosition + macroMatchInfo.macroText.length);
                }
            }
        }

        // public
        function replaceTriggerText (ctx, targetElement, path, offset, triggerCharSet, 
                text, requireLeadingSpace, hasTrailingSpace) {
            resetSelection(ctx, targetElement, path, offset);

            var mentionInfo = getTriggerInfo(ctx, triggerCharSet, requireLeadingSpace, true, hasTrailingSpace);

            if (mentionInfo) {
                if (selectedElementIsTextAreaOrInput()) {
                    var myField = getDocument(ctx).activeElement;
                    text = text + ' ';
                    var startPos = mentionInfo.mentionPosition;
                    var endPos = mentionInfo.mentionPosition + mentionInfo.mentionText.length + 1;
                    myField.value = myField.value.substring(0, startPos) + text +
                        myField.value.substring(endPos, myField.value.length);
                    myField.selectionStart = startPos + text.length;
                    myField.selectionEnd = startPos + text.length;
                } else {
                    if (!ctx.noTriggerChar) {
                        // add a space to the end of the pasted text
                        text = text + '\xA0';
                    }
                    console.log(mentionInfo);
                    var length = ctx.noTriggerChar ? mentionInfo.mentionText.length : 
                        mentionInfo.mentionText.length + 1;
                    pasteHtml(ctx, text, mentionInfo.mentionPosition,
                            mentionInfo.mentionPosition + length);
                }
            }
        }

        function getNodePositionInParent (ctx, elem) {
            if (elem.parentNode === null) {
                return 0;
            }
            for (var i = 0; i < elem.parentNode.childNodes.length; i++) {
                var node = elem.parentNode.childNodes[i];
                if (node === elem) {
                    return i;
                }
            }
        }

        // public
        function getMacroMatch (ctx, macros) {
            var selected, path = [], offset;

            if (selectedElementIsTextAreaOrInput(ctx)) {
                selected = getDocument(ctx).activeElement;
            } else {
                // content editable
                var selectionInfo = getContentEditableSelectedPath(ctx);
                if (selectionInfo) {
                    selected = selectionInfo.selected;
                    path = selectionInfo.path;
                    offset = selectionInfo.offset;
                }
            }
            var effectiveRange = getTextPrecedingCurrentSelection(ctx);
            if (effectiveRange) {

                var matchInfo;

                var hasTrailingSpace = false;

                if (effectiveRange.length > 0 &&
                    (effectiveRange.charAt(effectiveRange.length - 1) === '\xA0' ||
                        effectiveRange.charAt(effectiveRange.length - 1) === ' ')) {
                    hasTrailingSpace = true;
                    // strip space
                    effectiveRange = effectiveRange.substring(0, effectiveRange.length-1);
                }

                angular.forEach(macros, function (macro, c) {
                    var idx = effectiveRange.toUpperCase().lastIndexOf(c.toUpperCase());

                    if (idx >= 0 && c.length + idx === effectiveRange.length) {
                        var prevCharPos = idx - 1;
                        if (idx === 0 || effectiveRange.charAt(prevCharPos) === '\xA0' ||
                            effectiveRange.charAt(prevCharPos) === ' ' ) {

                            matchInfo = {
                                macroPosition: idx,
                                macroText: c,
                                macroSelectedElement: selected,
                                macroSelectedPath: path,
                                macroSelectedOffset: offset,
                                macroHasTrailingSpace: hasTrailingSpace
                            };
                        }
                    }
                });
                if (matchInfo) {
                    return matchInfo;
                }
            }
        }

        function getContentEditableSelectedPath(ctx) {
            // content editable
            var sel = getWindowSelection(ctx);
            var selected = sel.anchorNode;
            var path = [];
            var offset;
            if (selected != null) {
                var i;
                var ce = selected.contentEditable;
                while (selected !== null && ce !== 'true') {
                    i = getNodePositionInParent(ctx, selected);
                    path.push(i);
                    selected = selected.parentNode;
                    if (selected !== null) {
                        ce = selected.contentEditable;
                    }
                }
                path.reverse();
                // getRangeAt may not exist, need alternative
                offset = sel.getRangeAt(0).startOffset;
                return {
                    selected: selected,
                    path: path,
                    offset: offset
                };
            }
        }

        function scanForTrigger(ctx, triggerCharSet, effectiveRange, requireLeadingSpace) {
            if (ctx && ctx.hasOwnProperty('triggerOffset')) {
                console.log('has triggerOffset - returning', ctx.triggerOffset);
                return {
                    triggerChar: NON_TRIGGER_CHAR, 
                    mostRecentTriggerCharPos: ctx.triggerOffset
                };
            } 

            var triggerChar;
            var mostRecentTriggerCharPos = -1;
            if (ctx && ctx.noTriggerChar) {
                triggerChar = NON_TRIGGER_CHAR;
                mostRecentTriggerCharPos = effectiveRange.length - 1;

                console.log('no triggerOffset - assigning', mostRecentTriggerCharPos, effectiveRange);
                
                //ctx.triggerOffset = mostRecentTriggerCharPos;
            } else {
                triggerCharSet.forEach(function(c) {
                    var idx = effectiveRange.lastIndexOf(c);
                    if (idx > mostRecentTriggerCharPos) {
                        mostRecentTriggerCharPos = idx;
                        triggerChar = c;
                    }
                });
            }

            if (mostRecentTriggerCharPos >= 0 &&
                    (
                        /* are we at the beginning,
                        are leading spaces not required,
                        or is there a leading space? */
                        mostRecentTriggerCharPos === 0 ||
                        !requireLeadingSpace ||
                        effectiveRange.charAt(mostRecentTriggerCharPos - 1) === '\xA0' ||
                        effectiveRange.charAt(mostRecentTriggerCharPos - 1) === ' '
                    )
                )
            {
                return {
                    triggerChar: triggerChar, 
                    mostRecentTriggerCharPos: mostRecentTriggerCharPos
                };
            }
        }

        // public
        function getTriggerInfo (ctx, triggerCharSet, requireLeadingSpace, menuAlreadyActive, hasTrailingSpace) {
            /*jshint maxcomplexity:11 */
            // yes this function needs refactoring 
            var selected, path, offset;
            if (selectedElementIsTextAreaOrInput(ctx)) {
                selected = getDocument(ctx).activeElement;
            } else {
                // content editable
                var selectionInfo = getContentEditableSelectedPath(ctx);
                if (selectionInfo) {
                    selected = selectionInfo.selected;
                    path = selectionInfo.path;
                    offset = selectionInfo.offset;
                }
            }

            var effectiveRange = getTextPrecedingCurrentSelection(ctx);
            console.log('effectiveRange=', effectiveRange);

            if (effectiveRange) {

                var triggerInfo = scanForTrigger(ctx, triggerCharSet, effectiveRange, requireLeadingSpace);
                console.log('triggerInfo=', triggerInfo);

                if (triggerInfo) {
                    var mostRecentTriggerCharPos = triggerInfo.mostRecentTriggerCharPos;

                    var noTriggerChar = ctx && ctx.noTriggerChar;

                    var snippetStart = noTriggerChar ? mostRecentTriggerCharPos : mostRecentTriggerCharPos + 1;
                    var triggerChar = noTriggerChar ? triggerInfo.triggerChar : 
                        effectiveRange.substring(mostRecentTriggerCharPos, snippetStart);

                    var currentTriggerSnippet = effectiveRange.substring(snippetStart, effectiveRange.length);
                    var firstSnippetChar = currentTriggerSnippet.substring(0,1);
                    var leadingSpace = currentTriggerSnippet.length > 0 &&
                        (
                            firstSnippetChar === ' ' ||
                            firstSnippetChar === '\xA0'
                        );
                    if (hasTrailingSpace) {
                        currentTriggerSnippet = currentTriggerSnippet.trim();
                    }
                    if (!leadingSpace && (menuAlreadyActive || !(/[\xA0\s]/g.test(currentTriggerSnippet)))) {
                        return {
                            mentionPosition: mostRecentTriggerCharPos,
                            mentionText: currentTriggerSnippet,
                            mentionSelectedElement: selected,
                            mentionSelectedPath: path,
                            mentionSelectedOffset: offset,
                            mentionTriggerChar: triggerChar
                        };
                    }
                }
            }
        }

        function getWindowSelection(ctx) {
            if (ctx && ctx.iframe) {
                return ctx.iframe.contentWindow.getSelection();
            } else {
                return window.getSelection();
            }
        }

        function getDocument(ctx) {
            if (ctx && ctx.iframe) {
                return ctx.iframe.contentWindow.document;
            } else {
                return document;
            }
        }

        function isSelectionBackwards(ctx) {
            var backwards = false;
            var sel = getWindowSelection(ctx);
            if (!sel.isCollapsed) {
                var range = getDocument(ctx).createRange();
                range.setStart(sel.anchorNode, sel.anchorOffset);
                range.setEnd(sel.focusNode, sel.focusOffset);
                backwards = range.collapsed;
                range.detach();
            }
            return backwards;
        }

        function getTextPrecedingCurrentSelection (ctx) {
            var text;
            if (selectedElementIsTextAreaOrInput(ctx)) {
                var textComponent = getDocument(ctx).activeElement;
                var startPos = textComponent.selectionStart;
                text = textComponent.value.substring(0, startPos);

            } else {
                var isBackwards = isSelectionBackwards(ctx);
                var sel = getWindowSelection(ctx);
                var selectedElem = isBackwards ? sel.focusNode : sel.anchorNode;
                var selectedOffset = isBackwards ? sel.focusOffset : sel.anchorOffset;
                if (selectedElem) {
                    var workingNodeContent = selectedElem.textContent;
                    if (selectedOffset >= 0) {
                        text = workingNodeContent.substring(0, selectedOffset);
                    }
                }
            }
            return text;
        }

        function getContentEditableCaretPosition (ctx, selectedNodePosition) {
            var markerTextChar = '\ufeff';
            var markerEl, markerId = 'sel_' + new Date().getTime() + '_' + Math.random().toString().substr(2);

            var range;
            var sel = getWindowSelection(ctx);
            var prevRange = sel.getRangeAt(0);
            range = getDocument(ctx).createRange();

            range.setStart(sel.anchorNode, selectedNodePosition);
            range.setEnd(sel.anchorNode, selectedNodePosition);

            range.collapse(false);

            // Create the marker element containing a single invisible character using DOM methods and insert it
            markerEl = getDocument(ctx).createElement('span');
            markerEl.id = markerId;
            markerEl.appendChild(getDocument(ctx).createTextNode(markerTextChar));
            range.insertNode(markerEl);
            sel.removeAllRanges();
            sel.addRange(prevRange);

            var coordinates = {
                left: 0,
                top: markerEl.offsetHeight
            };

            localToGlobalCoordinates(ctx, markerEl, coordinates);

            markerEl.parentNode.removeChild(markerEl);
            return coordinates;
        }

        function localToGlobalCoordinates(ctx, element, coordinates) {
            var obj = element;
            var iframe = ctx ? ctx.iframe : null;
            while(obj) {
                coordinates.left += obj.offsetLeft;
                coordinates.top += obj.offsetTop;
                if (obj !== getDocument().body) {
                    coordinates.top -= obj.scrollTop;
                    coordinates.left -= obj.scrollLeft;
                }
                obj = obj.offsetParent;
                if (!obj && iframe) {
                    obj = iframe;
                    iframe = null;
                }
            }            
        }

        function getTextAreaOrInputUnderlinePosition (ctx, element, position) {
            var properties = [
                'direction',
                'boxSizing',
                'width',
                'height',
                'overflowX',
                'overflowY',
                'borderTopWidth',
                'borderRightWidth',
                'borderBottomWidth',
                'borderLeftWidth',
                'paddingTop',
                'paddingRight',
                'paddingBottom',
                'paddingLeft',
                'fontStyle',
                'fontVariant',
                'fontWeight',
                'fontStretch',
                'fontSize',
                'fontSizeAdjust',
                'lineHeight',
                'fontFamily',
                'textAlign',
                'textTransform',
                'textIndent',
                'textDecoration',
                'letterSpacing',
                'wordSpacing'
            ];

            var isFirefox = (window.mozInnerScreenX !== null);

            var div = getDocument(ctx).createElement('div');
            div.id = 'input-textarea-caret-position-mirror-div';
            getDocument(ctx).body.appendChild(div);

            var style = div.style;
            var computed = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

            style.whiteSpace = 'pre-wrap';
            if (element.nodeName !== 'INPUT') {
                style.wordWrap = 'break-word';
            }

            // position off-screen
            style.position = 'absolute';
            style.visibility = 'hidden';

            // transfer the element's properties to the div
            properties.forEach(function (prop) {
                style[prop] = computed[prop];
            });

            if (isFirefox) {
                style.width = (parseInt(computed.width) - 2) + 'px';
                if (element.scrollHeight > parseInt(computed.height))
                    style.overflowY = 'scroll';
            } else {
                style.overflow = 'hidden';
            }

            div.textContent = element.value.substring(0, position);

            if (element.nodeName === 'INPUT') {
                div.textContent = div.textContent.replace(/\s/g, '\u00a0');
            }

            var span = getDocument(ctx).createElement('span');
            span.textContent = element.value.substring(position) || '.';
            div.appendChild(span);

            var coordinates = {
                top: span.offsetTop + parseInt(computed.borderTopWidth) + parseInt(computed.fontSize),
                left: span.offsetLeft + parseInt(computed.borderLeftWidth)
            };

            localToGlobalCoordinates(ctx, element, coordinates);

            getDocument(ctx).body.removeChild(div);

            return coordinates;
        }

        return {
            // public
            popUnderMention: popUnderMention,
            replaceMacroText: replaceMacroText,
            replaceTriggerText: replaceTriggerText,
            getMacroMatch: getMacroMatch,
            getTriggerInfo: getTriggerInfo,
            selectElement: selectElement,




            // private: for unit testing only
            getTextAreaOrInputUnderlinePosition: getTextAreaOrInputUnderlinePosition,
            getTextPrecedingCurrentSelection: getTextPrecedingCurrentSelection,
            getContentEditableSelectedPath: getContentEditableSelectedPath,
            getNodePositionInParent: getNodePositionInParent,
            getContentEditableCaretPosition: getContentEditableCaretPosition,
            pasteHtml: pasteHtml,
            resetSelection: resetSelection,
            scrollIntoView: scrollIntoView
        };
    }]);

angular.module("mentio").run(["$templateCache", function($templateCache) {$templateCache.put("mentio-menu.tpl.html","<style>\n.scrollable-menu {\n    height: auto;\n    max-height: 300px;\n    overflow: auto;\n}\n\n.menu-highlighted {\n    font-weight: bold;\n}\n</style>\n<ul class=\"dropdown-menu scrollable-menu\" style=\"display:block\">\n    <li mentio-menu-item=\"item\" ng-repeat=\"item in items track by $index\">\n        <a class=\"text-primary\" ng-bind-html=\"item.label | mentioHighlight:typedTerm:\'menu-highlighted\' | unsafe\"></a>\n    </li>\n</ul>");}]);