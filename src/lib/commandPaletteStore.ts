import { create } from "zustand";

interface PaletteStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCommandPaletteStore = create<PaletteStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
