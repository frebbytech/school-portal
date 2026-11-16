import React, { useContext } from "react";
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, Stack, TextField } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postFee } from "@/api/feeAPI";
import useLevel from "@/components/hooks/useLevel";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { UserContext } from "@/context/providers/UserProvider";
import { thrownMessage } from "@/lib/formErrors";
import useUnsavedChangesWarning from "@/components/hooks/useUnsavedChangesWarning";
import FeeItemsEditor from "./FeeItemsEditor";

const schema = yup.object({
  level: yup
    .object({ _id: yup.string().required(), type: yup.string() })
    .nullable()
    .required("Choose a level"),
  items: yup.array().min(1, "Add at least one fee"),
});

// Sets the fees for one class for the current term. The server refuses a second set of fees
// for the same class and says so; that message is shown at the top of the dialog.
const AddFee = ({ open, setOpen }) => {
  const { session } = useContext(UserContext);
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { levelsOption } = useLevel();

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: yupResolver(schema), defaultValues: { level: null, items: [] } });
  useUnsavedChangesWarning(open && isDirty);

  const { mutate, isPending } = useMutation({ mutationFn: postFee });

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(
      {
        session: session?.sessionId,
        term: session?.termId,
        level: values.level._id,
        levelType: values.level.type,
        // The server keeps each item as { fee, amount }.
        amount: values.items,
      },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["fees"] });
        },
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          handleClose();
        },
        onError: (error) => setError("root.server", { type: "server", message: thrownMessage(error) }),
      }
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <CustomDialogTitle title="New Fees" onClose={handleClose} />
      {errors.root?.server && (
        <Alert severity="error" sx={{ mx: 2, my: 1 }} role="alert">
          {errors.root.server.message}
        </Alert>
      )}
      <DialogContent>
        <Stack spacing={2} paddingY={2}>
          <Controller
            name="level"
            control={control}
            render={({ field }) => (
              <Autocomplete
                fullWidth
                options={levelsOption || []}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                getOptionLabel={(option) => option?.type || ""}
                value={field.value}
                onChange={(e, value) => field.onChange(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Level" size="small" error={Boolean(errors.level)} helperText={errors.level?.message} />
                )}
              />
            )}
          />
          <Controller
            name="items"
            control={control}
            render={({ field }) => <FeeItemsEditor items={field.value} onChange={field.onChange} error={errors.items?.message} />}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? "Saving…" : "Save Fee"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFee;
