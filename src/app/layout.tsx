import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import { AppLayout } from '@/components/AppLayout';
import { FilterProvider } from '@/contexts/FilterContext';

export const metadata = {
  title: 'Grid Status',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <ColorSchemeScript />
        </head>
        <body>
          <MantineProvider>
            <FilterProvider>
              <AppLayout>{children}</AppLayout>
            </FilterProvider>
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
