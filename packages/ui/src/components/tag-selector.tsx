"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@decode/ui/lib/utils";
import { Button } from "@decode/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@decode/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@decode/ui/components/popover";

interface TagSelectorProps {
  availableTags: string[];
  className?: string;
  createTag: (inputValue: string) => string;
  onChange: (tags: string[]) => void;
  selectedTags: string[];
}

export function TagSelector({
  availableTags,
  className,
  createTag,
  onChange,
  selectedTags,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(tag),
  );

  function handleSelect(value: string) {
    onChange([...selectedTags, value]);
    setInputValue("");
  };

  function handleCreate() {
    const newTag = createTag(inputValue);
    onChange([...selectedTags, newTag]);
    setInputValue("");
  };

  function handleRemove(tag: string) {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "mt-1 flex h-auto min-h-9 w-full flex-wrap items-center justify-start gap-[2px] rounded-xl border-ring hover:bg-background py-[2px] pr-3 pl-[2px] text-left transition-[color,box-shadow,border-color] duration-300 focus-visible:border-primary focus-visible:ring-0",
            className,
          )}
          variant="outline"
        >
          {selectedTags.map((tag) => (
            <span
              className="flex items-center gap-1 rounded-xl px-2 py-1 text-sm wrap-break-word" // custom colours
              key={tag}
            >
              {tag}
              <span
                className="cursor-pointer rounded-xl p-0.5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(tag);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRemove(tag);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <X size={12} />
              </span>
            </span>
          ))}
          <span className="grow" />
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim() !== "") {
                handleCreate();
              }
            }}
            onValueChange={(value) => setInputValue(value)}
            placeholder="Enter tag..."
            value={inputValue}
          />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup heading="Tags">
              {filteredTags.map((tag) => (
                <CommandItem key={tag} onSelect={handleSelect} value={tag}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTags.includes(tag) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {tag}
                </CommandItem>
              ))}
            </CommandGroup>
            {inputValue.trim() !== "" &&
              !availableTags.includes(inputValue.toLowerCase()) && (
                <CommandGroup heading="Create Tag">
                  <CommandItem onSelect={handleCreate} value={inputValue}>
                    <Check className="mr-2 h-4 w-4 opacity-100" />
                    Create "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
