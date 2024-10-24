import {
  DataSourceConfig,
  DataSourceRow,
  DataSourceSubscribedMessage,
  SelectionChangeHandler,
} from "@finos/vuu-data-types";
import { VuuSortType } from "@finos/vuu-protocol-types";
import {
  CellFocusState,
  ColumnDescriptor,
  DataCellEditHandler,
  RuntimeColumnDescriptor,
  TableColumnResizeHandler,
  TableConfig,
  TableRowClickHandlerInternal,
  TableRowSelectHandlerInternal,
  TableSelectionModel,
} from "@finos/vuu-table-types";
import {
  DragStartHandler,
  MeasuredProps,
  MeasuredSize,
  useDragDrop,
} from "@finos/vuu-ui-controls";
import {
  asDataSourceRowObject,
  buildColumnMap,
  isGroupColumn,
  isJsonGroup,
  isValidNumber,
  metadataKeys,
  toggleOrApplySort,
  updateColumn,
  useLayoutEffectSkipFirst,
} from "@finos/vuu-utils";
import {
  FocusEvent,
  KeyboardEvent,
  MouseEventHandler,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TableProps } from "./Table";
import { useCellBlockSelection } from "./cell-block/useCellBlockSelection";
import {
  buildContextMenuDescriptors,
  useHandleTableContextMenu,
} from "./context-menu";
import { updateTableConfig } from "./table-config";
import { getIndexFromRowElement } from "./table-dom-utils";
import { useCellEditing } from "./useCellEditing";
import { FocusCell, useCellFocus } from "./useCellFocus";
import { useDataSource } from "./useDataSource";
import { useKeyboardNavigation } from "./useKeyboardNavigation";
import { useRowClassNameGenerators } from "./useRowClassNameGenerators";
import { useSelection } from "./useSelection";
import { useTableAndColumnSettings } from "./useTableAndColumnSettings";
import { useTableContextMenu } from "./useTableContextMenu";
import {
  ColumnActionHide,
  ColumnActionPin,
  PersistentColumnAction,
  isShowColumnSettings,
  isShowTableSettings,
  useTableModel,
} from "./useTableModel";
import { useTableScroll } from "./useTableScroll";
import { useTableViewport } from "./useTableViewport";
import { TableCellBlock } from "./cell-block/cellblock-utils";

const stripInternalProperties = (tableConfig: TableConfig): TableConfig => {
  return tableConfig;
};

const NullCellFocusState: CellFocusState = {
  cellPos: undefined,
  el: null,
  outsideViewport: false,
  placeholderEl: null,
  pos: undefined,
};

export interface TableHookProps
  extends MeasuredProps,
    Pick<
      TableProps,
      | "allowCellBlockSelection"
      | "allowDragDrop"
      | "availableColumns"
      | "config"
      | "dataSource"
      | "disableFocus"
      | "highlightedIndex"
      | "id"
      | "navigationStyle"
      | "onAvailableColumnsChange"
      | "onConfigChange"
      | "onDragStart"
      | "onDrop"
      | "onHighlight"
      | "onSelect"
      | "onSelectCellBlock"
      | "onSelectionChange"
      | "onRowClick"
      | "renderBufferSize"
      | "scrollingApiRef"
      | "showColumnHeaders"
      | "showPaginationControls"
    > {
  containerRef: RefObject<HTMLDivElement>;
  rowHeight: number;
  selectionModel: TableSelectionModel;
  size: MeasuredSize;
}

const { KEY, IS_EXPANDED, IS_LEAF } = metadataKeys;

const NULL_DRAG_DROP = {
  draggable: undefined,
  onMouseDown: undefined,
};
const useNullDragDrop = () => NULL_DRAG_DROP;

const addColumn = (
  tableConfig: TableConfig,
  column: ColumnDescriptor,
): TableConfig => ({
  ...tableConfig,
  columns: tableConfig.columns.concat(column),
});

export const useTable = ({
  allowCellBlockSelection,
  allowDragDrop = false,
  availableColumns,
  config,
  containerRef,
  dataSource,
  disableFocus,
  highlightedIndex: highlightedIndexProp,
  id,
  navigationStyle = "cell",
  onAvailableColumnsChange,
  onConfigChange,
  onDragStart,
  onDrop,
  onHighlight,
  onRowClick: onRowClickProp,
  onSelect,
  onSelectCellBlock,
  onSelectionChange,
  renderBufferSize = 0,
  rowHeight = 20,
  scrollingApiRef,
  selectionModel,
  showColumnHeaders,
  showPaginationControls,
  size,
}: TableHookProps) => {
  const tableConfigRef = useRef<TableConfig>(config);
  useMemo(() => {
    tableConfigRef.current = config;
  }, [config]);

  // state is mutated, so make every component gets a fresh copy
  const initialState = useMemo(() => ({ ...NullCellFocusState }), []);

  const cellFocusStateRef = useRef<CellFocusState>(initialState);
  // Needed to avoid circular dependency between useTableScroll and useCellFocus
  const focusCellRef = useRef<FocusCell>();

  const [headerHeight, setHeaderHeight] = useState(showColumnHeaders ? -1 : 0);
  const [rowCount, setRowCount] = useState<number>(dataSource.size);
  if (dataSource === undefined) {
    throw Error("no data source provided to Vuu Table");
  }

  const onDataRowcountChange = useCallback((size: number) => {
    setRowCount(size);
  }, []);

  const virtualContentHeight = rowHeight * rowCount;
  const viewportBodyHeight =
    size.height - (headerHeight === -1 ? 0 : headerHeight);
  const verticalScrollbarWidth =
    virtualContentHeight > viewportBodyHeight ? 10 : 0;
  const availableWidth = size.width - (verticalScrollbarWidth + 8);

  const rowClassNameGenerator = useRowClassNameGenerators(config);

  const useRowDragDrop = allowDragDrop ? useDragDrop : useNullDragDrop;

  const menuBuilder = useMemo(
    () => buildContextMenuDescriptors(dataSource),
    [dataSource],
  );

  const {
    columns,
    dispatchTableModelAction,
    headings,
    tableAttributes,
    tableConfig,
  } = useTableModel(config, dataSource, selectionModel, availableWidth);

  useLayoutEffectSkipFirst(() => {
    dispatchTableModelAction({
      availableWidth,
      type: "init",
      // tableConfig: config,
      tableConfig: tableConfigRef.current,
      dataSource,
    });
  }, [
    availableWidth,
    config,
    dataSource,
    dispatchTableModelAction,
    verticalScrollbarWidth,
  ]);

  const applyTableConfigChange = useCallback(
    (config: TableConfig) => {
      dispatchTableModelAction({
        availableWidth,
        type: "init",
        tableConfig: config,
        dataSource,
      });
      tableConfigRef.current = config;
      onConfigChange?.(stripInternalProperties(config));
    },
    [availableWidth, dataSource, dispatchTableModelAction, onConfigChange],
  );

  const columnMap = useMemo(
    () => buildColumnMap(dataSource.columns),
    [dataSource.columns],
  );

  const onSubscribed = useCallback(
    ({ tableSchema }: DataSourceSubscribedMessage) => {
      if (tableSchema) {
        dispatchTableModelAction({
          type: "setTableSchema",
          tableSchema,
        });
      } else {
        console.log("subscription message with no schema");
      }
    },
    [dispatchTableModelAction],
  );

  const {
    getRowAtPosition,
    getRowOffset,
    setInSituRowOffset: viewportHookSetInSituRowOffset,
    setScrollTop: viewportHookSetScrollTop,
    ...viewportMeasurements
  } = useTableViewport({
    columns,
    headerHeight,
    rowCount,
    rowHeight,
    size: size,
    showPaginationControls,
  });

  const { data, dataRef, getSelectedRows, range, setRange } = useDataSource({
    dataSource,
    // We need to factor this out of Table
    renderBufferSize,
    onSizeChange: onDataRowcountChange,
    onSubscribed,
  });

  const { requestScroll, ...scrollProps } = useTableScroll({
    cellFocusStateRef,
    columns,
    focusCell: focusCellRef.current,
    getRowAtPosition,
    rowHeight,
    scrollingApiRef,
    setRange,
    showPaginationControls,
    onVerticalScroll: viewportHookSetScrollTop,
    onVerticalScrollInSitu: viewportHookSetInSituRowOffset,
    viewportMeasurements,
  });

  // TODO does this belong here ?
  const handleConfigEditedInSettingsPanel = useCallback(
    (tableConfig: TableConfig) => {
      dispatchTableModelAction({
        availableWidth,
        dataSource,
        tableConfig,
        type: "init",
      });
      tableConfigRef.current = tableConfig;
      onConfigChange?.(stripInternalProperties(tableConfig));
    },
    [availableWidth, dataSource, dispatchTableModelAction, onConfigChange],
  );

  const handleDataSourceConfigChanged = useCallback(
    (dataSourceConfig: DataSourceConfig) => {
      dataSource.config = {
        ...dataSource.config,
        ...dataSourceConfig,
      };
    },
    [dataSource],
  );

  useEffect(() => {
    dataSource.on("config", (config, confirmed, changes) => {
      const scrollSensitiveChanges =
        changes?.filterChanged || changes?.groupByChanged;
      if (scrollSensitiveChanges && dataSource.range.from > 0) {
        requestScroll({
          type: "scroll-end",
          direction: "home",
        });
      }
      dispatchTableModelAction({
        type: "tableConfig",
        ...config,
        confirmed,
      });
    });
  }, [dataSource, dispatchTableModelAction, requestScroll]);

  const handleCreateCalculatedColumn = useCallback(
    (column: ColumnDescriptor) => {
      dataSource.columns = dataSource.columns.concat(column.name);
      applyTableConfigChange(addColumn(tableConfig, column));
    },
    [dataSource, tableConfig, applyTableConfigChange],
  );

  const hideColumns = useCallback(
    (action: ColumnActionHide) => {
      const { columns } = action;
      const hiddenColumns = columns.map((c) => c.name);
      const newTableConfig = {
        ...tableConfig,
        columns: tableConfig.columns.map((col) =>
          hiddenColumns.includes(col.name) ? { ...col, hidden: true } : col,
        ),
      };
      applyTableConfigChange(newTableConfig);
    },
    [tableConfig, applyTableConfigChange],
  );

  const pinColumn = useCallback(
    (action: ColumnActionPin) => {
      applyTableConfigChange({
        ...tableConfig,
        columns: updateColumn(tableConfig.columns, {
          ...action.column,
          pin: action.pin,
        }),
      });
    },
    [tableConfig, applyTableConfigChange],
  );

  const { showColumnSettingsPanel, showTableSettingsPanel } =
    useTableAndColumnSettings({
      availableColumns:
        availableColumns ??
        tableConfig.columns.map(({ name, serverDataType = "string" }) => ({
          name,
          serverDataType,
        })),
      onAvailableColumnsChange,
      onConfigChange: handleConfigEditedInSettingsPanel,
      onCreateCalculatedColumn: handleCreateCalculatedColumn,
      onDataSourceConfigChange: handleDataSourceConfigChanged,
      tableConfig,
    });

  const onPersistentColumnOperation = useCallback(
    (action: PersistentColumnAction) => {
      if (isShowColumnSettings(action)) {
        showColumnSettingsPanel(action);
      } else if (isShowTableSettings(action)) {
        showTableSettingsPanel();
      } else {
        switch (action.type) {
          case "hideColumns":
            return hideColumns(action);
          case "pinColumn":
            return pinColumn(action);
          default:
            dispatchTableModelAction(action);
        }
      }
    },
    [
      dispatchTableModelAction,
      hideColumns,
      pinColumn,
      showColumnSettingsPanel,
      showTableSettingsPanel,
    ],
  );

  const handleContextMenuAction = useHandleTableContextMenu({
    dataSource,
    onPersistentColumnOperation,
  });

  const handleSort = useCallback(
    (column: ColumnDescriptor, extendSort = false, sortType?: VuuSortType) => {
      if (dataSource) {
        dataSource.sort = toggleOrApplySort(
          dataSource.sort,
          column,
          extendSort,
          sortType,
        );
      }
    },
    [dataSource],
  );

  const resizeCells = useRef<HTMLElement[] | undefined>();

  const onResizeColumn: TableColumnResizeHandler = useCallback(
    (phase, columnName, width) => {
      const column = columns.find((column) => column.name === columnName);
      if (column) {
        if (phase === "resize") {
          resizeCells.current?.forEach((cell) => {
            cell.style.width = `${width}px`;
          });
        } else if (phase === "end") {
          resizeCells.current = undefined;
          if (isValidNumber(width)) {
            dispatchTableModelAction({
              type: "resizeColumn",
              phase,
              column,
              width,
            });
            onConfigChange?.(
              stripInternalProperties(
                updateTableConfig(tableConfig, {
                  type: "col-size",
                  column,
                  columns,
                  width,
                }),
              ),
            );
          }
        } else {
          const byColIndex = `[aria-colindex='${column.index}']`;
          resizeCells.current = Array.from(
            containerRef.current?.querySelectorAll(
              `.vuuTableCell${byColIndex},.vuuTableHeaderCell${byColIndex}`,
            ) ?? [],
          );
          dispatchTableModelAction({
            type: "resizeColumn",
            phase,
            column,
            width,
          });
        }
      } else {
        throw Error(
          `useDataTable.handleColumnResize, column ${columnName} not found`,
        );
      }
    },
    [
      columns,
      dispatchTableModelAction,
      onConfigChange,
      tableConfig,
      containerRef,
    ],
  );

  const onToggleGroup = useCallback(
    (row: DataSourceRow, column: RuntimeColumnDescriptor) => {
      const isJson = isJsonGroup(column, row, columnMap);
      const key = row[KEY];

      if (row[IS_EXPANDED]) {
        dataSource.closeTreeNode(key, true);
        if (isJson) {
          const idx = columns.indexOf(column);
          const rows = dataSource.getRowsAtDepth?.(idx + 1);
          if (rows && !rows.some((row) => row[IS_EXPANDED] || row[IS_LEAF])) {
            dispatchTableModelAction({
              type: "hideColumns",
              columns: columns.slice(idx + 2),
            });
          }
        }
      } else {
        dataSource.openTreeNode(key);
        if (isJson) {
          const childRows = dataSource.getChildRows?.(key);
          const idx = columns.indexOf(column) + 1;
          const columnsToShow = [columns[idx]];
          if (childRows && childRows.some((row) => row[IS_LEAF])) {
            columnsToShow.push(columns[idx + 1]);
          }
          if (columnsToShow.some((col) => col.hidden)) {
            dispatchTableModelAction({
              type: "showColumns",
              columns: columnsToShow,
            });
          }
        }
      }
    },
    [columnMap, columns, dataSource, dispatchTableModelAction],
  );

  const {
    focusCell,
    focusCellPlaceholderKeyDown,
    focusCellPlaceholderRef,
    tableBodyRef,
  } = useCellFocus({
    cellFocusStateRef,
    containerRef,
    disableFocus,
    requestScroll,
  });

  focusCellRef.current = focusCell;

  const columnCount = columns.filter((c) => c.hidden !== true).length;

  const {
    highlightedIndexRef,
    navigate,
    onFocus: navigationFocus,
    onKeyDown: navigationKeyDown,
    ...containerProps
  } = useKeyboardNavigation({
    cellFocusStateRef,
    columnCount,
    containerRef,
    disableFocus,
    focusCell,
    highlightedIndex: highlightedIndexProp,
    navigationStyle,
    requestScroll,
    rowCount,
    onHighlight,
    viewportRange: range,
    viewportRowCount: viewportMeasurements.rowCount,
  });

  const {
    onBlur: editingBlur,
    onDoubleClick: editingDoubleClick,
    onKeyDown: editingKeyDown,
    onFocus: editingFocus,
  } = useCellEditing({
    navigate,
  });

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      navigationFocus();
      if (!e.defaultPrevented) {
        editingFocus(e);
      }
    },
    [editingFocus, navigationFocus],
  );

  const onContextMenu = useTableContextMenu({
    columns,
    data,
    dataSource,
    getSelectedRows,
  });

  const onMoveGroupColumn = useCallback(
    (columns: ColumnDescriptor[]) => {
      dataSource.groupBy = columns.map((col) => col.name);
    },
    [dataSource],
  );

  const onRemoveGroupColumn = useCallback(
    (column: RuntimeColumnDescriptor) => {
      if (isGroupColumn(column)) {
        dataSource.groupBy = [];
      } else {
        if (dataSource && dataSource.groupBy.includes(column.name)) {
          dataSource.groupBy = dataSource.groupBy.filter(
            (columnName) => columnName !== column.name,
          );
        }
      }
    },
    [dataSource],
  );

  const handleSelectionChange: SelectionChangeHandler = useCallback(
    (selected) => {
      dataSource.select(selected);
      onSelectionChange?.(selected);
    },
    [dataSource, onSelectionChange],
  );

  const handleSelect = useCallback<TableRowSelectHandlerInternal>(
    (row) => {
      if (onSelect) {
        onSelect(row === null ? null : asDataSourceRowObject(row, columnMap));
      }
    },
    [columnMap, onSelect],
  );

  const {
    onKeyDown: selectionHookKeyDown,
    onRowClick: selectionHookOnRowClick,
  } = useSelection({
    highlightedIndexRef,
    onSelect: handleSelect,
    onSelectionChange: handleSelectionChange,
    selectionModel,
  });

  const handleSelectCellBlock = useCallback(
    (cellBlock: TableCellBlock) => {
      handleSelectionChange([]);
      onSelectCellBlock?.(cellBlock);
    },
    [handleSelectionChange, onSelectCellBlock],
  );

  const {
    onMouseDown: cellBlockHookMouseDown,
    cellBlock,
    onKeyDown: cellBlockSelectionKeyDown,
  } = useCellBlockSelection({
    allowCellBlockSelection,
    columnCount,
    containerRef,
    focusCell,
    onSelectCellBlock: handleSelectCellBlock,
    rowCount,
  });

  const handleRowClick = useCallback<TableRowClickHandlerInternal>(
    (evt, row, rangeSelect, keepExistingSelection) => {
      selectionHookOnRowClick(evt, row, rangeSelect, keepExistingSelection);
      onRowClickProp?.(evt, asDataSourceRowObject(row, columnMap));
    },
    [columnMap, onRowClickProp, selectionHookOnRowClick],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      cellBlockSelectionKeyDown?.(e);
      if (!e.defaultPrevented) {
        navigationKeyDown(e);
      }
      if (!e.defaultPrevented) {
        editingKeyDown(e);
      }
      if (!e.defaultPrevented) {
        selectionHookKeyDown(e);
      }
    },
    [
      cellBlockSelectionKeyDown,
      navigationKeyDown,
      editingKeyDown,
      selectionHookKeyDown,
    ],
  );

  const onMoveColumn = useCallback(
    (columns: ColumnDescriptor[]) => {
      const newTableConfig = {
        ...tableConfig,
        columns,
      };

      tableConfigRef.current = newTableConfig;

      dispatchTableModelAction({
        availableWidth,
        type: "init",
        tableConfig: newTableConfig,
        dataSource,
      });
      onConfigChange?.(stripInternalProperties(newTableConfig));
    },
    [
      availableWidth,
      dataSource,
      dispatchTableModelAction,
      onConfigChange,
      tableConfig,
    ],
  );

  const handleDropRow = useCallback(
    (dragDropState) => {
      onDrop?.(dragDropState);
    },
    [onDrop],
  );

  const handleDataEdited = useCallback<DataCellEditHandler>(
    async (row, columnName, value) => {
      return dataSource.applyEdit(row[KEY], columnName, value);
    },
    [dataSource],
  );

  const handleDragStartRow = useCallback<DragStartHandler>(
    (dragDropState) => {
      const { initialDragElement } = dragDropState;
      const rowIndex = getIndexFromRowElement(initialDragElement);
      const row = dataRef.current.find((row) => row[0] === rowIndex);
      if (row) {
        dragDropState.setPayload(row);
      } else {
        // should we abort the operation ?
      }
      onDragStart?.(dragDropState);
    },
    [dataRef, onDragStart],
  );

  const onHeaderHeightMeasured = useCallback((height: number) => {
    setHeaderHeight(height);
  }, []);

  // Drag Drop rows
  const { onMouseDown: rowDragMouseDown, draggable: draggableRow } =
    useRowDragDrop({
      allowDragDrop,
      containerRef,
      draggableClassName: `vuuTable`,
      id,
      onDragStart: handleDragStartRow,
      onDrop: handleDropRow,
      orientation: "vertical",
      itemQuery: ".vuuTableRow",
    });

  const handleMouseDown = useCallback<MouseEventHandler>(
    (evt) => {
      rowDragMouseDown?.(evt);
      if (!evt.isPropagationStopped()) {
        cellBlockHookMouseDown?.(evt);
      }
    },
    [rowDragMouseDown, cellBlockHookMouseDown],
  );

  return {
    ...containerProps,
    "aria-rowcount": dataSource.size,
    cellBlock,
    columnMap,
    columns,
    data,
    draggableRow,
    focusCellPlaceholderKeyDown,
    focusCellPlaceholderRef,
    getRowOffset,
    handleContextMenuAction,
    headerHeight,
    headings,
    highlightedIndex: highlightedIndexRef.current,
    menuBuilder,
    onBlur: editingBlur,
    onDoubleClick: editingDoubleClick,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    onMouseDown: handleMouseDown,
    onContextMenu,
    onDataEdited: handleDataEdited,
    onHeaderHeightMeasured,
    onMoveColumn,
    onMoveGroupColumn,
    onRemoveGroupColumn,
    onRowClick: handleRowClick,
    onSortColumn: handleSort,
    onResizeColumn,
    onToggleGroup,
    rowClassNameGenerator,
    scrollProps,
    // TODO don't think we need these ...
    tableAttributes,
    tableBodyRef,
    tableConfig,
    viewportMeasurements,
  };
};
