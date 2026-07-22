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

export type Course = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  subject: "mathematics" | "physics" | "computer-science";
  level: string;
  modules: CourseModule[];
};

