"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import { cn } from "@/lib/utils";

const markdownRenderer = new MarkdownIt({
    breaks: true,
    linkify: true,
});

const markdownSerializer = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    headingStyle: "atx",
});

function normalizeMarkdown(value: string) {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    return trimmed;
}

function looksLikeHTML(value: string) {
    const trimmed = value.trim();
    return /^<([a-z][a-z0-9]*)\b[^>]*>/i.test(trimmed);
}

function markdownToEditorHTML(value: string) {
    const normalized = normalizeMarkdown(value);
    if (!normalized) return "<p></p>";
    if (looksLikeHTML(normalized)) return normalized;
    return markdownRenderer.render(normalized);
}

function editorHTMLToMarkdown(value: string) {
    const trimmed = value.trim();
    if (
        trimmed === "" ||
        trimmed === "<p></p>" ||
        trimmed === "<p><br></p>"
    ) {
        return "";
    }

    return normalizeMarkdown(markdownSerializer.turndown(trimmed));
}

type RichTextMarkdownInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    contentClassName?: string;
};

export function RichTextMarkdownInput({
    value,
    onChange,
    placeholder,
    className,
    contentClassName,
}: RichTextMarkdownInputProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
            }),
            Underline,
            Placeholder.configure({
                placeholder: placeholder || "",
            }),
        ],
        content: markdownToEditorHTML(value),
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm max-w-none outline-none",
                    "prose-p:my-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
                    "prose-strong:text-inherit prose-em:text-inherit prose-headings:text-inherit",
                    contentClassName,
                ),
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editorHTMLToMarkdown(editor.getHTML()));
        },
    });

    React.useEffect(() => {
        if (!editor) return;
        const currentMarkdown = editorHTMLToMarkdown(editor.getHTML());
        const nextMarkdown = normalizeMarkdown(value);
        if (currentMarkdown !== nextMarkdown) {
            editor.commands.setContent(markdownToEditorHTML(nextMarkdown), {
                emitUpdate: false,
            });
        }
    }, [editor, value]);

    return (
        <div className={className}>
            <EditorContent editor={editor} />
        </div>
    );
}
