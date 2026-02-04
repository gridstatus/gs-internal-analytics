'use client';

import { Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface InfoHoverIconProps {
  /** Explanation or extra context shown on hover. Use for shares/cards when needed. */
  tooltip: ReactNode;
}

export function InfoHoverIcon({ tooltip }: InfoHoverIconProps) {
  return (
    <Tooltip label={tooltip} multiline maw={320} withArrow>
      <IconInfoCircle size={16} style={{ cursor: 'help', flexShrink: 0 }} aria-hidden />
    </Tooltip>
  );
}
