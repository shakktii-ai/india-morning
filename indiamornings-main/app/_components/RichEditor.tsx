"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

import { useEffect, useMemo, useRef } from "react";
import { applyWatermark } from "@/src/utils/watermark";

export default function RichEditor({ value, onChange, placeholder, style }: RichEditorProps) {
  const quillRef = useRef<any>(null);

  useEffect(() => {
    // Quill doesn't provide titles for toolbar buttons by default. 
    // This helper adds them for better UX.
    const addButtonTitles = () => {
      const tooltips: Record<string, string> = {
        'ql-bold': 'Bold',
        'ql-italic': 'Italic',
        'ql-underline': 'Underline',
        'ql-strike': 'Strike',
        'ql-blockquote': 'Blockquote',
        'ql-list[value="ordered"]': 'Ordered List',
        'ql-list[value="bullet"]': 'Bullet List',
        'ql-indent[value="-1"]': 'Decrease Indent',
        'ql-indent[value="+1"]': 'Increase Indent',
        'ql-link': 'Insert Link',
        'ql-image': 'Insert Image',
        'ql-clean': 'Clear Formatting',
        'ql-header[value="2"]': 'Heading 2',
        'ql-header[value="3"]': 'Heading 3',
        'ql-header': 'Heading',
        'ql-align': 'Text Align',
        'ql-align[value="center"]': 'Align Center',
        'ql-align[value="right"]': 'Align Right',
        'ql-align[value="justify"]': 'Justify'
      };

      Object.entries(tooltips).forEach(([selector, title]) => {
        const elements = document.querySelectorAll(`.${selector}`);
        elements.forEach(el => {
          if (!el.getAttribute('title')) {
            el.setAttribute('title', title);
          }
        });
      });

      // Special handling for the header dropdown pickers if they exist
      const pickers = document.querySelectorAll('.ql-header .ql-picker-label');
      pickers.forEach(p => {
        if (!p.getAttribute('title')) p.setAttribute('title', 'Headline Size');
      });
    };

    // Delay slightly to ensure Quill has rendered the toolbar
    const timer = setTimeout(addButtonTitles, 500);
    return () => clearTimeout(timer);
  }, []);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        // Apply watermark
        const watermarkedFile = await applyWatermark(file);

        // Upload to server
        const formData = new FormData();
        formData.append("file", watermarkedFile);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();

        // Insert into editor
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          quill.insertEmbed(range.index, "image", data.url);
        }
      } catch (err) {
        console.error("Image upload error:", err);
        alert("Failed to upload image with watermark");
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'align',
    'link', 'image'
  ];

  const Quill = ReactQuill as any;

  return (
    <div className="rich-editor-wrapper" style={style}>
      <Quill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ background: "#fff" }}
      />
      <style jsx global>{`
        .ql-container {
          height: 350px !important;
          font-size: 16px;
        }
        .ql-editor {
          max-height: 350px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
