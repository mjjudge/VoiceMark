import { useState } from "react";
import { EditorState, Modifier, convertToRaw } from "draft-js";
import "draft-js/dist/Draft.css";
import "./Editor.css";

// Fix exportMarkdown hoisting issue by converting it to a function declaration and placing it above useEditor
// Improve exportMarkdown based on requirements
function exportMarkdown(editorState) {
    const contentState = editorState.getCurrentContent();
    let raw = convertToRaw(contentState);

    return raw.blocks
        .map(block => {
            let text = block.text;

            // Ensure <br> is converted to newlines
            text = text.replace(/<br>/g, '\n');

            // Collapses 3+ sequential newlines to a maximum of 2
            text = text.replace(/(\n\n\n+)/g, '\n\n');

            // Removes trailing newline caused by final </p>
            text = text.replace(/\n$/, '');

            // Keeps <u> tags intact (assuming <u> is already wrapped properly in the raw content)
            return block.type === 'unstyled' ? text : `<${block.type}>${text}</${block.type}>`;
        })
        .join("\n\n");
}

const useEditor = () => {
    const [editorState, setEditorState] = useState(() => EditorState.createEmpty());

    const toggleInlineStyle = (inlineStyle) => {
        const newState = EditorState.push(
            editorState,
            Modifier.applyInlineStyle(
                editorState.getCurrentContent(),
                editorState.getSelection(),
                inlineStyle
            ),
            "change-inline-style"
        );
        setEditorState(newState);
    };

    return {
        editorState,
        setEditorState,
        toggleInlineStyle
    };
};

const Editor = () => {
    const { editorState, setEditorState } = useEditor();

    const toggleDebug = () => {
        const debug = document.querySelector(".debug");
        debug.style.display = debug.style.display === "none" ? "block" : "none";
    };

    return (
        <div className="editor-container">
            <div className="toolbar">
                <button type="button" onClick={() => console.log("Bold")}>Bold</button>
                <button type="button" onClick={() => console.log("Italic")}>Italic</button>
                <button type="button" onClick={() => console.log("Underline")}>Underline</button>
            </div>

            <div className="editor">
                <div
                    className="editor-input"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                        // Handle input
                    }}
                />
            </div>
            
            <div className="debug">
                <p>Debug: Markdown output (approx)</p>
                <pre>{exportMarkdown(editorState)}</pre>
            </div>

            <button type="button" onClick={toggleDebug}>Toggle Debug</button>
        </div>
    );
};

export default Editor;