'use client';

import { Alert, Code, Stack, Button, Text } from '@mantine/core';
import { IconAlertCircle, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';

interface ErrorDisplayProps {
  title?: string;
  error: string;
}

export function ErrorDisplay({ title = 'Error loading data', error }: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Split error into lines and add line numbers
  const errorLines = error.split('\n');
  const numberedError = errorLines
    .map((line, index) => `${String(index + 1).padStart(String(errorLines.length).length, ' ')} | ${line}`)
    .join('\n');

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title={title}
      color="red"
    >
      <Stack gap="sm">
        <Text size="sm">Click the button below to copy the full error message:</Text>
        <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
          {numberedError}
        </Code>
        <Button
          leftSection={<IconCopy size={16} />}
          variant="light"
          size="sm"
          onClick={handleCopy}
          style={{ alignSelf: 'flex-start' }}
        >
          {copied ? 'Copied!' : 'Copy Error'}
        </Button>
      </Stack>
    </Alert>
  );
}

