/** biome-ignore-all lint/style/noNestedTernary: PASS */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: PASS */

"use client";

import Logo from "@ui/components/branding/logo";
import { Button } from "@ui/components/shadcn/button";
import { BookMarked, ChartNoAxesGantt, Menu, Telescope, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const headerNavigation = [
  {
    name: "Docs",
    href: "/docs",
    icon: BookMarked,
  },
  {
    name: "Scout",
    href: "/scout",
    icon: Telescope,
  },
  {
    name: "Analyse",
    href: "/analyse",
    icon: ChartNoAxesGantt,
  },
];

function DesktopNavigation() {
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
        <Link
          className="font-extralight font-mono text-foreground/90 text-md tracking-wide transition-colors hover:text-foreground max-md:hidden"
          href="/auth/login"
          prefetch={true}
        >
          LOGIN
        </Link>
        <Link className="contents" href="/auth/signup" prefetch={true}>
          <Button type="button">SIGN UP</Button>
        </Link>
      </div>
    </div>
  );
}

function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const totalItems = headerNavigation.length + 2;

  return (
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
        className={`absolute top-14 left-0 z-50 w-full overflow-hidden border-b transition-all duration-300 ease-in-out ${
          isAnimating
            ? "max-h-[400px] opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col p-4">
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
        </div>
      </div>
    </div>
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
