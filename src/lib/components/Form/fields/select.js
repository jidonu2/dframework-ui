import React, { useEffect } from 'react';
import { FormHelperText } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const SelectField = ({ column, field, fieldLabel, formik, activeRecord, lookups, otherProps, classes, onChange, getRecordAndLookups }) => {
    const [loading, setIsloading] = React.useState(false);
    const [options, setOptions] = React.useState(typeof column.lookup === 'string' ? lookups[column.lookup] : column.lookup);
    const setActiveRecord = (lookups) => {
        const { State } = lookups;
        if (!State) return;
        setOptions(State);
    }
    const onOpen = () => {
        if (!column.parentComboType) return;
        const valueField = column.parentComboValueField || column.parentComboType + 'Id';
        if (!formik.values[valueField]) return;
        getRecordAndLookups({
            scopeId: formik.values[valueField],
            lookups: column.lookup,
            customSetIsLoading: setIsloading,
            customSetActiveRecord: setActiveRecord
        });
    };

    useEffect(() => {
        onOpen();
    }, [formik.values[column.parentComboValueField || column.parentComboType + 'Id']])

    let inputValue = formik.values[field];
    if (column.multiSelect) {
        if (!inputValue || inputValue.length === 0) {
            inputValue = [];
        }
        else {
            if (!Array.isArray(inputValue)) {
                inputValue = inputValue.split(',').map((e) => parseInt(e));
            }
        }
    }
    return (
        <FormControl
            fullWidth
            key={field}
            variant="standard">
            <InputLabel>{fieldLabel}</InputLabel>
            <Select
                IconComponent={KeyboardArrowDownIcon}
                {...otherProps}
                name={field}
                // disabled={loading}
                onOpen={onOpen}
                multiple={column.multiSelect === true}
                readOnly={column.readOnly === true}
                value={`${inputValue}`}
                // label={fieldLabel}
                onChange={formik.handleChange}
                // onChange={onChange}
                onBlur={formik.handleBlur}
                MenuProps={{
                    classes: {
                        // list: classes.select
                    }
                }}
            >
                {Array.isArray(options) && options.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </Select>
            <FormHelperText>{formik.touched[field] && formik.errors[field]}</FormHelperText>
        </FormControl>
    )
}

export default SelectField;