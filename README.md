# Interactive Learning Platform

An educational platform built with Next.js and TypeScript.

## Features

- Mathematics, Physics and Computer Science courses
- Course modules
- Lesson pages
- Notes
- Exercises
- Solutions
- Downloadable materials

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS

## Roadmap

- AWS Amplify
- Amazon S3
- Amazon Cognito
- User authentication
- Course progress
- Payment integration

## Local setup

npm install
npm run dev


components/auth/AuthPorvider.tsx - testy

1. guest → wejście na stronę
2. user → refresh strony
3. admin → refresh strony
4. logout
5. login user A → logout → login user B
6. kilka refreshAuth równolegle
7. refreshAuth → logout zanim refresh się skończy
8. logout kliknięty dwa razy
9. legal cache user A nie przechodzi na user B
10. ADMIN claim nadal poprawnie daje isAdmin=true