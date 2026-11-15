import React, { useContext, useEffect } from "react";
import { useForm } from "react-hook-form";
import _ from "lodash";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  DialogActions,
  Box,
} from "@mui/material";
import { motion } from "framer-motion";
import Student from "./form/Student";
import Level from "./form/Level";
import Exams from "./form/Exams";
import Report from "./form/Report";
import Core from "./form/Core";
import { sessionDefaultValues } from "@/config/initialValues";
import Confirm from "./form/Confirm";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "@/lib/dates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postTerm } from "@/api/termAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { useNavigate } from "react-router-dom";

import { getValidTerm } from "@/api/termAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Swal from "sweetalert2";
import { newSessionSchemas } from "@/config/validationSchema";
import useLocalStorage from "@/hooks/useLocalStorage";
import FormStep from "@/components/FormStep";

// Step Titles
const steps = [
  "Basic Session Details",
  "Levels Structure",
  "Enrollment & Student Management",
  "Exam & Assessment",
  "Report Customization",
  "Confirm",
  // "Extra-Curricular Activities",
  // "System & Settings",
];

function SessionForm() {
  const sessionData =
    JSON.parse(localStorage.getItem("@session-data")) || sessionDefaultValues;
  const [activeStep, setActiveStep] = useLocalStorage("@session-state", 0);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const postMutate = useMutation({
    mutationFn: postTerm,
  });

  const onSubmit = (values) => {
    postMutate.mutateAsync(values, {
      onSettled: () => {
        queryClient.invalidateQueries(["terms"]);
      },
      onSuccess: () => {
        navigate("/session");
        schoolSessionDispatch(alertSuccess("New Session created"));
        setActiveStep(0);
        localStorage.setItem(
          "@session-data",
          JSON.stringify(sessionDefaultValues)
        );
      },
      onError: (error) => {
        if (error?.isDuplicateError) {
          Swal.fire({
            title: "Duplicate Student ID",
            icon: "error",
            html: `<div> ${error?.message} ${JSON.stringify(
              error?.data
            )} </div>`,
            showCancelButton: false,
            backdrop: false,
          });
        } else {
          schoolSessionDispatch(alertError(error));
        }
      },
    });
  };

  const {
    register,
    control,
    trigger,
    setValue,
    watch,
    formState: { errors },
    handleSubmit,
    setError,
    clearErrors,
  } = useForm({
    resolver:
      activeStep === 5 ? null : yupResolver(newSessionSchemas[activeStep]),
    defaultValues: sessionData,
    mode: "onBlur",
    shouldUnregister: false,
  });

  const watchedValues = watch(); // Watch all form fields

  // Save to localStorage whenever form values change
  useEffect(() => {
    if (postMutate.isSuccess) {
      localStorage.setItem(
        "@session-data",
        JSON.stringify(sessionDefaultValues)
      );
    } else {
      localStorage.setItem("@session-data", JSON.stringify(watchedValues));
    }
  }, [watchedValues]);

  const { isPending, mutateAsync } = useMutation({
    mutationFn: () =>
      getValidTerm({
        academicYear: `${dayjs(watchedValues?.core?.from).year()}/${dayjs(
          watchedValues?.core?.to
        ).year()}`,
        term: watchedValues?.core?.term,
      }),
  });

  const handleNext = async () => {
    if (activeStep === 0) {
      try {
        await mutateAsync({});
        clearErrors("core.term");
        const isValid = await trigger();
        if (isValid) setActiveStep((prev) => prev + 1);
      } catch (error) {
        setError("core.term", {
          message: error,
          type: "custom",
        });
      }
      return;
    }

    if (activeStep === 2) {
      const duplicates = JSON.parse(
        sessionStorage.getItem("@duplicates") || "[]"
      );
      if (!_.isEmpty(duplicates)) {
        setError("students", {
          message:
            "Some index numbers in the selected students list already exist. Please remove all duplicates before submitting the data.",
          type: "custom",
        });
        return;
      }
    }

    // Handle other steps
    const isValid = await trigger();
    if (isValid) setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };
  const handleCancel = () => {
    Swal.fire({
      title: "Canceling",
      text: "All unsaved data will be lost.Do you wish to proceed?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        localStorage.removeItem("@session-data");
        localStorage.removeItem("@session-state");
        navigate("/session");
      }
    });
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <FormStep>
            <Core
              errors={errors}
              control={control}
              watch={watch}
              register={register}
            />
          </FormStep>
        );
      case 1:
        return (
          <>
            {/* Semester Details Step */}
            <FormStep>
              <Level
                watch={watch}
                setValue={setValue}
                errors={errors}
                handleNext={handleNext}
              />
            </FormStep>
          </>
        );

      case 2:
        return (
          <>
            <FormStep>
              <Student
                watch={watch}
                control={control}
                setValue={setValue}
                errors={errors}
                setError={setError}
                handleNext={handleNext}
              />
            </FormStep>
          </>
        );
      case 3:
        return (
          <>
            {/* Financial Info Step */}
            <FormStep>
              <Exams
                watch={watch}
                control={control}
                setValue={setValue}
                errors={errors}
              />
            </FormStep>
          </>
        );
      case 4:
        return (
          <>
            {/* Financial Info Step */}
            <FormStep>
              <Report
                setValue={setValue}
                errors={errors}
                watch={watch}
                control={control}
              />
            </FormStep>
          </>
        );
      case 5:
        return (
          <FormStep>
            <Confirm isPending={postMutate.isPending} />
          </FormStep>
        );

      default:
        return <p>More form fields for other steps...</p>;
    }
  };

  return (
    <>
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{ mb: 4, display: { xs: "none", md: "flex" } }}
      >
        {steps.map((label, index) => (
          <Step key={index}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Actions */}
      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 2,
          px: 4,
        }}
      >
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Previous
        </Button>
        {activeStep === steps.length - 1 ? null : (
          <Button
            variant="contained"
            color="primary"
            // disabled={activeStep === 2 && !_.isEmpty(duplicates)}
            onClick={handleNext}
            loading={isPending}
          >
            Next
          </Button>
        )}
      </DialogActions>
      <Box>
        <motion.div
          key={activeStep}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStepContent(activeStep)}
          </form>
        </motion.div>
        <Button variant="outlined" color="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </Box>
      {postMutate.isPending && <LoadingSpinner value="Creating session.." />}
    </>
  );
}

export default React.memo(SessionForm);
