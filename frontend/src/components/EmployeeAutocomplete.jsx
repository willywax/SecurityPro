import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const getEmployeeName = (employee) =>
  employee?.full_name || [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || 'Unnamed employee';

const getEmployeeLabel = (employee) => {
  const name = getEmployeeName(employee);
  return employee?.employee_id ? `${name} (${employee.employee_id})` : name;
};

const EmployeeAutocomplete = ({
  employees = [],
  value,
  onValueChange,
  placeholder = 'Search employee...',
  emptyText = 'No employees found.',
  disabled = false,
  className,
  triggerClassName,
  includeNone = false,
  noneValue = 'none',
  noneLabel = 'No linked employee',
  testId,
}) => {
  const [open, setOpen] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === value),
    [employees, value],
  );

  const selectedLabel = value === noneValue && includeNone
    ? noneLabel
    : selectedEmployee
      ? getEmployeeLabel(selectedEmployee)
      : placeholder;

  const selectValue = (nextValue) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn('w-full justify-between font-normal', !selectedEmployee && value !== noneValue && 'text-slate-500', triggerClassName)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[--radix-popover-trigger-width] p-0', className)} align="start">
        <Command>
          <CommandInput placeholder="Type a name or employee ID..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {includeNone && (
                <CommandItem value={noneLabel} onSelect={() => selectValue(noneValue)}>
                  <Check className={cn('mr-2 h-4 w-4', value === noneValue ? 'opacity-100' : 'opacity-0')} />
                  {noneLabel}
                </CommandItem>
              )}
              {employees.map((employee) => {
                const label = getEmployeeLabel(employee);
                const searchValue = `${label} ${employee.employee_id || ''} ${employee.guard_no || ''}`;
                return (
                  <CommandItem key={employee.id} value={searchValue} onSelect={() => selectValue(employee.id)}>
                    <Check className={cn('mr-2 h-4 w-4', value === employee.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EmployeeAutocomplete;
