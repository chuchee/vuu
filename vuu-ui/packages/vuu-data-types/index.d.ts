import type { Filter } from "@finos/vuu-filter-types";
import type { MenuActionClosePopup } from "@finos/vuu-popups";
import type {
  NoAction,
  OpenDialogAction,
  VuuAggregation,
  VuuColumnDataType,
  VuuColumns,
  VuuDataRowDto,
  VuuFilter,
  VuuGroupBy,
  VuuLinkDescriptor,
  VuuMenu,
  VuuRowDataItemType,
  VuuSort,
  VuuTable,
  VuuRpcRequest,
} from "@finos/vuu-protocol-types";
import type { DataSourceConfigChanges, IEventEmitter } from "@finos/vuu-utils";
import type {
  DataSourceFilter,
  MenuRpcResponse,
  Selection,
  TableSchema,
} from "@finos/vuu-data-types";
import type {
  VuuTableListRequest,
  VuuTableMetaRequest,
  LinkDescriptorWithLabel,
  VuuRpcViewportResponse,
  TypeAheadMethod,
  VuuRange,
} from "@finos/vuu-protocol-types";

export interface DataSourceFilter extends VuuFilter {
  filterStruct?: Filter;
}

export interface NamedDataSourceFilter extends DataSourceFilter {
  id?: string;
  name?: string;
}

type RowIndex = number;
type RenderKey = number;
type IsLeaf = boolean;
type IsExpanded = boolean;
type Depth = number;
type ChildCount = number;
type RowKey = string;
export type IsSelected = number;

export type DataSourceRow = [
  RowIndex,
  RenderKey,
  IsLeaf,
  IsExpanded,
  Depth,
  ChildCount,
  RowKey,
  IsSelected,
  ...VuuRowDataItemType[],
];

export type DataSourceRowObject = {
  index: number;
  key: string;
  isGroupRow: boolean;
  isSelected: boolean;
  data: VuuDataRowDto;
};

export type DataSourceRowPredicate = (row: DataSourceRow) => boolean;

export interface ContextMenuItemBase {
  className?: string;
  icon?: string;
  label: string;
  location?: string;
}

export interface ContextMenuLeafItemDescriptor extends ContextMenuItemBase {
  action: string;
  options?: unknown;
}

export type ContextMenuItemDescriptor =
  | ContextMenuLeafItemDescriptor
  | ContextMenuGroupItemDescriptor;

export interface ContextMenuGroupItemDescriptor extends ContextMenuItemBase {
  children: ContextMenuItemDescriptor[];
}

export interface MessageWithClientViewportId {
  clientViewportId: string;
}

export interface DataSourceAggregateMessage
  extends MessageWithClientViewportId {
  aggregations: VuuAggregation[];
  type: "aggregate";
}

export type DataUpdateMode = "batch" | "update" | "size-only";

export interface DataSourceDataMessage extends MessageWithClientViewportId {
  mode: DataUpdateMode;
  rows?: DataSourceRow[];
  size?: number;
  type: "viewport-update";
}

export interface DataSourceDataSizeMessage extends MessageWithClientViewportId {
  mode: "size-only";
  size: number;
  type: "viewport-update";
}

export interface DataSourceDisabledMessage extends MessageWithClientViewportId {
  type: "disabled";
}

export interface DataSourceEnabledMessage extends MessageWithClientViewportId {
  type: "enabled";
}

export interface DataSourceColumnsMessage extends MessageWithClientViewportId {
  type: "columns";
  columns: VuuColumns;
}
export interface DataSourceFilterMessage extends MessageWithClientViewportId {
  type: "filter";
  filter: DataSourceFilter;
}
export interface DataSourceGroupByMessage extends MessageWithClientViewportId {
  type: "groupBy";
  groupBy: VuuGroupBy | undefined;
}

export interface DataSourceSetConfigMessage
  extends MessageWithClientViewportId {
  type: "config";
  config: WithFullConfig;
}

export interface DataSourceDebounceRequest extends MessageWithClientViewportId {
  type: "debounce-begin";
}

export interface DataSourceMenusMessage extends MessageWithClientViewportId {
  type: "vuu-menu";
  menu: VuuMenu;
}

export interface DataSourceSortMessage extends MessageWithClientViewportId {
  type: "sort";
  sort: VuuSort;
}

export interface DataSourceSubscribedMessage
  extends MessageWithClientViewportId {
  aggregations: VuuAggregation[];
  columns: VuuColumns;
  filterSpec: DataSourceFilter;
  groupBy: VuuGroupBy;
  range: VuuRange;
  sort: VuuSort;
  tableSchema: Readonly<TableSchema>;
  type: "subscribed";
}

export interface DataSourceVisualLinkCreatedMessage
  extends MessageWithClientViewportId {
  colName: string;
  parentViewportId: string;
  parentColName: string;
  type: "vuu-link-created";
}

export interface DataSourceVisualLinkRemovedMessage
  extends MessageWithClientViewportId {
  type: "vuu-link-removed";
}

export interface DataSourceVisualLinksMessage
  extends MessageWithClientViewportId {
  type: "vuu-links";
  links: VuuLinkDescriptor[];
}

export type VuuFeatureMessage =
  | DataSourceMenusMessage
  | DataSourceVisualLinksMessage;

export type DataSourceConfigMessage =
  | DataSourceAggregateMessage
  | DataSourceColumnsMessage
  | DataSourceFilterMessage
  | DataSourceGroupByMessage
  | DataSourceSortMessage
  | DataSourceSetConfigMessage;

/**
 * Messages which are routed back to the DataSource
 */
export type DataSourceCallbackMessage =
  | DataSourceConfigMessage
  | DataSourceColumnsMessage
  | DataSourceDataMessage
  | DataSourceDebounceRequest
  | DataSourceDisabledMessage
  | DataSourceEnabledMessage
  | DataSourceMenusMessage
  | DataSourceSubscribedMessage
  | DataSourceVisualLinkCreatedMessage
  | DataSourceVisualLinkRemovedMessage
  | DataSourceVisualLinksMessage;

export type ConfigChangeColumnsMessage = {
  type: "columns";
  columns?: ColumnDescriptor[];
};

export type ConfigChangeMessage =
  | ConfigChangeColumnsMessage
  | DataSourceAggregateMessage
  | DataSourceFilterMessage
  | DataSourceGroupByMessage
  | DataSourceSortMessage
  | DataSourceVisualLinkCreatedMessage
  | DataSourceVisualLinkRemovedMessage;

export type ConfigChangeHandler = (msg: ConfigChangeMessage) => void;

/**
 * MenuBuilder describes a factory function that creates
 * Menu Item Descriptors appropriate to the supplied
 * location. Location can be any string identifier, it
 * can be used to determine which Menu Items to include
 * in the menu. Most often used for ContextMenus.
 */
export type MenuBuilder<L = string, O = unknown> = (
  location: L,
  options: O,
) => ContextMenuItemDescriptor[];

/**
 * MenuActionHandler describes a function that provides an implementation of
 * one or more MenuItem actions. It will receive the type from the MenuItem
 * clicked, plus any options object associated with that MenuItem.
 *
 * It should return true if it handled this MenuItem. This allows multiple Menu-
 * ActionHandlers to be chained.
 */
export type MenuActionHandler = (
  reason: MenuActionClosePopup,
) => boolean | undefined;

export interface ContextMenuContextType {
  menuBuilders: MenuBuilder[];
  menuActionHandler: MenuActionHandler;
}

export type SchemaColumn = {
  name: string;
  serverDataType: VuuColumnDataType;
};

/**
 * session will be present for session tables only, in which case the table
 * name represents the 'archetype' table name.
 */
export type TableSchemaTable = VuuTable & {
  session?: string;
};

export type TableSchema = {
  columns: SchemaColumn[];
  key: string;
  table: TableSchemaTable;
};

/**
 * Described the configuration values that should typically be
 * persisted across sessions.
 */
export interface WithFullConfig {
  readonly aggregations: VuuAggregation[];
  readonly columns: VuuColumns;
  readonly filterSpec: DataSourceFilter;
  readonly groupBy: VuuGroupBy;
  readonly sort: VuuSort;
}

export interface DataSourceConfig extends Partial<WithFullConfig> {
  visualLink?: LinkDescriptorWithLabel;
}

export interface WithGroupBy extends DataSourceConfig {
  groupBy: VuuGroupBy;
}
export interface WithFilter extends DataSourceConfig {
  filterSpec: DataSourceFilter;
}
export interface WithSort extends DataSourceConfig {
  sort: VuuSort;
}

export interface DataSourceConstructorProps extends DataSourceConfig {
  bufferSize?: number;
  table: VuuTable;
  title?: string;
  viewport?: string;
}

export interface SubscribeProps extends Partial<WithFullConfig> {
  viewport?: string;
  range?: VuuRange;
  title?: string;
}

export type SubscribeCallback = (message: DataSourceCallbackMessage) => void;
export type OptimizeStrategy = "none" | "throttle" | "debounce";

export type DataSourceEventHandler = (viewportId: string) => void;
export type RowSelectionEventHandler = (
  selection: Selection,
  selectedRowCount: number,
) => void;

export type DataSourceEvents = {
  config: (
    config: DataSourceConfig | undefined,
    confirmed?: boolean,
    configChanges?: DataSourceConfigChanges,
  ) => void;
  optimize: (optimize: OptimizeStrategy) => void;
  range: (range: VuuRange) => void;
  resize: (size: number) => void;
  "row-selection": RowSelectionEventHandler;
  subscribed: (subscription: DataSourceSubscribedMessage) => void;
  unsubscribed: DataSourceEventHandler;
  suspended: DataSourceEventHandler;
  resumed: DataSourceEventHandler;
  disabled: DataSourceEventHandler;
  enabled: DataSourceEventHandler;
  "title-changed": (id: string, title: string) => void;
  "visual-link-created": (message: DataSourceVisualLinkCreatedMessage) => void;
  "visual-link-removed": () => void;
};

/**
 * return Promise<true> indicates success
 * return Promise<errorMessage> indicates failure
 */
export type DataSourceEditHandler = (
  rowKey: string,
  columnName: string,
  value: VuuRowDataItemType,
) => Promise<true | string>;

export type DataSourceDeleteHandler = (key: string) => Promise<true | string>;
export type DataSourceInsertHandler = (
  key: string,
  data: VuuDataRowDto,
) => Promise<true | string>;

export type RpcResponse =
  | MenuRpcResponse
  | VuuUIMessageInRPCEditReject
  | VuuUIMessageInRPCEditResponse
  | ViewportRpcResponse;

export type RpcResponseHandler = (
  response: Omit<VuuRpcResponse, "vpId">,
) => boolean;

export type RowSearchPredicate = (row: DataSourceRow) => boolean;

export type DataSourceStatus =
  | "disabled"
  | "disabling"
  | "enabled"
  | "enabling"
  | "initialising"
  | "subscribing"
  | "subscribed"
  | "suspended"
  | "unsubscribed";

export type SuggestionFetcher = (params: TypeaheadParams) => Promise<string[]>;
export type SuggestionProvider = () => SuggestionFetcher;

export interface TypeaheadSuggestionProvider {
  getTypeaheadSuggestions: (
    columnName: string,
    pattern?: string,
  ) => Promise<string[]>;
}

export type RangeTuple = [from: number, to: number];
export type SelectionItem = number | RangeTuple;
export type Selection = SelectionItem[];
export type SelectionChangeHandler = (selection: Selection) => void;

export interface DataSource
  extends IEventEmitter<DataSourceEvents>,
    Partial<TypeaheadSuggestionProvider> {
  aggregations: VuuAggregation[];
  applyEdit: DataSourceEditHandler;
  /**
   * set config without triggering config event. Use this method when initialising
   * a dataSource that has been restored from session state. The dataSource will
   * not yet be subscribed. Triggering the config event is unnecessary and might
   * cause a React exception if the event were to cause a render.
   * @param config DataSourceConfig
   * @returns true if config has been applied (will not be if existig config is same)
   */
  applyConfig: (
    config: DataSourceConfig,
  ) => DataSourceConfigChanges | undefined;
  closeTreeNode: (key: string, cascade?: boolean) => void;
  columns: string[];
  config: DataSourceConfig;
  status: DataSourceStatus;
  /**
   *
   * Similar to disable but intended for pauses of very short duration (default is 3 seconds). Although
   * the dataSource will stop sending messages until resumed, it will not disconnect from a  remote server.
   * It will preserve subscription to the remote server and continue to apply updates to cached data. It
   * just won't send updates through to the UI thread (until resumed). Useful in edge cases such as where a
   * component is dragged to a new location. When dropped, the component will be unmounted and very quickly
   * remounted by React. For the duration of this operation, we suspend updates . Updating an unmounted
   * React component would cause a React error.
   * If an suspend is requested and not resumed within 3 seconds, it will automatically be promoted to a disable.,
   */
  suspend?: () => void;
  resume?: () => void;

  deleteRow?: DataSourceDeleteHandler;
  /**
   * create a DataSource on a session table. The concrete DataSource implementation that
   * implements this method will always return a session table datasource of the same concrete type.
   * @param table the sessionTable  (module and table name)
   * @returns
   */
  createSessionDataSource?: (table: VuuTable) => DataSource;
  /**
   * For a dataSource that has been previously disabled and is currently in disabled state , this will restore
   * the subscription to active status. Fresh data will be dispatched to client. The enable call optionally
   * accepts the same subscribe callback as subscribe. This allows a completely new instance of a component to
   * assume ownership of a subscription and receive all messages.
   * Should emit an enabled event
   */
  enable?: (callback?: SubscribeCallback) => void;
  /**
   * Disables this subscription. A datasource will send no further messages until re-enabled. Example usage
   * might be for a component displayed within a set of Tabs. If user switches to another tab, the dataSource
   * of the component that is no longer visible can be disabled until it is made visible again.
   * Should emit a disabled event
   */
  disable?: () => void;
  filter: DataSourceFilter;

  /**
   * Only implemented on JSON DataSource
   * @param depth
   * @param visibleOnly
   * @returns
   */
  getChildRows?: (rowKey: string) => DataSourceRow[];
  /**
   * Only implemented on JSON DataSource
   * @param depth
   * @param visibleOnly
   * @returns
   */
  getRowsAtDepth?: (depth: number, visibleOnly?: boolean) => DataSourceRow[];
  groupBy: VuuGroupBy;
  insertRow?: DataSourceInsertHandler;
  links?: LinkDescriptorWithLabel[];
  menu?: VuuMenu;
  /** @deprecated, use remoteProcedureCall instead */
  menuRpcCall: (
    rpcRequest: Omit<VuuRpcRequest, "vpId">,
  ) => Promise<VuuRpcMenuResponse>;
  /* @deprecated, use remoteProcedureCall instead */
  rpcCall?: <T extends VuuRpcResponse = VuuRpcResponse>(
    rpcRequest: Omit<VuuRpcRequest, "vpId">,
  ) => Promise<T>;
  openTreeNode: (key: string) => void;
  range: VuuRange;
  remoteProcedureCall: <T extends VuuRpcResponse = VuuRpcResponse>(
    message: VuuRpcRequest,
  ) => Promise<T>;
  select: SelectionChangeHandler;
  readonly selectedRowsCount: number;
  sendBroadcastMessage?: (message: DataSourceBroadcastMessage) => void;
  readonly size: number;
  sort: VuuSort;
  subscribe: (
    props: SubscribeProps,
    callback: SubscribeCallback,
  ) => Promise<void>;
  table?: VuuTable;
  readonly tableSchema?: TableSchema;
  /**
   * We allow a title because a context menu action can reference a target table, e.g. as a Visual Link target.
   * Users can edit titles on components. If so, and this is a table component, we will display this title in
   * the context menu rather than the underlying table name (which may not be unique within the layout)
   */
  title: string;
  unsubscribe: () => void;
  viewport?: string;
  visualLink?: LinkDescriptorWithLabel;
}

export interface MenuRpcResponse<
  TAction extends MenuRpcAction = MenuRpcAction,
> {
  action: TAction;
  error?: string;
  requestId: string;
  rpcName: string;
  tableAlreadyOpen?: boolean;
  type: "VIEW_PORT_MENU_RESP";
}

export interface OpenDialogActionWithSchema extends OpenDialogAction {
  tableSchema?: TableSchema;
}

export declare type MenuRpcAction =
  | OpenDialogActionWithSchema
  | NoAction
  | ShowToastAction;

export type ConnectionStatus =
  | "connecting"
  | "connection-open-awaiting-session"
  | "connected"
  | "disconnected"
  | "failed"
  | "reconnected";

export interface ConnectionStatusMessage {
  type: "connection-status";
  reason?: string;
  retry?: boolean;
  status: ConnectionStatus;
}

export interface ConnectionQualityMetrics {
  type: "connection-metrics";
  messagesLength: number;
}

export interface ServerProxySubscribeMessage extends WithFullConfig {
  bufferSize?: number;
  range: VuuRange;
  table: VuuTable;
  title?: string;
  viewport: string;
  visualLink?: LinkDescriptorWithLabel;
}

// export type VuuUIMessageInConnectionStatus = {
//   type: 'connection-status';
// };

export type VuuUIMessageInConnected = {
  type: "connected";
};

export type VuuUIMessageInConnectionFailed = {
  type: "connection-failed";
  reason: string;
};

export type VuuUIMessageInWorkerReady = {
  type: "ready";
};

export interface ViewportMessageIn {
  clientViewportId: string;
}

// TODO use generic to type result
export interface VuuUIMessageInRPC {
  method: string;
  result: unknown;
  requestId: string;
  type: "RPC_RESP";
}

export interface VuuUIMessageInRPCEditReject {
  error: string;
  requestId?: string;
  type: "VP_EDIT_RPC_REJECT";
}

export interface VuuUIMessageInRPCEditResponse {
  action: unknown;
  requestId: string;
  rpcName: string;
  type: "VP_EDIT_RPC_RESPONSE";
}

export interface VuuUIMessageInTableList {
  requestId: string;
  type: "TABLE_LIST_RESP";
  tables: VuuTable[];
}
export interface VuuUIMessageInTableMeta {
  requestId: string;
  tableSchema: TableSchema;
  type: "TABLE_META_RESP";
}
export interface ViewportRpcResponse {
  action: VuuRpcViewportResponse["action"] & {
    // for SessionTable editing, we inject the schema after receiving server message
    // and before forwarding to UI
    tableSchema?: TableSchema;
  };
  requestId: string;
  rpcName?: string;
  type: "VIEW_PORT_RPC_RESPONSE";
}
export interface MenuRpcReject extends ViewportMessageIn {
  error?: string;
  requestId: string;
  rpcName?: string;
  type: "VIEW_PORT_MENU_REJ";
}

export interface VuuUIMessageInMenuRej {
  error: string;
  requestId: string;
  rpcName: string;
  type: "VIEW_PORT_MENU_REJ";
}

export type VuuUiMessageInRequestResponse =
  | VuuUIMessageInMenuRej
  | MenuRpcResponse
  | MenuRpcReject
  | VuuUIMessageInRPC
  | VuuUIMessageInRPCEditReject
  | VuuUIMessageInRPCEditResponse
  | ViewportRpcResponse
  | VuuUIMessageInTableList
  | VuuUIMessageInTableMeta;

export type VuuUIMessageIn =
  | VuuUiMessageInRequestResponse
  | VuuUIMessageInConnected
  | VuuUIMessageInConnectionFailed
  | VuuUIMessageInWorkerReady;

export type WebSocketProtocol = string | string[] | undefined;

export interface VuuUIMessageOutConnect {
  protocol: WebSocketProtocol;
  type: "connect";
  token: string;
  url: string;
  username?: string;
  retryLimitDisconnect?: number;
  retryLimitStartup?: number;
}

export interface VuuUIMessageOutSubscribe extends ServerProxySubscribeMessage {
  type: "subscribe";
}

export interface VuuUIMessageOutUnsubscribe {
  type: "unsubscribe";
  viewport: string;
}
export interface VuuUIMessageOutSuspend {
  type: "suspend";
  viewport: string;
}
export interface VuuUIMessageOutResume {
  type: "resume";
  viewport: string;
}

export interface ViewportMessageOut {
  viewport: string;
}

export interface RequestMessage {
  requestId: string;
}

export interface VuuUIMessageOutColumns extends ViewportMessageOut {
  type: "setColumns";
  columns: string[];
}
export interface VuuUIMessageOutViewRange extends ViewportMessageOut {
  type: "setViewRange";
  range: {
    from: number;
    to: number;
  };
}
export interface VuuUIMessageOutAggregate extends ViewportMessageOut {
  aggregations: VuuAggregation[];
  type: "aggregate";
}
export interface VuuUIMessageOutCloseTreeNode extends ViewportMessageOut {
  key: string;
  type: "closeTreeNode";
}
export interface VuuUIMessageOutRemoveLink extends ViewportMessageOut {
  type: "removeLink";
}
export interface VuuUIMessageOutSetTitle extends ViewportMessageOut {
  title: string;
  type: "setTitle";
}

export interface VuuUIMessageOutDisable extends ViewportMessageOut {
  type: "disable";
}
export interface VuuUIMessageOutEnable extends ViewportMessageOut {
  type: "enable";
}
export interface VuuUIMessageOutOpenTreeNode extends ViewportMessageOut {
  key: string;
  type: "openTreeNode";
}
export interface VuuUIMessageOutResume extends ViewportMessageOut {
  type: "resume";
}

export interface VuuUIMessageOutSelect extends ViewportMessageOut {
  selected: Selection;
  type: "select";
}
export interface VuuUIMessageOutSelectAll extends ViewportMessageOut {
  type: "selectAll";
}
export interface VuuUIMessageOutSelectNone extends ViewportMessageOut {
  type: "selectNone";
}

export interface VuuUIMessageOutSort extends ViewportMessageOut {
  sort: VuuSort;
  type: "sort";
}
export interface VuuUIMessageOutSuspend extends ViewportMessageOut {
  type: "suspend";
}

export interface VuuUIMessageOutConfig extends ViewportMessageOut {
  config: WithFullConfig;
  type: "config";
}

export type VuuUIMessageOutViewport =
  | VuuUIMessageOutAggregate
  | VuuUIMessageOutCloseTreeNode
  | VuuUIMessageOutColumns
  | VuuUIMessageOutConfig
  | VuuUIMessageOutDisable
  | VuuUIMessageOutEnable
  | VuuUIMessageOutOpenTreeNode
  | VuuUIMessageOutRemoveLink
  | VuuUIMessageOutResume
  | VuuUIMessageOutSelect
  | VuuUIMessageOutSelectAll
  | VuuUIMessageOutSelectNone
  | VuuUIMessageOutSetTitle
  | VuuUIMessageOutSuspend
  | VuuUIMessageOutSort
  | VuuUIMessageOutViewRange;

export interface TypeAheadRpcRequest {
  method: TypeAheadMethod;
  params: [VuuTable, ...string[]];
  type: "RPC_CALL";
}

export type WithRequestId<T> = T & { requestId: string };

export type VuuUIMessageOut =
  | VuuUIMessageOutConnect
  | VuuUIMessageOutSubscribe
  | VuuUIMessageOutUnsubscribe
  | VuuUIMessageOutViewport
  | WithRequestId<VuuTableListRequest>
  | WithRequestId<VuuTableMetaRequest>;
