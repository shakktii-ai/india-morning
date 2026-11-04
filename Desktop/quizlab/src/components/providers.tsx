"use client";
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from "next-themes";
import{ QueryClient, QueryClientProvider} from "@tanstack/react-query";

const queryClient = new QueryClient();
type ProvidersProps = { children?: React.ReactNode };

const Providers: React.FC<ProvidersProps> = ({ children, ...props }:ThemeProviderProps) => {
    return (
        <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
            <SessionProvider>{children}</SessionProvider>
        </NextThemesProvider>
        </QueryClientProvider>
    );
};

export default Providers;