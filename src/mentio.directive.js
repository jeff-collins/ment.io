'use strict';

angular.module('mentio', [])
    .directive('mentio', function (mentioUtil, $compile) {
        return {
            restrict: 'A',
            scope: {
                macros: '=mtioMacros',
                search: '&mtioSearch',
                select: '&mtioSelect',
                items: '=mtioItems',
                triggerText: '=mtioTriggerText',
                ngModel: '='
            },
            controller: function($scope, $timeout, $document, $attrs) {
 
                $scope.query = function (triggerChar, triggerText) {
                    var remoteScope = $scope.map[triggerChar];
                    remoteScope.showMenu();

                    remoteScope.search({
                        term: triggerText
                    });

                    remoteScope.triggerText = triggerText;
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
                    var searchFn = $attrs.mtioSearch ? $scope.search : $scope.defaultSearch;
                    searchFn({
                        term: termString
                    });
                };

                $scope.defaultSelect = function(locals) {
                    return $scope.defaultTriggerChar + locals.item.label;
                };

                $scope.bridgeSelect = function(itemVar) {
                    var selectFn = $attrs.mtioSelect ? $scope.select : $scope.defaultSelect;
                    return selectFn({
                        item: itemVar
                    });
                };

                $scope.setTriggerText = function(text) {
                    if ($scope.syncTriggerText) {
                        $scope.triggerText = text;
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

                if (attrs.mtioItems) {
                    scope.localItems = [];
                    scope.parentScope = scope;
                    var itemsRef = attrs.mtioSearch ? ' mtio-items="items"' : ' mtio-items="localItems"';

                    scope.defaultTriggerChar = attrs.mtioTriggerChar ? scope.$eval(attrs.mtioTriggerChar) : '@';

                    var html = '<mentio-menu ' 
                        + ' mtio-search="bridgeSearch(term)"'
                        + ' mtio-select="bridgeSelect(item)"'
                        + itemsRef
                        + ' mtio-template-url="' + attrs.mtioTemplateUrl + '"'
                        + ' mtio-trigger-char="\'' + scope.defaultTriggerChar + '\'"'
                        + ' mtio-parent-scope="parentScope"'
                        + '/>';
                    var linkFn = $compile(html);
                    var el = linkFn(scope);

                    element.parent().append(el);
                }

                if (attrs.mtioTriggerText) {
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
                search: '&mtioSearch',
                select: '&mtioSelect',
                items: '=mtioItems',
                triggerChar: '=mtioTriggerChar',
                forElem: '=mtioFor',
                parentScope: '=mtioParentScope'
            },
            templateUrl: function(tElement, tAttrs) {
                return tAttrs.mtioTemplateUrl !== 'undefined' ? tAttrs.mtioTemplateUrl : 'mentio-menu.tpl.html';
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
