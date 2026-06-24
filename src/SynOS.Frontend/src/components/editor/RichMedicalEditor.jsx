import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { MacrosApi } from '@/api/macros';
import { cn } from "@/lib/utils";
import { Mark } from '@tiptap/core';

export const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="font-size"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => {
        return chain().setMark(this.name, { size }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      },
    };
  },
});

export const FontFamily = Mark.create({
  name: 'fontFamily',
  addAttributes() {
    return {
      font: {
        default: null,
        parseHTML: element => element.style.fontFamily,
        renderHTML: attributes => {
          if (!attributes.font) return {};
          return { style: `font-family: ${attributes.font}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="font-family"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
  addCommands() {
    return {
      setFontFamily: font => ({ chain }) => {
        return chain().setMark(this.name, { font }).run();
      },
      unsetFontFamily: () => ({ chain }) => {
        return chain().unsetMark(this.name).run();
      },
    };
  },
});
import { 
    Bold, 
    Italic, 
    Underline as UnderlineIcon, 
    Table as TableIcon, 
    List, 
    ListOrdered,
    AlignLeft, 
    AlignCenter, 
    AlignRight,
    Command,
    X,
    FolderGit2,
    Sparkles,
    FileSpreadsheet,
    FlameKindling,
    Settings,
    Trash2
} from 'lucide-react';


export function RichMedicalEditor({ 
    value, 
    onChange, 
    placeholder = "Start typing here or type '/' for medical macros...",
    disabled = false,
    patientContext = null,
    onSaveDraft = null,
    onOpenMacroManager = null,
    className
}) {
    const [wordCount, setWordCount] = useState(0);
    const [currentPath, setCurrentPath] = useState('p');
    
    // Command Palette state
    const [slashOpen, setSlashOpen] = useState(false);
    const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });
    const [slashFilter, setSlashFilter] = useState('');
    const [slashIndex, setSlashIndex] = useState(0);
    const slashSearchPos = useRef(-1);
    const lastValueRef = useRef(undefined);
    console.log("[RichMedicalEditor.jsx] Initializing lastValueRef.current to:", lastValueRef.current);
    const containerRef = useRef(null);

    // Right-Click Context Menu state
    const [contextMenu, setContextMenu] = useState(null);

    // Personal and System Snippets loaded from backend database storage
    const [personalSnippets, setPersonalSnippets] = useState([]);
    const [systemSnippets, setSystemSnippets] = useState([]);

    const fetchMacros = async () => {
        try {
            const data = await MacrosApi.getMacros();
            const personal = data.filter(m => m.scope?.toUpperCase() === 'PERSONAL' || !m.isSystem);
            const system = data.filter(m => m.scope?.toUpperCase() === 'SYSTEM' || m.isSystem);
            setPersonalSnippets(personal);
            setSystemSnippets(system);
            
            // Optionally update cache for fallback/offline/instant load
            localStorage.setItem('synos_personal_snippets_cache', JSON.stringify(personal));
            localStorage.setItem('synos_system_snippets_cache', JSON.stringify(system));
        } catch (err) {
            console.error("Failed to fetch macros from backend database", err);
            // Load from optional cache if available
            try {
                const cachedPersonal = localStorage.getItem('synos_personal_snippets_cache');
                if (cachedPersonal) setPersonalSnippets(JSON.parse(cachedPersonal));
                const cachedSystem = localStorage.getItem('synos_system_snippets_cache');
                if (cachedSystem) setSystemSnippets(JSON.parse(cachedSystem));
            } catch {}
        }
    };

    // Load from cache instantly on mount, then trigger backend fetch
    useEffect(() => {
        try {
            const cachedPersonal = localStorage.getItem('synos_personal_snippets_cache');
            if (cachedPersonal) setPersonalSnippets(JSON.parse(cachedPersonal));
            const cachedSystem = localStorage.getItem('synos_system_snippets_cache');
            if (cachedSystem) setSystemSnippets(JSON.parse(cachedSystem));
        } catch {}
        
        fetchMacros();
    }, []);

    // Listen for custom update events (e.g. from macro workspace editing)
    useEffect(() => {
        const handleUpdates = () => {
            fetchMacros();
        };
        window.addEventListener('synos_snippets_updated', handleUpdates);
        return () => {
            window.removeEventListener('synos_snippets_updated', handleUpdates);
        };
    }, []);

    // Auto-resolve dynamic context variables inside snippets (e.g. {{patientName}}, {{age}}, {{gender}})
    const resolveContextVariables = (text) => {
        if (!text) return '';
        let resolved = text;
        if (patientContext) {
            resolved = resolved
                .replace(/\{\{patientName\}\}/gi, patientContext.patientName || 'Patient')
                .replace(/\{\{age\}\}/gi, String(patientContext.age || ''))
                .replace(/\{\{gender\}\}/gi, patientContext.sex || patientContext.gender || '')
                .replace(/\{\{token\}\}/gi, patientContext.token || '');
        }
        return resolved;
    };

    // Combine Global and Personal Snippets
    const allSnippets = [...systemSnippets, ...personalSnippets];

    // Filter snippets based on filter input
    const filteredSnippets = allSnippets.filter(s => 
        s.shortcut.toLowerCase().includes(slashFilter.toLowerCase()) ||
        s.label.toLowerCase().includes(slashFilter.toLowerCase())
    );

    const extensions = useMemo(() => [
        StarterKit.configure({
            codeBlock: false,
            dropcursor: false,
        }),
        Highlight.configure({ multicolor: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
            placeholder: placeholder,
            emptyEditorClass: 'is-editor-empty',
        }),
        FontSize,
        FontFamily,
    ], [placeholder]);

    const editor = useEditor({
        extensions,
        content: '',
        editable: !disabled,
        editorProps: {
            handleKeyDown(view, event) {
                if (event.key === 'Backspace' || event.key === 'Delete') {
                    const { state } = view;
                    const { selection } = state;
                    
                    const isCellSelection = !!(selection.$anchorCell && selection.$headCell);
                    const isNodeSelection = selection.node && selection.node.type.name === 'table';

                    if (isCellSelection || isNodeSelection) {
                        editor.commands.deleteTable();
                        return true; // prevent default behavior
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const jsonStr = JSON.stringify(editor.getJSON());
            
            // Calculate Word Count
            const text = editor.getText();
            setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);

            if (jsonStr !== lastValueRef.current) {
                lastValueRef.current = jsonStr;
                onChange?.(jsonStr);
            }

            // Detect Slash Command
            const selection = editor.state.selection;
            const from = selection.$from.pos;
            const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, null, '\n');
            const slashMatch = textBefore.match(/\/([a-zA-Z0-9-]*)$/);

            if (slashMatch) {
                const filterText = slashMatch[1];
                setSlashFilter(filterText);
                setSlashOpen(true);
                slashSearchPos.current = from - slashMatch[0].length;

                // Calculate screen coords of the cursor relative to the container ref
                try {
                    const coords = editor.view.coordsAtPos(from);
                    if (containerRef.current) {
                        const rect = containerRef.current.getBoundingClientRect();
                        const menuWidth = 288; // w-72 is 288px
                        let computedLeft = coords.left - rect.left;
                        
                        // Prevent bleeding on the right side of the screen / container
                        if (computedLeft + menuWidth > rect.width) {
                            computedLeft = Math.max(8, rect.width - menuWidth - 8);
                        }

                        setSlashCoords({ 
                            top: coords.bottom - rect.top + 8, 
                            left: computedLeft 
                        });
                    }
                } catch (e) {
                    console.error("Coords calculation failed", e);
                }
            } else {
                setSlashOpen(false);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            // Update current HTML path representation
            const selection = editor.state.selection;
            const tags = [];
            let node = selection.$from.parent;
            while (node && node.type.name !== 'doc') {
                tags.unshift(node.type.name);
                node = node.type.parent;
            }
            setCurrentPath(tags.join(' > ') || 'p');
        }
    });

    // Keep Editor Content Synced
    useEffect(() => {
        if (!editor) return;

        console.log("[RichMedicalEditor.jsx] useEffect sync triggered:");
        console.log("  1. incoming value prop:", value);
        console.log("  2. lastValueRef.current:", lastValueRef.current);
        console.log("  3. editor.getJSON() (raw content):", JSON.stringify(editor.getJSON()));

        // If the incoming value is identical to the last value we processed or sent, bypass entirely
        if (value === lastValueRef.current) {
            console.log("  4. early exit: YES, value === lastValueRef.current. Bypassing sync.");
            return;
        }
        console.log("  4. early exit: NO");
        lastValueRef.current = value;

        // PERFORMANCE GUARD: Bypass sync from parent state if the editor is focused (active typing)
        if (editor.isFocused) {
            console.log("  Bypassing sync because editor is currently focused.");
            return;
        }

        try {
            if (!value) {
                if (editor.getText() !== '') {
                    console.log("  5. calling clearContent() since value is empty");
                    editor.commands.clearContent();
                }
                return;
            }

            // Detect if value is a valid stringified TipTap JSON
            if (value.startsWith('{"type":"doc"')) {
                const currentJSON = JSON.stringify(editor.getJSON());
                if (currentJSON !== value) {
                    console.log("  5. calling setContent() with parsed JSON value");
                    editor.commands.setContent(JSON.parse(value));
                } else {
                    console.log("  5. editor content matches value, setContent() skipped");
                }
            } else {
                // If it is legacy plain text, set it as HTML / paragraphs
                const cleanHTML = value.split('\n').map(line => `<p>${line}</p>`).join('');
                console.log("  5. calling setContent() with cleanHTML");
                editor.commands.setContent(cleanHTML);
            }
        } catch (e) {
            console.error("Content sync failed", e);
        }
    }, [value, editor]);

    // Handle Editor Disabled State Change
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [disabled, editor]);

    // Keyboard Shortcuts inside command list
    useEffect(() => {
        if (!slashOpen || filteredSnippets.length === 0) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashIndex(prev => (prev + 1) % filteredSnippets.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashIndex(prev => (prev - 1 + filteredSnippets.length) % filteredSnippets.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                insertSnippet(filteredSnippets[slashIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSlashOpen(false);
                editor?.commands.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [slashOpen, filteredSnippets, slashIndex, editor]);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
            setSlashOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const insertSnippet = (snippet) => {
        if (!editor || slashSearchPos.current === -1) return;

        const resolvedText = resolveContextVariables(snippet.text);

        editor.chain()
            .focus()
            .deleteRange({ from: slashSearchPos.current, to: editor.state.selection.$from.pos })
            .insertContent(resolvedText)
            .run();

        setSlashOpen(false);
        setSlashFilter('');
        setSlashIndex(0);
    };

    // Right-Click Context Menu Trigger
    const handleContextMenu = (e) => {
        if (disabled) return;
        e.preventDefault();
        
        const menuWidth = 256; // w-64 is 256px
        const menuHeight = 220; // approximate height
        
        let x = e.clientX;
        let y = e.clientY;
        
        // Prevent bleeding on the right side of the screen
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8;
        }
        
        // Prevent bleeding on the bottom of the screen
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8;
        }

        setContextMenu({ x, y });
    };

    const handleQuickInsert = (text) => {
        if (!editor) return;
        const resolved = resolveContextVariables(text);
        editor.chain().focus().insertContent(resolved).run();
        setContextMenu(null);
    };

    if (!editor) return null;

    return (
        <div ref={containerRef} className={cn("flex flex-col border dark:border-white/5 border-zinc-200 rounded-2xl dark:bg-zinc-950/40 bg-zinc-50/50 relative group/editor", className)}>
            {/* Unified Top Workstation Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b dark:border-white/5 border-zinc-200 dark:bg-zinc-900 bg-[linear-gradient(to_bottom,rgba(248,253,255,0.98)_0%,rgba(238,245,248,0.98)_50%,rgba(228,235,238,0.98)_100%)] rounded-t-2xl sticky top-0 z-20 transition-all select-none">
                <div className="flex flex-wrap items-center gap-1">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={disabled}
                        className={cn(
                            "p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95",
                            editor.isActive('bold') && "bg-synos-primary/10 dark:bg-cyan-500/10 text-synos-primary dark:text-cyan-400 font-extrabold"
                        )}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={disabled}
                        className={cn(
                            "p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95",
                            editor.isActive('italic') && "bg-synos-primary/10 dark:bg-cyan-500/10 text-synos-primary dark:text-cyan-400"
                        )}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        disabled={disabled}
                        className={cn(
                            "p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95",
                            editor.isActive('underline') && "bg-synos-primary/10 dark:bg-cyan-500/10 text-synos-primary dark:text-cyan-400"
                        )}
                        title="Underline (Ctrl+U)"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

                    <select
                        className="bg-transparent text-xs font-bold text-zinc-600 dark:text-zinc-400 outline-none border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 cursor-pointer hover:bg-zinc-500/5 transition-colors focus:ring-1 focus:ring-synos-primary"
                        value={
                            editor.isActive('heading', { level: 1 }) ? 'h1' :
                            editor.isActive('heading', { level: 2 }) ? 'h2' :
                            editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
                        }
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'h1') {
                                editor.chain().focus().toggleHeading({ level: 1 }).run();
                            } else if (val === 'h2') {
                                editor.chain().focus().toggleHeading({ level: 2 }).run();
                            } else if (val === 'h3') {
                                editor.chain().focus().toggleHeading({ level: 3 }).run();
                            } else {
                                editor.chain().focus().setParagraph().run();
                            }
                        }}
                    >
                        <option value="p" className="dark:bg-zinc-950 bg-white text-zinc-800 dark:text-zinc-250">Normal Text</option>
                        <option value="h1" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200 font-extrabold text-lg">Heading (Large)</option>
                        <option value="h2" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200 font-bold text-base">Subheading (Medium)</option>
                        <option value="h3" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200 font-semibold text-sm">Minor Heading (Small)</option>
                    </select>
 
                    <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

                    {/* Font Family Selector */}
                    <select
                        className="bg-transparent text-xs font-bold text-zinc-655 dark:text-zinc-400 outline-none border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 cursor-pointer hover:bg-zinc-500/5 transition-colors focus:ring-1 focus:ring-synos-primary"
                        value={editor.getAttributes('fontFamily').font || 'default'}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'default') {
                                editor.chain().focus().unsetFontFamily().run();
                            } else {
                                editor.chain().focus().setFontFamily(val).run();
                            }
                        }}
                        title="Font Family"
                    >
                        <option value="default" className="dark:bg-zinc-950 bg-white text-zinc-800 dark:text-zinc-250">Font: Default</option>
                        <option value="Inter, sans-serif" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                        <option value="Arial, sans-serif" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                        <option value="'Times New Roman', serif" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200" style={{ fontFamily: "'Times New Roman', serif" }}>Times New Roman</option>
                        <option value="Georgia, serif" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
                        <option value="'Courier New', monospace" className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200" style={{ fontFamily: "'Courier New', monospace" }}>Courier New</option>
                    </select>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

                    {/* Font Size Selector */}
                    <select
                        className="bg-transparent text-xs font-bold text-zinc-655 dark:text-zinc-400 outline-none border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 cursor-pointer hover:bg-zinc-500/5 transition-colors focus:ring-1 focus:ring-synos-primary w-16"
                        value={editor.getAttributes('fontSize').size || 'default'}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'default') {
                                editor.chain().focus().unsetFontSize().run();
                            } else {
                                editor.chain().focus().setFontSize(val).run();
                            }
                        }}
                        title="Font Size"
                    >
                        <option value="default" className="dark:bg-zinc-950 bg-white text-zinc-800 dark:text-zinc-250">Size</option>
                        {['9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'].map(sz => (
                            <option key={sz} value={sz} className="dark:bg-zinc-955 bg-white text-zinc-900 dark:text-zinc-200">{sz.replace('px', '')}</option>
                        ))}
                    </select>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        disabled={disabled}
                        className={cn(
                            "p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95",
                            editor.isActive('bulletList') && "bg-synos-primary/10 dark:bg-cyan-500/10 text-synos-primary dark:text-cyan-400"
                        )}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        disabled={disabled}
                        className={cn(
                            "p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95",
                            editor.isActive('orderedList') && "bg-synos-primary/10 dark:bg-cyan-500/10 text-synos-primary dark:text-cyan-400"
                        )}
                        title="Ordered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

                    {/* Table Tools */}
                    <button
                        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-zinc-500/10 dark:text-zinc-400 text-zinc-600 transition-colors active:scale-95"
                        title="Insert 3x3 Table"
                    >
                        <TableIcon className="w-4 h-4" />
                    </button>

                    {editor.can().deleteTable && editor.can().deleteTable() && (
                        <button
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            disabled={disabled}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors active:scale-95 ml-1"
                            title="Delete Table"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Area (Dynamically auto-growing or filling parent height) */}
            <div 
                className="p-4 outline-none prose dark:prose-invert max-w-none text-sm leading-relaxed dark:text-zinc-200 text-zinc-800 transition-all cursor-text flex-1 overflow-y-auto min-h-0"
                onContextMenu={handleContextMenu}
            >
                <EditorContent editor={editor} className="outline-none min-h-full h-full" />
            </div>

            {/* Bottom Workstation Status Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 border-t dark:border-white/5 border-zinc-200 dark:bg-zinc-950/80 bg-zinc-100 text-[10px] font-mono dark:text-zinc-500 text-zinc-400 rounded-b-2xl select-none">
                <span className="truncate max-w-[50%] tracking-tight">
                    {currentPath}
                </span>
                <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>{editor.getText().length} chars</span>
                </div>
            </div>

            {/* Smart Floating Slash Commands Command Palette */}
            {slashOpen && filteredSnippets.length > 0 && (
                <div 
                    className="absolute z-50 w-72 dark:bg-zinc-900 bg-white border dark:border-white/10 border-zinc-200 rounded-xl shadow-2xl p-2 animate-in fade-in duration-200 select-none"
                    style={{ top: slashCoords.top, left: slashCoords.left }}
                >
                    <div className="px-2 py-1 text-[9px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400 border-b dark:border-white/5 border-zinc-100 flex items-center justify-between mb-1.5">
                        <span>Clinical Macros</span>
                        <div className="flex items-center gap-1">
                            <span className="border dark:border-white/10 rounded px-1 py-0.5">↑↓</span>
                            <span className="border dark:border-white/10 rounded px-1 py-0.5">Enter</span>
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                        {filteredSnippets.map((snippet, sIdx) => (
                            <button
                                key={snippet.shortcut}
                                onClick={() => insertSnippet(snippet)}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-lg flex flex-col gap-0.5 transition-all text-xs font-semibold",
                                    sIdx === slashIndex 
                                        ? "bg-synos-primary text-white" 
                                        : "dark:text-zinc-300 text-zinc-700 hover:dark:bg-white/5 hover:bg-zinc-100"
                                )}
                            >
                                <span className="flex items-center justify-between">
                                    <span>{snippet.label}</span>
                                    <span className={cn("text-[9px] font-bold px-1 rounded font-mono uppercase tracking-wider", sIdx === slashIndex ? "bg-white/20 text-white" : "dark:bg-zinc-800 bg-zinc-100 text-zinc-500")}>
                                        {snippet.shortcut}
                                    </span>
                                </span>
                                <span className={cn("text-[9px] line-clamp-1", sIdx === slashIndex ? "text-white/60" : "text-zinc-400 dark:text-zinc-500")}>
                                    {snippet.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Right-Click Context Menu / Quick Insert */}
            {contextMenu && (
                <div 
                    className="fixed z-[999] w-64 dark:bg-zinc-900 bg-white border dark:border-white/10 border-zinc-200 rounded-xl shadow-2xl p-2 animate-in zoom-in-95 duration-100 select-none flex flex-col gap-1"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <span className="px-2 py-1 text-[8px] uppercase font-black tracking-widest dark:text-zinc-600 text-zinc-400 border-b dark:border-white/5 border-zinc-100 flex items-center gap-1.5 mb-1">
                        <FolderGit2 className="w-3 h-3" />
                        Quick Insert Templates
                    </span>

                    {/* Quick Insert Actions */}
                    {systemSnippets.map(snip => (
                        <button
                            key={snip.shortcut}
                            onClick={() => handleQuickInsert(snip.text)}
                            className="w-full text-left px-2 py-1.5 rounded-lg hover:dark:bg-white/5 hover:bg-zinc-100 flex items-center justify-between text-xs font-semibold dark:text-zinc-300 text-zinc-700 transition-colors"
                        >
                            <span>{snip.label}</span>
                            <Sparkles className="w-3 h-3 text-synos-primary opacity-60" />
                        </button>
                    ))}

                    <div className="w-full h-px bg-zinc-200 dark:bg-white/10 my-0.5" />

                    {/* Table insertion inside right-click */}
                    <button
                        onClick={() => {
                            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                            setContextMenu(null);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:dark:bg-white/5 hover:bg-zinc-100 flex items-center justify-between text-xs font-semibold dark:text-zinc-300 text-zinc-700 transition-colors"
                    >
                        <span>Insert 3x3 Table</span>
                        <FileSpreadsheet className="w-3 h-3 text-zinc-400" />
                    </button>

                    {onOpenMacroManager && (
                        <>
                            <div className="w-full h-px bg-zinc-200 dark:bg-white/10 my-0.5" />
                            <button
                                onClick={() => {
                                    setContextMenu(null);
                                    onOpenMacroManager();
                                }}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:dark:bg-white/5 hover:bg-zinc-100 flex items-center justify-between text-xs font-bold text-synos-primary transition-colors"
                            >
                                <span>Manage Medical Macros...</span>
                                <Settings className="w-3 h-3" />
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Custom styling injected locally for Placeholder Extension */}
            <style dangerouslySetInnerHTML={{ __html: `
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #a1a1aa;
                    pointer-events: none;
                    height: 0;
                    font-style: italic;
                }
                .ProseMirror {
                    outline: none !important;
                    min-height: 150px;
                    height: 100%;
                }
                .ProseMirror h1 {
                    font-size: 1.4rem !important;
                    font-weight: 800 !important;
                    margin-top: 1rem !important;
                    margin-bottom: 0.5rem !important;
                    text-transform: uppercase !important;
                }
                .ProseMirror h2 {
                    font-size: 1.2rem !important;
                    font-weight: 750 !important;
                    margin-top: 0.75rem !important;
                    margin-bottom: 0.4rem !important;
                    text-transform: uppercase !important;
                }
                .ProseMirror h3 {
                    font-size: 1.05rem !important;
                    font-weight: 700 !important;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.3rem !important;
                    text-transform: uppercase !important;
                }
                .ProseMirror ::selection {
                    background-color: rgba(99, 102, 241, 0.3) !important;
                }
                .ProseMirror ul {
                    list-style-type: disc !important;
                    padding-left: 1.5rem !important;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                }
                .ProseMirror ol {
                    list-style-type: decimal !important;
                    padding-left: 1.5rem !important;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                }
                .ProseMirror li {
                    display: list-item !important;
                }
                .ProseMirror table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 0;
                    overflow: hidden;
                }
                .ProseMirror table td, .ProseMirror table th {
                    min-width: 1em;
                    border: 2px solid #e4e4e7;
                    padding: 3px 5px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }
                .dark .ProseMirror table td, .dark .ProseMirror table th {
                    border: 2px solid #27272a;
                }
                .ProseMirror table th {
                    font-weight: bold;
                    text-align: left;
                    background-color: #f4f4f5;
                }
                .dark .ProseMirror table th {
                    background-color: #18181b;
                }
            `}} />
        </div>
    );
}
