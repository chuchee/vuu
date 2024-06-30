import { DataSource } from "@finos/vuu-data-types";
import {
  ReactElement,
  RefObject,
  SyntheticEvent,
  useCallback,
  useState,
} from "react";
import { useLayoutProviderDispatch } from "../layout-provider";
import { DragStartAction } from "../layout-reducer";
import { usePersistentState } from "../use-persistent-state";
import { QueryReponse, ViewDispatch } from "./ViewContext";
import type {
  Contribution,
  ContributionLocation,
  ViewAction,
} from "../layout-view";
import { useViewBroadcastChannel } from "../layout-view/useViewBroadcastChannel";

export const useViewActionDispatcher = (
  id: string,
  root: RefObject<HTMLDivElement>,
  viewPath?: string,
  dropTargets?: string[]
): [ViewDispatch, Contribution[] | undefined] => {
  const { loadSessionState, purgeSessionState, purgeState, saveSessionState } =
    usePersistentState();

  const [contributions, setContributions] = useState<Contribution[]>(
    loadSessionState(id, "contributions") ?? []
  );
  const dispatchLayoutAction = useLayoutProviderDispatch();
  const sendMessage = useViewBroadcastChannel(id, root);
  const updateContributions = useCallback(
    (location: ContributionLocation, content: ReactElement) => {
      const updatedContributions = contributions.concat([
        { location, content },
      ]);
      saveSessionState(id, "contributions", updatedContributions);
      setContributions(updatedContributions);
    },
    [contributions, id, saveSessionState]
  );

  const clearContributions = useCallback(() => {
    purgeSessionState(id, "contributions");
    setContributions([]);
  }, [id, purgeSessionState]);

  const handleRemove = useCallback(() => {
    const ds = loadSessionState(id, "data-source") as DataSource;
    if (ds) {
      ds.unsubscribe();
    }
    purgeSessionState(id);
    purgeState(id);
    dispatchLayoutAction({ type: "remove", path: viewPath });
  }, [
    dispatchLayoutAction,
    id,
    loadSessionState,
    purgeSessionState,
    purgeState,
    viewPath,
  ]);

  const handleMouseDown = useCallback(
    async (evt, index, preDragActivity): Promise<boolean> => {
      evt.stopPropagation();
      const dragRect = root.current?.getBoundingClientRect();
      return new Promise((resolve, reject) => {
        dispatchLayoutAction({
          type: "drag-start",
          evt,
          path: index === undefined ? viewPath : `${viewPath}.${index}`,
          dragRect,
          preDragActivity,
          dropTargets,
          resolveDragStart: resolve,
          rejectDragStart: reject,
        } as DragStartAction);
      });
    },
    [root, dispatchLayoutAction, viewPath, dropTargets]
  );

  const dispatchAction = useCallback(
    async <A extends ViewAction = ViewAction>(
      action: A,
      evt?: SyntheticEvent
    ): Promise<boolean | QueryReponse | void> => {
      const { type } = action;
      switch (type) {
        case "maximize":
        case "minimize":
        case "restore":
          return dispatchLayoutAction({ type, path: action.path ?? viewPath });
        case "remove":
          return handleRemove();
        case "mousedown":
          return handleMouseDown(evt, action.index, action.preDragActivity);
        case "add-toolbar-contribution":
          return updateContributions(action.location, action.content);
        case "remove-toolbar-contribution":
          return clearContributions();
        case "query":
          return dispatchLayoutAction({
            type,
            path: action.path,
            query: action.query,
          });
        case "broadcast-message":
          sendMessage(action.message);
          break;

        default: {
          return undefined;
        }
      }
    },
    [
      dispatchLayoutAction,
      viewPath,
      handleRemove,
      handleMouseDown,
      updateContributions,
      clearContributions,
      sendMessage,
    ]
  );

  return [dispatchAction, contributions];
};
