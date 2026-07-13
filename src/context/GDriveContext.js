import { createContext, useContext } from 'react';

// Provided by App.jsx. `pickFromDrive(onLinked)` opens the Google Picker and
// calls onLinked(resumeId) after the picked file is linked; pass null for a
// library-only flow (no job attach).
export const GDriveContext = createContext({
  enabled: false,
  connected: false,
  connect: () => {},
  disconnect: () => {},
  pickFromDrive: () => {},
});

export function useGDriveContext() {
  return useContext(GDriveContext);
}
