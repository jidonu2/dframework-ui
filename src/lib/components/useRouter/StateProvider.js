import React, { createContext, useReducer, useContext } from 'react';
import stateReducer from './stateReducer';
import initialState from './initialState';
import request from '../Grid/httpRequest';
import { locales } from '../mui/locale/localization';
import dayjs from 'dayjs';
import actionsStateProvider from './actions';

const StateContext = createContext();
const RouterContext = createContext(null);

const StateProvider = ({ children }) => {

  const [stateData, dispatchData] = useReducer(stateReducer, initialState);
  function systemDateTimeFormat(isDateFormatOnly, showOnlyDate, state) {
    if (state !== undefined && state !== null) {
      const userData = state; // Access 'state' 
      let userDateFormat = isDateFormatOnly ? 'DD-MM-YYYY' : 'DD-MM-YYYY hh:mm:ss A';
      if (userData) {
        userDateFormat = userData.split(' ');
        userDateFormat[0] = userDateFormat[0].toUpperCase();
        if (!isDateFormatOnly) {
          if (showOnlyDate) {
            userDateFormat = userDateFormat[0].toUpperCase();
          } else {
            userDateFormat[1] += ':ss';
            userDateFormat = userDateFormat.join(" ");
          }
        } else {
          userDateFormat = userDateFormat[0];
        }
      };
      return userDateFormat;
    }
    return isDateFormatOnly ? 'DD-MM-YYYY' : 'DD-MM-YYYY hh:mm:ss A';
  }
  async function getAllSavedPreferences({ preferenceName, Username, history, dispatchData, preferenceApi }) {
    let params = {
      action: 'list',
      id: preferenceName,
      Username
    }
    const response = await request({ url: preferenceApi, params, history, dispatch: dispatchData });
    dispatchData({ type: actionsStateProvider.UDPATE_PREFERENCES, payload: response?.preferences });
    dispatchData({ type: actionsStateProvider.TOTAL_PREFERENCES, payload: response.totalCount });
  }
  async function applyDefaultPreferenceIfExists({ gridRef, history, dispatchData, Username, preferenceName, setIsGridPreferenceFetched, preferenceApi }) {
    let params = {
      action: 'default',
      id: preferenceName,
      Username
    }

    const response = await request({ url: preferenceApi, params, history });
    if (response?.prefValue) {
      let userPreferenceCharts = JSON.parse(response.prefValue);
      userPreferenceCharts?.gridColumn.forEach(ele => {
        gridRef.current.setColumnWidth(ele.field, ele.width);
      })
      gridRef.current.setColumnVisibilityModel(userPreferenceCharts.columnVisibilityModel);
      gridRef.current.setPinnedColumns(userPreferenceCharts.pinnedColumns);
      gridRef.current.setSortModel(userPreferenceCharts.sortModel || []);
      gridRef.current.setFilterModel(userPreferenceCharts?.filterModel);
      dispatchData({ type: actionsStateProvider.SET_CURRENT_PREFERENCE_NAME, payload: response.prefName });
    }
    if (setIsGridPreferenceFetched) {
      setIsGridPreferenceFetched(true);
    }
  }
  function removeCurrentPreferenceName({ dispatchData }) {
    dispatchData({ type: actionsStateProvider.SET_CURRENT_PREFERENCE_NAME, payload: null });
  }

  function formatDate(value, useSystemFormat, showOnlyDate = false, state) {
    if (value) {
      const format = systemDateTimeFormat(useSystemFormat, showOnlyDate, state); // Pass 'state' as an argument
      return dayjs(value).format(format);
    }
    return '-';
  }
  function useLocalization() {
    const currentLocaleData = stateData.dataLocalization;
    const localeData = locales[currentLocaleData];
    function getLocalizedString(key) {
      return stateData.dataLocalization === 'pt-PT' || stateData.dataLocalization === 'ptPT' ? localeData.components.MuiDataGrid.defaultProps.localeText[key] || key : localeData[key] || key;
    }
    return { getLocalizedString };
  }

  return (
    <StateContext.Provider value={{ stateData, dispatchData, systemDateTimeFormat, formatDate, removeCurrentPreferenceName, getAllSavedPreferences, applyDefaultPreferenceIfExists, useLocalization }}>
      {children}
    </StateContext.Provider>
  );
};

const RouterProvider = RouterContext.Provider;

const useRouter = () => {
  return useContext(RouterContext);
};

const useStateContext = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useStateContext must be used within a StateProvider');
  }
  return context;
};

export { StateProvider, useStateContext, useRouter, RouterProvider };
