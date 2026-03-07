"use client";

import { SidebarAssignmentSlot } from "./slot";
import { Toggle } from "./toggle";

export function MatchHeader() {
  return (
    <>
      <Toggle />
      <SidebarAssignmentSlot />
    </>
  );
}
