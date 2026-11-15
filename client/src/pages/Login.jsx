import React, { useState, useEffect } from "react";
import { SchoolRounded } from "@mui/icons-material";
import Button from "@mui/material/Button";
import {
  Avatar,
  Box,
  Container,
  Stack,
  Typography,
} from "@mui/material";

import LoginForm from "@/components/forms/LoginForm";
import { getUserAuth } from "../api/userAPI";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import FindSchool from "./FindSchool";
import { useAuth } from "@/hooks/useAuth";
import _ from "lodash";

const Login = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const {
    school_info,
    user,
    schoolInformation,
    authenticateUser,
    switchAccount,
  } = useAuth();
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof state?.error === "string") {
      setMsg(state?.error);
    }
  }, [state]);

  // Throws the API's error so LoginForm can show it above the fields.
  const onLogin = async (values) => {
    setMsg("");
    const data = await getUserAuth({ ...values, code: schoolInformation?._id });
    authenticateUser(data?.token, data?.school);
    navigate("/school-session", { replace: true });
  };

  if (user?.id) {
    return <Navigate to="/" />;
  }

  if (_.isEmpty(schoolInformation)) {
    return <FindSchool />;
  }

  return (
    <>
      <Box
        className="custom-shape-divider-top-1737365089"
        sx={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "primary.main",
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
            fill="#fff"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5"
            className="shape-fill"
            fill="#fff"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            opacity=".75"
            className="shape-fill"
            fill="#fff"
          ></path>
        </svg>
        {/* <Box
          bgcolor="primary.main"
          sx={{
            height: "100%",
            overflow: "clip",
            flex: 1,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            color: "primary.contrastText",
          }}
        >
          <Typography
            variant="h1"
            textAlign="center"
            paragraph
            zIndex={9999999}
          >
            Frebby Tech School Portal
          </Typography>
          <LoginIcon />
        </Box> */}
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
              {school_info?.badge ? (
                <Avatar
                  alt="school logo"
                  loading="lazy"
                  srcSet={school_info?.badge}
                  sx={{
                    width: 80,
                    height: 80,
                  }}
                />
              ) : (
                <SchoolRounded sx={{ width: 100, height: 100 }} />
              )}

              <Typography variant="h4" textAlign="center">
                {school_info?.name || "School Management Portal"}
              </Typography>
              {/* <Typography variant="body2" fontStyle="italic" textAlign="center">
                {`"${school_info?.motto || "School Motto"}"`}
              </Typography> */}
            </Stack>

            <Typography variant="h4" alignSelf="flex-start">
              Welcome
            </Typography>
            <Typography
              variant="caption"
              alignSelf="flex-start"
              fontStyle="italic"
            >
              Login into your account
            </Typography>
            <LoginForm onLogin={onLogin} notice={msg} />
          </Container>
        </Box>
        <Button
          variant="text"
          onClick={() => switchAccount()}
          color="#fff"
          sx={{
            textDecoration: "underline",
            color: "#fff",
          }}
        >
          Switch School Account
        </Button>
        <Typography variant="body2" color="#fff" textAlign="center" pb={4}>
          Copyright &copy; {new Date().getFullYear()} | FrebbyTech Consults
          (+233543772591)
        </Typography>
      </Box>
    </>
  );
};

export default Login;
