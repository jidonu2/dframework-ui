import * as React from 'react';
import Box from '@mui/material/Box';
import BooleanField from './fields/boolean';
import StringField from './fields/string';
import NumberField from './fields/number';
import PasswordField from './fields/password';
import DateField from './fields/date';
import DateTimeField from './fields/dateTime';
import TimeField from './fields/time';
import SelectField from './fields/select';
import GridTransfer from './fields/grid-transfer';
import Grid from '@mui/material/Grid';
import RadioField from './fields/radio';
import AutocompleteField from './fields/autocomplete';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import DaySelection from './fields/dayRadio';
import { makeStyles } from '@material-ui/core';
import { Typography } from '@mui/material';
import { ActiveStepContext } from './Form';
const fieldMappers = {
    "boolean": BooleanField,
    "select": SelectField,
    "string": StringField,
    "number": NumberField,
    "password": PasswordField,
    "date": DateField,
    "dateTime": DateTimeField,
    "time": TimeField,
    "grid-transfer": GridTransfer,
    "oneToMany": GridTransfer,
    "radio": RadioField,
    "autocomplete": AutocompleteField,
    "dayRadio": DaySelection
};

const useStyles = makeStyles({
    root: {
        marginTop: "1rem",
        marginBottom: "1rem"
    },
    childStyles: {
        paddingTop: "2.5px",
        paddingBottom: "2.5px"
    },
    stepLabel: {
        fontSize: "20px !important"
    },
    stepperMain: {
        marginBottom: "20px"
    },
    renderSteps: {
        marginTop: "20px"
    }
})

const RenderSteps = ({ tabColumns, model, formik, data, onChange, combos, lookups, fieldConfigs, mode, handleSubmit }) => {
    const [skipped, setSkipped] = React.useState(new Set());

    const { activeStep, setActiveStep } = React.useContext(ActiveStepContext);
    const classes = useStyles();

    let skipSteps = {};
    for (let index = 0, len = model.columns.length; index < len; index++) {
        const { field, skip } = model.columns[index];
        if (skip) {
            skipSteps[skip.step] = formik.values[field];
        }
    }

    const isStepSkipped = (step) => {
        return skipped.has(step) || skipSteps[step];
    };

    const isLastStep = () => {
        for (let nextStep = activeStep + 1; nextStep < tabColumns.length; nextStep++) {
            if (!isStepSkipped(nextStep)) {
                return false;
            }
        }
        return true;
    };
    const handleNext = () => {
        let nextStep = activeStep + 1;
        while (skipSteps[nextStep]) {
            nextStep++;
        }

        setSkipped((prevSkipped) => new Set(prevSkipped).add(activeStep));

        if (nextStep >= tabColumns.length || isLastStep()) {
            handleSubmit();
        } else {
            setActiveStep(nextStep);
        }
    };

    const handleBack = () => {
        let prevStep = activeStep - 1;

        while (skipSteps[prevStep] && prevStep > 0) {
            prevStep--;
        }
        setActiveStep(prevStep);
    };

    if (!tabColumns?.length) {
        return null;
    }

    const currentStep = tabColumns[activeStep];
    return (
        <>
            <Stepper activeStep={activeStep} className={classes.stepperMain}>
                {tabColumns.map(({ title, key }, index) => {
                    return (
                        <Step key={key} completed={isStepSkipped(index)}>
                            <StepLabel>
                                <Typography className={classes.stepLabel}>{title}</Typography>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            <React.Fragment>
                <RenderColumns formElements={currentStep.items} model={model} formik={formik} data={data} onChange={onChange} combos={combos} lookups={lookups} fieldConfigs={fieldConfigs} mode={mode} />
                <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mr: 2 }}>
                    {activeStep !== 0 ? <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} variant="contained" sx={{ mr: 2 }}> {'Back'}</Button> : null}
                    <Button onClick={handleNext} variant="contained">{isLastStep() ? "Finish" : "Next"}</Button>
                </Box>
            </React.Fragment>
        </>
    )
}

const RenderColumns = ({ formElements, model, formik, data, onChange, combos, lookups, fieldConfigs, mode, getRecordAndLookups = () => {} }) => {
    const classes = useStyles();
    if (!formElements?.length) {
        return null;
    }
    return (
        <>
            {
                formElements.map(({ Component, column, field, fieldLabel, otherProps }, key) => {
                    let isGridComponent = typeof column.relation === 'function';
                    return (
                        <Grid container spacing={2} key={key} className={classes.root} alignItems={isGridComponent ? "flex-start" : "center"}>
                            {column?.showLabel !== false ?
                                <Grid item xs={1.5} className={classes.childStyles}>
                                    <Typography sx={{ fontSize: '16px', fontWeight: isGridComponent ? 'bold' : 'normal' }}>{column.label || field}:</Typography>
                                </Grid>
                                : null
                            }
                            <Grid item xs={isGridComponent ? 12 : 10.5} className={classes.childStyles}>
                                <Component model={model} fieldConfigs={fieldConfigs[field]} mode={mode} column={column} field={field} fieldLabel={fieldLabel} formik={formik} data={data} onChange={onChange} combos={combos} lookups={lookups} getRecordAndLookups={getRecordAndLookups} {...otherProps} />
                            </Grid>
                        </Grid >
                    )
                })
            }
        </>
    )
}

const getFormConfig = function ({ columns, tabs = {}, getRecordAndLookups}) {
    const formElements = [], tabColumns = {};
    for (const tab in tabs) {
        tabColumns[tab] = [];
    }
    for (const column of columns) {
        let fieldType = column.type;
        if (column.fieldLabel === null) { /* If the field should not be shown in form mode, specify fieldLabel as null */
            continue;
        }
        const { field, fieldLabel = column.header, tab } = column;
        const otherProps = {};
        if (column.options) {
            otherProps.options = column.options;
        }
        const Component = fieldMappers[fieldType];
        if (!Component) {
            continue;
        }
        const target = tab && tabs[tab] ? tabColumns[tab] : formElements;
        target.push({ Component, field, fieldLabel, column, otherProps });
    }
    const tabsData = [];
    for (const tabColumn in tabColumns) {
        tabsData.push({ key: tabColumn, title: tabs[tabColumn], items: tabColumns[tabColumn] })
    }
    return { formElements, tabColumns: tabsData };
}

const FormLayout = ({ model, formik, data, combos, onChange, lookups, id: displayId, fieldConfigs, mode, handleSubmit, getRecordAndLookups = () => {}}) => {
    const classes = useStyles();
    const { formElements, tabColumns, showTabs } = React.useMemo(() => {
        let showTabs = model?.formConfig?.showTabbed;
        const { formElements, tabColumns } = getFormConfig({ columns: model.columns, tabs: showTabs ? model.tabs : {}, getRecordAndLookups });
        return { formElements, tabColumns, showTabs: showTabs && tabColumns.length > 0 };
    }, [model]);
    return (
        <div>
            <RenderColumns getRecordAndLookups={getRecordAndLookups} formElements={formElements} model={model} formik={formik} data={data} onChange={onChange} combos={combos} lookups={lookups} fieldConfigs={fieldConfigs} mode={mode} />
            <div className={classes.renderSteps}>
                <RenderSteps tabColumns={tabColumns} model={model} formik={formik} data={data} onChange={onChange} combos={combos} lookups={lookups} fieldConfigs={fieldConfigs} mode={mode} handleSubmit={handleSubmit} />
            </div>
        </div>
    )
};

export {
    BooleanField,
    StringField,
    NumberField,
    PasswordField,
    DateField,
    TimeField,
    SelectField,
    GridTransfer,
    fieldMappers
}

export default FormLayout;
