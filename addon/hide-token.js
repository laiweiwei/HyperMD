// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Auto show/hide markdown tokens like `##` or `*`
//
// Only works with `hypermd` mode, require special CSS rules
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.HideToken = this.HyperMD.HideToken || {}), CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var DEBUG = false;
    exports.defaultOption = {
        enabled: false,
        line: true,
        tokenTypes: "em|strong|strikethrough|code|link|task".split("|"),
    };
    exports.suggestedOption = {
        enabled: true,
    };
    core_1.suggestedEditorConfig.hmdHideToken = exports.suggestedOption;
    CodeMirror.defineOption("hmdHideToken", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { enabled: !!newVal };
        }
        else if (typeof newVal === "string") {
            newVal = { enabled: true, tokenTypes: newVal.split("|") };
        }
        else if (newVal instanceof Array) {
            newVal = { enabled: true, tokenTypes: newVal };
        }
        ///// apply config and write new values into cm
        var inst = exports.getAddon(cm);
        for (var k in exports.defaultOption) {
            inst[k] = (k in newVal) ? newVal[k] : exports.defaultOption[k];
        }
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var hideClassName = "hmd-hidden-token";
    var lineDeactiveClassName = "hmd-inactive-line";
    var HideToken = /** @class */ (function () {
        function HideToken(cm) {
            var _this = this;
            this.cm = cm;
            /** a map storing shown tokens' beginning ch */
            this.shownTokensStart = {};
            this.renderLineHandler = function (cm, line, el) {
                _this.procLine(line, el);
            };
            this.cursorActivityHandler = function (doc) {
                _this.update();
            };
            this.update = core_1.debounce(function () { return _this.updateImmediately(); }, 100);
            new core_1.FlipFlop(
            /* ON  */ function () {
                cm.on("cursorActivity", _this.cursorActivityHandler);
                cm.on("renderLine", _this.renderLineHandler);
                cm.on("update", _this.update);
                _this.update();
                cm.refresh();
            }, 
            /* OFF */ function () {
                cm.off("cursorActivity", _this.cursorActivityHandler);
                cm.off("renderLine", _this.renderLineHandler);
                cm.off("update", _this.update);
                _this.update.stop();
                cm.refresh();
            }).bind(this, "enabled", true);
        }
        /**
         * fetch cursor position and re-calculate shownTokensStart
         */
        HideToken.prototype.calcShownTokenStart = function () {
            var cm = this.cm;
            var cpos = cm.getCursor();
            var tokenTypes = this.tokenTypes;
            var formattingRE = new RegExp("\\sformatting-(" + tokenTypes.join("|") + ")\\s");
            var ans = {};
            var lineTokens = cm.getLineTokens(cpos.line);
            var i_cursor = -1;
            var fstack = [];
            var currentType = null;
            var tokens_to_show = [];
            if (DEBUG)
                console.log("-----------calcShownTokenStart");
            // construct fstack until we find current char's position
            // i <- current token index
            for (var i = 0; i < lineTokens.length; i++) {
                var token = lineTokens[i];
                if (i_cursor === -1 && (token.end > cpos.ch || i === lineTokens.length - 1)) {
                    i_cursor = i; // token of cursor, is found!
                    if (DEBUG)
                        console.log("--------TOKEN OF CURSOR FOUND AT ", i_cursor, token);
                }
                var mat = token.type && token.type.match(formattingRE);
                if (mat) { // current token is a formatting-* token
                    var type = mat[1]; // type without "formatting-"
                    if (type !== currentType) {
                        // change the `fstack` (push or pop)
                        // and, if token on cursor is found, stop searching
                        var fstack_top = fstack[fstack.length - 1];
                        if (fstack_top && fstack_top[1] === type) {
                            fstack.pop();
                            if (i_cursor !== -1 || token.end === cpos.ch) {
                                tokens_to_show.push(fstack_top[0], token);
                                break;
                            }
                        }
                        else {
                            fstack.push([token, type]);
                            if (i_cursor !== -1) {
                                // token on cursor, is a beginning formatting token
                                tokens_to_show.push(token);
                                var testRE = new RegExp("\\sformatting-" + type + "\\s");
                                if (DEBUG)
                                    console.log("-> cursor token already found. ", token, testRE);
                                for (i += 1; i < lineTokens.length; i++) {
                                    var token2 = lineTokens[i];
                                    if (token2.type && testRE.test(token2.type)) {
                                        // found the ending formatting token
                                        tokens_to_show.push(token2);
                                        if (DEBUG)
                                            console.log(token2, token2.type);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        if (DEBUG)
                            console.log(fstack.map(function (x) { return x[0].start + " " + x[1]; }));
                        currentType = type;
                    }
                }
                else {
                    if (i_cursor !== -1) { // token on cursor, is found
                        if (fstack.length > 0) {
                            // token on cursor, is wrapped by a formatting token
                            var _a = fstack.pop(), token_1 = _a[0], type = _a[1];
                            var testRE = new RegExp("\\sformatting-" + type + "\\s");
                            if (DEBUG)
                                console.log("cursor is wrapped by ", type, token_1, "...");
                            tokens_to_show.push(token_1);
                            for (i += 1; i < lineTokens.length; i++) {
                                var token2 = lineTokens[i];
                                if (token2.type && testRE.test(token2.type)) {
                                    // found the ending formatting token
                                    tokens_to_show.push(token2);
                                    if (DEBUG)
                                        console.log("to ", token2, token2.type);
                                    break;
                                }
                            }
                        }
                        else {
                            // token on cursor, is not styled
                        }
                        break;
                    }
                    currentType = null;
                }
                if (i_cursor !== -1 && fstack.length === 0)
                    break; // cursor is not wrapped by formatting-*
            }
            var ans_of_line = ans[cpos.line] = [];
            for (var _i = 0, tokens_to_show_1 = tokens_to_show; _i < tokens_to_show_1.length; _i++) {
                var it = tokens_to_show_1[_i];
                ans_of_line.push(it.start);
            }
            if (i >= lineTokens.length - 1) {
                for (var _b = 0, fstack_1 = fstack; _b < fstack_1.length; _b++) {
                    var stack_it = fstack_1[_b];
                    var pos = stack_it[0].start;
                    if (ans_of_line.indexOf(pos) === -1)
                        ans_of_line.push(pos);
                }
            }
            return ans;
        };
        /**
         * hide/show <span>s in one line
         * @see this.shownTokensStart
         * @returns apperance changed since which char. -1 means nothing changed.
         */
        HideToken.prototype.procLine = function (line, pre) {
            if (!line)
                return -1;
            var cm = this.cm;
            var lineNo = line.lineNo();
            var lv = core_1.cm_internal.findViewForLine(cm, lineNo);
            if (!lv || lv.hidden || !lv.measure)
                return -1;
            var mapInfo = core_1.cm_internal.mapFromLineView(lv, line, lineNo);
            var map = mapInfo.map;
            var nodeCount = map.length / 3;
            var startChs = (lineNo in this.shownTokensStart) ? this.shownTokensStart[lineNo].slice().sort(function (a, b) { return (a - b); }) : null;
            var ans = -1;
            for (var idx = 0, i = 0; idx < nodeCount; idx++, i += 3) {
                var start = map[i];
                var end = map[i + 1];
                var text = map[i + 2];
                var span = text.parentElement;
                if (text.nodeType !== Node.TEXT_NODE || !span || !/^span$/i.test(span.nodeName))
                    continue;
                var spanClass = span.className;
                for (var _i = 0, _a = this.tokenTypes; _i < _a.length; _i++) {
                    var type = _a[_i];
                    if (type === 'link' && /(?:^|\s)(?:cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink)(?:\s|$)/.test(spanClass)) {
                        // ignore footnote names, footrefs, barelinks
                        continue;
                    }
                    if (spanClass.indexOf("cm-formatting-" + type + " ") === -1)
                        continue;
                    // found one! decide next action, hide or show?
                    var toHide = true;
                    if (startChs && startChs.length > 0) {
                        while (startChs[0] < start)
                            startChs.shift(); // remove passed chars
                        toHide = (startChs[0] !== start); // hide if not hit
                    }
                    // hide or show token
                    if (toHide) {
                        if (spanClass.indexOf(hideClassName) === -1) {
                            span.className += " " + hideClassName;
                            if (ans === -1)
                                ans = start;
                        }
                    }
                    else {
                        if (spanClass.indexOf(hideClassName) !== -1) {
                            span.className = spanClass.replace(hideClassName, "");
                            if (ans === -1)
                                ans = start;
                        }
                    }
                    break;
                }
            }
            if (this.line && (pre = pre || lv.text)) {
                var preClass = pre.className;
                var preIsActive = preClass.indexOf(lineDeactiveClassName) === -1;
                var preShouldActive = startChs !== null;
                if (preIsActive != preShouldActive) {
                    if (DEBUG)
                        console.log("[hide-token] <pre>" + lineNo, preClass, "should ", preIsActive ? "deactive" : "active");
                    if (preShouldActive) {
                        pre.className = preClass.replace(lineDeactiveClassName, "");
                    }
                    else {
                        pre.className = preClass + " " + lineDeactiveClassName;
                    }
                    ans = 0;
                }
            }
            if (ans !== -1 && lv.measure.cache)
                lv.measure.cache = {}; // clean cache
            return ans;
        };
        HideToken.prototype.updateImmediately = function () {
            var _this = this;
            var cm = this.cm;
            var cpos = cm.getCursor();
            var sts_old = this.shownTokensStart;
            var sts_new = this.shownTokensStart = (this.enabled ? this.calcShownTokenStart() : {});
            var cpos_line_changed = false;
            // find the numbers of changed line
            var changed_lines = [];
            for (var line_str in sts_old)
                changed_lines.push(~~line_str);
            for (var line_str in sts_new)
                changed_lines.push(~~line_str);
            changed_lines.sort(function (a, b) { return (a - b); }); // NOTE: numbers could be duplicated
            cm.operation(function () {
                // process every line, skipping duplicated numbers
                var lastLine = -1;
                for (var _i = 0, changed_lines_1 = changed_lines; _i < changed_lines_1.length; _i++) {
                    var line = changed_lines_1[_i];
                    if (line === lastLine)
                        continue; // duplicated
                    lastLine = line;
                    var procAns = _this.procLine(cm.getLineHandle(line));
                    if (procAns !== -1 && cpos.line === line)
                        cpos_line_changed = true;
                }
                // refresh cursor position if needed
                if (cpos_line_changed) {
                    core_1.updateCursorDisplay(cm, true);
                    if (cm.hmd.TableAlign && cm.hmd.TableAlign.enabled)
                        cm.hmd.TableAlign.updateStyle();
                }
            });
        };
        return HideToken;
    }());
    exports.HideToken = HideToken;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
    exports.getAddon = core_1.Addon.Getter("HideToken", HideToken, exports.defaultOption /** if has options */);
});
