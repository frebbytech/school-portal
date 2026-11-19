import React, { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  DialogActions,
  Container,
} from "@mui/material";
import { motion } from "framer-motion";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTerm, putTerm } from "@/api/termAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Exams from "./Exams";
import Report from "./Report";
import Core from "./Core";
import CustomTitle from "@/components/custom/CustomTitle";
import Headmaster from "./Headmaster";
import FormStep from "@/components/FormStep";
import { editSessionSchemas } from "@/config/validationSchema";

// Step Titles
const steps = [
  "Basic Session Details",
  "Exam & Assessment",
  "Headmaster Information",
  "Report Customization",
];

export default function EditSessionForm() {
  const { id } = useParams();
  const [activeStep, setActiveStep] = useState(0);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const session = useQuery({
    queryKey: ["terms/:id", id],
    queryFn: () => getTerm(id),
    initialData: queryClient
      .getQueryData(["terms"])
      ?.find((term) => term?.termId === id),
    enabled: !!id,
  });

  const postMutate = useMutation({
    mutationFn: putTerm,
  });

  const onSubmit = (values) => {
    postMutate.mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["terms"] });
        queryClient.invalidateQueries({ queryKey: ["terms/:id", id] });
      },
      onSuccess: () => {
        schoolSessionDispatch(alertSuccess("Changes Saved"));
        navigate(-1);
        setActiveStep(0); // Reset to the first step after saving
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const {
    control,
    trigger,
    setValue,
    watch,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm({
    resolver: yupResolver(editSessionSchemas[activeStep]),
    mode: "onBlur",
  });


  // Save to localStorage whenever form values change
  useEffect(() => {
    reset(session?.data);
  }, [session?.data]);

  const handleNext = async () => {
    // Handle other steps
    const isValid = await trigger();
    if (isValid) setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
    setActiveStep(0); // Reset to the first step
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <FormStep active={activeStep === 0}>
            <Core errors={errors} control={control} watch={watch} />
          </FormStep>
        );

      case 1:
        return (
          <>
            {/* Financial Info Step */}
            <FormStep active={activeStep === 1}>
              <Exams
                watch={watch}
                control={control}
                setValue={setValue}
                errors={errors}
              />
            </FormStep>
          </>
        );
      case 2:
        return (
          <>
            {/* Financial Info Step */}
            <FormStep active={activeStep === 2}>
              <Headmaster setValue={setValue} watch={watch} control={control} />
            </FormStep>
          </>
        );
      case 3:
        return (
          <>
            {/* Financial Info Step */}
            <FormStep active={activeStep === 3}>
              <Report
                setValue={setValue}
                errors={errors}
                watch={watch}
                control={control}
              />
            </FormStep>
          </>
        );
      // case 5:
      //   return (
      //     <FormStep active={activeStep === 5}>
      //       <Confirm isPending={postMutate.isPending} />
      //     </FormStep>
      //   );

      default:
        return <p>More form fields for other steps...</p>;
    }
  };

  return (
    <Container>
      <CustomTitle
        title={`${session?.data?.core?.academicYear},${session?.data?.core?.term}`}
        subtitle="Make changes to academic sessions to ensure smooth academic operations"
        // img={session_icon}
        color="primary.main"
        showBack={true}
        to={`/session/${id}`}
      />
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
          >
            Next
          </Button>
        )}
      </DialogActions>
      <>
        <form onSubmit={handleSubmit(onSubmit)}>
          <motion.div
            key={activeStep}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent(activeStep)}
          </motion.div>
          <DialogActions>
            <Button variant="outlined" color="secondary" onClick={handleCancel}>
              Cancel
            </Button>

            <Button
              variant="contained"
              color="primary"
              loading={postMutate.isPending}
              // onClick={}
              type="submit"
            >
              {postMutate.isPending ? "Please Wait.." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </>
      {postMutate.isPending && <LoadingSpinner value="Saving Changes.." />}
    </Container>
  );
}
