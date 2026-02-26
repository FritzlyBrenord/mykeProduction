"use client";

import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Link as LinkIcon,
  Undo,
  Redo,
  Quote,
  Code,
  Table as TableIcon,
  CheckSquare,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Highlighter,
  Video as VideoIcon,
  Upload as UploadIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ElementType,
  type ChangeEvent,
} from "react";

import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);
const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const VIDEO_FILE_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "ogg",
  "mov",
  "m4v",
  "mkv",
  "avi",
]);
const IMAGE_FILE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
]);

const VideoNode = TiptapNode.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes({ controls: true, preload: "metadata" }, HTMLAttributes),
    ];
  },
});

function getYoutubeVideoId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match?.[1] ?? null;
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extension.replace(/[^a-z0-9]/g, "");
}

interface MenuButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: ElementType;
  title: string;
}

const MenuButton = ({
  onClick,
  isActive = false,
  icon: Icon,
  title,
}: MenuButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={cn(
      "p-2 rounded-lg transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
      isActive
        ? "bg-[var(--primary)] text-white shadow-sm"
        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
    )}
  >
    <Icon size={18} />
  </button>
);

const Divider = () => <div className="w-px h-6 bg-[var(--border)] mx-1" />;

type UploadConfig = {
  imageEndpoint?: string;
  videoEndpoint?: string;
  videoFormData?: Record<string, string>;
};

export interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  uploadConfig?: UploadConfig;
}

const RichTextEditor = ({
  content = "",
  onChange,
  placeholder = "Commencez a rediger votre article...",
  className,
  uploadConfig,
}: RichTextEditorProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const imageUploadEndpoint =
    uploadConfig?.imageEndpoint ?? "/api/admin/formations/upload-image";
  const videoUploadEndpoint =
    uploadConfig?.videoEndpoint ?? "/api/admin/formations/upload-video";
  const videoUploadFormData = uploadConfig?.videoFormData ?? {
    formationId: "general",
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "underline",
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        allowFullscreen: true,
        HTMLAttributes: { class: "rich-editor-youtube" },
      }),
      VideoNode,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = content ?? "";
    const currentContent = editor.getHTML();
    const isEquivalentEmpty = !nextContent && editor.isEmpty;

    if (isEquivalentEmpty || nextContent === currentContent) return;
    editor.commands.setContent(nextContent, { emitUpdate: false });
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!linkUrl || !editor) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const insertVideo = useCallback(
    (url: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "video",
          attrs: { src: url, controls: true },
        })
        .run();
      editor.chain().focus().insertContent("<p></p>").run();
    },
    [editor]
  );

  const insertMediaFromUrl = useCallback(() => {
    if (!editor) return;

    const value = mediaUrl.trim();
    if (!value) return;

    if (!isHttpUrl(value)) {
      setMediaError("URL invalide. Utilisez une URL http(s).");
      return;
    }

    const youtubeId = getYoutubeVideoId(value);

    if (youtubeId) {
      editor
        .chain()
        .focus()
        .setYoutubeVideo({
          src: `https://www.youtube.com/watch?v=${youtubeId}`,
          width: 840,
          height: 472,
        })
        .run();
    } else if (VIDEO_URL_PATTERN.test(value)) {
      insertVideo(value);
    } else {
      editor.chain().focus().setImage({ src: value }).run();
    }

    setMediaError("");
    setMediaUrl("");
    setShowMediaInput(false);
  }, [editor, insertVideo, mediaUrl]);

  const uploadMediaFile = useCallback(
    async (file: File) => {
      if (!editor) return;

      const ext = getFileExtension(file.name);
      const isImage =
        file.type.startsWith("image/") || IMAGE_FILE_EXTENSIONS.has(ext);
      const isVideo =
        file.type.startsWith("video/") || VIDEO_FILE_EXTENSIONS.has(ext);

      if (!isImage && !isVideo) {
        setMediaError("Type non supporte. Choisissez une image ou une video.");
        return;
      }

      const endpoint = isVideo ? videoUploadEndpoint : imageUploadEndpoint;
      const formData = new FormData();
      formData.append("file", file);

      if (isVideo) {
        Object.entries(videoUploadFormData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      setMediaError("");
      setUploadingMedia(true);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const payload = (await response
          .json()
          .catch(() => null)) as { url?: string; error?: string } | null;

        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error || "Upload media echoue.");
        }

        if (isVideo) {
          insertVideo(payload.url);
        } else {
          editor.chain().focus().setImage({ src: payload.url }).run();
        }

        setMediaUrl("");
        setShowMediaInput(false);
      } catch (error) {
        setMediaError(
          error instanceof Error ? error.message : "Upload media echoue."
        );
      } finally {
        setUploadingMedia(false);
      }
    },
    [
      editor,
      imageUploadEndpoint,
      insertVideo,
      videoUploadEndpoint,
      videoUploadFormData,
    ]
  );

  const onMediaFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      await uploadMediaFile(file);
    },
    [uploadMediaFile]
  );

  const insertTable = useCallback(() => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "rich-editor w-full max-w-4xl mx-auto rounded-xl shadow-sm border border-[var(--border)] overflow-hidden bg-[var(--card)] text-[var(--foreground)]",
        className
      )}
    >
      <div className="bg-[var(--card)] border-b border-[var(--border)] p-3 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        <div className="flex gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            title="Annuler"
          />
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            title="Retablir"
          />
        </div>

        <Divider />

        <div className="flex gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            icon={Bold}
            title="Gras"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            icon={Italic}
            title="Italique"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            icon={UnderlineIcon}
            title="Souligne"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            icon={Strikethrough}
            title="Barre"
          />
        </div>

        <Divider />

        <div className="flex gap-1">
          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            isActive={editor.isActive("heading", { level: 1 })}
            icon={Heading1}
            title="Titre 1"
          />
          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={editor.isActive("heading", { level: 2 })}
            icon={Heading2}
            title="Titre 2"
          />
          <MenuButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={editor.isActive("heading", { level: 3 })}
            icon={Heading3}
            title="Titre 3"
          />
        </div>

        <Divider />

        <div className="flex gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            icon={List}
            title="Liste a puces"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            icon={ListOrdered}
            title="Liste numerotee"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            icon={CheckSquare}
            title="Liste de taches"
          />
        </div>

        <Divider />

        <div className="flex gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={editor.isActive({ textAlign: "left" })}
            icon={AlignLeft}
            title="Aligner a gauche"
          />
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            icon={AlignCenter}
            title="Centrer"
          />
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            icon={AlignRight}
            title="Aligner a droite"
          />
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            isActive={editor.isActive({ textAlign: "justify" })}
            icon={AlignJustify}
            title="Justifier"
          />
        </div>

        <Divider />

        <div className="flex gap-1 items-center">
          <div className="relative">
            <MenuButton
              onClick={() => {
                setShowMediaInput((previous) => !previous);
                setShowLinkInput(false);
                setMediaError("");
              }}
              icon={ImageIcon}
              title="Inserer media"
            />
            {showMediaInput && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl flex flex-col gap-2 z-50 min-w-[320px]">
                <p className="text-xs text-[var(--muted)]">
                  URL YouTube/image/video ou upload vers Supabase
                </p>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                  placeholder="https://..."
                  className="px-3 py-2 border border-[var(--border)] rounded text-sm bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)]"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    insertMediaFromUrl();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={insertMediaFromUrl}
                    className="px-3 py-2 bg-[var(--primary)] text-white rounded text-xs hover:opacity-90"
                  >
                    <VideoIcon size={14} className="inline mr-1" />
                    Inserer URL
                  </button>
                  <label className="px-3 py-2 border border-[var(--border)] rounded text-xs cursor-pointer hover:bg-[var(--background)]">
                    <UploadIcon size={14} className="inline mr-1" />
                    {uploadingMedia ? "Upload..." : "Uploader"}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={onMediaFileChange}
                      disabled={uploadingMedia}
                    />
                  </label>
                </div>
                {mediaError ? (
                  <p className="text-xs text-red-500">{mediaError}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="relative">
            <MenuButton
              onClick={() => {
                setShowLinkInput((previous) => !previous);
                setShowMediaInput(false);
              }}
              isActive={editor.isActive("link")}
              icon={LinkIcon}
              title="Ajouter un lien"
            />
            {showLinkInput && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl flex gap-2 z-50">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://..."
                  className="px-3 py-1 border border-[var(--border)] rounded text-sm w-48 bg-transparent text-[var(--foreground)] placeholder:text-[var(--muted)]"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addLink();
                  }}
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="px-3 py-1 bg-[var(--primary)] text-white rounded text-sm hover:opacity-90"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          <MenuButton
            onClick={insertTable}
            icon={TableIcon}
            title="Inserer un tableau"
          />
        </div>

        <Divider />

        <div className="flex gap-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            icon={Quote}
            title="Citation"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            icon={Code}
            title="Bloc de code"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive("subscript")}
            icon={SubscriptIcon}
            title="Indice"
          />
          <MenuButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive("superscript")}
            icon={SuperscriptIcon}
            title="Exposant"
          />
        </div>

        <Divider />

        <div className="flex gap-1 items-center">
          <input
            type="color"
            onChange={(event) =>
              editor.chain().focus().setColor(event.target.value).run()
            }
            value={editor.getAttributes("textStyle").color || "#1e293b"}
            className="w-8 h-8 rounded cursor-pointer border border-[var(--border)] p-0"
            title="Couleur du texte"
            aria-label="Couleur du texte"
          />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              editor.isActive("highlight")
                ? "bg-yellow-300 text-zinc-950"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
            )}
            title="Surligner"
            aria-label="Surligner"
          >
            <Highlighter size={18} />
          </button>
        </div>
      </div>

      <BubbleMenu
        editor={editor}
        className="bg-[var(--card)] shadow-xl border border-[var(--border)] rounded-lg p-1 flex gap-1"
      >
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={Bold}
          title="Gras"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={Italic}
          title="Italique"
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          icon={Highlighter}
          title="Surligner"
        />
        <input
          type="color"
          onChange={(event) =>
            editor.chain().focus().setColor(event.target.value).run()
          }
          value={editor.getAttributes("textStyle").color || "#1e293b"}
          className="w-6 h-6 rounded cursor-pointer border border-[var(--border)]"
          aria-label="Couleur du texte"
        />
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        className="bg-[var(--card)] shadow-xl border border-[var(--border)] rounded-lg p-2 flex gap-2"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--background)] rounded text-sm text-[var(--foreground)]"
        >
          <Heading2 size={16} /> Titre
        </button>
        <button
          type="button"
          onClick={() => {
            setShowMediaInput(true);
            setShowLinkInput(false);
          }}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--background)] rounded text-sm text-[var(--foreground)]"
        >
          <ImageIcon size={16} /> Media
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--background)] rounded text-sm text-[var(--foreground)]"
        >
          <List size={16} /> Liste
        </button>
      </FloatingMenu>

      <div className="p-6 min-h-[500px]">
        <EditorContent editor={editor} className="rich-editor-content article-content" />
      </div>

      <div className="bg-[var(--background)]/60 border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] flex justify-between items-center">
        <span>
          {editor.storage.characterCount?.characters?.() || editor.getText().length}{" "}
          caracteres
        </span>
        <span className="text-xs">
          {editor.isFocused ? "Edition en cours..." : "Cliquez pour editer"}
        </span>
      </div>

      <style jsx global>{`
        .rich-editor .ProseMirror {
          outline: none;
          min-height: 400px;
          color: var(--foreground);
        }

        .rich-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: var(--muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .rich-editor .ProseMirror a {
          color: var(--primary);
          text-decoration: underline;
        }

        .rich-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
        }

        .rich-editor .ProseMirror iframe,
        .rich-editor .ProseMirror video {
          width: 100%;
          max-width: 100%;
          border: 0;
          border-radius: 8px;
          margin: 1rem 0;
          aspect-ratio: 16 / 9;
          background: #000;
        }

        .rich-editor .ProseMirror blockquote {
          border-left: 4px solid var(--border);
          padding-left: 1rem;
          font-style: italic;
          color: var(--muted);
        }

        .rich-editor .ProseMirror pre {
          background: var(--primary-dark);
          color: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
        }

        .rich-editor .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }

        .rich-editor .ProseMirror th,
        .rich-editor .ProseMirror td {
          border: 1px solid var(--border);
          padding: 0.5rem;
          text-align: left;
        }

        .rich-editor .ProseMirror th {
          background: var(--background);
          font-weight: 600;
        }

        .rich-editor .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }

        .rich-editor .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .rich-editor .ProseMirror ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export { RichTextEditor };
export default RichTextEditor;
