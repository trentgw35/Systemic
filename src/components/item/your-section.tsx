"use client";

import type { ItemViewResponse } from "@/lib/engine/item-view";
import { CoupledSliders } from "./coupled-sliders";

export function YourSection({
  view,
  onChanged,
}: {
  view: ItemViewResponse;
  onChanged: () => void;
}) {
  const { your_sections, item, stats_labels } = view;

  return (
    <section>
      <h2 className="font-display text-xl text-ink">Your section</h2>
      {!your_sections.length ? (
        <p className="mt-2 rounded-md border border-dashed border-line bg-white/40 p-4 text-sm text-ink-soft">
          You don’t own a section on this item yet. You can still follow the
          stats and the full picture.
        </p>
      ) : (
        <div className="mt-4 space-y-8">
          {your_sections.map((section) => (
            <div
              key={section.parent_id}
              className="rounded-md border border-line bg-white/40 p-4"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded bg-sea/10 px-2 py-1 font-medium text-sea-deep">
                  {section.path.join(" › ")}
                </span>
                <span className="text-ink-soft">
                  Section share:{" "}
                  <strong className="text-ink">
                    {section.share_of_whole.toFixed(1)}%
                  </strong>
                </span>
              </div>
              <CoupledSliders
                itemId={item.id}
                parentId={section.parent_id}
                sectionShare={section.share_of_whole}
                inputs={section.children}
                mode={item.mode}
                localLabel={stats_labels.local}
                wholeLabel={stats_labels.whole}
                confirmed={section.confirmed}
                onChanged={onChanged}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
