import React, { useContext, useEffect } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { putFee } from "@/api/feeAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertSuccess } from "@/context/actions/globalAlertActions";
import Transition from "@/components/animations/Transition";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { thrownMessage } from "@/lib/formErrors";
import useUnsavedChangesWarning from "@/components/hooks/useUnsavedChangesWarning";
import FeeItemsEditor from "./FeeItemsEditor";
import { normalizeItems } from "./feeItems";

const schema = yup.object({ items: yup.array().min(1, "Add at least one fee") });

const EditFee = () => {
  const queryClient = useQueryClient();
  const {
    schoolSessionState: { feeEditData },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { items: [] } });
  useUnsavedChangesWarning(Boolean(feeEditData?.open) && isDirty);

  // Load the class's current fees each time the dialog is opened for one.
  useEffect(() => {
    reset({ items: normalizeItems(feeEditData?.data?.amount) });
  }, [feeEditData, reset]);

  const { mutateAsync, isPending } = useMutation({ mutationFn: putFee });

  const handleClose = () => {
    schoolSessionDispatch({ type: "setFeeEditData", payload: { open: false, data: {} } });
  };

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutateAsync(
      { _id: feeEditData?.data?._id, amount: values.items },
      {
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["fees"] }),
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          handleClose();
        },
        // For example: "cannot be lowered, a student has already paid more than that".
        onError: (error) => setError("root.server", { type: "server", message: thrownMessage(error) }),
      }
    );
  };

  return (
    <Dialog open={Boolean(feeEditData?.open)} onClose={handleClose} fullWidth maxWidth="sm" TransitionComponent={Transition}>
      <CustomDialogTitle title="Edit Fees" onClose={handleClose} />
      {errors.root?.server && (
        <Alert severity="error" sx={{ mx: 2, my: 1 }} role="alert">
          {errors.root.server.message}
        </Alert>
      )}
      <Alert severity="info" sx={{ mx: 2, my: 1 }}>
        Changing these fees changes what every student in this class owes, including students who have already paid.
      </Alert>
      <DialogContent>
        <Stack spacing={2} paddingY={2}>
          <TextField label="Level" size="small" value={feeEditData?.data?.level ?? ""} slotProps={{ input: { readOnly: true } }} />
          <Controller
            name="items"
            control={control}
            render={({ field }) => <FeeItemsEditor items={field.value} onChange={(list) => field.onChange(list)} error={errors.items?.message} />}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditFee;
