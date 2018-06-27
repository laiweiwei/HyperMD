// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn Markdown markers into real images, link icons etc. Support custom folders.
//
// You may set `hmdFold.customFolders` option to fold more, where `customFolders` is Array<FolderFunc>
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core"), require("./read-link")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core","./read-link"], mod) :
  /*plain env*/ mod(null, (this.HyperMD.Fold = this.HyperMD.Fold || {}), CodeMirror, HyperMD, HyperMD.ReadLink);
})(function (require, exports, CodeMirror, core_1, read_link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var DEBUG = false;
    var RequestRangeResult;
    (function (RequestRangeResult) {
        // Use string values because in TypeScript, string enum members do not get a reverse mapping generated at all.
        // Otherwise the generated code looks ugly
        RequestRangeResult["OK"] = "ok";
        RequestRangeResult["CURSOR_INSIDE"] = "ci";
        RequestRangeResult["HAS_MARKERS"] = "hm";
    })(RequestRangeResult = exports.RequestRangeResult || (exports.RequestRangeResult = {}));
    //#endregion
    /********************************************************************************** */
    //#region FolderFunc Registry
    exports.folderRegistry = {};
    /**
     * Add a Folder to the System Folder Registry
     *
     * @param name eg. "math"  "html"  "image"  "link"
     * @param folder
     * @param suggested enable this folder in suggestedEditorConfig
     * @param force if a folder with same name is already exists, overwrite it. (dangerous)
     */
    function registerFolder(name, folder, suggested, force) {
        var registry = exports.folderRegistry;
        if (name in registry && !force)
            throw new Error("Folder " + name + " already registered");
        exports.defaultOption[name] = false;
        exports.suggestedOption[name] = !!suggested;
        registry[name] = folder;
    }
    exports.registerFolder = registerFolder;
    //#endregion
    /********************************************************************************** */
    //#region builtinFolder
    exports.ImageFolder = function (stream, token) {
        var cm = stream.cm;
        var imgRE = /\bimage-marker\b/;
        var urlRE = /\bformatting-link-string\b/; // matches the parentheses
        if (imgRE.test(token.type) && token.string === "!") {
            var lineNo = stream.lineNo;
            // find the begin and end of url part
            var url_begin = stream.findNext(urlRE);
            var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
            var from = { line: lineNo, ch: token.start };
            var to = { line: lineNo, ch: url_end.token.end };
            var rngReq = stream.requestRange(from, to);
            if (rngReq === RequestRangeResult.OK) {
                var url;
                var title;
                { // extract the URL
                    var rawurl = cm.getRange(// get the URL or footnote name in the parentheses
                    { line: lineNo, ch: url_begin.token.start + 1 }, { line: lineNo, ch: url_end.token.start });
                    if (url_end.token.string === "]") {
                        var tmp = cm.hmdReadLink(rawurl, lineNo);
                        if (!tmp)
                            return null; // Yup! bad URL?!
                        rawurl = tmp.content;
                    }
                    url = read_link_1.splitLink(rawurl).url;
                    url = cm.hmdResolveURL(url);
                }
                { // extract the title
                    title = cm.getRange({ line: lineNo, ch: from.ch + 2 }, { line: lineNo, ch: url_begin.token.start - 1 });
                }
                var img = document.createElement("img");
                var marker = cm.markText(from, to, {
                    collapsed: true,
                    replacedWith: img,
                });
                img.addEventListener('load', function () {
                    img.classList.remove("hmd-image-loading");
                    marker.changed();
                }, false);
                img.addEventListener('error', function () {
                    img.classList.remove("hmd-image-loading");
                    img.classList.add("hmd-image-error");
                    marker.changed();
                }, false);
                img.addEventListener('click', function () { return breakMark(cm, marker); }, false);
                img.className = "hmd-image hmd-image-loading";
                img.src = url;
                img.title = title;
                return marker;
            }
            else {
                if (DEBUG) {
                    console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
                }
            }
        }
        return null;
    };
    exports.LinkFolder = function (stream, token) {
        var cm = stream.cm;
        var urlRE = /\bformatting-link-string\b/; // matches the parentheses
        var endTest = function (token) { return (urlRE.test(token.type) && token.string === ")"); };
        if (token.string === "(" && urlRE.test(token.type) && // is URL left parentheses
            (stream.i_token === 0 || !/\bimage/.test(stream.lineTokens[stream.i_token - 1].type)) // not a image URL
        ) {
            var lineNo = stream.lineNo;
            var url_end = stream.findNext(endTest);
            var from = { line: lineNo, ch: token.start };
            var to = { line: lineNo, ch: url_end.token.end };
            var rngReq = stream.requestRange(from, to);
            if (rngReq === RequestRangeResult.OK) {
                var text = cm.getRange(from, to);
                var _a = read_link_1.splitLink(text.substr(1, text.length - 2)), url = _a.url, title = _a.title;
                var img = document.createElement("span");
                img.setAttribute("class", "hmd-link-icon");
                img.setAttribute("title", url + "\n" + title);
                img.setAttribute("data-url", url);
                var marker = cm.markText(from, to, {
                    collapsed: true,
                    replacedWith: img,
                });
                img.addEventListener('click', function () { return breakMark(cm, marker); }, false);
                return marker;
            }
            else {
                if (DEBUG) {
                    console.log("[link]FAILED TO REQUEST RANGE: ", rngReq);
                }
            }
        }
        return null;
    };
    //#endregion
    /********************************************************************************** */
    //#region Utils
    /** break a TextMarker, move cursor to where marker is */
    function breakMark(cm, marker, chOffset) {
        cm.operation(function () {
            var pos = marker.find().from;
            pos = { line: pos.line, ch: pos.ch + ~~chOffset };
            cm.setCursor(pos);
            cm.focus();
            marker.clear();
        });
    }
    exports.breakMark = breakMark;
    exports.defaultOption = {
    /* will be populated by registerFolder() */
    };
    exports.suggestedOption = {
    /* will be populated by registerFolder() */
    };
    core_1.suggestedEditorConfig.hmdFold = exports.suggestedOption;
    CodeMirror.defineOption("hmdFold", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Record<string, boolean>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = newVal ? exports.suggestedOption : exports.defaultOption;
        }
        if ('customFolders' in newVal) {
            console.error('[HyperMD][Fold] `customFolders` is removed. To use custom folders, `registerFolder` first.');
            delete newVal['customFolders'];
        }
        ///// apply config
        var inst = exports.getAddon(cm);
        for (var type in exports.folderRegistry) {
            inst.setStatus(type, newVal[type]);
        }
        // then, folding task will be queued by setStatus()
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var Fold = /** @class */ (function (_super) {
        __extends(Fold, _super);
        function Fold(cm) {
            var _this = _super.call(this, cm) || this;
            _this.cm = cm;
            /**
             * stores Folder status for current editor
             * @private To enable/disable folders, use `setStatus()`
             */
            _this._enabled = {};
            /** Folder's output goes here */
            _this.folded = {};
            /// END OF APIS THAT EXPOSED TO FolderFunc
            ///////////////////////////////////////////////////////////////////////////////////////////
            /**
             * Fold everything! (This is a debounced, and `this`-binded version)
             */
            _this.startFold = core_1.debounce(_this.startFoldImmediately.bind(_this), 100);
            /** stores every affected lineNo */
            _this._quickFoldHint = [];
            cm.on("changes", function (cm, changes) {
                var fromLine = changes.reduce(function (prev, curr) { return Math.min(prev, curr.from.line); }, cm.lastLine());
                _this.startFold();
            });
            cm.on("cursorActivity", function (cm) {
                _this.startQuickFold();
            });
            return _this;
        }
        /** enable/disable one kind of folder, in current editor */
        Fold.prototype.setStatus = function (type, enabled) {
            if (!(type in exports.folderRegistry))
                return;
            if (!this._enabled[type] !== !enabled) {
                this._enabled[type] = !!enabled;
                if (enabled)
                    this.startFold();
                else
                    this.clear(type);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        /// BEGIN OF APIS THAT EXPOSED TO FolderFunc
        /// @see FoldStream
        /**
         * Check if a range is foldable and update _quickFoldHint
         *
         * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
         */
        Fold.prototype.requestRange = function (from, to) {
            var cm = this.cm, cmpPos = CodeMirror.cmpPos;
            var cursorPos = cm.getCursor();
            var markers = cm.findMarks(from, to);
            var ans = RequestRangeResult.OK;
            if (markers.length !== 0)
                ans = RequestRangeResult.HAS_MARKERS;
            else if (cmpPos(cursorPos, from) >= 0 && cmpPos(cursorPos, to) <= 0)
                ans = RequestRangeResult.CURSOR_INSIDE;
            if (ans !== RequestRangeResult.OK)
                this._quickFoldHint.push(from.line);
            return ans;
        };
        /**
         * Fold everything!
         *
         * @param toLine last line to fold. Inclusive
         */
        Fold.prototype.startFoldImmediately = function (fromLine, toLine) {
            var _this = this;
            var cm = this.cm;
            fromLine = fromLine || cm.firstLine();
            toLine = (toLine || cm.lastLine()) + 1;
            this._quickFoldHint = [];
            this.setPos(fromLine, 0, true);
            cm.operation(function () { return cm.eachLine(fromLine, toLine, function (line) {
                var lineNo = line.lineNo();
                if (lineNo < _this.lineNo)
                    return; // skip current line...
                else if (lineNo > _this.lineNo)
                    _this.setPos(lineNo, 0); // hmmm... maybe last one is empty line
                var charMarked = new Array(line.text.length);
                {
                    // populate charMarked array.
                    // @see CodeMirror's findMarksAt
                    var lineMarkers = line.markedSpans;
                    if (lineMarkers) {
                        for (var i = 0; i < lineMarkers.length; ++i) {
                            var span = lineMarkers[i];
                            var spanFrom = span.from == null ? 0 : span.from;
                            var spanTo = span.to == null ? charMarked.length : span.to;
                            for (var j = spanFrom; j < spanTo; j++)
                                charMarked[j] = true;
                        }
                    }
                }
                var tokens = _this.lineTokens;
                while (_this.i_token < tokens.length) {
                    var token = tokens[_this.i_token];
                    var type;
                    var marker = null;
                    var tokenFoldable = true;
                    {
                        for (var i = token.start; i < token.end; i++) {
                            if (charMarked[i]) {
                                tokenFoldable = false;
                                break;
                            }
                        }
                    }
                    if (tokenFoldable) {
                        // try built-in folders
                        for (type in exports.folderRegistry) {
                            if (!_this._enabled[type])
                                continue;
                            if (marker = exports.folderRegistry[type](_this, token))
                                break;
                        }
                    }
                    if (!marker) {
                        // this token not folded. check next
                        _this.i_token++;
                    }
                    else {
                        var _a = marker.find(), from = _a.from, to = _a.to;
                        (_this.folded[type] || (_this.folded[type] = [])).push(marker);
                        marker.on('clear', function (from, to) {
                            var markers = _this.folded[type];
                            var idx;
                            if (markers && (idx = markers.indexOf(marker)) !== -1)
                                markers.splice(idx, 1);
                            _this._quickFoldHint.push(from.line);
                        });
                        if (DEBUG) {
                            console.log("[FOLD] New marker ", type, from, to, marker);
                        }
                        if (to.line !== lineNo) {
                            _this.setPos(to.line, to.ch);
                            return; // nothing left in this line
                        }
                        else {
                            _this.setPos(to.ch); // i_token will be updated by this.setPos()
                        }
                    }
                }
            }); });
        };
        /**
         * Start a quick fold: only process recent `requestRange`-failed ranges
         */
        Fold.prototype.startQuickFold = function () {
            var hint = this._quickFoldHint;
            if (hint.length === 0)
                return;
            var from = hint[0], to = from;
            for (var _i = 0, hint_1 = hint; _i < hint_1.length; _i++) {
                var lineNo = hint_1[_i];
                if (from > lineNo)
                    from = lineNo;
                if (to < lineNo)
                    to = lineNo;
            }
            this.startFold.stop();
            this.startFoldImmediately(from, to);
        };
        /**
         * Clear one type of folded TextMarkers
         *
         * @param type builtin folder type ("image", "link" etc) or custom fold type
         */
        Fold.prototype.clear = function (type) {
            this.startFold.stop();
            var folded = this.folded[type];
            if (!folded || !folded.length)
                return;
            var marker;
            while (marker = folded.pop())
                marker.clear();
        };
        /**
         * Clear all folding result
         */
        Fold.prototype.clearAll = function () {
            this.startFold.stop();
            for (var type in this.folded) {
                var folded = this.folded[type];
                var marker;
                while (marker = folded.pop())
                    marker.clear();
            }
        };
        return Fold;
    }(core_1.TokenSeeker));
    exports.Fold = Fold;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one Fold instance */
    exports.getAddon = core_1.Addon.Getter("Fold", Fold);
    /********************************************************************************** */
    // register default folders
    registerFolder("image", exports.ImageFolder, true);
    registerFolder("link", exports.LinkFolder, true);
});
