/** biome-ignore-all lint/style/noNestedTernary: PASS */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: PASS */
/** biome-ignore-all lint/nursery/noLeakedRender: PASS */

"use client";

import { Button } from "@decode/ui/components/button";
import { Logo } from "@decode/ui/components/logo";
import {
  BookMarked,
  ChartNoAxesGantt,
  Menu,
  Telescope,
  User,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const headerNavigation = [
  {
    name: "Docs",
    href: "/docs" as Route,
    icon: BookMarked,
  },
  {
    name: "Scout",
    href: "/scout" as Route,
    icon: Telescope,
  },
  {
    name: "Analyse",
    href: "/analyse" as Route,
    icon: ChartNoAxesGantt,
  },
] as const;

function DesktopNavigation() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "Profile";

  return (
    <div className="hidden w-full items-center justify-between sm:flex">
      <Link className="flex items-center" href="/" prefetch={true}>
        <span className="block h-8 w-auto">
          <Logo className="h-full w-auto" />
        </span>
      </Link>
      <nav className="flex items-center gap-6 lg:gap-10">
        {headerNavigation.map((route) => (
          <Link
            className="text-center font-normal text-foreground/90 text-md tracking-wide transition-colors hover:text-foreground"
            href={route.href}
            key={route.name}
            prefetch={true}
          >
            {route.name}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-4 lg:gap-8">
        {session?.user ? (
          <Link className="contents" href={"/profile" as Route} prefetch={true}>
            <Button className="gap-2" type="button">
              <User className="size-4" />
              {name}
            </Button>
          </Link>
        ) : (
          <>
            <Link
              className="font-extralight font-mono text-foreground/90 text-md tracking-wide transition-colors hover:text-foreground max-md:hidden"
              href={"/login" as Route}
              prefetch={true}
            >
              LOGIN
            </Link>
            <Link
              className="contents"
              href={"/signup" as Route}
              prefetch={true}
            >
              <Button type="button">SIGN UP</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function MobileNavigation() {
  const { data: session } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const name = session?.user?.name ?? session?.user?.email ?? "Profile";

  const CASCADE_DELAY = 100;
  const TIMER_DURATION = 500;

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, TIMER_DURATION);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const totalItems = headerNavigation.length + (session?.user ? 1 : 2);

  return (
    <>
      {isOpen ? (
        <button
          className="fixed inset-x-0 top-14 bottom-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 sm:hidden"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          style={
            {
              opacity: isAnimating && isOpen ? 1 : 0,
              pointerEvents: isAnimating && isOpen ? "auto" : "none",
            } as React.CSSProperties
          }
          tabIndex={-1}
          type="button"
        />
      ) : null}

      <div className="flex w-full items-center justify-between sm:hidden">
        <div className="flex items-center">
          <Link href="/" prefetch={true}>
            <span className="mr-[20px] block h-6 w-auto">
              <Logo className="h-full w-auto" />
            </span>
          </Link>
        </div>

        <Button
          className="cursor-pointer bg-transparent! p-2 ring-0 ring-transparent"
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          variant="ghost"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>

        <div
          className={`fixed top-14 right-0 left-0 z-50 w-full overflow-hidden border-b bg-background/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
            isAnimating
              ? "max-h-[400px] opacity-100"
              : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-2 p-4">
            {headerNavigation.map((route, index) => (
              <Link
                className="inline-flex items-center gap-2 py-3 font-medium font-mono text-foreground/90 text-md tracking-tight transition-colors hover:text-foreground"
                href={route.href}
                key={route.name}
                onClick={() => setIsOpen(false)}
                prefetch={true}
                style={{
                  animationDelay: isOpen
                    ? `${index * CASCADE_DELAY}ms`
                    : `${(totalItems - index - 1) * CASCADE_DELAY}ms`,
                  animationDuration: "0.4s",
                  animationFillMode: "forwards",
                  animationName: isAnimating
                    ? isOpen
                      ? "cascade-in"
                      : "cascade-out"
                    : "none",
                  animationTimingFunction: "ease",
                  opacity: isAnimating ? (isOpen ? 0 : 1) : 0,
                  transform: isAnimating
                    ? isOpen
                      ? "translateY(-20px)"
                      : "translateY(0)"
                    : "translateY(-20px)",
                }}
              >
                <route.icon className="text-foreground/60" size={16} />
                <span>{route.name}</span>
              </Link>
            ))}
            <div className="mt-2 border-t pt-2">
              {session?.user ? (
                <Link
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium font-mono text-md text-primary-foreground tracking-tight transition-colors hover:bg-primary/90"
                  href={"/profile" as Route}
                  onClick={() => setIsOpen(false)}
                  prefetch={true}
                  style={{
                    animationDelay: isOpen
                      ? `${headerNavigation.length * CASCADE_DELAY}ms`
                      : "0ms",
                    animationDuration: "0.4s",
                    animationFillMode: "forwards",
                    animationName: isAnimating
                      ? isOpen
                        ? "cascade-in"
                        : "cascade-out"
                      : "none",
                    animationTimingFunction: "ease",
                    opacity: isAnimating ? (isOpen ? 0 : 1) : 0,
                    transform: isAnimating
                      ? isOpen
                        ? "translateY(-20px)"
                        : "translateY(0)"
                      : "translateY(-20px)",
                  }}
                >
                  <User className="size-4" />
                  <span>{name}</span>
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    className="inline-flex items-center justify-center py-3 font-medium font-mono text-foreground/90 text-md tracking-tight transition-colors hover:text-foreground"
                    href={"/login" as Route}
                    onClick={() => setIsOpen(false)}
                    prefetch={true}
                    style={{
                      animationDelay: isOpen
                        ? `${headerNavigation.length * CASCADE_DELAY}ms`
                        : `${CASCADE_DELAY}ms`,
                      animationDuration: "0.4s",
                      animationFillMode: "forwards",
                      animationName: isAnimating
                        ? isOpen
                          ? "cascade-in"
                          : "cascade-out"
                        : "none",
                      animationTimingFunction: "ease",
                      opacity: isAnimating ? (isOpen ? 0 : 1) : 0,
                      transform: isAnimating
                        ? isOpen
                          ? "translateY(-20px)"
                          : "translateY(0)"
                        : "translateY(-20px)",
                    }}
                  >
                    LOGIN
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 font-medium font-mono text-md text-primary-foreground tracking-tight transition-colors hover:bg-primary/90"
                    href={"/signup" as Route}
                    onClick={() => setIsOpen(false)}
                    prefetch={true}
                    style={{
                      animationDelay: isOpen
                        ? `${(headerNavigation.length + 1) * CASCADE_DELAY}ms`
                        : "0ms",
                      animationDuration: "0.4s",
                      animationFillMode: "forwards",
                      animationName: isAnimating
                        ? isOpen
                          ? "cascade-in"
                          : "cascade-out"
                        : "none",
                      animationTimingFunction: "ease",
                      opacity: isAnimating ? (isOpen ? 0 : 1) : 0,
                      transform: isAnimating
                        ? isOpen
                          ? "translateY(-20px)"
                          : "translateY(0)"
                        : "translateY(-20px)",
                    }}
                  >
                    SIGN UP
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Header() {
  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-foreground border-b bg-background px-10 py-4 lg:px-20">
      <DesktopNavigation />
      <MobileNavigation />
    </header>
  );
}
