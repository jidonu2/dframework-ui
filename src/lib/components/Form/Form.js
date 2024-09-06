import React from 'react';
import { useFormik } from 'formik';
import { useState, useEffect, createContext } from 'react';
import { getRecord, saveRecord, deleteRecord, getLookups } from '../Grid/crud-helper';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import FormLayout from './field-mapper';
import { useSnackbar } from '../SnackBar';
import { DialogComponent } from '../Dialog';
import { useStateContext, useRouter } from '../useRouter/StateProvider';
import actionsStateProvider from '../useRouter/actions';
export const ActiveStepContext = createContext(1);
const defaultFieldConfigs = {};

const Form = ({
    model,
    api,
    permissions = { edit: true, export: true, delete: true },
    Layout = FormLayout,
}) => {
    const { navigate, getParams, useParams, pathname } = useRouter()
    const navigateBack = pathname.substring(0, pathname.lastIndexOf('/')); // removes the last segment
    const { dispatchData, stateData } = useStateContext();
    const { id: idWithOptions } = useParams() || getParams;
    const id = idWithOptions?.split('-')[0];
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [lookups, setLookups] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const snackbar = useSnackbar();
    const combos = {}
    const [validationSchema, setValidationSchema] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const url = stateData?.gridSettings?.permissions?.Url;
    const fieldConfigs = model?.applyFieldConfig ? model?.applyFieldConfig({ data, lookups }) : defaultFieldConfigs;
    let gridApi = `${url}${model.api || api}`
    const { mode } = stateData.dataForm;

    const getRecordAndLookups = ({ lookups, scopeId, customSetIsLoading, customSetActiveRecord }) => {
        const options = idWithOptions?.split('-');
        try {
            const params = {
                api: api || gridApi,
                modelConfig: model, 
                setError: errorOnLoad
            }
            if(lookups){
                getLookups({
                    ...params,
                    // setIsLoading, 
                    setIsLoading: customSetIsLoading || setIsLoading, 
                    setActiveRecord: customSetActiveRecord, 
                    lookups, 
                    scopeId
                })
            }
            else {
                getRecord({
                    ...params,
                    id: options.length > 1 ? options[1] : options[0],
                    setIsLoading,
                    setActiveRecord
                })
            }
        } catch (error) {
            snackbar.showError('An error occured, please try after some time.', error);
            navigate(navigateBack);
        }
    }
    useEffect(() => {
        setValidationSchema(model.getValidationSchema({ id, snackbar }));
        getRecordAndLookups({});
    }, [id, idWithOptions, model]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: { ...model.initialValues, ...data },
        validationSchema: validationSchema,
        validateOnBlur: false,
        onSubmit: async (values, { resetForm }) => {
            setIsLoading(true);
            saveRecord({
                id,
                api: gridApi,
                values,
                setIsLoading,
                setError: snackbar.showError
            })
                .then(success => {
                    if (success) {
                        snackbar.showMessage('Record Updated Successfully.');
                        navigate(navigateBack);
                    }
                })
                .catch((err) => {
                    snackbar.showError('An error occured, please try after some time.second', err);
                })
                .finally(() => setIsLoading(false));
        }
    });

    const { dirty } = formik;

    const handleDiscardChanges = () => {
        formik.resetForm();
        setIsDiscardDialogOpen(false);
        navigate(navigateBack);
    };

    const warnUnsavedChanges = () => {
        if (dirty) {
            setIsDiscardDialogOpen(true);
        }
    }

    const errorOnLoad = function (title, error) {
        snackbar.showError(title, error);
        navigate(navigateBack);
    }

    const setActiveRecord = function ({ id, title, record, lookups }) {
        const isCopy = idWithOptions.indexOf("-") > -1;
        const isNew = !id || id === "0";
        const localTitle = isNew ? "Create" : (isCopy ? "Copy" : "Edit");
        const localValue = isNew ? "" : record[model.linkColumn];
        const breadcrumbs = [{ text: model?.breadCrumbs }, { text: localTitle }];

        if (isCopy) {
            record[model.linkColumn] += " (Copy)";
        }
        setData(record);
        setLookups(lookups);

        if (localValue !== "") {
            breadcrumbs.push({ text: localValue });
        }
        dispatchData({
            type: actionsStateProvider.PAGE_TITLE_DETAILS,
            payload: {
                showBreadcrumbs: true, breadcrumbs: breadcrumbs
            },
        });
    }
    const handleFormCancel = function (event) {
        if (dirty) {
            warnUnsavedChanges();
            event.preventDefault();
        } else {
            navigate(navigateBack);
        }
    }
    const handleDelete = async function () {
        setIsDeleting(true);
        try {
            const response = await deleteRecord({
                id,
                api: api || model?.api,
                setIsLoading,
                setError: snackbar.showError,
                setErrorMessage
            })
            if (response === true) {
                snackbar.showMessage('Record Deleted Successfully.');
                navigate(navigateBack);
            }
        } catch (error) {
            snackbar?.showError('An error occured, please try after some time.');
        } finally {
            setIsDeleting(false);
        }
    }
    const clearError = () => {
        setErrorMessage(null);
        setIsDeleting(false);
    };
    if (isLoading) {
        return <Box sx={{ display: 'flex', pt: '20%', justifyContent: 'center' }}>
            <CircularProgress />
        </Box>
    }
    const handleChange = function (e) {
        const { name, value } = e.target;
        const gridData = { ...data };
        gridData[name] = value;
        setData(gridData);
    }

    const handleSubmit = function (e) {
        if (e) e.preventDefault();
        const { errors } = formik;
        formik.handleSubmit();
        const fieldName = Object.keys(errors)[0];
        const errorMessage = errors[fieldName];
        if (errorMessage) {
            snackbar.showError(errorMessage, null, "error");
        }
        const fieldConfig = model.columns.find(column => column.field === fieldName);
        if (fieldConfig && fieldConfig.tab) {
            const tabKeys = Object.keys(model.tabs);
            setActiveStep(tabKeys.indexOf(fieldConfig.tab));
        }
    }
    return (
        <ActiveStepContext.Provider value={{ activeStep, setActiveStep }}>
            <Paper sx={{ padding: 2 }}>
                <form>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mb={1}>
                        {permissions.edit && <Button variant="contained" type="submit" color="success" onClick={handleSubmit}>{`${"Save"}`}</Button>}
                        <Button variant="contained" type="cancel" color="error" onClick={(e) => handleFormCancel(e)}>{`${"Cancel"}`}</Button>
                        {permissions.delete && <Button variant="contained" color="error" onClick={() => setIsDeleting(true)}>{`${"Delete"}`}</Button>}
                    </Stack>
                    <Layout model={model} formik={formik} data={data} fieldConfigs={fieldConfigs} combos={combos} onChange={handleChange} lookups={lookups} id={id} handleSubmit={handleSubmit} mode={mode} getRecordAndLookups={getRecordAndLookups}/>
                </form>
                {errorMessage && (<DialogComponent open={!!errorMessage} onConfirm={clearError} onCancel={clearError} title="Info" hideCancelButton={true} > {errorMessage}</DialogComponent>)}
                <DialogComponent
                    open={isDiscardDialogOpen}
                    onConfirm={handleDiscardChanges}
                    onCancel={() => setIsDiscardDialogOpen(false)}
                    title="Changes not saved"
                    okText="Discard"
                    cancelText="Continue"
                >
                    {"Would you like to continue to edit or discard changes?"}
                </DialogComponent>
                <DialogComponent open={isDeleting} onConfirm={handleDelete} onCancel={() => { setIsDeleting(false); setDeleteError(null); }} title={deleteError ? "Error Deleting Record" : "Confirm Delete"}>{`Are you sure you want to delete ${data?.GroupName || data?.SurveyName}?`}</DialogComponent>
            </Paper>
        </ActiveStepContext.Provider >
    )
}
export default Form;