import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Image, Table, Undo, Redo, WrapText } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface HistoryEntry {
  content: string;
  selectionStart?: number;
  selectionEnd?: number;
}

const RichTextEditor = ({ value, onChange, placeholder, className }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState("14");
  const [currentMenu, setCurrentMenu] = useState<HTMLElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [textWrapping, setTextWrapping] = useState(true);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    unorderedList: false,
    orderedList: false,
  });

  // Undo/Redo state with cursor position
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Function to style all tables consistently
  const styleAllTables = () => {
    if (!editorRef.current) return;

    const tables = editorRef.current.querySelectorAll('table');
    tables.forEach((table) => {
      // Apply consistent styling to the table - cast to HTMLElement
      const htmlTable = table as HTMLTableElement;
      htmlTable.style.borderCollapse = 'collapse';
      htmlTable.style.width = '100%';
      htmlTable.style.margin = '10px 0';
      htmlTable.style.borderRadius = '6px';
      htmlTable.style.overflow = 'hidden';
      htmlTable.classList.add('editable-table');

      // Style table headers
      const headers = table.querySelectorAll('th');
      headers.forEach((th) => {
        const htmlTh = th as HTMLTableCellElement;
        htmlTh.style.border = '1px solid hsl(var(--border))';
        htmlTh.style.padding = '12px';
        htmlTh.style.backgroundColor = 'hsl(var(--muted))';
        htmlTh.style.fontWeight = '600';
      });

      // Style table cells
      const cells = table.querySelectorAll('td');
      cells.forEach((td) => {
        const htmlTd = td as HTMLTableCellElement;
        htmlTd.style.border = '1px solid hsl(var(--border))';
        htmlTd.style.padding = '12px'
      });

      // Style thead section
      const thead = table.querySelector('thead');
      if (thead) {
        const theadCells = thead.querySelectorAll('th, td');
        theadCells.forEach((cell) => {
          const htmlCell = cell as HTMLTableCellElement;
          htmlCell.style.border = '1px solid hsl(var(--border))';
          htmlCell.style.padding = '12px';
          htmlCell.style.backgroundColor = 'hsl(var(--muted))';
          htmlCell.style.fontWeight = '600';
        });
      }

      // Style tbody section
      const tbody = table.querySelector('tbody');
      if (tbody) {
        const tbodyCells = tbody.querySelectorAll('td, th');
        tbodyCells.forEach((cell) => {
          const htmlCell = cell as HTMLTableCellElement;
          htmlCell.style.border = '1px solid hsl(var(--border))';
          htmlCell.style.padding = '12px';
          if (cell.tagName.toLowerCase() === 'th') {
            htmlCell.style.backgroundColor = 'hsl(var(--muted))';
            htmlCell.style.fontWeight = '600';
          }
        });
      }
    });
  };

  // Get current cursor position
  const getCurrentSelection = (): { start: number; end: number } | null => {
    if (!editorRef.current) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;

    return {
      start,
      end: start + range.toString().length
    };
  };

  // Set cursor position
  const setSelection = (start: number, end: number) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    let charIndex = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;

      if (startNode === null && charIndex + nodeLength >= start) {
        startNode = node;
        startOffset = start - charIndex;
      }

      if (endNode === null && charIndex + nodeLength >= end) {
        endNode = node;
        endOffset = end - charIndex;
        break;
      }

      charIndex += nodeLength;
    }

    if (startNode && endNode) {
      try {
        range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
        range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0));
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // Fallback: just focus the editor
        editorRef.current.focus();
      }
    } else {
      // Fallback: focus at the end
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Save state to history with cursor position
  const saveToHistory = (content: string) => {
    if (isUndoRedoAction) return;

    const selection = getCurrentSelection();

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        content,
        selectionStart: selection?.start,
        selectionEnd: selection?.end
      });
      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(prev => prev);
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  // Undo function with cursor position restoration
  const handleUndo = () => {
    if (historyIndex > 0 && editorRef.current) {
      setIsUndoRedoAction(true);
      const previousEntry = history[historyIndex - 1];
      editorRef.current.innerHTML = previousEntry.content;
      onChange(previousEntry.content);
      setHistoryIndex(prev => prev - 1);

      // Restore cursor position
      setTimeout(() => {
        if (previousEntry.selectionStart !== undefined && previousEntry.selectionEnd !== undefined) {
          setSelection(previousEntry.selectionStart, previousEntry.selectionEnd);
        }
        setIsUndoRedoAction(false);
      }, 0);
    }
  };

  // Redo function with cursor position restoration
  const handleRedo = () => {
    if (historyIndex < history.length - 1 && editorRef.current) {
      setIsUndoRedoAction(true);
      const nextEntry = history[historyIndex + 1];
      editorRef.current.innerHTML = nextEntry.content;
      onChange(nextEntry.content);
      setHistoryIndex(prev => prev + 1);

      // Restore cursor position
      setTimeout(() => {
        if (nextEntry.selectionStart !== undefined && nextEntry.selectionEnd !== undefined) {
          setSelection(nextEntry.selectionStart, nextEntry.selectionEnd);
        }
        setIsUndoRedoAction(false);
      }, 0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'Z' && e.shiftKey) {
          // Handle Ctrl+Shift+Z for redo (capital Z when shift is pressed)
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'y') {
          // Handle Ctrl+Y for redo
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Initialize history with initial value
  useEffect(() => {
    if (value && history.length === 0) {
      setHistory([{ content: value }]);
      setHistoryIndex(0);
    }
  }, [value, history.length]);

  // Convert plain text to HTML for initial content and style tables
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      styleAllTables();
      addTableEditIcons();
      makeImagesResizable(); // Make sure images are resizable when content loads
    }
  }, [value]);

  // Add global click listener to close menus and deselect images
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (currentMenu && !currentMenu.contains(e.target as Node)) {
        closeCurrentMenu();
      }

      // Deselect images when clicking elsewhere
      const target = e.target as HTMLElement;
      if (!target.closest('.image-resize-wrapper') && !target.closest('img')) {
        deselectAllImages();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('contextmenu', handleGlobalClick);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('contextmenu', handleGlobalClick);
    };
  }, [currentMenu]);

  // Check for active formatting states
  const checkActiveFormats = () => {
    if (!editorRef.current) return;

    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      alignLeft: document.queryCommandState('justifyLeft'),
      alignCenter: document.queryCommandState('justifyCenter'),
      alignRight: document.queryCommandState('justifyRight'),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  // Add selection change listener to track active formats
  useEffect(() => {
    const handleSelectionChange = () => {
      checkActiveFormats();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const deselectAllImages = () => {
    if (!editorRef.current) return;

    const allImages = editorRef.current.querySelectorAll('img');
    allImages.forEach(img => {
      img.classList.remove('selected');
      img.style.borderColor = 'transparent';
    });

    // Remove all resize wrappers and handles
    const wrappers = editorRef.current.querySelectorAll('.image-resize-wrapper');
    wrappers.forEach(wrapper => {
      const img = wrapper.querySelector('img');
      if (img) {
        // Move image back to its original position
        wrapper.parentNode?.insertBefore(img, wrapper);
        // Reset image styles
        img.style.margin = '10px auto';
        img.style.display = 'block';
        img.style.position = 'relative';
      }
      wrapper.remove();
    });
  };

  const makeImagesResizable = () => {
    if (!editorRef.current) return;

    const images = editorRef.current.querySelectorAll('img');
    images.forEach((img) => {
      // Remove existing event listeners and reset the image
      img.classList.remove('resizable-image');
      img.style.cursor = '';
      img.style.maxWidth = '';
      img.style.height = '';
      img.style.display = '';
      img.style.margin = '';
      img.style.border = '';
      img.style.borderRadius = '';
      img.style.transition = '';
      img.style.position = '';

      // Remove any existing event listeners by cloning the element
      const newImg = img.cloneNode(true) as HTMLImageElement;
      img.parentNode?.replaceChild(newImg, img);

      // Now set up the resizable functionality on the clean image
      newImg.classList.add('resizable-image');
      newImg.style.cursor = 'pointer';
      newImg.style.maxWidth = '100%';
      newImg.style.height = 'auto';
      newImg.style.display = 'block';
      newImg.style.margin = '10px auto';
      newImg.style.border = '2px solid transparent';
      newImg.style.borderRadius = '6px';
      newImg.style.transition = 'border-color 0.2s ease';
      newImg.style.position = 'relative';

      // Add hover effect
      newImg.addEventListener('mouseenter', () => {
        newImg.style.borderColor = '#3b82f6';
      });

      newImg.addEventListener('mouseleave', () => {
        if (!newImg.classList.contains('selected')) {
          newImg.style.borderColor = 'transparent';
        }
      });

      // Add click handler for selection
      newImg.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Remove selection from other images
        deselectAllImages();

        // Select this image
        newImg.classList.add('selected');
        newImg.style.borderColor = '#3b82f6';

        // Create resize handles
        createResizeHandles(newImg);
      });
    });
  };

  const createResizeHandles = (img: HTMLImageElement) => {
    // Create wrapper with better positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'image-resize-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'block';
    wrapper.style.margin = '10px auto';
    wrapper.style.maxWidth = '100%';
    wrapper.style.width = 'fit-content';

    // Insert wrapper before image and move image into wrapper
    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    // Reset image styles for wrapper context
    img.style.margin = '0';
    img.style.display = 'block';
    img.style.width = img.offsetWidth + 'px';
    img.style.height = 'auto';
    img.style.position = 'relative';

    // Create resize handles
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(position => {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${position}`;
      handle.style.position = 'absolute';
      handle.style.width = '10px';
      handle.style.height = '10px';
      handle.style.backgroundColor = '#3b82f6';
      handle.style.border = '2px solid white';
      handle.style.borderRadius = '50%';
      handle.style.cursor = `${position}-resize`;
      handle.style.zIndex = '10';

      // Position handles
      switch (position) {
        case 'nw':
          handle.style.top = '-5px';
          handle.style.left = '-5px';
          break;
        case 'ne':
          handle.style.top = '-5px';
          handle.style.right = '-5px';
          break;
        case 'sw':
          handle.style.bottom = '-5px';
          handle.style.left = '-5px';
          break;
        case 'se':
          handle.style.bottom = '-5px';
          handle.style.right = '-5px';
          break;
      }

      // Add resize functionality
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const handleMouseMove = (e: MouseEvent) => {
          let newWidth: number;
          let newHeight: number;

          if (position === 'se') {
            newWidth = startWidth + (e.clientX - startX);
          } else if (position === 'sw') {
            newWidth = startWidth - (e.clientX - startX);
          } else if (position === 'ne') {
            newWidth = startWidth + (e.clientX - startX);
          } else { // nw
            newWidth = startWidth - (e.clientX - startX);
          }

          // Maintain aspect ratio
          newHeight = newWidth / aspectRatio;

          // Apply minimum size constraints
          newWidth = Math.max(50, Math.min(800, newWidth));
          newHeight = newWidth / aspectRatio;

          img.style.width = newWidth + 'px';
          img.style.height = newHeight + 'px';
        };

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          handleInput(); // Update the editor content
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });

      wrapper.appendChild(handle);
    });
  };

  // Close current menu and remove it from the DOM
  const closeCurrentMenu = () => {
    if (currentMenu) {
      currentMenu.remove();
      setCurrentMenu(null);
      setIsMenuOpen(false);
    }
  };

  // Create a table menu at the specified position
  const createTableMenu = (table: HTMLTableElement, x: number, y: number) => {
    // Always close any existing menu first
    closeCurrentMenu();

    // Prevent creating a new menu if one was just closed
    if (isMenuOpen) {
      return;
    }

    const menu = document.createElement('div');
    menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-40 py-1';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
      <div class="py-1">
        <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2" data-action="addRow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
          Add Row
        </button>
        <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2" data-action="addColumn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14m-7-7h14"/>
          </svg>
          Add Column
        </button>
        <div class="border-t border-gray-100 my-1"></div>
        <button class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2" data-action="deleteRow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Delete Row
        </button>
        <button class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2" data-action="deleteColumn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Delete Column
        </button>
      </div>
    `;

    // Set as current menu and mark as open
    setCurrentMenu(menu);
    setIsMenuOpen(true);

    // Add event listeners
    menu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = (e.target as HTMLElement).closest('button')?.getAttribute('data-action');
      if (action) {
        handleTableAction(action, table);
        closeCurrentMenu();
      }
    });

    document.body.appendChild(menu);
    return menu;
  };

  // Add table edit icons to tables in the editor
  const addTableEditIcons = () => {
    if (!editorRef.current) return;

    const tables = editorRef.current.querySelectorAll('table');
    tables.forEach((table) => {
      // Remove existing edit icons to avoid duplicates
      const existingIcon = table.parentElement?.querySelector('.table-edit-icon');
      if (existingIcon) {
        existingIcon.remove();
      }

      // Create wrapper if table isn't already wrapped
      if (!table.parentElement?.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper relative inline-block';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }

      // Create edit icon with fixed dimensions
      const editIcon = document.createElement('div');
      editIcon.className = 'table-edit-icon';
      editIcon.innerHTML = `
        <button class="absolute -top-2 -right-2 z-10 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 flex items-center justify-center" style="width: 28px; height: 28px; min-width: 28px; min-height: 28px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-600">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      `;
      editIcon.style.position = 'absolute';
      editIcon.style.top = '-8px';
      editIcon.style.right = '-8px';
      editIcon.style.zIndex = '10';

      // Add hover effect to table wrapper
      table.parentElement?.classList.add('group');

      // Add click handler with immediate menu closure
      const button = editIcon.querySelector('button');
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          console.log('Edit button clicked, closing any existing menu');
          // Force close any existing menu immediately and prevent new menu creation
          closeCurrentMenu();

          // Only create new menu after a short delay and if no menu is currently open
          setTimeout(() => {
            if (!isMenuOpen) {
              const rect = button.getBoundingClientRect();
              createTableMenu(table as HTMLTableElement, rect.right - 160, rect.bottom + 4);
            }
          }, 50);
        });
      }

      table.parentElement?.appendChild(editIcon);
    });
  };


  // Handle table actions based on user input
  const handleTableAction = (action: string, table: HTMLTableElement) => {
    switch (action) {
      case 'addRow':
        addTableRow(table);
        break;
      case 'addColumn':
        addTableColumn(table);
        break;
      case 'deleteRow':
        // Delete the last row
        if (table.rows.length > 1) {
          deleteTableRow(table, table.rows.length - 1);
        }
        break;
      case 'deleteColumn':
        // Delete the last column
        if (table.rows[0]?.cells.length > 1) {
          deleteTableColumn(table, table.rows[0].cells.length - 1);
        }
        break;
    }
  };

  // Handle input changes in the editor
  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      saveToHistory(content);
      // Re-style tables, add edit icons and make images resizable after content changes
      setTimeout(() => {
        styleAllTables();
        addTableEditIcons();
        makeImagesResizable();
      }, 0);
      // Check active formats after content changes
      checkActiveFormats();
    }
  };

  // Execute a command on the document
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Insert bold text
  const insertBold = () => {
    executeCommand('bold');
    checkActiveFormats();
  };

  // Insert italic text
  const insertItalic = () => {
    executeCommand('italic');
    checkActiveFormats();
  };

  // Insert underline text
  const insertUnderline = () => {
    executeCommand('underline');
    checkActiveFormats();
  };

  // Insert a heading with the specified level
  const insertHeading = (level: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Handle "normal" text (remove heading formatting)
    if (level === "normal") {
      // Check if cursor is inside a heading element
      let headingElement = null;
      let currentNode = range.commonAncestorContainer;

      // Traverse up to find heading element
      while (currentNode && currentNode !== editorRef.current) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const element = currentNode as Element;
          if (element.tagName && /^H[1-6]$/.test(element.tagName)) {
            headingElement = element;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }

      if (headingElement) {
        // Convert heading to paragraph
        const paragraph = document.createElement('p');
        paragraph.innerHTML = headingElement.innerHTML;
        headingElement.parentNode?.replaceChild(paragraph, headingElement);

        // Position cursor in the new paragraph
        const textNode = paragraph.firstChild;
        if (textNode) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, textNode.textContent?.length || 0);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (!range.collapsed) {
        // Handle selected text
        const selectedText = range.toString();
        const paragraphHTML = `<p>${selectedText}</p>`;

        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = paragraphHTML;
        const paragraphElement = div.firstChild;

        if (paragraphElement) {
          range.insertNode(paragraphElement);

          // Position cursor after the new paragraph
          range.setStartAfter(paragraphElement);
          range.setEndAfter(paragraphElement);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // If no selection and not in heading, create an empty paragraph
        const paragraphHTML = `<p>Normal text</p>`;
        const div = document.createElement('div');
        div.innerHTML = paragraphHTML;
        const paragraphElement = div.firstChild;

        if (paragraphElement) {
          range.insertNode(paragraphElement);

          // Select the text inside the paragraph for easy editing
          const textNode = paragraphElement.firstChild;
          if (textNode) {
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent?.length || 0);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    } else {
      // Check if cursor is inside a heading element to replace it
      let existingHeading = null;
      let currentNode = range.commonAncestorContainer;

      // Traverse up to find heading element
      while (currentNode && currentNode !== editorRef.current) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const element = currentNode as Element;
          if (element.tagName && /^H[1-6]$/.test(element.tagName)) {
            existingHeading = element;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }

      if (existingHeading) {
        // Replace existing heading with new level
        const newHeading = document.createElement(`h${level}`);
        newHeading.innerHTML = existingHeading.innerHTML;
        existingHeading.parentNode?.replaceChild(newHeading, existingHeading);

        // Position cursor in the new heading
        const textNode = newHeading.firstChild;
        if (textNode) {
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else if (!range.collapsed) {
        // Handle selected text
        const selectedText = range.toString();
        const headingHTML = `<h${level}>${selectedText}</h${level}>`;

        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = headingHTML;
        const headingElement = div.firstChild;

        if (headingElement) {
          range.insertNode(headingElement);

          // Position cursor after the new heading
          range.setStartAfter(headingElement);
          range.setEndAfter(headingElement);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        // If no selection, create an empty heading
        const headingHTML = `<h${level}>Heading ${level}</h${level}>`;
        const div = document.createElement('div');
        div.innerHTML = headingHTML;
        const headingElement = div.firstChild;

        if (headingElement) {
          range.insertNode(headingElement);

          // Select the text inside the heading for easy editing
          const textNode = headingElement.firstChild;
          if (textNode) {
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent?.length || 0);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }

    handleInput();
  };

  // Set the alignment of the selected text
  const setAlignment = (align: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let currentElement = range.commonAncestorContainer;

    // Find the parent element that can be aligned
    while (currentElement && currentElement !== editorRef.current) {
      if (currentElement.nodeType === Node.ELEMENT_NODE) {
        const element = currentElement as Element;

        // Check if it's a list item
        if (element.tagName === 'LI') {
          // Find the parent list (UL or OL)
          const parentList = element.closest('ul, ol');
          if (parentList) {
            // Apply alignment to the entire list
            const alignmentStyle = align.toLowerCase() === 'left' ? 'left' :
                                 align.toLowerCase() === 'center' ? 'center' : 'right';
            (parentList as HTMLElement).style.textAlign = alignmentStyle;

            // Also set the list positioning for center/right alignment
            if (alignmentStyle === 'center') {
              (parentList as HTMLElement).style.listStylePosition = 'inside';
              (parentList as HTMLElement).style.display = 'table';
              (parentList as HTMLElement).style.margin = '0 auto';
            } else if (alignmentStyle === 'right') {
              (parentList as HTMLElement).style.listStylePosition = 'inside';
              (parentList as HTMLElement).style.display = 'table';
              (parentList as HTMLElement).style.marginLeft = 'auto';
              (parentList as HTMLElement).style.marginRight = '0';
            } else {
              (parentList as HTMLElement).style.listStylePosition = 'outside';
              (parentList as HTMLElement).style.display = 'block';
              (parentList as HTMLElement).style.margin = '0 0 0 20px';
            }

            handleInput();
            checkActiveFormats();
            return;
          }
        }

        // Check for other block elements
        if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL'].includes(element.tagName)) {
          break;
        }
      }
      currentElement = currentElement.parentNode;
    }

    // Fallback to standard alignment for non-list elements
    executeCommand(`justify${align}`);
    checkActiveFormats();
  };

  // Insert an unordered list
  const insertList = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    // Create unordered list with proper styling - positioned outside by default
    const listHTML = selectedText
      ? `<ul style="list-style-type: disc; margin: 0 0 0 20px; padding-left: 10px; list-style-position: outside;"><li>${selectedText}</li></ul>`
      : `<ul style="list-style-type: disc; margin: 0 0 0 20px; padding-left: 10px; list-style-position: outside;"><li></li></ul>`;

    // Insert the list
    range.deleteContents();
    const div = document.createElement('div');
    div.innerHTML = listHTML;
    const listElement = div.firstChild;

    if (listElement) {
      range.insertNode(listElement);

      // Position cursor inside the list item - cast to Element to access querySelector
      const listItem = (listElement as Element).querySelector('li');
      if (listItem) {
        range.setStart(listItem, 0);
        range.setEnd(listItem, 0);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    handleInput();
    checkActiveFormats();
  };

  // Insert an ordered list
  const insertOrderedList = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    // Create ordered list with proper styling - positioned outside by default
    const listHTML = selectedText
      ? `<ol style="list-style-type: decimal; margin: 0 0 0 20px; padding-left: 10px; list-style-position: outside;"><li>${selectedText}</li></ol>`
      : `<ol style="list-style-type: decimal; margin: 0 0 0 20px; padding-left: 10px; list-style-position: outside;"><li></li></ol>`;

    // Insert the list
    range.deleteContents();
    const div = document.createElement('div');
    div.innerHTML = listHTML;
    const listElement = div.firstChild;

    if (listElement) {
      range.insertNode(listElement);

      // Position cursor inside the list item - cast to Element to access querySelector
      const listItem = (listElement as Element).querySelector('li');
      if (listItem) {
        range.setStart(listItem, 0);
        range.setEnd(listItem, 0);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    handleInput();
    checkActiveFormats();
  };

  // Insert a table into the editor
  const insertTable = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const table = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0; border-radius: 6px; overflow: hidden;" class="editable-table"><tr><th style="border: 1px solid #e5e7eb; padding: 12px; background-color: #f9fafb; font-weight: 600;">Column 1</th><th style="border: 1px solid #e5e7eb; padding: 12px; background-color: #f9fafb; font-weight: 600;">Column 2</th><th style="border: 1px solid #e5e7eb; padding: 12px; background-color: #f9fafb; font-weight: 600;">Column 3</th></tr><tr><td style="border: 1px solid #e5e7eb; padding: 12px;">Row 1</td><td style="border: 1px solid #e5e7eb; padding: 12px;">Data</td><td style="border: 1px solid #e5e7eb; padding: 12px;">Data</td></tr><tr><td style="border: 1px solid #e5e7eb; padding: 12px;">Row 2</td><td style="border: 1px solid #e5e7eb; padding: 12px;">Data</td><td style="border: 1px solid #e5e7eb; padding: 12px;">Data</td></tr></table>`;

    // Insert the table HTML
    range.deleteContents();
    const div = document.createElement('div');
    div.innerHTML = table;
    const tableElement = div.firstChild;

    if (tableElement) {
      range.insertNode(tableElement);

      // Create a new paragraph after the table
      const newParagraph = document.createElement('p');
      newParagraph.innerHTML = '&nbsp;'; // Add non-breaking space to make it visible

      // Insert the paragraph after the table
      range.setStartAfter(tableElement);
      range.insertNode(newParagraph);

      // Position cursor at the beginning of the new paragraph
      range.setStart(newParagraph, 0);
      range.setEnd(newParagraph, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    editorRef.current.focus();
    handleInput();
  };

  // Add a new row to the specified table
  const addTableRow = (table: HTMLTableElement) => {
    const newRow = table.insertRow();
    const cellCount = table.rows[0]?.cells.length || 1;

    for (let i = 0; i < cellCount; i++) {
      const cell = newRow.insertCell();
      cell.style.border = "1px solid #e5e7eb";
      cell.style.padding = "12px";
      cell.textContent = "New Cell";
    }
    handleInput();
  };

  // Add a new column to the specified table
  const addTableColumn = (table: HTMLTableElement) => {
    for (let i = 0; i < table.rows.length; i++) {
      const cell = table.rows[i].insertCell();
      cell.style.border = "1px solid #e5e7eb";
      cell.style.padding = "12px";
      if (i === 0) {
        cell.textContent = "New Header";
        cell.style.fontWeight = "600";
        cell.style.backgroundColor = "#f9fafb";
      } else {
        cell.textContent = "New Cell";
      }
    }
    handleInput();
  };

  // Delete a row from the specified table
  const deleteTableRow = (table: HTMLTableElement, rowIndex: number) => {
    if (table.rows.length > 1) {
      table.deleteRow(rowIndex);
      handleInput();
    }
  };

  // Delete a column from the specified table
  const deleteTableColumn = (table: HTMLTableElement, colIndex: number) => {
    if (table.rows[0]?.cells.length > 1) {
      for (let i = 0; i < table.rows.length; i++) {
        table.rows[i].deleteCell(colIndex);
      }
      handleInput();
    }
  };

  // Insert an image into the editor
  const insertImage = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for image insertion
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        // Insert image with no extra spacing
        const imageHTML = `<img src="${imageUrl}" style="max-width: 100%; height: auto; display: block; margin: 5px auto; border-radius: 6px;" />`;

        if (!editorRef.current) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const div = document.createElement('div');
        div.innerHTML = imageHTML;
        const imageElement = div.firstChild;

        if (imageElement) {
          range.insertNode(imageElement);

          // Position cursor right after the image without extra spacing
          range.setStartAfter(imageElement);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        handleInput();
      };
      reader.readAsDataURL(file);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  // Handle font size changes
  const handleFontSizeChange = (newSize: string) => {
    setFontSize(newSize);
    if (editorRef.current) {
      editorRef.current.style.fontSize = `${newSize}px`;
    }
  };

  // Handle text wrapping toggle
  const toggleTextWrapping = () => {
    setTextWrapping(prev => !prev);
  };

  // Apply text wrapping styles when component mounts or wrapping changes
  useEffect(() => {
    if (editorRef.current) {
      if (textWrapping) {
        editorRef.current.style.whiteSpace = 'pre-wrap';
        editorRef.current.style.wordWrap = 'break-word';
        editorRef.current.style.overflowX = 'hidden';
      } else {
        editorRef.current.style.whiteSpace = 'pre';
        editorRef.current.style.wordWrap = 'normal';
        editorRef.current.style.overflowX = 'auto';
      }
    }
  }, [textWrapping]);

  // Font size options
  const fontSizes = [
    { value: "12", label: "12px" },
    { value: "14", label: "14px (Default)" },
    { value: "16", label: "16px" },
    { value: "18", label: "18px" },
    { value: "20", label: "20px" },
    { value: "24", label: "24px" },
    { value: "28", label: "28px" },
    { value: "32", label: "32px" },
  ];

  // Heading level options
  const headingLevels = [
    { value: "normal", label: "Normal Text" },
    { value: "1", label: "Heading 1" },
    { value: "2", label: "Heading 2" },
    { value: "3", label: "Heading 3" },
    { value: "4", label: "Heading 4" },
    { value: "5", label: "Heading 5" },
    { value: "6", label: "Heading 6" },
  ];

  return (
    <div className={cn("border rounded-lg overflow-hidden shadow-sm bg-background flex flex-col", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Toolbar */}
      <div className="border-b bg-muted/80 p-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Font Size */}
          <Select value={fontSize} onValueChange={handleFontSizeChange}>
            <SelectTrigger className="w-36 h-9 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Headings */}
          <Select onValueChange={insertHeading}>
            <SelectTrigger className="w-36 h-9 bg-background border-border">
              <SelectValue placeholder="Headings" />
            </SelectTrigger>
            <SelectContent>
              {headingLevels.map((heading) => (
                <SelectItem key={heading.value} value={heading.value}>
                  {heading.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Text Formatting */}
          <Toggle
            pressed={activeFormats.bold}
            onPressedChange={insertBold}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={activeFormats.italic}
            onPressedChange={insertItalic}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={activeFormats.underline}
            onPressedChange={insertUnderline}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <Underline className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Alignment */}
          <Toggle
            pressed={activeFormats.alignLeft}
            onPressedChange={() => setAlignment('Left')}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={activeFormats.alignCenter}
            onPressedChange={() => setAlignment('Center')}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={activeFormats.alignRight}
            onPressedChange={() => setAlignment('Right')}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Lists */}
          <Toggle
            pressed={activeFormats.unorderedList}
            onPressedChange={insertList}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={activeFormats.orderedList}
            onPressedChange={insertOrderedList}
            size="sm"
            className="h-9 w-9 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Text Wrapping */}
          <Toggle
            pressed={textWrapping}
            onPressedChange={toggleTextWrapping}
            size="sm"
            className="h-9 w-9 p-0"
            title={textWrapping ? "Disable text wrapping" : "Enable text wrapping"}
          >
            <WrapText className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Media and Tables */}
          <Button variant="ghost" size="sm" onClick={insertImage} className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700">
            <Image className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertTable} className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700">
            <Table className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* WYSIWYG Editor without ScrollArea wrapper */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onMouseUp={checkActiveFormats}
        onKeyUp={checkActiveFormats}
        className={cn(
          "p-6 min-h-[300px] focus:outline-none max-w-none prose prose-slate flex-1",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none",
          "[&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:ml-0",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3",
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-1 [&_h3]:mt-2",
          "[&_h4]:text-base [&_h4]:font-bold [&_h4]:mb-1 [&_h4]:mt-2",
          "[&_h5]:text-sm [&_h5]:font-bold [&_h5]:mb-1 [&_h5]:mt-1",
          "[&_h6]:text-xs [&_h6]:font-bold [&_h6]:mb-1 [&_h6]:mt-1",
          "[&_p]:mb-0 [&_p]:leading-tight",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:my-1",
          "[&_table]:table [&_table]:w-auto [&_table]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:my-1"
        )}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: '1.2',
          whiteSpace: textWrapping ? 'pre-wrap' : 'pre',
          wordWrap: textWrapping ? 'break-word' : 'normal',
          overflowX: textWrapping ? 'hidden' : 'auto',
          overflowY: 'auto'
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;