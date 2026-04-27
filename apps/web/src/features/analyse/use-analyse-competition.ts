"use client";

import { useSearchParams } from "next/navigation";
import {
  type AnalyseCompetitionType,
  parseAnalyseCompetitionType,
} from "@/lib/analyse";

export function useAnalyseCompetition(): AnalyseCompetitionType {
  const searchParams = useSearchParams();
  return parseAnalyseCompetitionType(searchParams.get("competitionType"));
}
