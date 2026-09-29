
import "./globals.css";
import { ContextProvider } from "src/component/helper/Context";
import ToastProvider from "src/component/helper/ToastProvider";
import { SCHOOL_NAME, META_TITLE, META_DESCRIPTION } from "src/lib/database/secret";

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: META_TITLE || `${SCHOOL_NAME} |  Campus`,
  description: META_DESCRIPTION || `Official portal for ${SCHOOL_NAME} (${shortName}).`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="w-full h-full">
      <body className="min-h-full w-full overflow-x-hidden">
        <ContextProvider>
          
          <ToastProvider />
          <main>{children}</main>
        </ContextProvider>
      </body>
    </html>
  );
}
