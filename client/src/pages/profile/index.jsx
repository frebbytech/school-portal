import React, { useContext } from "react";
import {
  Avatar,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  useTheme,
} from "@mui/material";
import { UserContext } from "@/context/providers/UserProvider";
import FormDisplayItem from "@/components/inputs/FormDisplayItem";
import { Edit } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import UpdateUserProfile from "@/components/dialog/UpdateUserProfile";
import dayjs from "@/lib/dates";
import { styled } from "@mui/material/styles";

// Styled components for better customization
const ProfileCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  // boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  overflow: "visible",
  position: "relative",
  background: theme.palette.background.paper,
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 140,
  height: 140,
  border: `4px solid ${theme.palette.secondary.main}`,
  boxShadow: theme.shadows[6],
  margin: "-70px auto 0",
  [theme.breakpoints.down("sm")]: {
    width: 100,
    height: 100,
    margin: "-50px auto 0",
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.secondary,
  borderBottom: `1px solid ${theme.palette.divider}`,
  paddingBottom: theme.spacing(1),
}));

function Profile() {
  const { user } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();

  const handleOpenEdit = () => {
    setSearchParams((params) => {
      params.set("e_p", true);
      return params;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* <CustomTitle
        title="Your Profile"
        subtitle="Manage your personal information and account settings"
        color="text.primary"
        backColor={theme.palette.primary.main}
      /> */}

      <ProfileCard>
        <Box
          sx={{
            height: 140,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            borderRadius: "16px 16px 0 0",
            position: "relative",
            p: 2,
          }}
        >
          <Typography variant="h3" color="#fff">
            Profile
          </Typography>
          <Typography variant="body2" color="#fff" sx={{ opacity: 0.8 }}>
            Manage your personal information and account settings
          </Typography>

          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={handleOpenEdit}
            sx={{
              position: "absolute",
              bgcolor: "secondary.main",
              color: "white",
              top: 16,
              right: 16,
              borderRadius: 12,
              fontWeight: 600,
              px: 3,
              boxShadow: theme.shadows[3],
              "&:hover": {
                boxShadow: theme.shadows[6],
              },
            }}
          >
            Edit Profile
          </Button>
        </Box>

        <ProfileAvatar src={user?.profile} />

        <CardContent sx={{ pt: 8, pb: 4 }}>
          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
            sx={{
              mb: 0.5,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {user?.fullname}
          </Typography>

          <Typography
            variant="body2"
            textTransform="capitalize"
            color="text.secondary"
            textAlign="center"
          >
            {user?.role}
          </Typography>

          <Box sx={{ mt: 4 }}>
            <SectionTitle variant="h6">Personal Information</SectionTitle>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="First Name"
                  value={user.firstname || "-"}
                  icon="person"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="Last Name"
                  value={user.lastname || "-"}
                  icon="person"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="Date of Birth"
                  value={dayjs(new Date(user.dateofbirth)).format("LL") || "-"}
                  icon="calendar_today"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="Gender"
                  value={user.gender || "-"}
                  icon="wc"
                />
              </Grid>
            </Grid>

            <SectionTitle variant="h6" sx={{ mt: 4 }}>
              Account Details
            </SectionTitle>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="Username"
                  value={user.username || "-"}
                  icon="alternate_email"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormDisplayItem
                  label="Role"
                  value={user.role || "-"}
                  icon="badge"
                />
              </Grid>
              <Grid item xs={12}>
                <FormDisplayItem
                  label="Email"
                  value={user.email || "-"}
                  icon="email"
                />
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </ProfileCard>

      <UpdateUserProfile />
    </Container>
  );
}

export default Profile;
