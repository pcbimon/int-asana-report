"use client"
import { Badge } from "./ui/badge";
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AdminSection() {
  const assignees = [
    { name: "Alice", value: "123456" },
    { name: "Bob", value: "234567" },
    { name: "Charlie", value: "345678" },
    { name: "David", value: "456789" },
  ];
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const selectedAssignee = assignees.find(
    (assignee) => assignee.value === value
  );
  return (
    <div className="my-4">
      <div className="flex space-x-2 items-center">
        <Badge variant="default">Admin</Badge>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {value
                ? assignees.find((assignee) => assignee.value === value)
                    ?.name
                : "Select assignee..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search framework..." className="h-9" />
              <CommandList>
                <CommandEmpty>No assignee found.</CommandEmpty>
                <CommandGroup>
                  {assignees.map((assignee) => (
                    <CommandItem
                      key={assignee.value}
                      value={assignee.name}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                    >
                      {assignee.name}
                      <Check
                        className={cn(
                          "ml-auto",
                          value === assignee.name
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
