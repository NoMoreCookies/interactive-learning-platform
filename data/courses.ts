import type { Course } from "@/types/course";

export const courses: Course[] = [
  {
    id: "course-math-extended",
    slug: "matematyka-rozszerzona",
    title: "Matematyka rozszerzona",
    subject: "mathematics",
    description:
      "Kompletny kurs matematyki rozszerzonej z teorią, zadaniami i rozwiązaniami.",
    illustrations: {
      left: "/illustrations/courses/math-extended-left.svg",
      right: "/illustrations/courses/math-extended-right.svg",
    },

    modules: [
      {
        id: "module-functions",
        slug: "funkcje",
        title: "Funkcje",
        description: "Najważniejsze zagadnienia dotyczące funkcji.",
        order: 1,

        lessons: [
          {
            id: "lesson-quadratic-function",
            slug: "funkcja-kwadratowa",
            order: 1,
            title: "Funkcja kwadratowa",
            description:
              "Postać ogólna, delta, miejsca zerowe i wierzchołek paraboli.",
            durationMinutes: 28,
            videoPath: "/videos/mat12.mp4",
            materialsPath:
              "/materials/funkcja-kwadratowa-materialy.zip",

            notes: [
              {
                id: "note-general-form",
                title: "Postać ogólna",
                content: String.raw`
Funkcja kwadratowa ma postać:

$$
f(x) = ax^2 + bx + c
$$

gdzie $a \neq 0$.
                `,
              },
            ],

            tasks: [
              {
                id: "task-zero-points",
                title: "Wyznacz miejsca zerowe",
                content: String.raw`
Wyznacz miejsca zerowe funkcji:

$$
f(x) = x^2 - 5x + 6
$$
                `,
                answer: String.raw`
$$
x_1 = 2,\qquad x_2 = 3
$$
                `,
                solution: String.raw`
Liczymy deltę:

$$
\Delta = (-5)^2 - 4 \cdot 1 \cdot 6 = 1
$$

Następnie korzystamy ze wzoru na miejsca zerowe.
                `,
              },
            ],
          },
        ],
      },
    ],
  },
];