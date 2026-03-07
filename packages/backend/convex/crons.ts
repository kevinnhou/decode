import { cronJobs } from "convex/server";

const crons = cronJobs();

// FRC FIRST API cache can be refreshed manually via fetchAndCacheEventSchedule action.
// Add scheduled refresh here when needed, e.g.:
// crons.interval("refresh-frc-schedule", { hours: 1 }, api.firstApi.fetchAndCacheEventSchedule, { season: 2025, eventCode: "AUSC" });

export default crons;
