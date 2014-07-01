'use strict';

angular.module('mentio', [])
    .directive('mentio', function (mentioUtil, $compile) {
        return {
            restrict: 'A',
            scope: {
                macros: '=mentioMacros',
                search: '&mentioSearch',
                select: '&mentioSelect',
                items: '=mentioItems',
                typedTerm: '=mentioTypedTerm',
                ngModel: '='
            },
            controller: function($scope, $timeout, $document, $attrs) {
 
                $scope.query = function (triggerChar, triggerText) {
                    var remoteScope = $scope.map[triggerChar];
                    remoteScope.showMenu();

                    remoteScope.search({
                        term: triggerText
                    });

                    remoteScope.typedTerm = triggerText;
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
                        $scope.typedTerm = text;
                    }
                };

                $scope.replaceText = function (triggerChar, item) {
                    // need to set up call to this
                    var remoteScope = $scope.map[triggerChar];
                    var text = remoteScope.select({
                        item: item
                    });
                    mentioUtil.replaceTriggerText($scope.targetElement, $scope.targetElementPath,
                        $scope.targetElementSelectedOffset, $scope.triggerCharSet, text);
                    $scope.setTriggerText('');
                    if ($scope.isContentEditable()) {
                        $scope.contentEditableMenuPasted = true;
                        var timer = $timeout(function() {
                            $scope.contentEditableMenuPasted = false;
                        }, 100);
                        $scope.$on('$destroy', function() {
                            $timeout.cancel(timer);
                        });
                    }
                };

                $scope.hideAll = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            $scope.map[key].hideMenu();
                        }
                    }
                };

                $scope.getActiveMenuScope = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            if ($scope.map[key].visible) {
                                return $scope.map[key];
                            }
                        }
                    }
                    return null;
                };

                $scope.selectActive = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            if ($scope.map[key].visible) {
                                $scope.map[key].selectActive();
                            }
                        }
                    }
                };

                $scope.isActive = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            if ($scope.map[key].visible) {
                                return true;
                            }
                        }
                    }
                    return false;
                };

                $scope.isContentEditable = function() {
                    return ($scope.targetElement.nodeName !== 'INPUT' && $scope.targetElement.nodeName !== 'TEXTAREA');
                };

                $scope.replaceMacro = function(macro) {
                    var timer = $timeout(function() {
                        mentioUtil.replaceMacroText($scope.targetElement, $scope.targetElementPath,
                            $scope.targetElementSelectedOffset, $scope.macros, $scope.macros[macro]);
                    }, 300);
                    $scope.$on('$destroy', function() {
                        $timeout.cancel(timer);
                    });
                };

                $scope.addMenu = function(menuScope) {
                    if (menuScope.parentScope && $scope.map.hasOwnProperty(menuScope.triggerChar)) {
                        return;
                    }
                    $scope.map[menuScope.triggerChar] = menuScope;
                    if ($scope.triggerCharSet === undefined) {
                        $scope.triggerCharSet = [];
                    }
                    $scope.triggerCharSet.push(menuScope.triggerChar);
                    menuScope.setParent($scope);
                };

                $scope.$on(
                    'menuCreated', function (event, data) {
                        if ($attrs.id === data.targetElement) {
                            $scope.addMenu(data.scope);
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
                    'keydown keypress paste', function () {
                        var activeMenuScope = $scope.getActiveMenuScope();
                        if (activeMenuScope) {
                            if (event.which === 9) {
                                activeMenuScope.$apply(function() {
                                    activeMenuScope.selectActive();
                                });
                            }

                            if (event.which === 27) {
                                event.preventDefault();
                                activeMenuScope.$apply(function () {
                                    activeMenuScope.hideMenu();
                                });
                            }

                            if (event.which === 40) {
                                event.preventDefault();
                                activeMenuScope.$apply(function () {
                                    activeMenuScope.activateNextItem();
                                });
                            }

                            if (event.which === 38) {
                                event.preventDefault();
                                activeMenuScope.$apply(function () {
                                    activeMenuScope.activatePreviousItem();
                                });
                            }

                            if (event.which === 13 || event.which === 32) {
                                event.preventDefault();
                                activeMenuScope.$apply(function () {
                                    activeMenuScope.selectActive();
                                });
                            }
                        }
                    }
                );
            },
            link: function (scope, element, attrs) {
                scope.map = {};
                attrs.$set('autocomplete','off');

                if (attrs.mentioItems) {
                    scope.localItems = [];
                    scope.parentScope = scope;
                    var itemsRef = attrs.mentioSearch ? ' mentio-items="items"' : ' mentio-items="localItems"';

                    scope.defaultTriggerChar = attrs.mentioTriggerChar ? scope.$eval(attrs.mentioTriggerChar) : '@';

                    var html = '<mentio-menu ' 
                        + ' mentio-search="bridgeSearch(term)"'
                        + ' mentio-select="bridgeSelect(item)"'
                        + itemsRef
                        + ' mentio-template-url="' + attrs.mentioTemplateUrl + '"'
                        + ' mentio-trigger-char="\'' + scope.defaultTriggerChar + '\'"'
                        + ' mentio-parent-scope="parentScope"'
                        + '/>';
                    var linkFn = $compile(html);
                    var el = linkFn(scope);

                    element.parent().append(el);
                }

                if (attrs.mentioTypedTerm) {
                    scope.syncTriggerText = true;
                }

                scope.$watch(
                    'ngModel',
                    function () {
                        if (scope.contentEditableMenuPasted) {
                            // don't respond to changes from insertion of the menu content
                            scope.contentEditableMenuPasted = false;
                            return;
                        }

                        var mentionInfo = mentioUtil.getTriggerInfo(scope.triggerCharSet);

                        if (mentionInfo !== undefined) {
                            /** save selection info about the target control for later re-selection */
                            scope.targetElement = mentionInfo.mentionSelectedElement;
                            scope.targetElementPath = mentionInfo.mentionSelectedPath;
                            scope.targetElementSelectedOffset = mentionInfo.mentionSelectedOffset;

                            /* publish to external */
                            scope.setTriggerText(mentionInfo.mentionText);
                            /* perform query */
                            scope.query(mentionInfo.mentionTriggerChar, mentionInfo.mentionText);
                        } else {
                            scope.setTriggerText('');
                            scope.hideAll();

                            var macroMatchInfo = mentioUtil.getMacroMatch(scope.macros);
                            if (macroMatchInfo !== undefined) {
                                scope.targetElement = macroMatchInfo.macroSelectedElement;
                                scope.targetElementPath = macroMatchInfo.macroSelectedPath;
                                scope.targetElementSelectedOffset = macroMatchInfo.macroSelectedOffset;
                                scope.replaceMacro(macroMatchInfo.macroText);
                            }
                        }
                    }
                );
            }
        };
    })

    .directive('mentioMenu', function (mentioUtil, $rootScope, $log) {
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
                return tAttrs.mentioTemplateUrl !== 'undefined' ? tAttrs.mentioTemplateUrl : 'mentio-menu.tpl.html';
            },
            controller: function ($scope) {
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
                    $scope.visible = false;
                    $scope.parentMentio.replaceText($scope.triggerChar, item);
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

                $scope.hideMenu = function () {
                    $scope.visible = false;
                };

                $scope.setParent = function (scope) {
                    $scope.parentMentio = scope;
                };
            },

            link: function (scope, element) {
                element[0].parentNode.removeChild(element[0]);
                document.body.appendChild(element[0]);

                if (scope.parentScope) {
                    scope.parentScope.addMenu(scope);
                } else {
                    var targetElement = document.querySelector('#' + scope.forElem);

                    if (targetElement) {
                        var ngElem = angular.element(targetElement);
                        var mentioAttr = ngElem.attr('mentio');
                        if (mentioAttr !== undefined) {
                            // send own scope to mentio directive so that the menu
                            // becomes attached
                            $rootScope.$broadcast('menuCreated', 
                                {
                                    targetElement : scope.forElem,
                                    scope : scope
                                });
                            scope.targetElement = ngElem;
                        } else {
                            $log.error('Error, no mentio directive on target element ' + scope.forElem);
                        }
                    } else {
                        $log.error('Error, no such element: ' + scope.forElem);
                    }
                }

                scope.$watch('items', function (items) {
                    if (items && items.length > 0) {
                        scope.activate(items[0]);
                        if (!scope.visible && scope.requestVisiblePendingSearch) {
                            scope.visible = true;
                            scope.requestVisiblePendingSearch = false;
                        }
                    } else {
                        scope.visible = false;
                    }
                });

                scope.$watch('isVisible()', function (visible) {
                    if (visible) {
                        var triggerCharSet = [];
                        triggerCharSet.push(scope.triggerChar);
                        mentioUtil.popUnderMention(triggerCharSet, element);
                    } else {
                        element.css('display', 'none');
                    }
                });

            }
        };
    })

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
                    scope.$apply(function () {
                        controller.selectItem(scope.item);
                    });
                });
            }
        };
    })

    .filter('mentioHighlight', function() {
        function escapeRegexp (queryToEscape) {
            return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        }

        return function (matchItem, query, hightlightClass) {
            if (query) {
                var replaceText = hightlightClass
                                 ? '<span class="' + hightlightClass + '">$&</span>'
                                 : '<strong>$&</strong>';
                return ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), replaceText);
            } else {
                return matchItem;
            }
        };
    });

'use strict';

angular.module('mentio')
    .factory('mentioUtil', function () {

        // public
        function popUnderMention (triggerCharSet, selectionEl) {
            var coordinates;
            var mentionInfo = getTriggerInfo(triggerCharSet);

            if (mentionInfo !== undefined) {

                if (selectedElementIsTextAreaOrInput()) {
                    coordinates = getTextAreaOrInputUnderlinePosition(document.activeElement,
                        mentionInfo.mentionPosition);
                } else {
                    coordinates = getContentEditableCaretPosition(mentionInfo.mentionPosition);
                }

                // Move the button into place.
                selectionEl.css({
                    top: coordinates.top + 'px',
                    left: coordinates.left + 'px',
                    position: 'absolute',
                    zIndex: 100,
                    display: 'block'
                });
            } else {
                selectionEl.css({
                    display: 'none'
                });
            }
        }

        function selectedElementIsTextAreaOrInput () {
            var element = document.activeElement;
            if (element !== null) {
                var nodeName = element.nodeName;
                return nodeName === 'INPUT' || nodeName === 'TEXTAREA';
            }
            return false;
        }

        function selectElement (targetElement, path, offset) {
            var range;
            var elem = targetElement;
            for (var i = 0; i < path.length; i++) {
                elem = elem.childNodes[path[i]];
                if (elem === undefined) {
                    return;
                }
                while (elem.length < offset) {
                    offset -= elem.length;
                    elem = elem.nextSibling;
                }
            }
            if (document.selection && document.selection.createRange) {
                // Clone the TextRange and collapse
                range = document.selection.createRange().duplicate();
                range.select(elem);
                range.selectStartOffset(offset);
                range.selectEndOffset(offset);
                range.collapse(true);
                document.selection.removeAllRanges();
                document.selection.addRange(range);
            } else if (window.getSelection) {
                var sel = window.getSelection();

                range = document.createRange();
                range.setStart(elem, offset);
                range.setEnd(elem, offset);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                targetElement.focus();
            }
        }

        function pasteHtml (html, startPos, endPos) {
            var range, sel;
            if (document.selection && document.selection.createRange) {
                range = document.selection.createRange().duplicate();
                range.selectStartOffset(startPos);
                range.selectEndOffset(endPos);
                range.collapse(false);
                range.deleteContents();

                range.pasteHTML(html);
            } else if (window.getSelection) {
                sel = window.getSelection();
                range = document.createRange();
                range.setStart(sel.anchorNode, startPos);
                range.setEnd(sel.anchorNode, endPos);
                range.deleteContents();

                var el = document.createElement('div');
                el.innerHTML = html;
                var frag = document.createDocumentFragment(),
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
        }

        function resetSelection (targetElement, path, offset) {
            var nodeName = targetElement.nodeName;
            if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
                if (targetElement !== document.activeElement) {
                    targetElement.focus();
                }
            } else {
                selectElement(targetElement, path, offset);
            }
        }

        // public
        function replaceMacroText (targetElement, path, offset, macros, text) {
            resetSelection(targetElement, path, offset);

            var macroMatchInfo = getMacroMatch(macros);

            if (macroMatchInfo !== undefined) {
                if (selectedElementIsTextAreaOrInput()) {
                    var myField = document.activeElement;
                    //IE support
                    if (document.selection) {
                        myField.focus();
                        var sel = document.selection.createRange();
                        sel.selectStartOffset(macroMatchInfo.macroPosition);
                        sel.selectEndOffset(macroMatchInfo.macroPosition + macroMatchInfo.macroText.length);
                        sel.text = text;
                    }
                    //MOZILLA and others
                    else {
                        var startPos = macroMatchInfo.macroPosition;
                        var endPos = macroMatchInfo.macroPosition + macroMatchInfo.macroText.length;
                        myField.value = myField.value.substring(0, startPos) + text +
                            myField.value.substring(endPos, myField.value.length);
                        myField.selectionStart = startPos + text.length;
                        myField.selectionEnd = startPos + text.length;
                    }
                } else {
                    pasteHtml(text, macroMatchInfo.macroPosition,
                            macroMatchInfo.macroPosition + macroMatchInfo.macroText.length);
                }
            }
        }

        // public
        function replaceTriggerText (targetElement, path, offset, triggerCharSet, text) {
            resetSelection(targetElement, path, offset);

            var mentionInfo = getTriggerInfo(triggerCharSet);

            if (mentionInfo !== undefined) {
                if (selectedElementIsTextAreaOrInput()) {
                    var myField = document.activeElement;
                    text = text + ' ';
                    //IE support
                    if (document.selection) {
                        myField.focus();
                        var sel = document.selection.createRange();
                        sel.selectStartOffset(mentionInfo.mentionPosition);
                        sel.selectEndOffset(mentionInfo.mentionPosition + mentionInfo.mentionText.length);
                        sel.text = text;
                    }
                    //MOZILLA and others
                    else {
                        var startPos = mentionInfo.mentionPosition;
                        var endPos = mentionInfo.mentionPosition + mentionInfo.mentionText.length + 1;
                        myField.value = myField.value.substring(0, startPos) + text +
                            myField.value.substring(endPos, myField.value.length);
                        myField.selectionStart = startPos + text.length;
                        myField.selectionEnd = startPos + text.length;
                    }
                } else {
                    text = text + '\xA0';
                    pasteHtml(text, mentionInfo.mentionPosition,
                            mentionInfo.mentionPosition + mentionInfo.mentionText.length + 1);
                }
            }
        }

        function getNodePositionInParent (elem) {
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
        function getMacroMatch (macros) {
            var selected, path = [], offset;

            if (selectedElementIsTextAreaOrInput()) {
                selected = document.activeElement;
            } else {
                // content editable
                var sel = window.getSelection();
                selected = sel.anchorNode;
                if (selected != null) {
                    var i;
                    var ce = selected.contentEditable;
                    while (selected !== null && ce !== 'true') {
                        i = getNodePositionInParent(selected);
                        path.push(i);
                        selected = selected.parentNode;
                        if (selected !== null) {
                            ce = selected.contentEditable;
                        }
                    }
                    path.reverse();
                    // getRangeAt may not exist, need alternative
                    offset = sel.getRangeAt(0).startOffset;
                }
            }
            var effectiveRange = getTextPrecedingCurrentSelection();
            if (effectiveRange !== undefined && effectiveRange !== null) {

                var matchInfo;

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
                                macroSelectedOffset: offset
                            };
                        }
                    }
                });
                if (matchInfo) {
                    return matchInfo;
                }
            }
        }

        // public
        function getTriggerInfo (triggerCharSet) {
            var selected, path = [],
                offset;
            if (selectedElementIsTextAreaOrInput()) {
                selected = document.activeElement;
            } else {
                // content editable
                var sel = window.getSelection();
                selected = sel.anchorNode;
                if (selected != null) {
                    var i;
                    var ce = selected.contentEditable;
                    while (selected !== null && ce !== 'true') {
                        i = getNodePositionInParent(selected);
                        path.push(i);
                        selected = selected.parentNode;
                        if (selected !== null) {
                            ce = selected.contentEditable;
                        }
                    }
                    path.reverse();
                    // getRangeAt may not exist, need alternative
                    offset = sel.getRangeAt(0).startOffset;
                }
            }
            var effectiveRange = getTextPrecedingCurrentSelection();
            if (effectiveRange !== undefined && effectiveRange !== null) {
                var mostRecentAtSymbol = -1;
                var triggerChar;
                triggerCharSet.forEach(function(c) {
                    var idx = effectiveRange.lastIndexOf(c);
                    if (idx > mostRecentAtSymbol) {
                        mostRecentAtSymbol = idx;
                        triggerChar = c;
                    }
                });
                if (mostRecentAtSymbol === 0 || /[\xA0\s]/g.test(
                    effectiveRange.substring(mostRecentAtSymbol - 1, mostRecentAtSymbol))) {
                    var currentTriggerSnippet = effectiveRange.substring(mostRecentAtSymbol + 1,
                        effectiveRange.length);

                    triggerChar = effectiveRange.substring(mostRecentAtSymbol, mostRecentAtSymbol+1);
                    if (!(/[\xA0\s]/g.test(currentTriggerSnippet))) {
                        return {
                            mentionPosition: mostRecentAtSymbol,
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

        function getTextPrecedingCurrentSelection () {
            var text;
            if (selectedElementIsTextAreaOrInput()) {
                var textComponent = document.activeElement;
                // IE version
                if (document.selection !== undefined) {
                    textComponent.focus();
                    var sel = document.selection.createRange();
                    text = sel.text;
                }
                // Mozilla version
                else if (textComponent.selectionStart !== undefined) {
                    var startPos = textComponent.selectionStart;
                    text = textComponent.value.substring(0, startPos);
                }

            } else {
                var selectedElem = window.getSelection().anchorNode; // taSelection.getSelectionElement();
                if (selectedElem != null) {
                    var workingNodeContent = selectedElem.textContent;
                    var selectStartOffset = window.getSelection().getRangeAt(0).startOffset;
                    if (selectStartOffset >= 0) {
                        text = workingNodeContent.substring(0, selectStartOffset);
                    }
                }
            }
            return text;
        }

        function getContentEditableCaretPosition (selectedNodePosition) {
            var markerTextChar = '\ufeff';
            var markerTextCharEntity = '&#xfeff;';
            var markerEl, markerId = 'sel_' + new Date().getTime() + '_' + Math.random().toString().substr(2);

            var range;
            if (document.selection && document.selection.createRange) {
                // Clone the TextRange and collapse
                range = document.selection.createRange().duplicate();
                range.selectStartOffset(selectedNodePosition);
                range.selectEndOffset(selectedNodePosition);
                range.collapse(false);

                // Create the marker element containing a single invisible character by
                // creating literal HTML and insert it
                range.pasteHTML('<span id="' + markerId + '" style="position: relative;">' +
                    markerTextCharEntity + '</span>');
                markerEl = document.getElementById(markerId);
            } else if (window.getSelection) {
                var sel = window.getSelection();
                range = document.createRange();

                range.setStart(sel.anchorNode, selectedNodePosition);
                range.setEnd(sel.anchorNode, selectedNodePosition);

                range.collapse(false);

                // Create the marker element containing a single invisible character using DOM methods and insert it
                markerEl = document.createElement('span');
                markerEl.id = markerId;
                markerEl.appendChild(document.createTextNode(markerTextChar));
                range.insertNode(markerEl);
            }

            var obj = markerEl;
            var coordinates = {
                left: 0,
                top: markerEl.offsetHeight
            };
            do {
                coordinates.left += obj.offsetLeft;
                coordinates.top += obj.offsetTop;
            } while (obj = obj.offsetParent);

            markerEl.parentNode.removeChild(markerEl);
            return coordinates;
        }

        function getTextAreaOrInputUnderlinePosition (element, position) {
            var properties = [
                'direction', // RTL support
                'boxSizing',
                'width', //on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
                'height',
                'overflowX',
                'overflowY', // copy the scrollbar for IE

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


            // mirrored div
            var div = document.createElement('div');
            div.id = 'input-textarea-caret-position-mirror-div';
            document.body.appendChild(div);

            var style = div.style;
            // currentStyle for IE < 9
            var computed = window.getComputedStyle ? getComputedStyle(element) : element.currentStyle;

            // default textarea styles
            style.whiteSpace = 'pre-wrap';
            if (element.nodeName !== 'INPUT') {
                style.wordWrap = 'break-word'; // only for textarea-s
            }

            // position off-screen
            style.position = 'absolute'; // required to return coordinates properly
            style.visibility = 'hidden'; // not 'display: none' because we want rendering

            // transfer the element's properties to the div
            properties.forEach(function (prop) {
                style[prop] = computed[prop];
            });

            if (isFirefox) {
                // Firefox adds 2 pixels to the padding - https://bugzilla.mozilla.org/show_bug.cgi?id=753662
                style.width = (parseInt(computed.width) - 2) + 'px';
                // Firefox lies about the overflow property for textareas:
                // https://bugzilla.mozilla.org/show_bug.cgi?id=984275
                if (element.scrollHeight > parseInt(computed.height))
                    style.overflowY = 'scroll';
            } else {
                style.overflow = 'hidden'; // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
            }

            div.textContent = element.value.substring(0, position);

            if (element.nodeName === 'INPUT') {
                div.textContent = div.textContent.replace(/\s/g, '\u00a0');
            }

            var span = document.createElement('span');
            span.textContent = element.value.substring(position) || '.';
            div.appendChild(span);

            var coordinates = {
                top: span.offsetTop + parseInt(computed.borderTopWidth) + span.offsetHeight,
                left: span.offsetLeft + parseInt(computed.borderLeftWidth)
            };

            var obj = element;
            do {
                coordinates.left += obj.offsetLeft;
                coordinates.top += obj.offsetTop;
            } while (obj = obj.offsetParent);

            document.body.removeChild(div);

            return coordinates;
        }

        return {
            popUnderMention: popUnderMention,
            replaceMacroText: replaceMacroText,
            replaceTriggerText: replaceTriggerText,
            getMacroMatch: getMacroMatch,
            getTriggerInfo: getTriggerInfo,
            selectElement: selectElement
        };
    });

angular.module("mentio").run(["$templateCache", function($templateCache) {$templateCache.put("mentio-menu.tpl.html","<ul class=\"dropdown-menu\" style=\"display:block\">\n    <li mentio-menu-item=\"item\" ng-repeat=\"item in items track by $index\">\n        <a class=\"text-primary\" ng-bind-html=\"item.label | mentioHighlight:triggerText:\'menu-highlighted\' | unsafe\"></a>\n    </li>\n</ul>");}]);