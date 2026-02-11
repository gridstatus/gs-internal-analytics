'use client';

import { Container } from '@mantine/core';
import { ReactNode } from 'react';

interface AppContainerProps {
  children: ReactNode;
}

/**
 * Standard page content wrapper: fluid container with consistent top/bottom padding.
 * Use for all main content areas so padding can be changed in one place.
 */
export function AppContainer({ children }: AppContainerProps) {
  return (
    <Container fluid pt="0" pb="xl" px="0">
      {children}
    </Container>
  );
}
