import roadmap from "@/public/roadmap-data.json";
import { RoadmapViz } from "@/components/roadmap/RoadmapViz";
import type { Roadmap } from "@/components/roadmap/roadmap-types";

export default function RoadmapPage() {
  return <RoadmapViz roadmap={roadmap as unknown as Roadmap} />;
}
