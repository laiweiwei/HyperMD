import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable HideToken features or not. */
    enabled: boolean;
    /** Add `hmd-inactive-line` style to inactive lines or not */
    line: boolean;
    /** @internal reserved yet */
    tokenTypes: string[];
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | string | string[];
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for HideToken.
             *
             * You may also provide a `false` to disable it; a `true` to enable it with defaultOption (except `enabled`);
             * or token types (as string array, or just a string with "|" as separator inside)
             */
            hmdHideToken?: OptionValueType;
        }
    }
}
export declare class HideToken implements Addon.Addon, Options {
    cm: cm_t;
    tokenTypes: string[];
    line: boolean;
    enabled: boolean;
    constructor(cm: cm_t);
    /** a map storing shown tokens' beginning ch */
    shownTokensStart: {
        [line: number]: number[];
    };
    renderLineHandler: (cm: CodeMirror.Editor, line: CodeMirror.LineHandle, el: HTMLPreElement) => void;
    /**
     * fetch cursor position and re-calculate shownTokensStart
     */
    calcShownTokenStart(): {
        [line: number]: number[];
    };
    /**
     * hide/show <span>s in one line
     * @see this.shownTokensStart
     * @returns apperance changed since which char. -1 means nothing changed.
     */
    procLine(line: CodeMirror.LineHandle, pre?: HTMLPreElement): number;
    cursorActivityHandler: (doc: CodeMirror.Doc) => void;
    update: {
        (): void;
        stop(): void;
    };
    updateImmediately(): void;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
export declare const getAddon: (cm: CodeMirror.Editor) => HideToken;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            HideToken?: HideToken;
        }
    }
}
