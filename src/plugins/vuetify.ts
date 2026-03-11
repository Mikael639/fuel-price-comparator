import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";

export const vuetify = createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: "fuelLight",
    themes: {
      fuelLight: {
        dark: false,
        colors: {
          background: "#f3f7f6",
          surface: "#ffffff",
          "surface-bright": "#ffffff",
          primary: "#0f766e",
          secondary: "#0f172a",
          accent: "#ffb703",
          success: "#2e7d32",
          warning: "#c2410c",
          error: "#b91c1c",
          info: "#0369a1",
        },
      },
      fuelDark: {
        dark: true,
        colors: {
          background: "#07161c",
          surface: "#0d1f27",
          "surface-bright": "#132934",
          primary: "#5eead4",
          secondary: "#e2f7f1",
          accent: "#ffd166",
          success: "#86efac",
          warning: "#fdba74",
          error: "#fca5a5",
          info: "#7dd3fc",
        },
      },
    },
  },
  defaults: {
    VBtn: {
      rounded: "xl",
      variant: "flat",
    },
    VCard: {
      rounded: "xl",
      elevation: 0,
    },
    VChip: {
      rounded: "xl",
    },
    VTextField: {
      variant: "solo-filled",
      rounded: "xl",
      hideDetails: "auto",
    },
    VSelect: {
      variant: "solo-filled",
      rounded: "xl",
      hideDetails: "auto",
    },
    VAutocomplete: {
      variant: "solo-filled",
      rounded: "xl",
      hideDetails: "auto",
    },
  },
});
