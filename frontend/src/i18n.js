import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import bn from "./locales/bn.json";

const savedLanguage = localStorage.getItem("pc_user_language");
const initialLanguage = savedLanguage === "bn" ? "bn" : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    bn: { translation: bn },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
});

export default i18n;
