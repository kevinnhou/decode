"use client";

import { Button } from "@decode/ui/components/button";
import type { Route } from "next";
import Link from "next/link";

const competitions = [
  {
    name: "FTC",
    description: "FIRST Tech Challenge",
    href: "/scout/ftc/match" as Route,
  },
  {
    name: "FRC",
    description: "FIRST Robotics Competition",
    href: "/scout/frc/match" as Route,
  },
] as const;

export default function Scout() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-4">
          {competitions.map((comp) => (
            <Link href={comp.href} key={comp.name} prefetch={true}>
              <Button
                className="flex h-auto flex-col gap-1 rounded-xl px-10 py-6"
                variant="outline"
              >
                <span className="font-mono text-lg">{comp.name}</span>
                <span className="text-muted-foreground text-xs">
                  {comp.description}
                </span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
