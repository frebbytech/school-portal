import React, { useContext, useEffect } from "react";
import { Alert, Button, Dialog, DialogContent, Stack, TextField, Typography } from "@mui/material";
import { SaveAs } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import MedicalAllergy from "@/components/items/MedicalAllergy";
import { medicalValidationSchema } from "@/config/validationSchema";
import { putStudent } from "@/api/studentAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { thrownMessage } from "@/lib/formErrors";

// The six yes/no questions, in the order they are shown
export const CONDITIONS = [
  ["heartDisease", "1. Heart Disease"],
  ["visualImpairment", "2. Visual Impairment"],
  ["asthma", "3. Asthma"],
  ["hearingImpairment", "4. Hearing Impairment"],
  ["siezures", "5. Siezures"],
  ["physicalDisability", "6. Physical Disability"],
];

// What the form starts with: every field present, so nothing is "uncontrolled"
export const medicalDefaults = (medical = {}) => {
  const { id: _id, ...rest } = medical || {};
  return {
    ...Object.fromEntries(CONDITIONS.map(([key]) => [key, rest[key] ?? "No"])),
    emergencyContact: {
      fullname: rest.emergencyContact?.fullname ?? "",
      phonenumber: rest.emergencyContact?.phonenumber ?? "",
      address: rest.emergencyContact?.address ?? "",
    },
  };
};

const row = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" };

const MedicalInformationEdit = ({ medical }) => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get("mi") === "true";
  const studentId = medical?.id;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(medicalValidationSchema),
    defaultValues: medicalDefaults(medical),
  });

  // Start from what is saved each time the dialog opens (not from an abandoned edit)
  // (keyed on the content: the parent passes a new object on every render)
  const saved = JSON.stringify(medicalDefaults(medical));
  useEffect(() => {
    if (open) reset(JSON.parse(saved));
  }, [open, saved, reset]);

  const handleClose = () =>
    setSearchParams((params) => {
      params.delete("mi");
      return params;
    });

  const { mutate, isPending } = useMutation({ mutationFn: putStudent });

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(
      { _id: studentId, type: "medical", medical: values },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["student-profile"] });
          queryClient.invalidateQueries({ queryKey: ["student/id"] });
          schoolSessionDispatch(alertSuccess(data));
          handleClose();
        },
        onError: (error) => {
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const contact = (name, label, extra = {}) => (
    <Controller
      name={`emergencyContact.${name}`}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          fullWidth
          size="small"
          error={!!errors.emergencyContact?.[name]}
          helperText={errors.emergencyContact?.[name]?.message}
          {...extra}
        />
      )}
    />
  );

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={handleClose}>
      <CustomDialogTitle title="Medical History" onClose={handleClose} />
      <DialogContent sx={{ p: 1 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack padding={2} spacing={1}>
            {errors.root?.server && (
              <Alert severity="error" role="alert">
                {errors.root.server.message}
              </Alert>
            )}
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isPending || !studentId}
                endIcon={<SaveAs />}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </Stack>
            <Stack width={{ xs: "100%", md: "80%" }} py={5}>
              {[0, 2, 4].map((i) => (
                <div key={i} style={row}>
                  {CONDITIONS.slice(i, i + 2).map(([key, title]) => (
                    <Controller
                      key={key}
                      name={key}
                      control={control}
                      render={({ field }) => (
                        <MedicalAllergy
                          title={title}
                          name={key}
                          value={field.value}
                          setValue={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                  ))}
                </div>
              ))}
            </Stack>
            <Stack py={2} spacing={1}>
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: "bold" }}>
                Emergency Contact
              </Typography>
              <CustomFormControl>
                {contact("fullname", "Fullname")}
                {contact("phonenumber", "Telephone No.", { type: "tel", inputMode: "tel" })}
              </CustomFormControl>
              <CustomFormControl>{contact("address", "Address")}</CustomFormControl>
            </Stack>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalInformationEdit;
