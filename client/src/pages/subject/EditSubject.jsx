import React, { useContext } from "react";

import {
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";
import CustomDialogTitle from "../../components/dialog/CustomDialogTitle";
import { Formik } from "formik";
import { SchoolSessionContext } from "../../context/providers/SchoolSessionProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { putSubject } from "../../api/subjectAPI";
import {
  alertError,
  alertSuccess,
} from "../../context/actions/globalAlertActions";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

function EditSubject() {
  const {
    schoolSessionState: {
      editSubject: { open, data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: putSubject,
  });
  const onSubmit = (values) => {
    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["subjects"] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleCloseDialog();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };
  const handleCloseDialog = () => {
    schoolSessionDispatch({
      type: "editSubject",
      payload: { open: false, data: {} },
    });
  };

  return (
    <Dialog open={open} fullWidth maxWidth="xs">
      <CustomDialogTitle title="Edit Subject" onClose={handleCloseDialog} />
      <Formik
        initialValues={data}
        onSubmit={onSubmit}
        // validationSchema={sessionValidationSchema}
        enableReinitialize={true}
      >
        {({ values, errors, touched, handleChange, handleSubmit }) => {
          return (
            <>
              <DialogContent>
                <Stack spacing={2} paddingY={2}>
                  <FormControlLabel
                    sx={{ alignSelf: "flex-end" }}
                    label="Core Subject"
                    control={
                      <Checkbox
                        value={values.isCore || false}
                        defaultValue={false}
                        checked={values?.isCore}
                        onChange={handleChange("isCore")}
                        defaultChecked={false}
                      />
                    }
                  />
                  <TextField
                    label="Code"
                    size="small"
                    value={values?.code || ""}
                    onChange={handleChange("code")}
                    error={Boolean(touched.code && errors.code)}
                    helperText={touched.code && errors.code}
                  />
                  <TextField
                    label="Name"
                    size="small"
                    value={values?.name || ""}
                    onChange={handleChange("name")}
                    error={Boolean(touched.name && errors.name)}
                    helperText={touched.name && errors.name}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ padding: 2 }}>
                <Button
                  loading={isPending}
                  variant="contained"
                  onClick={handleSubmit}
                >
                  {isPending ? "Saving" : "Save Changes"}
                </Button>
              </DialogActions>
            </>
          );
        }}
      </Formik>
      {isPending && <LoadingSpinner value="Saving Changes. Please Wait.." />}
    </Dialog>
  );
}

export default EditSubject;
