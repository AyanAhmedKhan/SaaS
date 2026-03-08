import { useEffect, useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { getInstitutes } from "@/lib/api";
import type { Institute } from "@/types";
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
import { cn } from "@/lib/utils";

interface InstituteSelectorProps {
  selectedInstituteId: string | null;
  onSelectInstitute: (instituteId: string | null, institute: Institute | null) => void;
  className?: string;
}

export function InstituteSelector({ selectedInstituteId, onSelectInstitute, className }: InstituteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInstitutes = async () => {
      try {
        setLoading(true);
        const res = await getInstitutes({ page: "1", limit: "100" });
        if (res.success && res.data) {
          setInstitutes(res.data.institutes || []);
        }
      } catch (error) {
        console.error("Failed to load institutes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchInstitutes();
    }
  }, [open]);

  const selectedInstitute = institutes.find((inst) => inst.id === selectedInstituteId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-w-[280px]", className)}
        >
          {selectedInstitute ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{selectedInstitute.name}</span>
              <span className="text-xs text-muted-foreground">({selectedInstitute.code})</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select institute...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search institutes..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading institutes..." : "No institutes found."}
            </CommandEmpty>
            <CommandGroup>
              {institutes.map((institute) => (
                <CommandItem
                  key={institute.id}
                  value={institute.name}
                  onSelect={() => {
                    onSelectInstitute(
                      institute.id === selectedInstituteId ? null : institute.id,
                      institute.id === selectedInstituteId ? null : institute
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedInstituteId === institute.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{institute.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{institute.code}</span>
                    </div>
                    {institute.city && (
                      <span className="text-xs text-muted-foreground">{institute.city}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
