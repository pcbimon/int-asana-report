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

export type AssigneeOption = { name: string; value: string };

export default function AdminSection({
  assignees,
  activeAssigneeGid,
}: {
  assignees: AssigneeOption[];
  activeAssigneeGid?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  // use a stable id so Radix-generated ids don't mismatch between server and client
  const id = React.useId();
  // selectedAssignee by name (value stores name for search friendliness)
  const selectedAssignee = assignees.find((assignee) => assignee.name === value);
  // when active gid or assignees change, set the displayed value to the matching name
  React.useEffect(() => {
    if (!activeAssigneeGid) {
      setValue("");
      return;
    }
    const found = assignees.find((a) => a.value === activeAssigneeGid);
    setValue(found?.name ?? "");
  }, [activeAssigneeGid, assignees]);

  return (
    <div className="my-4">
      <div className="flex space-x-2 items-center">
        <Badge variant="default">Admin</Badge>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-content`}
              className="w-[200px] justify-between"
            >
              {value ? selectedAssignee?.name : "Select assignee..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent id={`${id}-content`} className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search assignee..." className="h-9" />
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
                          const picked = assignees.find((a) => a.name === currentValue);
                          if (picked?.value) {
                            window.location.href = `/dashboard/${picked.value}`;
                          }
                        }}
                      >
                        {assignee.name}
                        <Check
                          className={cn(
                            "ml-auto",
                            value === assignee.name ? "opacity-100" : "opacity-0"
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
