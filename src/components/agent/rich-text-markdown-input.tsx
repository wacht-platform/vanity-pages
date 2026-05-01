"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
    IconBold,
    IconCode,
    IconItalic,
    IconList,
    IconListNumbers,
} from "@tabler/icons-react";
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
    disabled?: boolean;
    onSubmit?: () => void;
    showToolbar?: boolean;
    className?: string;
    contentClassName?: string;
};

export function RichTextMarkdownInput({
    value,
    onChange,
    placeholder,
    disabled = false,
    onSubmit,
    showToolbar = false,
    className,
    contentClassName,
}: RichTextMarkdownInputProps) {
    const onSubmitRef = React.useRef(onSubmit);

    React.useEffect(() => {
        onSubmitRef.current = onSubmit;
    }, [onSubmit]);

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
        editable: !disabled,
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
            handleKeyDown: (_view, event) => {
                if (event.key !== "Enter" || event.shiftKey) return false;
                event.preventDefault();
                onSubmitRef.current?.();
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editorHTMLToMarkdown(editor.getHTML()));
        },
    });

    React.useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

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

    const toolbarActions = editor
        ? [
              {
                  label: "Bold",
                  icon: <IconBold className="h-3.5 w-3.5" />,
                  active: editor.isActive("bold"),
                  run: () => editor.chain().focus().toggleBold().run(),
              },
              {
                  label: "Italic",
                  icon: <IconItalic className="h-3.5 w-3.5" />,
                  active: editor.isActive("italic"),
                  run: () => editor.chain().focus().toggleItalic().run(),
              },
              {
                  label: "Code",
                  icon: <IconCode className="h-3.5 w-3.5" />,
                  active: editor.isActive("code"),
                  run: () => editor.chain().focus().toggleCode().run(),
              },
              {
                  label: "Bulleted list",
                  icon: <IconList className="h-3.5 w-3.5" />,
                  active: editor.isActive("bulletList"),
                  run: () => editor.chain().focus().toggleBulletList().run(),
              },
              {
                  label: "Numbered list",
                  icon: <IconListNumbers className="h-3.5 w-3.5" />,
                  active: editor.isActive("orderedList"),
                  run: () => editor.chain().focus().toggleOrderedList().run(),
              },
          ]
        : [];

    return (
        <div className={cn("rich-text-markdown-input", className)}>
            {showToolbar && toolbarActions.length > 0 ? (
                <div className="mb-2 flex items-center gap-1">
                    {toolbarActions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            title={action.label}
                            disabled={disabled}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                action.run();
                            }}
                            className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                                action.active && "bg-accent text-foreground",
                            )}
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            ) : null}
            <EditorContent editor={editor} />
        </div>
    );
}
