"use strict";

require("core-js/modules/es.error.cause.js");
require("core-js/modules/es.weak-map.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.saveRecord = exports.getRecord = exports.getLookups = exports.getList = exports.deleteRecord = void 0;
require("core-js/modules/es.array.includes.js");
require("core-js/modules/es.array.push.js");
require("core-js/modules/es.array.sort.js");
require("core-js/modules/es.json.stringify.js");
require("core-js/modules/es.promise.js");
require("core-js/modules/es.regexp.to-string.js");
require("core-js/modules/web.dom-collections.iterator.js");
require("core-js/modules/web.url-search-params.js");
require("core-js/modules/web.url-search-params.delete.js");
require("core-js/modules/web.url-search-params.has.js");
require("core-js/modules/web.url-search-params.size.js");
var _actions = _interopRequireDefault(require("../useRouter/actions"));
var _httpRequest = _interopRequireWildcard(require("./httpRequest"));
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const dateDataTypes = ['date', 'dateTime'];
const exportRecordSize = 10000;
const getList = async _ref => {
  var _filterModel$items;
  let {
    gridColumns,
    setIsLoading,
    setData,
    page,
    pageSize,
    sortModel,
    filterModel,
    api,
    parentFilters,
    action = 'list',
    setError,
    extraParams,
    contentType,
    columns,
    controllerType = 'node',
    template = null,
    configFileName = null,
    dispatchData,
    showFullScreenLoader = false,
    oderStatusId = 0,
    modelConfig = null,
    baseFilters = null,
    isElasticExport
  } = _ref;
  if (!contentType) {
    setIsLoading(true);
    if (showFullScreenLoader) {
      dispatchData({
        type: _actions.default.UPDATE_LOADER_STATE,
        payload: true
      });
    }
  }
  const lookups = [];
  const dateColumns = [];
  gridColumns.forEach(_ref2 => {
    let {
      lookup,
      type,
      field,
      keepLocal = false,
      keepLocalDate
    } = _ref2;
    if (dateDataTypes.includes(type)) {
      dateColumns.push({
        field,
        keepLocal,
        keepLocalDate
      });
    }
    if (!lookup) {
      return;
    }
    if (!lookups.includes(lookup)) {
      lookups.push(lookup);
    }
  });
  const where = [];
  if (filterModel !== null && filterModel !== void 0 && (_filterModel$items = filterModel.items) !== null && _filterModel$items !== void 0 && _filterModel$items.length) {
    filterModel.items.forEach(filter => {
      if (["isEmpty", "isNotEmpty"].includes(filter.operator) || filter.value) {
        var _column$;
        const {
          field,
          operator,
          filterField
        } = filter;
        let {
          value
        } = filter;
        const column = gridColumns.filter(item => item.field === filter.field);
        const type = (_column$ = column[0]) === null || _column$ === void 0 ? void 0 : _column$.type;
        if (type === 'boolean') {
          value = value === 'true' ? 1 : 0;
        } else if (type === 'number') {
          value = Array.isArray(value) ? value.filter(e => e) : value;
        }
        value = filter.filterValues || value;
        where.push({
          field: filterField || field,
          operator: operator,
          value: value,
          type: type
        });
      }
    });
  }
  if (parentFilters) {
    where.push(...parentFilters);
  }
  if (baseFilters) {
    where.push(...baseFilters);
  }
  const requestData = _objectSpread(_objectSpread({
    start: page * pageSize,
    limit: isElasticExport ? modelConfig.exportSize : pageSize
  }, extraParams), {}, {
    logicalOperator: filterModel.logicOperator,
    sort: sortModel.map(sort => (sort.filterField || sort.field) + ' ' + sort.sort).join(','),
    where,
    oderStatusId: oderStatusId,
    isElasticExport,
    fileName: modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.overrideFileName
  });
  if (lookups) {
    requestData.lookups = lookups.join(',');
  }
  if (modelConfig !== null && modelConfig !== void 0 && modelConfig.limitToSurveyed) {
    requestData.limitToSurveyed = modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.limitToSurveyed;
  }
  const headers = {};
  let url = controllerType === 'cs' ? "".concat(api, "?action=").concat(action, "&asArray=0") : "".concat(api, "/").concat(action);
  if (template !== null) {
    url += "&template=".concat(template);
  }
  if (configFileName !== null) {
    url += "&configFileName=".concat(configFileName);
  }
  if (contentType) {
    const form = document.createElement("form");
    requestData.responseType = contentType;
    requestData.columns = columns;
    form.setAttribute("method", "POST");
    form.setAttribute("id", "exportForm");
    form.setAttribute("target", "_blank");
    if (template === null) {
      for (const key in requestData) {
        let v = requestData[key];
        if (v === undefined || v === null) {
          continue;
        } else if (typeof v !== 'string') {
          v = JSON.stringify(v);
        }
        let hiddenTag = document.createElement('input');
        hiddenTag.type = "hidden";
        hiddenTag.name = key;
        hiddenTag.value = v;
        form.append(hiddenTag);
      }
    }
    form.setAttribute('action', url);
    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
      document.getElementById("exportForm").remove();
    }, 3000);
    return;
  }
  try {
    let params = {
      url,
      method: 'POST',
      data: requestData,
      headers: _objectSpread({
        "Content-Type": "application/json"
      }, headers),
      credentials: 'include'
    };
    const response = await (0, _httpRequest.transport)(params);
    function isLocalTime(dateValue) {
      const date = new Date(dateValue);
      const localOffset = new Date().getTimezoneOffset();
      const dateOffset = date.getTimezoneOffset();
      return localOffset === dateOffset;
    }
    if (response.status === _httpRequest.HTTP_STATUS_CODES.OK) {
      const {
        records,
        userCurrencySymbol
      } = response.data;
      if (records) {
        records.forEach(record => {
          if (record.hasOwnProperty("TotalOrder")) {
            record["TotalOrder"] = "".concat(userCurrencySymbol).concat(record["TotalOrder"]);
          }
          dateColumns.forEach(column => {
            const {
              field,
              keepLocal,
              keepLocalDate
            } = column;
            if (record[field]) {
              record[field] = new Date(record[field]);
              if (keepLocalDate) {
                const userTimezoneOffset = record[field].getTimezoneOffset() * 60000;
                record[field] = new Date(record[field].getTime() + userTimezoneOffset);
              }
              if (keepLocal && !isLocalTime(record[field])) {
                const userTimezoneOffset = record[field].getTimezoneOffset() * 60000;
                record[field] = new Date(record[field].getTime() + userTimezoneOffset);
              }
            }
          });
        });
      }
      setData(response.data);
    } else if (response.status === _httpRequest.HTTP_STATUS_CODES.UNAUTHORIZED) {
      setError('Session Expired!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setError(response.statusText);
    }
  } catch (err) {
    setError(err);
  } finally {
    if (!contentType) {
      setIsLoading(false);
      if (showFullScreenLoader) {
        dispatchData({
          type: _actions.default.UPDATE_LOADER_STATE,
          payload: false
        });
      }
    }
  }
};
exports.getList = getList;
const getRecord = async _ref3 => {
  var _Object$keys;
  let {
    api,
    id,
    setIsLoading,
    setActiveRecord,
    modelConfig,
    parentFilters,
    where = {},
    setError
  } = _ref3;
  api = api || (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.api);
  setIsLoading(true);
  const searchParams = new URLSearchParams();
  const url = "".concat(api, "/").concat(id === undefined || id === null ? '-' : id);
  const lookupsToFetch = [];
  const fields = modelConfig.formDef || modelConfig.columns;
  fields === null || fields === void 0 || fields.forEach(field => {
    if (field.lookup && !lookupsToFetch.includes(field.lookup)) {
      lookupsToFetch.push(field.lookup);
    }
  });
  searchParams.set("lookups", lookupsToFetch);
  if (where && (_Object$keys = Object.keys(where)) !== null && _Object$keys !== void 0 && _Object$keys.length) {
    searchParams.set("where", JSON.stringify(where));
  }
  ;
  try {
    const response = await (0, _httpRequest.transport)({
      url: "".concat(url, "?").concat(searchParams.toString()),
      method: 'GET',
      credentials: 'include'
    });
    if (response.status === _httpRequest.HTTP_STATUS_CODES.OK) {
      const {
        data: record,
        lookups
      } = response.data;
      let title = record[modelConfig.linkColumn];
      const columnConfig = modelConfig.columns.find(a => a.field === modelConfig.linkColumn);
      if (columnConfig && columnConfig.lookup) {
        var _lookups$columnConfig;
        if (lookups && lookups[columnConfig.lookup] && (_lookups$columnConfig = lookups[columnConfig.lookup]) !== null && _lookups$columnConfig !== void 0 && _lookups$columnConfig.length) {
          const lookupValue = lookups[columnConfig.lookup].find(a => a.value === title);
          if (lookupValue) {
            title = lookupValue.label;
          }
        }
      }
      const defaultValues = _objectSpread({}, modelConfig.defaultValues);
      setActiveRecord({
        id,
        title: title,
        record: _objectSpread(_objectSpread(_objectSpread({}, defaultValues), record), parentFilters),
        lookups
      });
    } else if (response.status === _httpRequest.HTTP_STATUS_CODES.UNAUTHORIZED) {
      setError('Session Expired!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setError('Could not load record', response.body.toString());
    }
  } catch (error) {
    setError('Could not load record', error);
  } finally {
    setIsLoading(false);
  }
};
exports.getRecord = getRecord;
const deleteRecord = exports.deleteRecord = async function deleteRecord(_ref4) {
  let {
    id,
    api,
    setIsLoading,
    setError,
    setErrorMessage
  } = _ref4;
  let result = {
    success: false,
    error: ''
  };
  if (!id) {
    setError('Deleted failed. No active record.');
    return;
  }
  setIsLoading(true);
  try {
    const response = await (0, _httpRequest.transport)({
      url: "".concat(api, "/").concat(id),
      method: 'DELETE',
      credentials: 'include'
    });
    if (response.status === _httpRequest.HTTP_STATUS_CODES.OK) {
      result.success = true;
      return true;
    }
    if (response.status === _httpRequest.HTTP_STATUS_CODES.UNAUTHORIZED) {
      setError('Session Expired!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setError('Delete failed', response.body);
    }
  } catch (error) {
    var _error$response;
    const errorMessage = error === null || error === void 0 || (_error$response = error.response) === null || _error$response === void 0 || (_error$response = _error$response.data) === null || _error$response === void 0 ? void 0 : _error$response.error;
    result.error = errorMessage;
    setErrorMessage(errorMessage);
  } finally {
    setIsLoading(false);
  }
  return result;
};
const saveRecord = exports.saveRecord = async function saveRecord(_ref5) {
  let {
    id,
    api,
    values,
    setIsLoading,
    setError
  } = _ref5;
  let url, method;
  if (id !== 0) {
    url = "".concat(api, "/").concat(id);
    method = 'PUT';
  } else {
    url = api;
    method = 'POST';
  }
  try {
    setIsLoading(true);
    const response = await (0, _httpRequest.transport)({
      url,
      method,
      data: values,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    if (response.status === _httpRequest.HTTP_STATUS_CODES.OK) {
      const {
        data = {}
      } = response.data;
      if (data.success) {
        return data;
      }
      setError('Save failed', data.err || data.message);
      return;
    }
    if (response.status === _httpRequest.HTTP_STATUS_CODES.UNAUTHORIZED) {
      setError('Session Expired!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setError('Save failed', response.body);
    }
  } catch (error) {
    setError('Save failed', error);
  } finally {
    setIsLoading(false);
  }
  return false;
};
const getLookups = async _ref6 => {
  let {
    api,
    setIsLoading,
    setActiveRecord,
    modelConfig,
    setError,
    lookups,
    scopeId
  } = _ref6;
  api = api || (modelConfig === null || modelConfig === void 0 ? void 0 : modelConfig.api);
  setIsLoading(true);
  const searchParams = new URLSearchParams();
  const url = "".concat(api, "/lookups");
  searchParams.set("lookups", lookups);
  searchParams.set("scopeId", scopeId);
  try {
    const response = await (0, _httpRequest.transport)({
      url: "".concat(url, "?").concat(searchParams.toString()),
      method: 'GET',
      credentials: 'include'
    });
    if (response.status === _httpRequest.HTTP_STATUS_CODES.OK) {
      setActiveRecord(response.data);
    } else if (response.status === _httpRequest.HTTP_STATUS_CODES.UNAUTHORIZED) {
      // setError('Session Expired!');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      // setError('Could not load lookups', response.body.toString());
    }
  } catch (error) {
    // setError('Could not load lookups', error);
  } finally {
    setIsLoading(false);
  }
};
exports.getLookups = getLookups;