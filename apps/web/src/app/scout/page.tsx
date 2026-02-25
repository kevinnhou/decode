"use client";

import { Button } from "@decode/ui/components/button";
import type { Route } from "next";
import Link from "next/link";

const competitions = [
  {
    name: "FTC",
    description: "FIRST Tech Challenge",
    routes: [{ label: "Match Scouting", href: "/scout/ftc/match" as Route }],
  },
  {
    name: "FRC",
    description: "FIRST Robotics Competition",
    routes: [
      { label: "Match Scouting", href: "/scout/frc/match" as Route },
      { label: "Pit Scouting", href: "/scout/frc/pit" as Route },
    ],
  },
] as const;

export default function Scout() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-6">
          {competitions.map((comp) => (
            <div className="flex flex-col gap-3" key={comp.name}>
              <div className="flex flex-col items-center gap-1">
                <span className="font-mono text-lg">{comp.name}</span>
                <span className="text-muted-foreground text-xs">
                  {comp.description}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {comp.routes.map((route) => (
                  <Link href={route.href} key={route.href} prefetch={true}>
                    <Button
                      className="w-full rounded-xl px-8 py-5"
                      variant="outline"
                    >
                      <span className="text-sm">{route.label}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
