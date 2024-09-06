import Button from '@mui/material/Button';
import React from 'react';
import {
    DataGridPremium,
    GridToolbarContainer,
    GridToolbarColumnsButton,
    GridToolbarFilterButton,
    GridToolbarExportContainer,
    getGridDateOperators,
    GRID_CHECKBOX_SELECTION_COL_DEF,
    getGridStringOperators,
} from '@mui/x-data-grid-premium';
import DeleteIcon from '@mui/icons-material/Delete';
import CopyIcon from '@mui/icons-material/FileCopy';
import EditIcon from '@mui/icons-material/Edit';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import {
    GridActionsCellItem,
    useGridApiRef
} from '@mui/x-data-grid-premium';
import { useMemo, useEffect, memo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { useSnackbar } from '../SnackBar/index';
import { DialogComponent } from '../Dialog/index';
import { getList, getRecord, deleteRecord } from './crud-helper';
import PropTypes from 'prop-types';
import { Footer } from './footer';
import template from './template';
import { Tooltip } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { makeStyles } from "@material-ui/core";
import PageTitle from '../PageTitle';
import { useStateContext, useRouter } from '../useRouter/StateProvider';
import LocalizedDatePicker from './LocalizedDatePicker';
import actionsStateProvider from '../useRouter/actions';
import GridPreferences from './GridPreference';
import CustomDropdownmenu from './CustomDropdownmenu';

const defaultPageSize = 10;
const sortRegex = /(\w+)( ASC| DESC)?/i;
const recordCounts = 60000;
const actionTypes = {
    Copy: "Copy",
    Edit: "Edit",
    Delete: "Delete"
};
const constants = {
    gridFilterModel: { items: [], logicOperator: 'and', quickFilterValues: Array(0), quickFilterLogicOperator: 'and' },
    permissions: { edit: true, add: true, export: true, delete: true, clearFilterText: "CLEAR THIS FILTER" },
}

const booleanIconRenderer = (params) => {
    if (params.value) {
        return <CheckIcon style={{ color: 'green' }} />;
    } else {
        return <CloseIcon style={{ color: 'gray' }} />;
    }
}


const useStyles = makeStyles({
    buttons: {
        margin: '6px !important'
    }
})

const convertDefaultSort = (defaultSort) => {
    const orderBy = [];
    if (typeof defaultSort === 'string') {
        const sortFields = defaultSort.split(',');
        for (const sortField of sortFields) {
            sortRegex.lastIndex = 0;
            const sortInfo = sortRegex.exec(sortField);
            if (sortInfo) {
                const [, field, direction = 'ASC'] = sortInfo;
                orderBy.push({ field: field.trim(), sort: direction.trim().toLowerCase() });
            }
        }
    }
    return orderBy;
};
const ExportMenuItem = ({ handleExport, contentType, type, isPivotExport = false }) => {
    return (
        <MenuItem
            onClick={handleExport}
            data-type={type}
            data-content-type={contentType}
            data-is-pivot-export={isPivotExport}
        >
            {"Export"} {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
        </MenuItem>
    );
};

ExportMenuItem.propTypes = {
    hideMenu: PropTypes.func
};

const CustomExportButton = (props) => (
    <GridToolbarExportContainer {...props}>
        {props?.showOnlyExcelExport !== true && <ExportMenuItem {...props} type="csv" contentType="text/csv" />}
        <ExportMenuItem {...props} type="excel" contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        {props.showPivotExportBtn && <ExportMenuItem {...props} type="excel With Pivot" contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" isPivotExport={true} />}
        {props?.showOnlyExcelExport !== true && <>
            <ExportMenuItem {...props} type="xml" contentType="text/xml" />
            <ExportMenuItem {...props} type="html" contentType="text/html" />
            <ExportMenuItem {...props} type="json" contentType="application/json" />
        </>}
    </GridToolbarExportContainer>
);

const areEqual = (prevProps = {}, nextProps = {}) => {
    let equal = true;
    for (const o in prevProps) {
        if (prevProps[o] !== nextProps[o]) {
            equal = false;
            console.error({ o, prev: prevProps[o], next: nextProps[o] });
        }
    }
    for (const o in nextProps) {
        if (!prevProps.hasOwnProperty(o)) {
            equal = false;
            console.error({ o, prev: prevProps[o], next: nextProps[o] });
        }
    }
    return equal;
}
const GridBase = memo(({
    useLinkColumn = true,
    model,
    columns,
    api,
    defaultSort,
    setActiveRecord,
    parentFilters,
    parent,
    where,
    title,
    showModal,
    OrderModal,
    permissions,
    selected,
    assigned,
    available,
    disableCellRedirect = false,
    onAssignChange,
    customStyle,
    onCellClick,
    showRowsSelected,
    chartFilters,
    clearChartFilter,
    showFullScreenLoader,
    customFilters,
    onRowDoubleClick,
    baseFilters,
    onRowClick = () => { },
    gridStyle,
    reRenderKey,
    additionalFilters
}) => {
    const [paginationModel, setPaginationModel] = useState({ pageSize: defaultPageSize, page: 0 });
    const [data, setData] = useState({ recordCount: 0, records: [], lookups: {} });
    const [isLoading, setIsLoading] = useState(false);
    const forAssignment = !!onAssignChange;
    const rowsSelected = showRowsSelected;
    const [selection, setSelection] = useState([]);
    const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [visibilityModel, setVisibilityModel] = useState({ CreatedOn: false, CreatedByUser: false, ...model?.columnVisibilityModel });
    const [isDeleting, setIsDeleting] = useState(false);
    const [record, setRecord] = useState(null);
    const snackbar = useSnackbar();
    const isClient = model.isClient === true ? 'client' : 'server';
    const [errorMessage, setErrorMessage] = useState('');
    const [sortModel, setSortModel] = useState(convertDefaultSort(defaultSort || model?.defaultSort));
    const initialFilterModel = { items: [], logicOperator: 'and', quickFilterValues: Array(0), quickFilterLogicOperator: 'and' }
    if (model.defaultFilters) {
        initialFilterModel.items = [];
        model.defaultFilters.forEach((ele) => {
            initialFilterModel.items.push(ele);
        })
    }
    const [filterModel, setFilterModel] = useState({ ...initialFilterModel });
    const { pathname, navigate } = useRouter()
    const apiRef = useGridApiRef();
    const { idProperty = "id", showHeaderFilters = true, disableRowSelectionOnClick = true, createdOnKeepLocal = true, hideBackButton = false, hideTopFilters = true, updatePageTitle = true, isElasticScreen = false } = model;
    const isReadOnly = model.readOnly === true;
    const isDoubleClicked = model.doubleClicked === false;
    const customExportRef = useRef();
    const dataRef = useRef(data);
    const showAddIcon = model.showAddIcon === true;
    const toLink = model.columns.map(item => item.link);
    const [isGridPreferenceFetched, setIsGridPreferenceFetched] = useState(false);
    const classes = useStyles();
    const { systemDateTimeFormat, stateData, dispatchData, formatDate, removeCurrentPreferenceName, getAllSavedPreferences, applyDefaultPreferenceIfExists } = useStateContext();
    const effectivePermissions = { ...constants.permissions, ...stateData.gridSettings.permissions, ...model.permissions, ...permissions };
    const { ClientId } = stateData?.getUserData ? stateData.getUserData : {};
    const { Username } = stateData?.getUserData ? stateData.getUserData : {};
    const routesWithNoChildRoute = stateData.gridSettings.permissions?.routesWithNoChildRoute || [];
    const url = stateData?.gridSettings?.permissions?.Url;
    const withControllersUrl = stateData?.gridSettings?.permissions?.withControllersUrl;
    const currentPreference = stateData?.currentPreference;
    const tablePreferenceEnums = stateData?.gridSettings?.permissions?.tablePreferenceEnums;
    const emptyIsAnyOfOperatorFilters = ["isEmpty", "isNotEmpty", "isAnyOf"];
    const filterFieldDataTypes = {
        Number: 'number',
        String: 'string',
        Boolean: 'boolean'
    };

    const OrderSuggestionHistoryFields = {
        OrderStatus: 'OrderStatusId'
    }
    const preferenceApi = stateData?.gridSettings?.permissions?.preferenceApi;
    const gridColumnTypes = {
        "radio": {
            "type": "singleSelect",
            "valueOptions": "lookup"
        },
        "date": {
            "valueFormatter": ( value ) => (
                formatDate(value, true, false, stateData.dateTime)
            ),
            "filterOperators": LocalizedDatePicker({ columnType: "date" }),
        },
        "dateTime": {
            "valueFormatter": ( value ) => (
                formatDate(value, false, false, stateData.dateTime)
            ),
            "filterOperators": LocalizedDatePicker({ columnType: "datetime" }),
        },
        "dateTimeLocal": {
            "valueFormatter": ( value ) => (
                formatDate(value, false, false, stateData.dateTime)
            ),
            "filterOperators": LocalizedDatePicker({ type: "dateTimeLocal", convert: true }),
        },
        "boolean": {
            renderCell: booleanIconRenderer
        },
        "select": {
            "type": "singleSelect",
            "valueOptions": "lookup"
        }
    }

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {

        if (customFilters && Object.keys(customFilters) != 0) {
            if (customFilters.clear) {
                let filterObject = {
                    items: [],
                    logicOperator: "and",
                    quickFilterValues: [],
                    quickFilterLogicOperator: "and"
                }
                setFilterModel(filterObject)
                return
            } else {
                const newArray = [];
                for (const key in customFilters) {
                    if (key === 'startDate' || key === 'endDate') {
                        newArray.push(customFilters[key])
                    } else {
                        if (customFilters.hasOwnProperty(key)) {
                            const newObj = {
                                field: key,
                                value: customFilters[key],
                                operator: "equals",
                                type: "string"
                            };
                            newArray.push(newObj);
                        }
                    }
                }
                let filterObject = {
                    items: newArray,
                    logicOperator: "and",
                    quickFilterValues: [],
                    quickFilterLogicOperator: "and"
                }
                setFilterModel(filterObject)
            }
        }
    }, [customFilters]);

    const lookupOptions = ({ row, field, id, ...others }) => {
        const lookupData = dataRef.current.lookups || {};
        return lookupData[lookupMap[field].lookup] || [];
    };

    useEffect(() => {
        if (hideTopFilters) {
            dispatchData({
                type: actionsStateProvider.PASS_FILTERS_TOHEADER, payload: {
                    filterButton: null,
                    hidden: { search: true, operation: true, export: true, print: true, filter: true }
                }
            });
        }
    }, []);

    const { gridColumns, pinnedColumns, lookupMap } = useMemo(() => {
        const baseColumnList = columns || model?.gridColumns || model?.columns;
        const pinnedColumns = { left: [GRID_CHECKBOX_SELECTION_COL_DEF.field], right: [] };
        const finalColumns = [];
        const lookupMap = {};
        for (const column of baseColumnList) {
            const overrides = {};
            if (column.headerName === null) {
                continue;
            }
            if (parent && column.lookup === parent) {
                continue;
            }
            if (column.type === 'oneToMany') {
                if (column.countInList === false) {
                    continue;
                }
                overrides.type = 'number';
                overrides.field = column.field.replace(/s$/, 'Count');
            }

            if (gridColumnTypes[column.type]) {
                Object.assign(overrides, gridColumnTypes[column.type]);
            }
            if (overrides.valueOptions === "lookup") {
                overrides.valueOptions = lookupOptions;
                let lookupFilters = [...getGridDateOperators(), ...getGridStringOperators()].filter((operator) => ['is', 'not', 'isAnyOf'].includes(operator.value))
                overrides.filterOperators = lookupFilters.map((operator) => ({
                    ...operator,
                    InputComponent: operator.InputComponent ? (params) => (
                        <CustomDropdownmenu
                            column={{
                                ...column,
                                dataRef: dataRef
                            }}
                            {...params}
                            autoHighlight
                        />
                    ) : undefined
                }));
            }
            if (column.linkTo) {
                overrides.cellClassName = "mui-grid-linkColumn";
            }
            if (column.link) {
                overrides.cellClassName = "mui-grid-linkColumn";
            }
            finalColumns.push({ headerName: column.headerName || column.label, ...column, ...overrides });
            if (column.pinned) {
                pinnedColumns[column.pinned === 'right' ? 'right' : 'left'].push(column.field);
            }
            lookupMap[column.field] = column;
            column.label = column?.label
        }

        const auditColumns = model.standard === true;

        if (auditColumns && model?.addCreatedModifiedColumns !== false) {
            if (model?.addCreatedOnColumn !== false) {
                finalColumns.push(
                    {
                        field: "CreatedOn", type: "dateTime", headerName: "Created On", width: 200, filterOperators: LocalizedDatePicker({ columnType: "date" }), valueFormatter: gridColumnTypes.dateTime.valueFormatter, keepLocal: true
                    }
                );
            }
            if (model?.addCreatedByColumn !== false) {
                finalColumns.push(
                    { field: "CreatedByUser", type: "string", headerName: "Created By", width: 200 },
                );
            }
            if (model?.addModifiedOnColumn !== false) {
                finalColumns.push(
                    {
                        field: "ModifiedOn", type: "dateTime", headerName: "Modified On", width: 200, filterOperators: LocalizedDatePicker({ columnType: "date" }), valueFormatter: gridColumnTypes.dateTime.valueFormatter, keepLocal: true

                    }
                );
            }
            if (model?.addModifiedByColumn !== false) {
                finalColumns.push(
                    { field: "ModifiedByUser", type: "string", headerName: "Modified By", width: 200 }
                );
            }
        }

        if (!forAssignment && !isReadOnly) {
            const actions = [];
            if (effectivePermissions?.edit) {
                actions.push(<GridActionsCellItem icon={<Tooltip title="Edit">   <EditIcon /></Tooltip>} data-action={actionTypes.Edit} label="Edit" color="primary" />);
            }
            if (effectivePermissions.add) {
                actions.push(<GridActionsCellItem icon={<Tooltip title="Copy"><CopyIcon /> </Tooltip>} data-action={actionTypes.Copy} label="Copy" color="primary" />);
            }
            if (effectivePermissions.delete) {
                actions.push(<GridActionsCellItem icon={<Tooltip title="Delete"><DeleteIcon /> </Tooltip>} data-action={actionTypes.Delete} label="Delete" color="error" />);
            }
            if (actions.length > 0) {
                finalColumns.push({
                    field: 'actions',
                    type: 'actions',
                    label: '',
                    width: actions.length * 50,
                    getActions: () => actions,
                });
            }
            pinnedColumns.right.push('actions');
        }

        return { gridColumns: finalColumns, pinnedColumns, lookupMap };
    }, [columns, model, parent, permissions, forAssignment]);
    const fetchData = (action = "list", extraParams = {}, contentType, columns, isPivotExport, isElasticExport) => {
        const { pageSize, page } = paginationModel;
        let gridApi = `${model.controllerType === 'cs' ? withControllersUrl : url || ""}${model.api || api}`

        let controllerType = model?.controllerType;
        if (isPivotExport) {
            gridApi = `${withControllersUrl}${model?.pivotAPI}`;
            controllerType = 'cs';
        }
        if (assigned || available) {
            extraParams[assigned ? "include" : "exclude"] = Array.isArray(selected) ? selected.join(',') : selected;
        }
        let filters = { ...filterModel }, finalFilters = { ...filterModel };
        if (chartFilters?.items?.length > 0) {
            let { columnField: field, operatorValue: operator } = chartFilters.items[0];
            field = constants.chartFilterFields[field];
            const chartFilter = [{ field: field, operator: operator, isChartFilter: false }];
            filters.items = [...chartFilter];
            if (JSON.stringify(filterModel) !== JSON.stringify(filters)) {
                setFilterModel({ ...filters });
                finalFilters = filters;
                chartFilters.items.length = 0;
            }
        }
        if (additionalFilters) {
            finalFilters.items = [...finalFilters.items, ...additionalFilters];
        }
        getList({
            action,
            page: !contentType ? page : 0,
            pageSize: !contentType ? pageSize : 1000000,
            sortModel,
            filterModel: finalFilters,
            controllerType: controllerType,
            api: gridApi,
            setIsLoading,
            setData,
            gridColumns,
            modelConfig: model,
            parentFilters,
            extraParams,
            setError: snackbar.showError,
            contentType,
            columns,
            template: isPivotExport ? model?.template : null,
            configFileName: isPivotExport ? model?.configFileName : null,
            dispatchData,
            showFullScreenLoader,
            history: navigate,
            baseFilters,
            isElasticExport
        });
    };
    const openForm = (id, { mode } = {}) => {
        if (setActiveRecord) {
            getRecord({ id, api: api || model?.api, setIsLoading, setActiveRecord, modelConfig: model, parentFilters, where });
            return;
        }
        let path = pathname;
        if (!path.endsWith("/")) {
            path += "/";
        }
        if (mode === "copy") {
            path += "0-" + id;
            dispatchData({ type: 'UPDATE_FORM_MODE', payload: 'copy' })

        } else {
            path += id;
            dispatchData({ type: 'UPDATE_FORM_MODE', payload: '' })
        }
        navigate(path);
    };
    const onCellClickHandler = async (cellParams, event, details) => {
        if (!isReadOnly) {
            if (onCellClick) {
                const result = await onCellClick({ cellParams, event, details });
                if (typeof result !== "boolean") {
                    return;
                }
            }
            const { row: record } = cellParams;
            const columnConfig = lookupMap[cellParams.field] || {};
            if (columnConfig.linkTo) {
                navigate({
                    pathname: template.replaceTags(columnConfig.linkTo, record)
                });
                return;
            }
            let action = useLinkColumn && cellParams.field === model.linkColumn ? actionTypes.Edit : null;
            if (!action && cellParams.field === 'actions') {
                action = details?.action;
                if (!action) {
                    const el = event.target.closest('button');
                    if (el) {
                        action = el.dataset.action;
                    }
                }
            }
            if (action === actionTypes.Edit) {
                return openForm(record[idProperty]);
            }
            if (action === actionTypes.Copy) {
                return openForm(record[idProperty], { mode: 'copy' });
            }
            if (action === actionTypes.Delete) {
                setIsDeleting(true);
                setRecord({ name: record[model?.linkColumn], id: record[idProperty] });
            }
        }
        if (isReadOnly && toLink) {
            if (model?.isAcostaController && onCellClick && cellParams.colDef.customCellClick === true) {
                onCellClick(cellParams.row);
                return;
            }
            const { row: record } = cellParams;
            const columnConfig = lookupMap[cellParams.field] || {};
            let historyObject = {
                pathname: template.replaceTags(columnConfig.linkTo, record),
            }

            if (model.addRecordToState) {
                historyObject.state = record
            }
            navigate(historyObject);
        }
    };

    const handleDelete = async function () {

        let gridApi = `${model.controllerType === 'cs' ? withControllersUrl : url}${model.api || api}`
        const result = await deleteRecord({ id: record?.id, api: gridApi, setIsLoading, setError: snackbar.showError, setErrorMessage });
        if (result === true) {
            setIsDeleting(false);
            snackbar.showMessage('Record Deleted Successfully.');
            fetchData();
        } else {
            setTimeout(() => {
                setIsDeleting(false);
            }, 200);
        }
    }
    const clearError = () => {
        setErrorMessage(null);
        setIsDeleting(false);
    };
    const onCellDoubleClick = (event) => {
        const { row: record } = event;
        if ((!isReadOnly && !isDoubleClicked) && !disableCellRedirect) {
            openForm(record[idProperty]);
        }

        if (isReadOnly && model.rowRedirectLink) {
            let historyObject = {
                pathname: template.replaceTags(model.rowRedirectLink, record),
            }

            if (model.addRecordToState) {
                historyObject.state = record
            }
            navigate(historyObject);
        }

        if (onRowDoubleClick) {
            onRowDoubleClick(event);
        }
    };

    const handleCloseOrderDetailModal = () => {
        setIsOrderDetailModalOpen(false);
        setSelectedOrder(null);
        fetchData();
    };


    const onAdd = () => {
        openForm(0);
    };

    const clearFilters = () => {
        if (filterModel?.items?.length > 0) {
            const filters = JSON.parse(JSON.stringify(constants.gridFilterModel));
            setFilterModel(filters);
            if (clearChartFilter) {
                clearChartFilter();
            }
        }
    }
    const updateAssignment = ({ unassign, assign }) => {
        const assignedValues = Array.isArray(selected) ? selected : (selected.length ? selected.split(',') : []);
        const finalValues = unassign ? assignedValues.filter(id => !unassign.includes(parseInt(id))) : [...assignedValues, ...assign];
        onAssignChange(typeof selected === 'string' ? finalValues.join(',') : finalValues);
    }

    const onAssign = () => {
        updateAssignment({ assign: selection });
    }

    const onUnassign = () => {
        updateAssignment({ unassign: selection });
    }

    useEffect(() => {
        if(model.preferenceId) {
            removeCurrentPreferenceName({ dispatchData });
            getAllSavedPreferences({ preferenceName: model.preferenceId, history: navigate, dispatchData, Username, preferenceApi, tablePreferenceEnums });
            applyDefaultPreferenceIfExists({ preferenceName: model.preferenceId, history: navigate, dispatchData, Username, gridRef: apiRef, setIsGridPreferenceFetched, preferenceApi, tablePreferenceEnums });
        }
    }, [])

    const CustomToolbar = function (props) {

        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between'
                }}
            >
                {model.gridSubTitle && <Typography variant="h6" component="h3" textAlign="center" sx={{ ml: 1 }}> {t(model.gridSubTitle, tOpts)}</Typography>}
                {currentPreference && <Typography className="preference-name-text" variant="h6" component="h6" textAlign="center" sx={{ ml: 1 }} >Applied Preference - {currentPreference}</Typography>}
                {(isReadOnly || (!effectivePermissions.add && !forAssignment)) && <Typography variant="h6" component="h3" textAlign="center" sx={{ ml: 1 }} > {isReadOnly ? "" : model.title}</Typography>}
                {!forAssignment && effectivePermissions.add && !isReadOnly && !showAddIcon && <Button startIcon={!showAddIcon ? null : <AddIcon />} onClick={onAdd} size="medium" variant="contained" className={classes.buttons} >{model?.customAddTextTitle ? model.customAddTextTitle : ` ${!showAddIcon ? "" : `${"Add"}`} ${model.title ? model.title : 'Add'}`}</Button>}
                {available && <Button startIcon={!showAddIcon ? null : <AddIcon />} onClick={onAssign} size="medium" variant="contained" className={classes.buttons}  >{"Assign"}</Button>}
                {assigned && <Button startIcon={!showAddIcon ? null : <RemoveIcon />} onClick={onUnassign} size="medium" variant="contained" className={classes.buttons}  >{"Remove"}</Button>}

                <GridToolbarContainer {...props}>
                    <GridToolbarColumnsButton />
                    <GridToolbarFilterButton />
                    <Button startIcon={<FilterListOffIcon />} onClick={clearFilters} size="small">{"CLEAR FILTER"}</Button>
                    {effectivePermissions.export && (
                        <CustomExportButton handleExport={handleExport} showPivotExportBtn={model?.showPivotExportBtn} showOnlyExcelExport={model.showOnlyExcelExport} />
                    )}
                    {model.preferenceId &&
                        <GridPreferences preferenceName={model.preferenceId} gridRef={apiRef} columns={gridColumns} setIsGridPreferenceFetched={setIsGridPreferenceFetched} />
                    }
                </GridToolbarContainer>
            </div >
        );
    };

    const getGridRowId = (row) => {
        return row[idProperty];
    };

    const handleExport = (e) => {
        if (data?.recordCount > recordCounts) {
            snackbar.showMessage('Cannot export more than 60k records, please apply filters or reduce your results using filters');
            return;
        }
        else {
            const { orderedFields, columnVisibilityModel, lookup } = apiRef.current.state.columns;
            const columns = {};
            const isPivotExport = e.target.dataset.isPivotExport === 'true';
            const hiddenColumns = Object.keys(columnVisibilityModel).filter(key => columnVisibilityModel[key] === false);
            const visibleColumns = orderedFields.filter(ele => !hiddenColumns?.includes(ele) && ele !== '__check__' && ele !== 'actions');
            if (visibleColumns?.length === 0) {
                snackbar.showMessage('You cannot export while all columns are hidden... please show at least 1 column before exporting');
                return;
            }

            visibleColumns.forEach(ele => {
                columns[ele] = { field: ele, width: lookup[ele].width, headerName: lookup[ele].headerName || lookup[ele].field, type: lookup[ele].type, keepLocal: lookup[ele].keepLocal === true, isParsable: lookup[ele]?.isParsable };
            })

            fetchData(isPivotExport ? 'export' : undefined, undefined, e.target.dataset.contentType, columns, isPivotExport, isElasticScreen);
        }
    };
    useEffect(() => {
        // if (isGridPreferenceFetched) {
            fetchData();
        // }
    }, [paginationModel, sortModel, filterModel, api, gridColumns, model, parentFilters, assigned, selected, available, chartFilters, isGridPreferenceFetched, reRenderKey])

    useEffect(() => {
        if (forAssignment || !updatePageTitle) {
            return;
        }
        dispatchData({ type: actionsStateProvider.PAGE_TITLE_DETAILS, payload: { icon: "", titleHeading: model?.pageTitle || model?.title, titleDescription: model?.titleDescription, title: model?.title } })
        return () => {
            dispatchData({
                type: actionsStateProvider.PAGE_TITLE_DETAILS, payload: null
            })
        }
    }, [])

    useEffect(() => {
        let backRoute = pathname;

        // we do not need to show the back button for these routes
        if (hideBackButton || routesWithNoChildRoute.includes(backRoute)) {
            dispatchData({
                type: actionsStateProvider.SET_PAGE_BACK_BUTTON,
                payload: { status: false, backRoute: '' },
            });
            return;
        }
        backRoute = backRoute.split("/");
        backRoute.pop();
        backRoute = backRoute.join("/");
        dispatchData({
            type: actionsStateProvider.SET_PAGE_BACK_BUTTON,
            payload: { status: true, backRoute: backRoute },
        });
    }, [isLoading]);

    const updateFilters = (e) => {
        const { items } = e;
        const updatedItems = items.map(item => {
            const { field, operator, type, value } = item;
            const column = gridColumns.find(col => col.field === field);
            const isNumber = column?.type === filterFieldDataTypes.Number;

            if (field === OrderSuggestionHistoryFields.OrderStatus) {
                const { filterField, ...newItem } = item;
                return newItem;
            }

            if ((emptyIsAnyOfOperatorFilters.includes(operator)) || (isNumber && !isNaN(value)) || ((!isNumber))) {
                const isKeywordField = isElasticScreen && gridColumns.filter(element => element.field === item.field)[0]?.isKeywordField;
                if (isKeywordField) {
                    item.filterField = `${item.field}.keyword`;
                }
                return item;
            }
            const updatedValue = isNumber ? null : value;
            return { field, operator, type, value: updatedValue };
        });
        e.items = updatedItems;
        setFilterModel(e);
        if (e?.items?.findIndex(ele => ele.isChartFilter && !(['isEmpty', 'isNotEmpty'].includes(ele.operator))) === -1) {
            if (clearChartFilter) {
                clearChartFilter();
            }
        }
        if (chartFilters?.items?.length > 0) {
            if (e.items.length === 0) {
                if (clearChartFilter) {
                    clearChartFilter();
                }
            } else {
                const chartFilterIndex = chartFilters?.items.findIndex(ele => ele.columnField === e.items[0].field);
                if (chartFilterIndex > -1) {
                    if (clearChartFilter) {
                        clearChartFilter();
                    }
                }
            }
        }
    };

    const updateSort = (e) => {
        const sort = e.map((ele) => {
            const isKeywordField = isElasticScreen && gridColumns.filter(element => element.field === ele.field)[0]?.isKeywordField
            return { ...ele, filterField: isKeywordField ? `${ele.field}.keyword` : ele.field };
        })
        setSortModel(sort);
    }

    return (
        <div style={gridStyle || customStyle}>
            <DataGridPremium
                sx={{
                    "& .MuiTablePagination-selectLabel": {
                        marginTop: 2
                    },
                    "& .MuiTablePagination-displayedRows": {
                        marginTop: 2
                    },
                    "& .MuiDataGrid-columnHeader .MuiInputLabel-shrink": {
                        display: "none"
                    }
                }}
                unstable_headerFilters={showHeaderFilters}
                checkboxSelection={forAssignment}
                loading={isLoading}
                className="pagination-fix"
                onCellClick={onCellClickHandler}
                onCellDoubleClick={onCellDoubleClick}
                columns={gridColumns}
                paginationModel={paginationModel}
                pageSizeOptions={[5, 10, 20, 50, 100]}
                onPaginationModelChange={setPaginationModel}
                pagination
                rowCount={data.recordCount}
                rows={data.records}
                sortModel={sortModel}
                paginationMode={isClient}
                sortingMode={isClient}
                filterMode={isClient}
                keepNonExistentRowsSelected
                onSortModelChange={updateSort}
                onFilterModelChange={updateFilters}
                rowSelection={selection}
                onRowSelectionModelChange={setSelection}
                filterModel={filterModel}
                getRowId={getGridRowId}
                onRowClick={onRowClick}
                slots={{
                    headerFilterMenu: false,
                    toolbar: CustomToolbar,
                    footer: Footer
                }}
                slotProps={{
                    footer: {
                        pagination: true,
                        apiRef
                    },
                    panel: {
                        placement: "bottom-end"
                    },
                }}
                hideFooterSelectedRowCount={rowsSelected}
                density="compact"
                disableDensitySelector={true}
                apiRef={apiRef}
                disableAggregation={true}
                disableRowGrouping={true}
                disableRowSelectionOnClick={disableRowSelectionOnClick}
                autoHeight
                initialState={{
                    columns: {
                        columnVisibilityModel: visibilityModel
                    },
                    pinnedColumns: pinnedColumns
                }}
            />
            {isOrderDetailModalOpen && selectedOrder && model.OrderModal && (
                <model.OrderModal
                    orderId={selectedOrder.OrderId}
                    isOpen={true}
                    orderTotal={selectedOrder.OrderTotal}
                    orderDate={selectedOrder.OrderDateTime}
                    orderStatus={selectedOrder.OrderStatus}
                    customerNumber={selectedOrder.CustomerPhoneNumber}
                    customerName={selectedOrder.CustomerName}
                    customerEmail={selectedOrder.CustomerEmailAddress}
                    onClose={handleCloseOrderDetailModal}
                />
            )}
            {errorMessage && (<DialogComponent open={!!errorMessage} onConfirm={clearError} onCancel={clearError} title="Info" hideCancelButton={true} > {errorMessage}</DialogComponent>)
            }
            {isDeleting && !errorMessage && (<DialogComponent open={isDeleting} onConfirm={handleDelete} onCancel={() => setIsDeleting(false)} title="Confirm Delete"> {`${'Are you sure you want to delete'} ${record?.name}?`}</DialogComponent>)}
        </div >
    );
}, areEqual);

export default GridBase;