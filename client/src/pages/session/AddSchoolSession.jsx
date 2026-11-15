import React, { useContext } from "react";
import {
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  MenuItem,
  FormLabel,
  Typography,
} from "@mui/material";
import dayjs from "@/lib/dates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "@mui/material/Button";
import { postTerm } from "@/api/termAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SCHOOL_TERMS } from "@/mockup/columns/sessionColumns";
import Transition from "@/components/animations/Transition";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import DateInputPicker from "@/components/inputs/DateInputPicker";
import CustomRadioInput from "@/components/items/CustomRadioInput";
import { useForm } from "react-hook-form";
import { sessionValidationSchema } from "@/config/validationSchema";
import { sessionDefaultValues } from "@/config/initialValues";
import { yupResolver } from "@hookform/resolvers/yup";
import SelectInput from "@/components/inputs/SelectInput";
import Input from "@/components/inputs/Input";

const AddSchoolSession = ({ open, setOpen }) => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  //ADD New Session
  const { mutateAsync, isPending } = useMutation({
    mutationFn: postTerm,
  });

  const {
    control,
    watch,
    handleSubmit,
  } = useForm({
    resolver: yupResolver(sessionValidationSchema),
    defaultValues: sessionDefaultValues.core,
    mode: "onBlur",
    shouldUnregister: false,
  });

  const sT = watch("from");
  const eT = watch("to");

  const onSubmit = (values) => {
    // console.log(values);
    // return;

    mutateAsync(
      {
        core: {
          ...values,
        },
        levels: [],
        students: [],
        exams: {
          grade: "",
        },
      },
      {
        onSettled: () => {
          queryClient.invalidateQueries(["terms"]);
        },
        onSuccess: () => {
          schoolSessionDispatch(alertSuccess('New Session Created!'));
          handleCloseAddSession();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const handleCloseAddSession = () => setOpen(false);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Transition}
    >
      <CustomDialogTitle
        title="Add Quick Session"
        subtitle="You can complete the other details in the session preview"
        onClose={handleCloseAddSession}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Input
              name="name"
              control={control}
              size="small"
              label="Session Name"
              fullWidth
            />

            <FormLabel component="legend">Academic Session</FormLabel>

            <DateInputPicker
              label="Start of Academic Term/Semester"
              name="from"
              control={control}
              textFieldProps={{
                required: true,
              }}
            />
            <DateInputPicker
              label="End of Academic Term/Semester"
              name="to"
              control={control}
              textFieldProps={{
                required: true,
              }}
            />

            <FormLabel
              sx={{
                textAlign: "center",
                p: 1,
                borderRadius: 1,
                border: "1px solid lightgray",
              }}
            >
              {`${dayjs(sT || new Date()).year()}/${dayjs(
                eT || new Date()
              ).year()}`}
            </FormLabel>

            <Typography variant="h6" gutterBottom>
              Semester
            </Typography>
            <SelectInput
              label="Term/Semester"
              size="small"
              name="term"
              control={control}
              fullWidth
              margin="normal"
            >
              {SCHOOL_TERMS.map((term) => (
                <MenuItem key={term} value={term}>
                  {term}
                </MenuItem>
              ))}
            </SelectInput>
            <CustomRadioInput
              name="isPromotionTerm"
              title="Promotion Term / Semester?"
              control={control}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button
            loading={isPending}
            variant="contained"
            type="submit"
            // onClick={handleSubmit}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddSchoolSession;
