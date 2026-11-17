// src/components/Login.js
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Fade,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff, Person, Lock } from "@mui/icons-material";
import { useLogin } from "@/hooks/useStudentAuth";
import { useAuth } from "@/context/AuthProvider";
import { getSavedLoginInfo, saveLoginInfo } from "@/config/sessionHandler";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema } from "@/config/validationSchema";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      studentId: "",
      password: "",
      rememberMe: false,
    },
    resolver: yupResolver(loginSchema),
    mode: "onChange",
  });

  const { login } = useAuth();
  const loginStudent = useLogin();
  const navigate = useNavigate();

  useEffect(() => {
    const { studentId } = getSavedLoginInfo();
    setValue("studentId", studentId);
    setValue("rememberMe", !!studentId);
  }, [setValue]);

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const onSubmit = async (data) => {
    loginStudent.mutate(data, {
      onSuccess: (res) => {
        if (res.accessToken) {
          login(res.accessToken, res.data, { mustChangePassword: res.mustChangePassword });
          saveLoginInfo(data.studentId, data.rememberMe);
          navigate("/");
        }
      },
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)",
        p: 2,
      }}
    >
      <Fade in={true} timeout={600}>
        <Paper
          elevation={10}
          sx={{
            width: "100%",
            maxWidth: 450,
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            backgroundColor: "background.paper",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
          }}
        >
          {/* Logo Placeholder */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              component="div"
              sx={{
                display: "inline-flex",
                width: 60,
                height: 60,
                backgroundColor: "primary.main",
                borderRadius: 2,
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Lock sx={{ color: "white", fontSize: 32 }} />
            </Box>
          </Box>

          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              textAlign: "center",
              color: "text.primary",
              mb: 1,
            }}
          >
            Welcome Back
          </Typography>

          <Typography
            variant="body1"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              mb: 4,
            }}
          >
            Login to your account
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Student ID"
              {...register("studentId")}
              fullWidth
              margin="normal"
              error={!!errors.studentId}
              helperText={errors.studentId?.message}
              InputProps={{
                sx: { borderRadius: 2 },
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                sx: { borderRadius: 2 },
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowPassword}
                      edge="end"
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    {...register("rememberMe")}
                    color="primary"
                    size="small"
                  />
                }
                label="Remember my student ID"
                sx={{ fontSize: "0.875rem" }}
              />

              <Link
                href="/forgot-password"
                underline="hover"
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  "&:hover": { color: "primary.main" },
                }}
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={!isValid || loginStudent.isLoading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                fontSize: "1rem",
                fontWeight: 600,
                backgroundColor: "primary.main",
                boxShadow: "0 4px 14px rgba(9, 68, 43, 0.4)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 18px rgba(12, 69, 69, 0.34)",
                  backgroundColor: "primary.main",
                },
                transition: "all 0.3s ease",
              }}
            >
              {loginStudent.isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Login"
              )}
            </Button>

            {loginStudent.isError && (
              <Typography
                color="error"
                align="center"
                sx={{
                  mt: 2,
                  fontWeight: 500,
                }}
              >
                {loginStudent.error.response?.data?.message || "Login failed"}
              </Typography>
            )}
          </form>
        </Paper>
      </Fade>
    </Box>
  );
};

export default Login;
