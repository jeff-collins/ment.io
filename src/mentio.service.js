'use strict';

angular.module('mentio')
    .factory('mentioUtil', function ($window, $location, $anchorScroll, $timeout) {

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
                    zIndex: 10000,
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

            if (mentionInfo !== undefined) {
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
                    // add a space to the end of the pasted text
                    text = text + '\xA0';
                    pasteHtml(ctx, text, mentionInfo.mentionPosition,
                            mentionInfo.mentionPosition + mentionInfo.mentionText.length + 1);
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
            if (effectiveRange !== undefined && effectiveRange !== null) {

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

            if (effectiveRange !== undefined && effectiveRange !== null) {
                var mostRecentTriggerCharPos = -1;
                var triggerChar;
                triggerCharSet.forEach(function(c) {
                    var idx = effectiveRange.lastIndexOf(c);
                    if (idx > mostRecentTriggerCharPos) {
                        mostRecentTriggerCharPos = idx;
                        triggerChar = c;
                    }
                });
                if (mostRecentTriggerCharPos >= 0 &&
                        (
                            mostRecentTriggerCharPos === 0 ||
                            !requireLeadingSpace ||
                            /[\xA0\s]/g.test
                            (
                                effectiveRange.substring(
                                    mostRecentTriggerCharPos - 1,
                                    mostRecentTriggerCharPos)
                            )
                        )
                    )
                {
                    var currentTriggerSnippet = effectiveRange.substring(mostRecentTriggerCharPos + 1,
                        effectiveRange.length);

                    triggerChar = effectiveRange.substring(mostRecentTriggerCharPos, mostRecentTriggerCharPos+1);
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
            if (!ctx) {
                return window.getSelection();
            } else {
                return ctx.iframe.contentWindow.getSelection();
            }
        }

        function getDocument(ctx) {
            if (!ctx) {
                return document;
            } else {
                return ctx.iframe.contentWindow.document;
            }
        }

        function getTextPrecedingCurrentSelection (ctx) {
            var text;
            if (selectedElementIsTextAreaOrInput(ctx)) {
                var textComponent = getDocument(ctx).activeElement;
                var startPos = textComponent.selectionStart;
                text = textComponent.value.substring(0, startPos);

            } else {
                var selectedElem = getWindowSelection(ctx).anchorNode;
                if (selectedElem != null) {
                    var workingNodeContent = selectedElem.textContent;
                    var selectStartOffset = getWindowSelection(ctx).getRangeAt(0).startOffset;
                    if (selectStartOffset >= 0) {
                        text = workingNodeContent.substring(0, selectStartOffset);
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
                coordinates.left += obj.offsetLeft + obj.clientLeft;
                coordinates.top += obj.offsetTop + obj.clientTop;
                obj = obj.offsetParent;
                if (!obj && iframe) {
                    obj = iframe;
                    iframe = null;
                }
            }            
            obj = element;
            iframe = ctx ? ctx.iframe : null;
            while(obj !== getDocument().body) {
                if (obj.scrollTop && obj.scrollTop > 0) {
                    coordinates.top -= obj.scrollTop;
                }
                if (obj.scrollLeft && obj.scrollLeft > 0) {
                    coordinates.left -= obj.scrollLeft;
                }
                obj = obj.parentNode;
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
    });
