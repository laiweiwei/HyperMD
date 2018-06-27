/**
 * Ready-to-use functions that powers up your Markdown editor
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("codemirror/addon/fold/foldcode"), require("codemirror/addon/fold/foldgutter"), require("codemirror/addon/fold/markdown-fold"), require("codemirror/addon/edit/closebrackets"), require("codemirror/lib/codemirror.css"), require("codemirror/addon/fold/foldgutter.css"), require("../theme/hypermd-light.css")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","codemirror/addon/fold/foldcode","codemirror/addon/fold/foldgutter","codemirror/addon/fold/markdown-fold","codemirror/addon/edit/closebrackets","codemirror/lib/codemirror.css","codemirror/addon/fold/foldgutter.css","../theme/hypermd-light.css"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), CodeMirror);
})(function (require, exports, CodeMirror) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * The default configuration that used by `HyperMD.fromTextArea`
     *
     * Addons may update this object freely!
     */
    exports.suggestedEditorConfig = {
        lineNumbers: true,
        lineWrapping: true,
        theme: "hypermd-light",
        mode: "text/x-hypermd",
        tabSize: 4,
        autoCloseBrackets: true,
        foldGutter: true,
        gutters: [
            "CodeMirror-linenumbers",
            "CodeMirror-foldgutter",
            "HyperMD-goback" // (addon: click) 'back' button for footnotes
        ],
    };
    /**
     * Initialize an editor from a <textarea>
     * Calling `CodeMirror.fromTextArea` with recommended HyperMD options
     *
     * @see CodeMirror.fromTextArea
     *
     * @param {HTMLTextAreaElement} textArea
     * @param {object} [config]
     * @returns {cm_t}
     */
    function fromTextArea(textArea, config) {
        var final_config = __assign({}, exports.suggestedEditorConfig, config);
        var cm = CodeMirror.fromTextArea(textArea, final_config);
        return cm;
    }
    exports.fromTextArea = fromTextArea;
    function switchToNormal(editor, options_or_theme) {
        var opt = {
            theme: "default",
            hmdFold: false,
            hmdHideToken: false,
            hmdTableAlign: false,
        };
        if (typeof options_or_theme === 'string')
            options_or_theme = { theme: options_or_theme };
        Object.assign(opt, options_or_theme);
        for (var key in opt) {
            editor.setOption(key, opt[key]);
        }
    }
    exports.switchToNormal = switchToNormal;
    function switchToHyperMD(editor, options_or_theme) {
        if (typeof options_or_theme === 'string')
            options_or_theme = { theme: options_or_theme };
        var opt = __assign({}, exports.suggestedEditorConfig, options_or_theme);
        for (var key in opt) {
            editor.setOption(key, opt[key]);
        }
    }
    exports.switchToHyperMD = switchToHyperMD;
});
