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

      // Social button title
      const socialBtn = document.querySelector('.ql-social') as HTMLElement | null;
      if (socialBtn && !socialBtn.getAttribute('title')) {
        socialBtn.setAttribute('title', 'Social Media Embed (Twitter, Instagram, FB)');
      }
    };

    // Delay slightly to ensure Quill has rendered the toolbar
    const timer = setTimeout(addButtonTitles, 500);
    return () => clearTimeout(timer);
  }, []);

  const socialHandler = () => {
    const url = prompt("Enter Social Media URL (Twitter/X, Instagram, Facebook):");
    if (!url) return;

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Clean URL: strip query parameters for better canonical matching
    const cleanUrl = url.split('?')[0].split('#')[0];
    const targetUrl = cleanUrl;

    const range = quill.getSelection(true);
    let html = "";

    // Clean URL (remove query params for canonical matching if needed, but platforms usually handle it)
    if (targetUrl.includes("twitter.com") || targetUrl.includes("x.com")) {
      html = `<blockquote class="twitter-tweet" data-lang="en"><a href="${targetUrl}">${targetUrl}</a></blockquote>`;
    } else if (targetUrl.includes("instagram.com")) {
      html = `<blockquote class="instagram-media" data-instgrm-permalink="${targetUrl}" data-instgrm-version="14"><a href="${targetUrl}">${targetUrl}</a></blockquote>`;
    } else if (targetUrl.includes("facebook.com")) {
      // Facebook SDK expectsfb-post class with data-href
      html = `<div class="fb-post" data-href="${targetUrl}" data-show-text="true"><blockquote cite="${targetUrl}" class="fb-xfbml-parse-ignore"><a href="${targetUrl}">${targetUrl}</a></blockquote></div>`;
    } else {
      alert("Unsupported platform. Please enter a valid Twitter, Instagram, or Facebook URL.");
      return;
    }

    // Insert as HTML and move cursor below
    quill.clipboard.dangerouslyPasteHTML(range.index, html + "<p><br></p>");
  };

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
        ['link', 'image', 'social'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        social: socialHandler
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
        .ql-social::before {
          content: "📱";
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .ql-social:hover::after {
          content: "Embed Social Media";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 100;
        }
      `}</style>
    </div>
  );
}
