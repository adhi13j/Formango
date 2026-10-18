import { createContext, useContext } from 'react';

/** Where the open design lives: nowhere but this browser (guest), or a saved form of an account. */
export interface BuilderSource {
  formId: string | null;
}

export const BuilderSourceContext = createContext<BuilderSource>({ formId: null });

export function useBuilderSource(): BuilderSource {
  return useContext(BuilderSourceContext);
}
