"use client";

import { useEffect, useRef } from "react";
import type { ClipboardEvent, SVGProps } from "react";
import { sanitizeRichText } from "@/lib/sanitize";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const HeadingIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6 5v14M18 5v14M6 12h12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BoldIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M8 5h6a3.5 3.5 0 010 7H8z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 12h6.5a3.5 3.5 0 010 7H8z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ItalicIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M16 5h-6M14 19H8M14 5l-4 14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UnderlineIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M7 5v6a5 5 0 1010 0V5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 19h12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BulletedListIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="5" cy="6" r="1.5" fill="currentColor" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="5" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const NumberedListIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 5.5l-1 1.5h1v3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 12.75a1.25 1.25 0 112.5 0c0 .69-.56 1-1.25 1h-.5v1.75h1.75" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 18.5h2.5l-2.5 3h2.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const COMMANDS: Array<{ icon: IconComponent; command: "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "formatBlock"; value?: string; label: string }> = [
  { icon: HeadingIcon, command: "formatBlock", value: "h3", label: "Heading level 3" },
  { icon: BoldIcon, command: "bold", label: "Bold" },
  { icon: ItalicIcon, command: "italic", label: "Italic" },
  { icon: UnderlineIcon, command: "underline", label: "Underline" },
  { icon: BulletedListIcon, command: "insertUnorderedList", label: "Bulleted list" },
  { icon: NumberedListIcon, command: "insertOrderedList", label: "Numbered list" }
];

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  const placeCaretAtEnd = () => {
    const element = editorRef.current;
    if (!element) {
      return;
    }
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const sanitized = sanitizeRichText(value);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) {
      return;
    }
    const sanitized = sanitizeRichText(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
      placeCaretAtEnd();
    }
    onChange(sanitized);
  };

  const applyCommand = (command: typeof COMMANDS[number]["command"], value?: string) => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.focus();
    document.execCommand(command, false, value ?? undefined);
    handleInput();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div
      className="rich-text-editor-wrapper"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div className="rich-text-editor__toolbar">
        {COMMANDS.map((item) => (
          <button
            key={item.command}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyCommand(item.command, item.value)}
            className="rich-text-editor__toolbar-btn"
            aria-label={item.label}
          >
            <item.icon className="rich-text-editor__toolbar-icon" strokeWidth={2} />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
        style={{
          padding: "1rem",
          minHeight: "220px",
          outline: "none",
          fontFamily: "inherit"
        }}
        data-placeholder={placeholder}
        className="rich-text-editor"
      />
      <style jsx>{`
        .rich-text-editor-wrapper:focus-within {
          border-color: var(--border-focus);
          box-shadow: var(--input-shadow);
        }
        .rich-text-editor__toolbar {
          display: flex;
          gap: 0.5rem;
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid var(--border);
          background: rgba(148, 163, 184, 0.12);
        }
        .rich-text-editor__toolbar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .rich-text-editor__toolbar-btn:hover,
        .rich-text-editor__toolbar-btn:focus-visible {
          background: rgba(148, 163, 184, 0.25);
          border-color: rgba(148, 163, 184, 0.4);
        }
        .rich-text-editor__toolbar-btn:active {
          background: rgba(148, 163, 184, 0.35);
        }
        .rich-text-editor__toolbar-icon {
          width: 1rem;
          height: 1rem;
        }
        .rich-text-editor:empty::before {
          content: attr(data-placeholder);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
