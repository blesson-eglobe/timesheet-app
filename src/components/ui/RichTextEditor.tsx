import React, { useRef, useEffect } from "react";

interface RichTextEditorProps {
	value: string;
	onChange?: (html: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	minHeight?: number;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
	value,
	onChange,
	placeholder = "Add detailed task description, bullet points, or notes...",
	readOnly = false,
	minHeight = 110,
}) => {
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
			editorRef.current.innerHTML = value || "";
		}
	}, [value]);

	const exec = (command: string, val: string | undefined = undefined) => {
		document.execCommand(command, false, val);
		if (editorRef.current && onChange) {
			onChange(editorRef.current.innerHTML);
		}
	};

	const handleInput = () => {
		if (editorRef.current && onChange) {
			onChange(editorRef.current.innerHTML);
		}
	};

	if (readOnly) {
		if (!value || value.trim() === "" || value === "<br>") {
			return (
				<div className="rich-text-editor__empty-readonly">
					No task description provided.
				</div>
			);
		}
		return (
			<div
				className="rich-text-content rich-text-editor__readonly-content"
				dangerouslySetInnerHTML={{ __html: value }}
			/>
		);
	}

	return (
		<div className="rich-text-editor">
			{/* Toolbar */}
			<div className="rich-text-editor__toolbar">
				<button
					type="button"
					onClick={() => exec("bold")}
					title="Bold (Ctrl+B)"
					className="rich-text-editor__btn rich-text-editor__btn--bold"
				>
					<b>B</b>
				</button>
				<button
					type="button"
					onClick={() => exec("italic")}
					title="Italic (Ctrl+I)"
					className="rich-text-editor__btn rich-text-editor__btn--italic"
				>
					<i>I</i>
				</button>
				<div className="rich-text-editor__divider" />
				<button
					type="button"
					onClick={() => exec("insertUnorderedList")}
					title="Bullet List"
					className="rich-text-editor__btn"
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
						<circle cx="3" cy="4" r="1.8" />
						<circle cx="3" cy="8" r="1.8" />
						<circle cx="3" cy="12" r="1.8" />
						<path
							d="M7 4h8M7 8h8M7 12h8"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					onClick={() => exec("insertOrderedList")}
					title="Numbered List"
					className="rich-text-editor__btn"
				>
					<span className="rich-text-editor__num-icon">1.</span>
				</button>
				<div className="rich-text-editor__divider" />
				<button
					type="button"
					onClick={() => exec("removeFormat")}
					title="Clear formatting"
					className="rich-text-editor__btn rich-text-editor__btn--clear"
				>
					Clear
				</button>
			</div>

			{/* ContentEditable Area */}
			<div
				ref={editorRef}
				contentEditable
				onInput={handleInput}
				className="rich-text-editor-area rich-text-editor__area"
				style={{ minHeight }}
			/>
		</div>
	);
};
