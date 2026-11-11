import "./globals.css";
import { ContextProvider } from "src/component/helper/Context";
import ToastProvider from "src/component/helper/ToastProvider";
import { SCHOOL_NAME, META_TITLE, META_DESCRIPTION } from "src/lib/database/secret";

export const metadata = {
  title: META_TITLE || `${SCHOOL_NAME} | Campus`,
  description: META_DESCRIPTION || `Official portal for ${SCHOOL_NAME}.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="w-full h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.performance && typeof window.performance.measure === 'function') {
                const _orig = window.performance.measure.bind(window.performance);
                window.performance.measure = function(...args) {
                  try {
                    return _orig(...args);
                  } catch {
                    return null;
                  }
                };
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full w-full overflow-x-hidden" suppressHydrationWarning>
        <ContextProvider>
          <ToastProvider />
          <main>{children}</main>
        </ContextProvider>
      </body>
    </html>
  );
}
