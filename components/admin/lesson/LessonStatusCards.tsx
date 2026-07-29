import { Surface } from "@/components/ui";

type LessonStatusCardsProps = {
  hasVideo: boolean;
  hasMaterials: boolean;
  notesCount: number;
  tasksCount: number;
};

export default function LessonStatusCards({
  hasVideo,
  hasMaterials,
  notesCount,
  tasksCount,
}: LessonStatusCardsProps) {
  return (
    <section
      aria-label="Stan kompletności lekcji"
      className="grid gap-4 md:grid-cols-4"
    >
      <StatusCard
        label="Film"
        value={hasVideo ? "Gotowy" : "Brak"}
        ready={hasVideo}
      />

      <StatusCard
        label="Materiały"
        value={hasMaterials ? "Gotowe" : "Brak"}
        ready={hasMaterials}
      />

      <StatusCard
        label="Notatki"
        value={String(notesCount)}
        ready={notesCount > 0}
      />

      <StatusCard
        label="Zadania"
        value={String(tasksCount)}
        ready={tasksCount > 0}
      />
    </section>
  );
}

type StatusCardProps = {
  label: string;
  value: string;
  ready: boolean;
};

function StatusCard({
  label,
  value,
  ready,
}: StatusCardProps) {
  return (
    <Surface className="p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-lg font-semibold text-zinc-100">
          {value}
        </p>

        <span
          aria-hidden="true"
          className={[
            "h-3 w-3 rounded-full",
            ready
              ? "bg-emerald-400"
              : "bg-red-400",
          ].join(" ")}
        />
      </div>
    </Surface>
  );
}
