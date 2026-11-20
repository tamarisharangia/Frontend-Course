// Типы описывают «форму» данных. Это как структура компонента в Figma:
// TypeScript подскажет, если в JSON урока забыли обязательное поле.

export type SkillId =
  | 'html' | 'layout' | 'responsive' | 'tokens' | 'js'
  | 'react' | 'motion' | 'ds' | 'tools' | 'platforms';

export type SkillPoints = Partial<Record<SkillId, number>>;

/** Одна автоматическая проверка задания. */
export interface Check {
  /** exists — элемент есть; count — сколько элементов; style — вычисленный стиль;
   *  text — текст элемента; attr — атрибут; source — регулярка по исходному коду */
  type: 'exists' | 'notExists' | 'count' | 'style' | 'text' | 'attr' | 'source';
  label: string;
  /** Подсказка при ошибке — наводит на мысль, но не даёт готовый ответ */
  hint: string;
  selector?: string;
  /** style: CSS-свойство, например "padding-top" */
  prop?: string;
  /** attr: имя атрибута */
  attr?: string;
  equals?: string;
  oneOf?: string[];
  notEquals?: string;
  contains?: string;
  min?: number;
  max?: number;
  /** source/attr: регулярное выражение */
  pattern?: string;
  file?: 'html' | 'css' | 'js';
  /** source: проверка, что шаблона НЕТ */
  not?: boolean;
  /** проверять все найденные элементы, а не только первый */
  all?: boolean;
}

export interface CodeFiles { html?: string; css?: string; js?: string }

export interface Task {
  id: string;
  title: string;
  brief: string;
  files: CodeFiles;
  checks: Check[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explain: string;
  /** Мини-макет для вопросов вида «угадай платформу» */
  preview?: { html: string; css?: string; height?: number };
}

export type Control =
  | { type: 'range'; var: string; label: string; min: number; max: number; step?: number; unit?: string; value: number }
  | { type: 'select'; var: string; label: string; options: { label: string; value: string }[]; value: string }
  | { type: 'toggle'; className: string; label: string; value: boolean };

export interface PlaygroundWidget {
  type: 'playground';
  title: string;
  description?: string;
  html: string;
  css: string;
  /** Что показать в блоке кода. По умолчанию — css с подставленными значениями */
  code?: string;
  controls: Control[];
  height?: number;
}

export interface ComparatorWidget {
  type: 'comparator';
  title: string;
  description?: string;
  ios: { html: string; css: string };
  android: { html: string; css: string };
  diffs: { id: string; label: string; ios: string; android: string }[];
}

export interface ChecklistWidget {
  type: 'checklist';
  id: string;
  title: string;
  description?: string;
  groups: { title: string; items: string[] }[];
}

export type Widget = PlaygroundWidget | ComparatorWidget | ChecklistWidget;

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  duration?: string;
  stub?: boolean;
  skills: SkillPoints;
  /** Пометка о версии гайдлайнов/спецификаций */
  version?: string;
  theory?: string[];
  figma?: string;
  widgets?: Widget[];
  task?: Task;
  quiz?: QuizQuestion[];
  practice?: string;
  sources?: { label: string; url: string }[];
}

export interface Module {
  id: string;
  order: number;
  num: string;
  title: string;
  summary: string;
  status: 'ready' | 'stub';
  skills: SkillId[];
  lessons: Lesson[];
}

export interface GlossaryTerm {
  designer: string;
  developer: string;
  explain: string;
  category: string;
}
