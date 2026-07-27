export type CourseSubject =
  | "MATHEMATICS"
  | "PHYSICS"
  | "COMPUTER_SCIENCE";

export type CourseLevel =
  | "BASIC"
  | "EXTENDED";

export type LessonNote = {
  id: string;
  title: string;
  content: string;
};

export type LessonTask = {
  id: string;
  title: string;
  content: string;
  imagePath?: string;
  answer: string;
  solution: string;
};

export type Lesson = {
  id: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  durationMinutes: number;
  videoPath: string;
  materialsPath?: string;
  notes: LessonNote[];
  tasks: LessonTask[];
};

export type CourseModule = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
};

export type CourseIllustrations = {
  left: string;
  right: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: CourseSubject;
  level?: CourseLevel;
  thumbnailPath?: string;
  modules: CourseModule[];
  illustrations?: CourseIllustrations;
};