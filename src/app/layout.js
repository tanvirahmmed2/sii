import "./globals.css";
import { ContextProvider } from "src/component/helper/Context";
import ToastProvider from "src/component/helper/ToastProvider";
import { SCHOOL_NAME, META_TITLE, META_DESCRIPTION } from "src/lib/database/secret";
import { GoogleTranslateProvider } from "next-google-translate";

const shortName = SCHOOL_NAME.split(" ").map((w) => w[0]).join('');

export const metadata = {
  title: META_TITLE || `${SCHOOL_NAME} |  Campus`,
  description: META_DESCRIPTION || `Official portal for ${SCHOOL_NAME} (${shortName}).`,
};

const customLanguages = [
  { value: "en|en", label: "English" },
  { value: "en|bn", label: "বাংলা (Bangla)" },
  { value: "en|es", label: "Español (Spanish)" },
  { value: "en|hi", label: "हिन्दी (Hindi)" },
  { value: "en|de", label: "Deutsch (German)" },
  { value: "en|fr", label: "Français (French)" },
  { value: "en|ar", label: "العربية (Arabic)" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="w-full h-full">
      <body className="min-h-full w-full overflow-x-hidden">
        <GoogleTranslateProvider pageLanguage="en" availableLanguages={customLanguages}>
          <ContextProvider>
            <ToastProvider />
            <main>{children}</main>
          </ContextProvider>
        </GoogleTranslateProvider>
      </body>
    </html>
  );
}
