import React, { useContext, useEffect } from "react";
import dayjs from "@/lib/dates";
import {
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { getTerm, putTerm } from "@/api/termAPI";
import { alertSuccess, alertError } from "@/context/actions/globalAlertActions";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import Input from "@/components/inputs/Input";
import DateInputPicker from "@/components/inputs/DateInputPicker";

const EditSession = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ["terms/:id", searchParams.get("_id")],
    queryFn: () => getTerm(searchParams.get("_id")),
    initialData: queryClient
      .getQueryData(["terms"])
      ?.find((term) => term?.termId === searchParams.get("_id")),
    enabled:
      searchParams.get("_id") !== null &&
      !!searchParams.get("edit_session") !== null,
  });

  const { handleSubmit, reset, control } = useForm({
    // resolver: yupResolver(schema),
    defaultValues: {
      id: "",
      from: null,
      to: null,
      vacationDate: null,
      reOpeningDate: null,
      academicYear: "",
      term: "",
      session: "",
    },
  });

  useEffect(() => {
    reset({
      id: searchParams.get("_id"),
      from: dayjs(new Date(session?.data?.from)),
      to: dayjs(new Date(session?.data?.to)),
      vacationDate: dayjs(new Date(session?.data?.vacationDate)),
      reOpeningDate: dayjs(new Date(session?.data?.reOpeningDate)),
      academicYear: session?.data?.academicYear,
      term: session?.data?.term,
      session: session?.data?.sessionId,
    });
  }, [session.data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: putTerm,
  });

  const onSubmit = (values) => {
    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["terms"] });
        queryClient.invalidateQueries({ queryKey: ["terms/:id", searchParams.get("_id")] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  //Edit session
  const handleClose = () => {
    setSearchParams((params) => {
      params.delete("_id");
      params.delete("edit_session");

      return params;
    });
  };

  return (
    <Dialog
      open={searchParams.get("edit_session") !== null}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <CustomDialogTitle title="Edit Session" onClose={handleClose} />
      {session?.isPending ? (
        <p>Please Wait..</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Stack spacing={2} paddingY={2}>
              <Input
                label="Academic Year"
                name="academicYear"
                control={control}
                InputProps={{ readOnly: true }}
                fullWidth
                margin="normal"
                size="small"
                
              />
              <DateInputPicker
                label="Start of Academic Term"
                name="from"
                control={control}
              />
              <DateInputPicker
                label="End of Academic Term"
                name="to"
                control={control}
              />

              <Input
                label="Term/Semester"
                size="small"
                name="term"
                control={control}
                InputProps={{ readOnly: true }}
                fullWidth
                margin="normal"
              />

              <Typography fontSize={13}>Vacation</Typography>
              <DateInputPicker
                label="Vacation Date"
                name="vacationDate"
                control={control}
              />

              <DateInputPicker
                label="Next Term Begins"
                name="reOpeningDate"
                control={control}
              />

              <Divider />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ padding: 2 }}>
            <Button
              type="submit"
              loading={isPending}
              variant="contained"
              onClick={handleSubmit}
            >
              {isPending ? "Please Wait.." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
};

export default EditSession;
