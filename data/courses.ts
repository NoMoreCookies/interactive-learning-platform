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
      left: "/courses/matematyka-rozszerzona/math-extended-left.svg",
      right: "/courses/matematyka-rozszerzona/math-extended-right.svg",
    },

    modules: [
      {
        id: "module-math-extended-functions",
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
            videoPath: "/videos/mathematics/funkcja-kwadratowa.mp4",
            materialsPath:
              "/materials/mathematics/funkcja-kwadratowa-materialy.zip",

            notes: [
              {
                id: "note-quadratic-general-form",
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
                id: "task-quadratic-zero-points",
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

Następnie korzystamy ze wzoru na miejsca zerowe:

$$
x_1 = \frac{5 - 1}{2} = 2
$$

$$
x_2 = \frac{5 + 1}{2} = 3
$$
                `,
              },
            ],
          },
          {
            id: "lesson-exponential-function",
            slug: "funkcja-wykladnicza",
            order: 2,
            title: "Funkcja wykładnicza",
            description:
              "Własności, wykres i rozwiązywanie prostych równań wykładniczych.",
            durationMinutes: 24,
            videoPath: "/videos/mathematics/funkcja-wykladnicza.mp4",
            materialsPath:
              "/materials/mathematics/funkcja-wykladnicza-materialy.zip",

            notes: [
              {
                id: "note-exponential-definition",
                title: "Definicja funkcji wykładniczej",
                content: String.raw`
Funkcja wykładnicza ma postać:

$$
f(x) = a^x
$$

gdzie:

$$
a > 0 \qquad \text{oraz} \qquad a \neq 1
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-exponential-equation",
                title: "Rozwiąż równanie",
                content: String.raw`
Rozwiąż równanie:

$$
2^x = 16
$$
                `,
                answer: String.raw`
$$
x = 4
$$
                `,
                solution: String.raw`
Ponieważ:

$$
16 = 2^4
$$

otrzymujemy:

$$
2^x = 2^4
$$

Zatem:

$$
x = 4
$$
                `,
              },
            ],
          },
        ],
      },
      {
        id: "module-math-extended-calculus",
        slug: "rachunek-rozniczkowy",
        title: "Rachunek różniczkowy",
        description: "Pochodne funkcji i ich zastosowania.",
        order: 2,

        lessons: [
          {
            id: "lesson-function-derivative",
            slug: "pochodna-funkcji",
            order: 1,
            title: "Pochodna funkcji",
            description:
              "Definicja pochodnej oraz podstawowe wzory różniczkowania.",
            durationMinutes: 32,
            videoPath: "/videos/mathematics/pochodna-funkcji.mp4",
            materialsPath:
              "/materials/mathematics/pochodna-funkcji-materialy.zip",

            notes: [
              {
                id: "note-derivative-power-rule",
                title: "Pochodna funkcji potęgowej",
                content: String.raw`
Dla funkcji:

$$
f(x) = x^n
$$

pochodna wynosi:

$$
f'(x) = nx^{n-1}
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-calculate-derivative",
                title: "Oblicz pochodną",
                content: String.raw`
Oblicz pochodną funkcji:

$$
f(x) = 3x^4 - 2x^2 + 5
$$
                `,
                answer: String.raw`
$$
f'(x) = 12x^3 - 4x
$$
                `,
                solution: String.raw`
Różniczkujemy każdy składnik osobno:

$$
(3x^4)' = 12x^3
$$

$$
(-2x^2)' = -4x
$$

$$
5' = 0
$$

Dlatego:

$$
f'(x) = 12x^3 - 4x
$$
                `,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "course-math-basic",
    slug: "matematyka-podstawowa",
    title: "Matematyka podstawowa",
    subject: "mathematics",
    description:
      "Kurs przygotowujący do matury podstawowej z matematyki krok po kroku.",
    illustrations: {
      left: "/courses/matematyka-podstawowa/math-basic-left.svg",
      right: "/courses/matematyka-podstawowa/math-basic-right.svg",
    },

    modules: [
      {
        id: "module-math-basic-numbers",
        slug: "liczby-i-dzialania",
        title: "Liczby i działania",
        description:
          "Podstawowe działania, potęgi, pierwiastki i procenty.",
        order: 1,

        lessons: [
          {
            id: "lesson-percentages",
            slug: "procenty",
            order: 1,
            title: "Procenty",
            description:
              "Obliczanie procentu liczby, podwyżek, obniżek i zmian procentowych.",
            durationMinutes: 21,
            videoPath: "/videos/mathematics/procenty.mp4",
            materialsPath:
              "/materials/mathematics/procenty-materialy.zip",

            notes: [
              {
                id: "note-percentage-value",
                title: "Procent danej liczby",
                content: String.raw`
Aby obliczyć $p\%$ liczby $a$, korzystamy ze wzoru:

$$
\frac{p}{100} \cdot a
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-percentage-value",
                title: "Oblicz procent liczby",
                content: String.raw`
Oblicz $15\%$ liczby $240$.
                `,
                answer: String.raw`
$$
36
$$
                `,
                solution: String.raw`
Korzystamy ze wzoru:

$$
\frac{15}{100} \cdot 240
$$

$$
0{,}15 \cdot 240 = 36
$$
                `,
              },
            ],
          },
          {
            id: "lesson-square-roots",
            slug: "pierwiastki",
            order: 2,
            title: "Pierwiastki",
            description:
              "Upraszczanie wyrażeń zawierających pierwiastki.",
            durationMinutes: 19,
            videoPath: "/videos/mathematics/pierwiastki.mp4",
            materialsPath:
              "/materials/mathematics/pierwiastki-materialy.zip",

            notes: [
              {
                id: "note-square-root-product",
                title: "Pierwiastek z iloczynu",
                content: String.raw`
Dla liczb nieujemnych zachodzi:

$$
\sqrt{ab} = \sqrt{a}\sqrt{b}
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-simplify-square-root",
                title: "Uprość pierwiastek",
                content: String.raw`
Uprość wyrażenie:

$$
\sqrt{72}
$$
                `,
                answer: String.raw`
$$
6\sqrt{2}
$$
                `,
                solution: String.raw`
Rozkładamy liczbę $72$:

$$
72 = 36 \cdot 2
$$

Zatem:

$$
\sqrt{72} = \sqrt{36 \cdot 2}
$$

$$
\sqrt{72} = 6\sqrt{2}
$$
                `,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "course-physics-extended",
    slug: "fizyka-rozszerzona",
    title: "Fizyka rozszerzona",
    subject: "physics",
    description:
      "Kurs fizyki rozszerzonej obejmujący mechanikę, energię, elektryczność i fale.",
    illustrations: {
      left: "/courses/fizyka-rozszerzona/physics-extended-left.svg",
      right: "/courses/fizyka-rozszerzona/physics-extended-right.svg",
    },

    modules: [
      {
        id: "module-physics-extended-mechanics",
        slug: "mechanika",
        title: "Mechanika",
        description:
          "Ruch, siły, zasady dynamiki i zasady zachowania.",
        order: 1,

        lessons: [
          {
            id: "lesson-newton-second-law",
            slug: "druga-zasada-dynamiki",
            order: 1,
            title: "Druga zasada dynamiki Newtona",
            description:
              "Zależność między siłą, masą i przyspieszeniem.",
            durationMinutes: 27,
            videoPath:
              "/videos/physics/druga-zasada-dynamiki.mp4",
            materialsPath:
              "/materials/physics/druga-zasada-dynamiki-materialy.zip",

            notes: [
              {
                id: "note-newton-second-law",
                title: "Podstawowy wzór",
                content: String.raw`
Druga zasada dynamiki Newtona ma postać:

$$
\vec{F} = m\vec{a}
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-newton-acceleration",
                title: "Oblicz przyspieszenie",
                content: String.raw`
Na ciało o masie $4\ \mathrm{kg}$ działa siła o wartości $20\ \mathrm{N}$.

Oblicz przyspieszenie ciała.
                `,
                answer: String.raw`
$$
a = 5\ \mathrm{\frac{m}{s^2}}
$$
                `,
                solution: String.raw`
Korzystamy ze wzoru:

$$
F = ma
$$

Po przekształceniu:

$$
a = \frac{F}{m}
$$

Podstawiamy dane:

$$
a = \frac{20}{4}
$$

$$
a = 5\ \mathrm{\frac{m}{s^2}}
$$
                `,
              },
            ],
          },
          {
            id: "lesson-kinetic-energy",
            slug: "energia-kinetyczna",
            order: 2,
            title: "Energia kinetyczna",
            description:
              "Energia ruchu oraz zależność od masy i prędkości.",
            durationMinutes: 23,
            videoPath: "/videos/physics/energia-kinetyczna.mp4",
            materialsPath:
              "/materials/physics/energia-kinetyczna-materialy.zip",

            notes: [
              {
                id: "note-kinetic-energy-formula",
                title: "Wzór na energię kinetyczną",
                content: String.raw`
Energię kinetyczną obliczamy ze wzoru:

$$
E_k = \frac{mv^2}{2}
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-calculate-kinetic-energy",
                title: "Oblicz energię kinetyczną",
                content: String.raw`
Ciało o masie $2\ \mathrm{kg}$ porusza się z prędkością:

$$
v = 3\ \mathrm{\frac{m}{s}}
$$

Oblicz jego energię kinetyczną.
                `,
                answer: String.raw`
$$
E_k = 9\ \mathrm{J}
$$
                `,
                solution: String.raw`
Podstawiamy dane do wzoru:

$$
E_k = \frac{mv^2}{2}
$$

$$
E_k = \frac{2 \cdot 3^2}{2}
$$

$$
E_k = 9\ \mathrm{J}
$$
                `,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "course-physics-basics",
    slug: "fizyka-od-podstaw",
    title: "Fizyka od podstaw",
    subject: "physics",
    description:
      "Wprowadzenie do fizyki dla osób, które chcą uporządkować najważniejsze podstawy.",
    illustrations: {
      left: "/courses/fizyka-od-podstaw/physics-basics-left.svg",
      right: "/courses/fizyka-od-podstaw/physics-basics-right.svg",
    },

    modules: [
      {
        id: "module-physics-basics-motion",
        slug: "ruch",
        title: "Opis ruchu",
        description:
          "Droga, czas, prędkość i podstawowe wykresy ruchu.",
        order: 1,

        lessons: [
          {
            id: "lesson-average-speed",
            slug: "predkosc-srednia",
            order: 1,
            title: "Prędkość średnia",
            description:
              "Obliczanie prędkości średniej na podstawie drogi i czasu.",
            durationMinutes: 18,
            videoPath: "/videos/physics/predkosc-srednia.mp4",
            materialsPath:
              "/materials/physics/predkosc-srednia-materialy.zip",

            notes: [
              {
                id: "note-average-speed-formula",
                title: "Wzór na prędkość średnią",
                content: String.raw`
Prędkość średnią obliczamy ze wzoru:

$$
v_{\text{śr}} = \frac{s}{t}
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-average-speed",
                title: "Oblicz prędkość",
                content: String.raw`
Samochód przejechał $150\ \mathrm{km}$ w czasie $3\ \mathrm{h}$.

Oblicz jego prędkość średnią.
                `,
                answer: String.raw`
$$
v_{\text{śr}} = 50\ \mathrm{\frac{km}{h}}
$$
                `,
                solution: String.raw`
Podstawiamy dane do wzoru:

$$
v_{\text{śr}} = \frac{s}{t}
$$

$$
v_{\text{śr}} = \frac{150}{3}
$$

$$
v_{\text{śr}} = 50\ \mathrm{\frac{km}{h}}
$$
                `,
              },
            ],
          },
        ],
      },
      {
        id: "module-physics-basics-forces",
        slug: "sily",
        title: "Siły",
        description:
          "Podstawowe rodzaje sił i ich wpływ na ruch ciał.",
        order: 2,

        lessons: [
          {
            id: "lesson-gravitational-force",
            slug: "sila-ciezkosci",
            order: 1,
            title: "Siła ciężkości",
            description:
              "Zależność siły ciężkości od masy i przyspieszenia grawitacyjnego.",
            durationMinutes: 20,
            videoPath: "/videos/physics/sila-ciezkosci.mp4",
            materialsPath:
              "/materials/physics/sila-ciezkosci-materialy.zip",

            notes: [
              {
                id: "note-gravitational-force-formula",
                title: "Wzór na siłę ciężkości",
                content: String.raw`
Siłę ciężkości obliczamy ze wzoru:

$$
F_g = mg
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-gravitational-force",
                title: "Oblicz siłę ciężkości",
                content: String.raw`
Oblicz siłę ciężkości działającą na ciało o masie $5\ \mathrm{kg}$.

Przyjmij:

$$
g = 10\ \mathrm{\frac{m}{s^2}}
$$
                `,
                answer: String.raw`
$$
F_g = 50\ \mathrm{N}
$$
                `,
                solution: String.raw`
Podstawiamy dane do wzoru:

$$
F_g = mg
$$

$$
F_g = 5 \cdot 10
$$

$$
F_g = 50\ \mathrm{N}
$$
                `,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "course-computer-science-matura",
    slug: "informatyka-maturalna",
    title: "Informatyka maturalna",
    subject: "computer-science",
    description:
      "Przygotowanie do matury z informatyki: algorytmy, Python, arkusze i bazy danych.",
    illustrations: {
      left: "/courses/informatyka-maturalna/cs-matura-left.svg",
      right: "/courses/informatyka-maturalna/cs-matura-right.svg",
    },

    modules: [
      {
        id: "module-cs-matura-python",
        slug: "python",
        title: "Programowanie w Pythonie",
        description:
          "Podstawowe konstrukcje języka Python potrzebne na maturze.",
        order: 1,

        lessons: [
          {
            id: "lesson-python-loops",
            slug: "petle",
            order: 1,
            title: "Pętle w Pythonie",
            description:
              "Pętle for i while oraz ich zastosowanie w zadaniach algorytmicznych.",
            durationMinutes: 30,
            videoPath: "/videos/computer-science/petle-python.mp4",
            materialsPath:
              "/materials/computer-science/petle-python-materialy.zip",

            notes: [
              {
                id: "note-python-for-loop",
                title: "Pętla for",
                content: String.raw`
Pętla \`for\` pozwala wykonywać instrukcję dla kolejnych elementów kolekcji.

\`\`\`python
for number in range(1, 6):
    print(number)
\`\`\`
                `,
              },
            ],

            tasks: [
              {
                id: "task-python-sum",
                title: "Suma liczb",
                content: String.raw`
Napisz program, który oblicza sumę liczb całkowitych od $1$ do $100$.
                `,
                answer: String.raw`
$$
5050
$$
                `,
                solution: String.raw`
Przykładowe rozwiązanie:

\`\`\`python
total = 0

for number in range(1, 101):
    total += number

print(total)
\`\`\`
                `,
              },
            ],
          },
        ],
      },
      {
        id: "module-cs-matura-algorithms",
        slug: "algorytmy",
        title: "Algorytmy",
        description:
          "Wyszukiwanie, sortowanie i analiza prostych algorytmów.",
        order: 2,

        lessons: [
          {
            id: "lesson-binary-search",
            slug: "wyszukiwanie-binarne",
            order: 1,
            title: "Wyszukiwanie binarne",
            description:
              "Efektywne wyszukiwanie elementu w uporządkowanym ciągu.",
            durationMinutes: 26,
            videoPath:
              "/videos/computer-science/wyszukiwanie-binarne.mp4",
            materialsPath:
              "/materials/computer-science/wyszukiwanie-binarne-materialy.zip",

            notes: [
              {
                id: "note-binary-search-complexity",
                title: "Złożoność obliczeniowa",
                content: String.raw`
Wyszukiwanie binarne działa dla uporządkowanych danych.

Jego złożoność czasowa wynosi:

$$
O(\log n)
$$
                `,
              },
            ],

            tasks: [
              {
                id: "task-binary-search-condition",
                title: "Warunek użycia algorytmu",
                content:
                  "Jaki warunek musi spełniać tablica, aby można było zastosować wyszukiwanie binarne?",
                answer:
                  "Tablica musi być uporządkowana według przyjętego porządku.",
                solution:
                  "Algorytm odrzuca połowę zakresu po każdym porównaniu. Jest to możliwe tylko wtedy, gdy elementy są uporządkowane.",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "course-programming-python",
    slug: "programowanie-w-pythonie",
    title: "Programowanie w Pythonie",
    subject: "computer-science",
    description:
      "Praktyczny kurs programowania od pierwszych zmiennych do własnych funkcji i struktur danych.",
    illustrations: {
      left: "/courses/programowanie-w-pythonie/python-left.svg",
      right: "/courses/programowanie-w-pythonie/python-right.svg",
    },

    modules: [
      {
        id: "module-python-basics",
        slug: "podstawy-pythona",
        title: "Podstawy Pythona",
        description:
          "Zmienne, typy danych, instrukcje warunkowe i operatory.",
        order: 1,

        lessons: [
          {
            id: "lesson-python-variables",
            slug: "zmienne-i-typy-danych",
            order: 1,
            title: "Zmienne i typy danych",
            description:
              "Tworzenie zmiennych oraz praca z liczbami, tekstem i wartościami logicznymi.",
            durationMinutes: 22,
            videoPath:
              "/videos/computer-science/zmienne-i-typy-danych.mp4",
            materialsPath:
              "/materials/computer-science/zmienne-i-typy-danych-materialy.zip",

            notes: [
              {
                id: "note-python-basic-types",
                title: "Podstawowe typy danych",
                content: String.raw`
Najczęściej używane podstawowe typy danych w Pythonie:

- \`int\` — liczby całkowite,
- \`float\` — liczby zmiennoprzecinkowe,
- \`str\` — napisy,
- \`bool\` — wartości logiczne.
                `,
              },
            ],

            tasks: [
              {
                id: "task-python-variable",
                title: "Utwórz zmienne",
                content: String.raw`
Utwórz zmienne przechowujące:

- imię użytkownika,
- jego wiek,
- informację, czy jest pełnoletni.
                `,
                answer: String.raw`
\`\`\`python
name = "Kacper"
age = 22
is_adult = True
\`\`\`
                `,
                solution: String.raw`
Tekst zapisujemy jako \`str\`, wiek jako \`int\`, a informację logiczną jako \`bool\`.

\`\`\`python
name = "Kacper"
age = 22
is_adult = age >= 18
\`\`\`
                `,
              },
            ],
          },
          {
            id: "lesson-python-conditions",
            slug: "instrukcje-warunkowe",
            order: 2,
            title: "Instrukcje warunkowe",
            description:
              "Sterowanie działaniem programu za pomocą if, elif i else.",
            durationMinutes: 25,
            videoPath:
              "/videos/computer-science/instrukcje-warunkowe.mp4",
            materialsPath:
              "/materials/computer-science/instrukcje-warunkowe-materialy.zip",

            notes: [
              {
                id: "note-python-if",
                title: "Instrukcja if",
                content: String.raw`
Instrukcja warunkowa wykonuje kod tylko wtedy, gdy warunek jest prawdziwy.

\`\`\`python
age = 18

if age >= 18:
    print("Użytkownik jest pełnoletni")
\`\`\`
                `,
              },
            ],

            tasks: [
              {
                id: "task-python-number-sign",
                title: "Sprawdź znak liczby",
                content:
                  "Napisz program, który sprawdzi, czy liczba jest dodatnia, ujemna czy równa zero.",
                answer: String.raw`
\`\`\`python
number = 7

if number > 0:
    print("Liczba dodatnia")
elif number < 0:
    print("Liczba ujemna")
else:
    print("Zero")
\`\`\`
                `,
                solution:
                  "Najpierw sprawdzamy, czy liczba jest większa od zera. Następnie, czy jest mniejsza. Jeśli żaden warunek nie jest spełniony, liczba musi być równa zero.",
              },
            ],
          },
        ],
      },
      {
        id: "module-python-functions",
        slug: "funkcje",
        title: "Funkcje",
        description:
          "Tworzenie funkcji, parametry i zwracanie wyników.",
        order: 2,

        lessons: [
          {
            id: "lesson-python-functions",
            slug: "tworzenie-funkcji",
            order: 1,
            title: "Tworzenie funkcji",
            description:
              "Definiowanie własnych funkcji za pomocą słowa kluczowego def.",
            durationMinutes: 29,
            videoPath:
              "/videos/computer-science/tworzenie-funkcji.mp4",
            materialsPath:
              "/materials/computer-science/tworzenie-funkcji-materialy.zip",

            notes: [
              {
                id: "note-python-function-definition",
                title: "Definicja funkcji",
                content: String.raw`
Funkcję definiujemy za pomocą słowa kluczowego \`def\`.

\`\`\`python
def add(a: int, b: int) -> int:
    return a + b
\`\`\`
                `,
              },
            ],

            tasks: [
              {
                id: "task-python-rectangle-area",
                title: "Pole prostokąta",
                content:
                  "Napisz funkcję, która przyjmuje długości boków prostokąta i zwraca jego pole.",
                answer: String.raw`
\`\`\`python
def rectangle_area(width: float, height: float) -> float:
    return width * height
\`\`\`
                `,
                solution:
                  "Pole prostokąta jest iloczynem długości jego boków. Funkcja powinna więc zwrócić wynik mnożenia parametrów `width` i `height`.",
              },
            ],
          },
        ],
      },
    ],
  },
];