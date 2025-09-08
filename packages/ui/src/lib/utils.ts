import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_PARTS_COUNT = 3;

export function formatDate(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === "string") {
    const parts = date.split("-");
    if (parts.length === DATE_PARTS_COUNT) {
      const [datePart, monthPart, yearPart] = parts;
      dateObj = new Date(`${yearPart}-${monthPart}-${datePart}`);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  const day = dateObj.toLocaleDateString("en-AU", { day: "numeric" });
  const month = dateObj.toLocaleDateString("en-AU", { month: "long" });
  const year = dateObj.toLocaleDateString("en-AU", { year: "numeric" });
  return `${day} ${month} ${year}`;
}
