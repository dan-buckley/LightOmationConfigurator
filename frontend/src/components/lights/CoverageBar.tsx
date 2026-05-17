interface Segment {
  start_led: number;
  stop_led: number;
  name?: string | null;
}

interface CoverageBarProps {
  segments: Segment[];
  totalLeds: number | null;
}

interface Block {
  start: number;
  end: number;
  type: 'covered' | 'gap' | 'overlap';
  label?: string;
}

function computeBlocks(segments: Segment[], totalLeds: number): Block[] {
  if (totalLeds <= 0) return [];
  const blocks: Block[] = [];
  const sorted = [...segments].sort((a, b) => a.start_led - b.start_led);

  // Build a coverage map: for each LED position, how many segments cover it
  // For visualisation purposes, compute blocks from the sorted segments
  let cursor = 0;
  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    const start = Math.max(0, seg.start_led);
    const end = Math.min(totalLeds, seg.stop_led);

    if (start > cursor) {
      blocks.push({ start: cursor, end: start, type: 'gap' });
    }
    // Check if this segment overlaps with the previous covered area
    if (start < cursor) {
      // Overlap portion
      blocks.push({ start, end: Math.min(cursor, end), type: 'overlap' });
      if (end > cursor) {
        blocks.push({ start: cursor, end, type: 'covered', label: seg.name ?? undefined });
      }
    } else {
      blocks.push({ start, end, type: 'covered', label: seg.name ?? undefined });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < totalLeds) {
    blocks.push({ start: cursor, end: totalLeds, type: 'gap' });
  }
  return blocks;
}

export function CoverageBar({ segments, totalLeds }: CoverageBarProps) {
  if (!totalLeds || totalLeds <= 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        Set total LEDs to see coverage visualisation
      </div>
    );
  }

  const blocks = computeBlocks(segments, totalLeds);

  if (blocks.length === 0) {
    return (
      <div className="h-6 w-full rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-400">No segments defined</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex h-6 w-full rounded overflow-hidden border border-gray-200">
        {blocks.map((block, i) => {
          const widthPct = ((block.end - block.start) / totalLeds) * 100;
          const color =
            block.type === 'gap'
              ? 'bg-red-200'
              : block.type === 'overlap'
                ? 'bg-orange-400'
                : 'bg-green-400';
          return (
            <div
              key={i}
              className={`${color} h-full relative group`}
              style={{ width: `${widthPct}%` }}
              title={
                block.type === 'gap'
                  ? `Gap: ${block.start}–${block.end}`
                  : block.type === 'overlap'
                    ? `Overlap: ${block.start}–${block.end}`
                    : `${block.label ?? 'Segment'}: ${block.start}–${block.end}`
              }
            />
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-400" />
          Covered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200" />
          Gap
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />
          Overlap
        </span>
        <span className="ml-auto">{totalLeds} LEDs total</span>
      </div>
    </div>
  );
}
