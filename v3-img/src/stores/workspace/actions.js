import { createWorkspaceRequestActions } from "./request-actions";
import { createWorkspaceSessionActions } from "./session-actions";
import { createWorkspaceShared } from "./shared";
import { createWorkspaceUiActions } from "./ui-actions";

export function createWorkspaceActions(state, computedState) {
  const shared = createWorkspaceShared(state, computedState);
  const sessionActions = createWorkspaceSessionActions(state, computedState, shared);
  const requestActions = createWorkspaceRequestActions(state, computedState, shared);
  const uiActions = createWorkspaceUiActions(state, computedState, shared);

  return {
    ...sessionActions,
    ...requestActions,
    ...uiActions
  };
}
