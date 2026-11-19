import React, { useState } from "react";
import { thrownMessage } from "@/lib/formErrors";
import { SchoolRounded, Search } from "@mui/icons-material";
import Button from "@mui/material/Button";
import {
  Box,
  Container,
  Stack,
  Typography,
  CircularProgress,
  Modal,
  Avatar,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { yupResolver } from "@hookform/resolvers/yup";
import { findSchoolValidationSchema } from "../config/validationSchema";
import Input from "@/components/inputs/Input";
import { getSchool } from "@/api/schoolAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

const FindSchool = () => {
  const { updateSchoolInformation } = useAuth();
  const [schoolDetails, setSchoolDetails] = useState({
    _id: "",
    badge: null,
    name: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: getSchool,
  });

  const { handleSubmit, watch, control, setError } = useForm({
    resolver: yupResolver(findSchoolValidationSchema),
    defaultValues: {
      code: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (values) => {
    mutate(values, {
      onSuccess: (data) => {
        if (data?._id) {
          setSchoolDetails(data);
          setIsModalOpen(true);
        } else {
          setError("code", {
            type: "custom",
            message: "School not found",
          });
        }
      },
      onError: (error) => {
        setError("code", {
          type: "custom",
          message: thrownMessage(error),
        });
      },
    });
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleProceedToLogin = () => {
    updateSchoolInformation(schoolDetails);
  };

  const codeWatch = watch("code");
  return (
    <>
      <Box
        className="custom-shape-divider-top-1737365089"
        sx={{
          heigh: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#fff",
          overflowY: "hidden",
          // p: 4,
          gap: 4,
        }}
      >
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            className="shape-fill"
            fill="#012e54"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5"
            className="shape-fill"
            fill="#ffc09f"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            opacity=".75"
            className="shape-fill"
            fill="#012e54"
          ></path>
        </svg>

        <Box flex={1} display="flex" p={4} width="100%">
          <Container
            maxWidth="xs"
            sx={{ bgcolor: "#fff", borderRadius: 2, m: "auto", p: 2 }}
          >
            <Stack
              spacing={2}
              pb={4}
              justifyContent="center"
              alignItems="center"
            >
              <SchoolRounded sx={{ width: 100, height: 100 }} />
              <Typography variant="h4" textAlign="center">
                FIND YOUR SCHOOL
              </Typography>
            </Stack>

            <Typography variant="h4" alignSelf="flex-start">
              Welcome
            </Typography>
            <Typography
              variant="caption"
              alignSelf="flex-start"
              fontStyle="italic"
            >
              Enter your school unique code to find your school
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2} py={2} width="100%">
                <Input
                  type="number"
                  inputMode="number"
                  label="School Code"
                  name="code"
                  control={control}
                  placeholder="School Code"
                  fullWidth
                  margin="normal"
                  // size='small'
                />

                <Button
                  type="submit"
                  loading={isPending}
                  fullWidth
                  size="large"
                  loadingPosition="start"
                  startIcon={<Search size={20} />}
                  loadingIndicator={<CircularProgress size={20} />}
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={codeWatch?.length < 6 || codeWatch?.length > 6}
                >
                  {isPending ? "PLEASE WAIT.." : "FIND NOW"}
                </Button>
              </Stack>
            </form>
          </Container>
        </Box>
        <Typography variant="body2" textAlign="center" pb={4}>
          Copyright &copy; {new Date().getFullYear()} | FrebbyTech Consults
          (+233543772591)
        </Typography>
      </Box>

      
      <Modal open={isModalOpen}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            minWidth: { xs: 300, md: 500 },
          }}
        >
          <Typography variant="h6">School Found</Typography>

          <Stack
            direction={{ xs: "column", md: "row" }}
            border="1px solid #ccc"
            // justifyContent="center"
            alignItems="center"
            p={1}
            spacing={2}
            my={4}
          >
            <Avatar
              alt="school badge"
              loading="lazy"
              srcSet={schoolDetails?.badge}
              sx={{
                width: 60,
                height: 60,
              }}
            >
              {schoolDetails?.name[0]}
            </Avatar>
            <Stack py={2}>
              <Typography variant="h5" textTransform="uppercase">
                {schoolDetails?.name}
              </Typography>
              <Typography variant="body2">{schoolDetails?.address}</Typography>
              <Typography fontStyle="italic" variant="h5" fontWeight={600}>
                {schoolDetails?.code} - {schoolDetails?.region}
              </Typography>
            </Stack>
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>

            <Button
              size="small"
              variant="contained"
              onClick={handleProceedToLogin}
            >
              Proceed
            </Button>
          </Box>
        </Box>
      </Modal>
      {/* <CustomParticle /> */}
      {isPending && (
        <LoadingSpinner value="Searching for your School.Please wait.." />
      )}
    </>
  );
};

export default FindSchool;
