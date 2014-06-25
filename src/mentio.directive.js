'use strict';

angular.module('mentio', [])
    .directive('mentioMenu', function (mentioUtil) {
        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {
                bind: '&',
                atVar: '=ngModel',
                macros: '='
            },
            controller: function($scope, $timeout, $document) {
                this.addRule = function(rule) {
                    $scope.map[rule.triggerChar] = rule;
                    $scope.triggerCharSet.push(rule.triggerChar);
                    if (this.triggerCharSet === undefined) {
                        this.triggerCharSet = [];
                    }
                    this.triggerCharSet.push(rule.triggerChar);
                };

                $scope.query = function (triggerChar) {
                    var remoteScope = $scope.map[triggerChar];
                    remoteScope.showMenu();

                    remoteScope.search({
                        term: $scope.atVar
                    });

                    remoteScope.atVar = $scope.atVar;
                };

                this.replaceText = $scope.replaceText = function (triggerChar, item) {
                    // need to set up call to this
                    var remoteScope = $scope.map[triggerChar];
                    var text = remoteScope.select({
                        item: item
                    });
                    mentioUtil.replaceAtMentionText($scope.targetElement, $scope.targetElementPath,
                        $scope.targetElementSelectedOffset, $scope.triggerCharSet, text);
                    $scope.atVar = '';
                };

                $scope.hideAll = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            $scope.map[key].hideMenu();
                        }
                    }
                };

                $scope.selectActive = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            if (!$scope.map[key].hide) {
                                $scope.map[key].selectActive();
                            }
                        }
                    }
                };

                $scope.isActive = function () {
                    for (var key in $scope.map) {
                        if ($scope.map.hasOwnProperty(key)) {
                            if (!$scope.map[key].hide) {
                                return true;
                            }
                        }
                    }
                    return false;
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

                $document.on(
                    'click', function () {
                        if ($scope.isActive()) {
                            $scope.$apply(function () {
                                $scope.selectActive();
                            });
                        }
                    }
                );

                $document.on(
                    'keydown keypress', function () {
                        if (event.which === 9) {
                            $scope.$apply(function() {
                                $scope.selectActive();
                            });
                        }
                    }
                );
            },
            link: function (scope) {
                scope.map = {};
                scope.triggerCharSet = [];
                scope.$watch(
                    function (scope) {
                        return scope.$eval(scope.bind);
                    },
                    function () {
                        var mentionInfo = mentioUtil.getAtMentionInfo(scope.triggerCharSet);
                        if (mentionInfo !== undefined) {
                            /** save selection info about the target control for later re-selection */
                            scope.targetElement = mentionInfo.mentionSelectedElement;
                            scope.targetElementPath = mentionInfo.mentionSelectedPath;
                            scope.targetElementSelectedOffset = mentionInfo.mentionSelectedOffset;

                            /* store model */
                            scope.atVar =  mentionInfo.mentionText;
                            /* perform query */
                            scope.query(mentionInfo.mentionTriggerChar, mentionInfo.mentionText);
                        } else {
                            scope.atVar = '';
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

    .directive('mentioRule', function (mentioUtil) {
        function setupKeyCapture (scope, element) {
            angular.element(element).bind('keydown keypress', function (event) {
                if (!scope.hide) {
                    if (event.which === 27) {
                        scope.$apply(function () {
                            scope.hide = true;
                        });
                        event.preventDefault();
                    }

                    if (event.which === 40) {
                        event.preventDefault();
                        scope.$apply(function () {
                            scope.activateNextItem();
                        });
                    }

                    if (event.which === 38) {
                        event.preventDefault();
                        scope.$apply(function () {
                            scope.activatePreviousItem();
                        });
                    }

                    if (event.which === 13) {
                        event.preventDefault();
                        scope.$apply(function () {
                            scope.selectActive();
                        });
                    }
                }
            });
        }

        return {
            restrict: 'E',
            scope: {
                search: '&',
                select: '&',
                items: '='
            },
            require: '^mentioMenu',
            templateUrl: function(tElement, tAttrs) {
                return tAttrs.template;
            },
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope.items = [];
                $scope.hide = true;

                $scope.triggerChar = $attrs.triggerChar;

                this.activate = $scope.activate = function (item) {
                    $scope.active = item;
                };

                $scope.activateNextItem = function () {
                    var index = $scope.items.indexOf($scope.active);
                    this.activate($scope.items[(index + 1) % $scope.items.length]);
                };

                $scope.activatePreviousItem = function () {
                    var index = $scope.items.indexOf($scope.active);
                    this.activate($scope.items[index === 0 ? $scope.items.length - 1 : index - 1]);
                };

                this.isActive = $scope.isActive = function (item) {
                    return $scope.active === item;
                };

                $scope.selectActive = function () {
                    $scope.selector($scope.active);
                };

                this.selector = $scope.selector = function (item) {
                    $scope.hide = true;
                    $scope.controller.replaceText($scope.triggerChar, item);
                };

                $scope.isVisible = function () {
                    return !$scope.hide;
                };

                $scope.showMenu = function () {
                    $scope.requestVisiblePendingSearch = true;
                };

                $scope.hideMenu = function () {
                    $scope.hide = true;
                };
           }],

            link: function (scope, element, attrs, controller) {
                controller.addRule(scope);
                scope.controller = controller;

                var $list = element;
                element[0].parentNode.removeChild(element[0]);
                document.body.appendChild(element[0]);

                setupKeyCapture(scope, document.body);


                scope.$watch('items', function (items) {
                    if (items.length > 0) {
                        scope.activate(items[0]);
                        if (scope.hide && scope.requestVisiblePendingSearch) {
                            scope.hide = false;
                            scope.requestVisiblePendingSearch = false;
                        }
                    } else {
                        scope.hide = true;
                    }
                });

                scope.$watch('isVisible()', function (visible) {
                    if (visible) {
                        mentioUtil.popUnderMention(controller.triggerCharSet, $list);
                    } else {
                        $list.css('display', 'none');
                    }
                });

            }
        };
    })

    .directive('mentioMenuItem', function () {
        return {
            restrict: 'A',
            scope: {
                mentioMenuItem: '='
            },
            require: '^mentioRule',
            link: function (scope, element, attrs, controller) {

                var item = scope.mentioMenuItem;

                scope.$watch(function () {
                    return controller.isActive(item);
                }, function (active) {
                    if (active) {
                        element.addClass('active');
                    } else {
                        element.removeClass('active');
                    }
                });

                element.bind('mouseenter', function () {
                    scope.$apply(function () {
                        controller.activate(item);
                    });
                });

                element.bind('click', function (e) {
                    scope.$apply(function () {
                        controller.selector(item);
                    });
                    e.preventDefault();
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
                var replaceText = hightlightClass ? '<span class="' + hightlightClass + '">$&</span>' : '<strong>$&</strong>';
                return ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), replaceText);
            } else {
                return matchItem;
            }
        };
    });
