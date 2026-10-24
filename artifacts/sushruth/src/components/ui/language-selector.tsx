import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage, INDIAN_LANGUAGES } from "@/context/LanguageContext";

interface LanguageSelectorProps {
  className?: string;
  buttonClassName?: string;
}

export function LanguageSelector({ className, buttonClassName }: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { language, setLanguageCode } = useLanguage();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full sm:w-[220px] justify-between bg-background text-foreground", buttonClassName)}
            data-testid="button-language-selector"
          >
            <div className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {language.nativeName} ({language.name})
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Search language..." data-testid="input-language-search" />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {INDIAN_LANGUAGES.map((lang) => (
                  <CommandItem
                    key={lang.code}
                    value={`${lang.name} ${lang.nativeName}`}
                    onSelect={() => {
                      setLanguageCode(lang.code);
                      setOpen(false);
                    }}
                    data-testid={`item-language-${lang.code}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        language.code === lang.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col truncate">
                      <span className="truncate font-medium">{lang.nativeName}</span>
                      <span className="truncate text-xs text-muted-foreground">{lang.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
