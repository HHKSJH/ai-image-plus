import { defineStore } from "pinia";
import { API_BASE_URL_OPTIONS, SIZE_OPTIONS, STYLE_OPTIONS } from "../constants/options";
import { createWorkspaceActions } from "./workspace/actions";
import { createWorkspaceComputed } from "./workspace/computed";
import { createWorkspaceState } from "./workspace/state";

export const useWorkspaceStore = defineStore("workspace", () => {
  const state = createWorkspaceState();
  const computedState = createWorkspaceComputed(state);
  const actions = createWorkspaceActions(state, computedState);

  return {
    API_BASE_URL_OPTIONS,
    SIZE_OPTIONS,
    STYLE_OPTIONS,
    ...state,
    ...computedState,
    ...actions
  };
});
