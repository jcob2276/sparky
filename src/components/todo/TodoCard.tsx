/**
 * @component TodoCard
 * @role Prezentacyjna powłoka karty (collapsed row, attachments) — logikę dostarcza TodoCardConnected.
 * @composes TodoCardCollapsedRow (renderuje collapsed view)
 * @composes TodoCardExpandedPanel (renderowany gdy expanded=true)
 * @usedBy TodoCardConnected (jedyny konsument)
 */
import React, { useId } from 'react';
import { splitEmoji, relativeDate } from './todoUtils';
import TodoCardExpandedPanel from './TodoCardExpandedPanel';
import TodoCardCollapsedRow from './TodoCardCollapsedRow';
import { useTodoCardAttachments } from './useTodoCardAttachments';
import { useTodoCardSwipe } from './useTodoCardSwipe';
import type { TodoItemRow } from '../../lib/todo/todo';

export interface TodoCardProps {
  item: TodoItemRow;
  onToggle: () => void;
  onDelete: () => void;
  onDrop: () => void;
  onSetPriority: (p: string) => void;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  busy: boolean;
  today: string;
  isLinkedToPlan: boolean;
  sections: { id: string; name: string }[];
  onMoveSection: (sId: string | null) => void;
  isEditing: boolean;
  editingTitle: string;
  onEditStart: (t: string) => void;
  onEditChange: (val: string) => void;
  onEditSave: () => void;
  sectionName?: string | null;
  onDragStart?: (item: TodoItemRow, clientX: number, clientY: number) => void;
  isDragging: boolean;
  onShowContextMenu: (item: TodoItemRow, clientX: number, clientY: number) => void;
  onMoveToToday?: () => void;
  onSetSchedule: (patch: { due_date?: string | null; scheduled_time?: string | null }) => void;
  onSetRecurrence: (r: string | null) => void;
  onSetDeadline: (date: string | null) => void;
  dreamTitle?: string | null;
  onSetReminder: (isoDatetime: string) => void;
  onCancelReminder: () => void;
  onSetTags: (tags: string[]) => void;
  onSetSphere?: (sphere: string | null) => void;
  onAiBreakdown: () => Promise<string[]>;
  onSetTitle: (title: string) => void;
  onSetNotes?: (notes: string | null) => void;
  childTasks?: TodoItemRow[];
  onAddChildTask?: (title: string) => void;
  onToggleChildTask?: (child: TodoItemRow) => void;
}

export default function TodoCard({
  item,
  onToggle,
  onDelete,
  onDrop,
  onSetPriority,
  expanded,
  onToggleExpand,
  busy,
  today,
  isLinkedToPlan,
  sections,
  onMoveSection,
  isEditing,
  editingTitle,
  onEditStart,
  onEditChange,
  onEditSave,
  sectionName,
  onDragStart,
  isDragging,
  onShowContextMenu,
  onSetSchedule,
  onSetRecurrence,
  onSetDeadline,
  dreamTitle,
  onSetReminder,
  onSetTags,
  onSetNotes,
  childTasks = [],
  onAddChildTask,
  onToggleChildTask,
}: TodoCardProps) {
  const { attachments, uploadingFile, fileInputRef, handleFileUpload, handleDeleteAttachment } = useTodoCardAttachments(expanded, item.id, item.user_id);

  const swipe = useTodoCardSwipe({
    onToggle,
    item,
    onDragStart,
  });

  const panelId = useId();
  const totalSubtaskCount = childTasks.length;
  const doneSubtaskCount = childTasks.filter((c) => c.status === 'done').length;
  const isDone = item.status === 'done';

  const { icon, label } = splitEmoji(item.title);
  const dateInfo = relativeDate(item.due_date, today);

  return (
    <div
      data-no-swipe-nav="true"
      className={`group relative ${isDragging ? 'opacity-[var(--opacity-0)] pointer-events-none' : ''}`}
    >
      {/* Row */}
      <div
        onContextMenu={e => {
          e.preventDefault();
          onShowContextMenu(item, e.clientX, e.clientY);
        }}
        onClick={e => e.stopPropagation()}
        className="todo-focus-card"
      >
        <TodoCardCollapsedRow
          item={item}
          busy={busy}
          isDone={isDone}
          icon={icon}
          label={label}
          dateInfo={dateInfo}
          today={today}
          isEditing={isEditing}
          editingTitle={editingTitle}
          onEditChange={onEditChange}
          onEditSave={onEditSave}
          expanded={expanded}
          totalSubtaskCount={totalSubtaskCount}
          doneSubtaskCount={doneSubtaskCount}
          isLinkedToPlan={isLinkedToPlan}
          sectionName={sectionName}
          dreamTitle={dreamTitle}
          onTitlePress={() => expanded ? onEditStart(item.title) : onToggleExpand(item.id)}
          onEdit={() => onEditStart(item.title)}
          onDelete={onDelete}
          panelId={panelId}
          swipe={swipe}
          onShowContextMenu={onShowContextMenu}
        />

        {/* Expanded Panel */}
        {expanded && (
          <div id={panelId} className="todo-focus-expanded">
            <TodoCardExpandedPanel
                item={item}
                onSetNotes={onSetNotes}
                onSetSchedule={onSetSchedule}
                onSetRecurrence={onSetRecurrence}
                onSetDeadline={onSetDeadline}
                onSetPriority={onSetPriority}
                onSetReminder={onSetReminder}
                onSetTags={onSetTags}
                onMoveSection={onMoveSection}
                onDrop={onDrop}
                onToggleExpand={onToggleExpand}
                sections={sections}
                today={today}
                childTasks={childTasks}
                onAddChildTask={onAddChildTask}
                onToggleChildTask={onToggleChildTask}
                attachments={attachments}
                uploadingFile={uploadingFile}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                handleDeleteAttachment={handleDeleteAttachment}
              />
          </div>
        )}
      </div>
    </div>
  );
}
