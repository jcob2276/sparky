import { useCallback, useMemo } from 'react';
import { buildSectionGoalMaps } from '../../../lib/goal/goalLineage';
import { shiftDateStr } from '../../../lib/date';
import { matchesSmartQuery, PRIORITY_ORDER } from '../todoUtils';
import type { TodoItemRow, TodoSectionRow } from '../useTodoData';
import { isStudySubject } from '../../../lib/todo/studySubjects';

interface UseTodoDerivedViewsProps {
  items: TodoItemRow[];
  sections: TodoSectionRow[];
  projects: Array<{ id: string; dream_id: string | null }>;
  dreams: Array<{ id: string; title: string; life_goal: string | null }>;
  today: string;
  activeFilterSection: string | null;
  activeSmartQuery: string;
}

/** Pure derivations from the raw items/sections query data — no state of its own. */
export function useTodoDerivedViews({
  items,
  sections,
  projects,
  dreams,
  today,
  activeFilterSection,
  activeSmartQuery,
}: UseTodoDerivedViewsProps) {
  const sectionById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);

  const { sectionGoalMap, sectionDreamMap } = useMemo(
    () => buildSectionGoalMaps(sections, projects, dreams),
    [sections, projects, dreams],
  );

  const subjectIds = useMemo(() => new Set(items.filter(isStudySubject).map(item => item.id)), [items]);
  // Study assignments also appear in daily views; ordinary subtasks stay nested.
  const taskItems = useMemo(() => items.filter(item => !isStudySubject(item)
    && (!item.parent_task_id || subjectIds.has(item.parent_task_id))), [items, subjectIds]);
  const openItems = useMemo(() => taskItems.filter(i => i.status === 'open'), [taskItems]);
  const doneItems = useMemo(() => taskItems.filter(i => i.status === 'done'), [taskItems]);
  const childrenByParentId = useMemo(() => {
    const map: Record<string, TodoItemRow[]> = {};
    for (const i of items) {
      if (!i.parent_task_id) continue;
      (map[i.parent_task_id] = map[i.parent_task_id] || []).push(i);
    }
    return map;
  }, [items]);
  const getChildren = useCallback((itemId: string) => childrenByParentId[itemId] || [], [childrenByParentId]);

  const sectionNameById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s.name])), [sections]);

  const applyFilter = useCallback((arr: TodoItemRow[]) => arr.filter(i => {
    if (activeFilterSection && i.section_id !== activeFilterSection) return false;
    if (activeSmartQuery && !matchesSmartQuery(activeSmartQuery, i, today, sectionNameById)) return false;
    return true;
  }), [activeFilterSection, activeSmartQuery, today, sectionNameById]);

  const { todayItems, inboxItems, upcomingItems, sectionsWithItems } = useMemo(() => {
    const todayList = openItems
      .filter((i) => (i.due_date && i.due_date <= today) || (i.deadline_date && i.deadline_date <= today) || i.ai_bucket === 'today')
      .sort((a, b) => {
        const pA = PRIORITY_ORDER.indexOf(a.priority || 'normal');
        const pB = PRIORITY_ORDER.indexOf(b.priority || 'normal');
        if (pA !== pB) return pB - pA;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
    const todaySet = new Set(todayList.map((i) => i.id));
    const remainingItems = openItems.filter((i) => !todaySet.has(i.id));
    const inbox = applyFilter(remainingItems.filter((i) => i.section_id === null));

    const upcomingCutoffStr = shiftDateStr(today, 7);
    const upcoming = applyFilter(
      remainingItems
        .filter((i) => {
          const nextDate = i.due_date || i.deadline_date;
          return nextDate && nextDate > today && nextDate <= upcomingCutoffStr;
        })
        .sort((a, b) => (a.due_date || a.deadline_date || '').localeCompare(b.due_date || b.deadline_date || '')),
    );

    const sectionsMap: Record<string, TodoItemRow[]> = {};
    sections.forEach(s => { sectionsMap[s.id] = []; });
    [...remainingItems.filter(i => !i.parent_task_id), ...items.filter(i => isStudySubject(i) && i.status === 'open')].forEach((i) => {
      if (i.section_id && sectionsMap[i.section_id] !== undefined) {
        sectionsMap[i.section_id].push(i);
      }
    });
    const sectionsList = sections.map(s => ({
      ...s,
      items: applyFilter(sectionsMap[s.id] || [])
    }));
    return {
      todayItems: applyFilter(todayList),
      inboxItems: inbox,
      upcomingItems: upcoming,
      sectionsWithItems: sectionsList
    };
  }, [openItems, items, sections, today, applyFilter]);

  return {
    sectionById,
    sectionGoalMap,
    sectionDreamMap,
    openItems,
    doneItems,
    getChildren,
    todayItems,
    inboxItems,
    upcomingItems,
    sectionsWithItems,
  };
}
