'use client';

import { useState } from 'react';
import { Menu, Checkbox, Box, Text, Pill, Group, UnstyledButton } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';

export interface CustomMultiSelectOption {
  value: string;
  label: string;
}

interface CustomMultiSelectProps {
  label: string;
  placeholder: string;
  data: CustomMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  clearable?: boolean;
  /** When true, only show options that are not already selected in the dropdown list */
  hidePickedOptions?: boolean;
  /** When true, show "N selected" when more than one selected so the trigger stays on one row */
  singleLine?: boolean;
  w?: number;
  /** Optional styles for the pills container (e.g. maxHeight, overflowY) */
  pillsListStyle?: React.CSSProperties;
}

export function CustomMultiSelect({
  label,
  placeholder,
  data,
  value,
  onChange,
  clearable = true,
  hidePickedOptions = false,
  singleLine = false,
  w = 300,
  pillsListStyle,
}: CustomMultiSelectProps) {
  const [opened, setOpened] = useState(false);

  const selectedSet = new Set(value);
  const optionsToShow = hidePickedOptions
    ? data.filter((opt) => !selectedSet.has(opt.value))
    : data;

  const toggleOption = (optValue: string) => {
    if (selectedSet.has(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const selectedLabels = value
    .map((v) => data.find((d) => d.value === v)?.label ?? v)
    .filter(Boolean);

  const pillsMaxHeight = pillsListStyle?.maxHeight ?? 70;
  const pillsOverflow = pillsListStyle?.overflowY ?? 'auto';

  const triggerContent =
    value.length === 0 ? (
      <Text size="sm" c="dimmed">
        {placeholder}
      </Text>
    ) : singleLine ? (
      <Text size="sm" truncate>
        {value.length > 1 ? `${value.length} selected` : selectedLabels[0]}
      </Text>
    ) : (
      selectedLabels.map((labelText, i) => (
        <Pill
          key={value[i]}
          size="sm"
          withRemoveButton
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
          styles={{ root: { maxWidth: '100%' } }}
        >
          {labelText}
        </Pill>
      ))
    );

  return (
    <Box style={{ width: w }}>
      <Text size="sm" fw={500} mb={4} component="label">
        {label}
      </Text>
      <Menu
        opened={opened}
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
        position="bottom-start"
        width="target"
        shadow="md"
        closeOnClickOutside
        closeOnEscape
      >
        <Menu.Target>
          <UnstyledButton
            style={{
              width: '100%',
              minHeight: 36,
              padding: '6px 12px',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
              backgroundColor: 'var(--mantine-color-default)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box
              style={{
                flex: 1,
                minWidth: 0,
                maxHeight: singleLine ? undefined : pillsMaxHeight,
                overflowY: singleLine ? undefined : pillsOverflow,
                overflowX: 'hidden',
                display: 'flex',
                flexWrap: singleLine ? 'nowrap' : 'wrap',
                gap: 6,
                alignContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              {triggerContent}
            </Box>
            <IconChevronDown
              size={16}
              style={{
                flexShrink: 0,
                marginLeft: 8,
                opacity: 0.6,
                transform: opened ? 'rotate(180deg)' : undefined,
              }}
            />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          {clearable && value.length > 0 && (
            <Menu.Item
              onClick={() => onChange([])}
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text size="sm" c="dimmed">
                Clear all
              </Text>
            </Menu.Item>
          )}
          {optionsToShow.length === 0 ? (
            <Box py="xs" px="sm">
              <Text size="sm" c="dimmed">
                {hidePickedOptions ? 'All options selected' : 'No options'}
              </Text>
            </Box>
          ) : (
            optionsToShow.map((opt) => (
              <Menu.Item
                key={opt.value}
                closeMenuOnClick={false}
                onClick={(e) => e.preventDefault()}
              >
                <Checkbox
                  checked={selectedSet.has(opt.value)}
                  onChange={() => toggleOption(opt.value)}
                  label={opt.label}
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
