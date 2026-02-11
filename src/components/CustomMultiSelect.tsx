'use client';

import { useState } from 'react';
import { Menu, Checkbox, Box, Text, UnstyledButton } from '@mantine/core';
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
  w?: number;
}

export function CustomMultiSelect({
  label,
  placeholder,
  data,
  value,
  onChange,
  clearable = true,
  w = 300,
}: CustomMultiSelectProps) {
  const [opened, setOpened] = useState(false);

  const selectedSet = new Set(value);

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

  const triggerContent =
    value.length === 0 ? (
      <Text size="sm" c="dimmed">
        {placeholder}
      </Text>
    ) : (
      <Text size="sm" truncate>
        {value.length > 1
          ? `${selectedLabels[0]} (+${value.length - 1} more)`
          : selectedLabels[0]}
      </Text>
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
            component="div"
            role="button"
            tabIndex={0}
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
                overflow: 'hidden',
                display: 'flex',
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
          {data.length === 0 ? (
            <Box py="xs" px="sm">
              <Text size="sm" c="dimmed">
                No options
              </Text>
            </Box>
          ) : (
            data.map((opt) => (
              <Menu.Item
                key={opt.value}
                closeMenuOnClick={false}
                onClick={() => toggleOption(opt.value)}
              >
                <Checkbox
                  checked={selectedSet.has(opt.value)}
                  label={opt.label}
                  size="sm"
                  readOnly
                  style={{ pointerEvents: 'none' }}
                />
              </Menu.Item>
            ))
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
