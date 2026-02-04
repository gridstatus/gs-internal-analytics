import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import './main-content.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { ClerkProvider } from '@clerk/nextjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AppLayout } from '@/components/AppLayout';
import { FilterProvider } from '@/contexts/FilterContext';

export const metadata = {
  title: 'Grid Status',
  robots: {
    index: false,
    follow: false,
  },
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
            <NuqsAdapter>
              <FilterProvider>
                <AppLayout>{children}</AppLayout>
              </FilterProvider>
            </NuqsAdapter>
          </MantineProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
