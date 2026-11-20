// Контент уроков лежит в /content/modules/*.json — отдельно от кода.
// Vite при сборке находит все файлы по маске и подключает их.
import type { GlossaryTerm, Lesson, Module, SkillId } from './types';
import glossaryData from '../../content/glossary.json';

const files = import.meta.glob<Module>('../../content/modules/*.json', { eager: true, import: 'default' });

export const modules: Module[] = Object.values(files).sort((a, b) => a.order - b.order);
export const glossary = glossaryData as GlossaryTerm[];

export const lessonKey = (m: Module, l: Lesson) => `${m.id}/${l.id}`;

export function findLesson(moduleId?: string, lessonId?: string) {
  const module = modules.find((m) => m.id === moduleId);
  const lesson = module?.lessons.find((l) => l.id === lessonId);
  return module && lesson ? { module, lesson } : null;
}

/** Все уроки подряд — удобно для «предыдущий / следующий» */
export const allLessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson })));

export const SKILLS: { id: SkillId; label: string }[] = [
  { id: 'html', label: 'HTML' },
  { id: 'layout', label: 'CSS Layout' },
  { id: 'responsive', label: 'Адаптив' },
  { id: 'tokens', label: 'Токены' },
  { id: 'js', label: 'JavaScript' },
  { id: 'react', label: 'React' },
  { id: 'motion', label: 'Motion' },
  { id: 'ds', label: 'Дизайн-системы' },
  { id: 'tools', label: 'Инструменты' },
  { id: 'platforms', label: 'Платформы (iOS / Android)' },
];
