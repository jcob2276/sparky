import { useState, useRef, useEffect, useCallback } from 'react';

interface UseKeepQuickCaptureParams {
  onCreate: (note: { title: string; content: string; color?: string; tags?: string[]; is_pinned?: boolean }) => Promise<string | void> | void;
}

export function useKeepQuickCapture({ onCreate }: UseKeepQuickCaptureParams) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('default');
  const [isChecklist, setIsChecklist] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle && !trimmedContent) {
      setExpanded(false);
      return;
    }

    let finalHtml = trimmedContent;
    if (isChecklist) {
      const lines = trimmedContent.split('\n').filter(Boolean);
      finalHtml = lines.map(line => `<p><span class="keep-todo-checkbox"></span><span>${line}</span></p>`).join('');
    } else if (trimmedContent) {
      finalHtml = trimmedContent.split('\n').map(p => `<p>${p}</p>`).join('');
    }

    onCreate({
      title: trimmedTitle,
      content: finalHtml,
      color,
    });

    setTitle('');
    setContent('');
    setColor('default');
    setIsChecklist(false);
    setShowColorPicker(false);
    setExpanded(false);
  }, [title, content, color, isChecklist, onCreate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (title.trim() || content.trim()) {
          handleSave();
        } else {
          setExpanded(false);
        }
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expanded, title, content, handleSave]);

  const handleStartChecklist = useCallback(() => {
    setIsChecklist(true);
    setExpanded(true);
  }, []);

  const handleCancel = useCallback(() => {
    setTitle('');
    setContent('');
    setExpanded(false);
  }, []);

  return {
    expanded, setExpanded,
    title, setTitle,
    content, setContent,
    color, setColor,
    isChecklist, setIsChecklist,
    showColorPicker, setShowColorPicker,
    containerRef,
    handleSave,
    handleStartChecklist,
    handleCancel,
  };
}
