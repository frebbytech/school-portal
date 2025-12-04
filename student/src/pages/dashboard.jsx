import React from "react";
// import Calendar from "react-calendar";
import {
  Box,
  Stack,
  Typography,
  Avatar,
  Divider,
  Grid,
  LinearProgress,
  // useTheme,
  // useMediaQuery,
} from "@mui/material";
import { TrendingUp, CreditCard, DockTwoTone } from "@mui/icons-material";
import DashboardSwiper from "@/components/swiper/DashboardSwiper";
import Birthday from "@/components/items/Birthday";
import CustomCard from "@/components/cards/CustomCard";
import CustomTitle from "@/components/custom/CustomTitle";
import Announcement from "@/components/calendar/Announcement";
import Event from "@/components/calendar/Event";
import { useAuth } from "@/context/AuthProvider";
import CustomEvent from "@/components/calendar/CustomEvent";
import { useQuery } from "@tanstack/react-query";
import { getExamsDashboardAnalytics } from "@/api/ExaminationAPI";
import { getFeeDashboardInfo } from "@/api/currentFeeAPI";
import { currencyFormatter } from "@/config/currencyFormatter";
import moment from "moment";


import birthday_ico from "@/assets/images/header/bd1.svg";
import event_ico from "@/assets/images/header/subject.svg";
import announcement_ico from "@/assets/images/header/sms_ico.svg";

// Chart options
// const chartOptions = {
//   responsive: true,
//   maintainAspectRatio: false,
//   plugins: {
//     legend: {
//       position: "top",
//       labels: {
//         usePointStyle: true,
//         padding: 20,
//       },
//     },
//     tooltip: {
//       backgroundColor: "rgba(255, 255, 255, 0.95)",
//       titleColor: "#333",
//       bodyColor: "#333",
//       borderColor: "#ddd",
//       borderWidth: 1,
//       padding: 12,
//       displayColors: false,
//       callbacks: {
//         label: function (context) {
//           return `${context.dataset.label}: ${context.parsed.y}%`;
//         },
//       },
//     },
//   },
//   scales: {
//     x: {
//       grid: {
//         display: false,
//       },
//     },
//     y: {
//       min: 60,
//       max: 100,
//       grid: {
//         color: "rgba(0, 0, 0, 0.05)",
//       },
//       ticks: {
//         callback: function (value) {
//           return value + "%";
//         },
//       },
//     },
//   },
//   interaction: {
//     mode: "index",
//     intersect: false,
//   },
//   hover: {
//     mode: "nearest",
//     intersect: true,
//   },
// };

const Dashboard = () => {
  // const { breakpoints } = useTheme();
  // const matches = useMediaQuery(breakpoints.down("md"));

  const { user } = useAuth();

  const analytics = useQuery({
    queryKey: ["dashboard-analytics", user?._id],
    queryFn: () => getExamsDashboardAnalytics(user?._id),
    enabled: !!user?._id,
    initialData: {
      averageIndex: 0,
      chartData: {
        labels: [""],
        datasets: [],
      },
      trend: "Not enough data",
    },
  });

  const feesRecord = useQuery({
    queryKey: ["feesRecord", user?._id],
    queryFn: () => getFeeDashboardInfo(user?._id),
    enabled: !!user?._id,
    initialData: {
      totalFees: 0,
      totalPaid: 0,
      totalArrears: 0,
    },
  });

  // const feeProgress = feesRecord?.data?.totalPaid / feesRecord?.data?.totalFees;

  return (
    <>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              pt: 2,
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                textAlign="right"
                textTransform="capitalize"
              >
                Welcome,{user?.firstname}!
              </Typography>
              {/* <Typography>Your current dashboard for today!</Typography> */}
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="right"
                gutterBottom
              >
                This is your dashboard where you can see your academic progress,
                fees status, and more.
              </Typography>
              {/* <p>
                Use the navigation menu to access different sections of the
                application.
              </p> */}
            </Box>
            {/* <Avatar
              alt="wave_hand"
              src={EMPTY_IMAGES.hand}
              style={{ width: "48px", height: "48px" }}
              variant="square"
            /> */}
            <Avatar
              alt={user?.firstname}
              src={user?.profile}
              sx={{
                width: 64,
                height: 64,
                border: "2px solid #3B82F6",
                bgcolor: "#3B82F6",
                color: "white",
              }}
            >
              {user?.firstname?.[0]}
              {user?.lastname?.[0]}
            </Avatar>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box>
              <Typography fontWeight={600} textTransform="capitalize">
                {user?.firstname} {user?.surname}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {user?.indexnumber || "STD-001"}
              </Typography>
              {/* <Typography variant="body2" color="text.secondary">
                {user?.program || "Computer Science"}
              </Typography> */}
            </Box>
          </Stack>

          <Divider />
          <CustomTitle
            title="Dashboard"
            subtitle=" Access key metrics, recent updates, and important notifications to stay informed about school activities at a glance."
            color="text.main"
            bgColor="transparent"
            backColor="#012e54"
            titleVariant="h2"
            bgcolor="#ffffff"
          />
          {/* Quick Stats */}
          <Grid container spacing={3} sx={{ my: 3 }}>
            {/* GPA Card */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 6,
              }}
            >
              <CustomCard
                title="Performance Index"
                icon={
                  analytics?.data?.trend === "📈 Improving" ? (
                    <TrendingUp fontSize="large" />
                  ) : analytics?.data?.trend === "📉 Declining" ? (
                    <TrendingUp fontSize="large" />
                  ) : (
                    <DockTwoTone fontSize="large" />
                  )
                }
                bgColor="linear-gradient(135deg, #009fb7 0%, #002025 100%)"
              >
                <Stack direction="row" alignItems="flex-end" spacing={1}>
                  <Typography variant="h2" fontWeight={700} color="white">
                    {analytics.data?.averageIndex || 0}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="rgba(255,255,255,0.8)"
                    pb={0.5}
                  >
                    / 100%
                  </Typography>
                </Stack>
                <Typography variant="body2" color="rgba(255,255,255,0.8)">
                  {analytics?.data?.trend}
                </Typography>
              </CustomCard>
            </Grid>

            {/* Attendance Card */}
            {/* <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 4,
              }}
            >
              <CustomCard
                title="Attendance"
                icon={<Person fontSize="large" />}
                bgColor="linear-gradient(135deg, #10B981 0%, #047857 100%)"
              >
                <Box
                  sx={{ position: "relative", display: "inline-flex", mb: 1 }}
                >
                  <Box sx={{ position: "relative" }}>
                    <CircularProgress
                      variant="determinate"
                      value={92}
                      size={80}
                      thickness={4}
                      sx={{ color: "rgba(255,255,255,0.3)" }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: "absolute",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} color="white">
                        92%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Typography variant="body2" color="rgba(255,255,255,0.8)">
                  4 absences this semester
                </Typography>
              </CustomCard>
            </Grid> */}

            {/* Fees Card */}
            <Grid
              size={{
                xs: 12,
                sm: 6,
                md: 6,
              }}
            >
              <CustomCard
                title="Fees Status"
                icon={<CreditCard fontSize="large" />}
                bgColor="linear-gradient(135deg, #F59E0B 0%, #B45309 100%)"
              >
                <Stack spacing={1} width="100%">
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Total Fees
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="white">
                      {currencyFormatter(feesRecord?.data?.totalFees || 0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Paid
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="white">
                      {currencyFormatter(feesRecord?.data?.totalPaid || 0)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="rgba(255,255,255,0.8)">
                      Arreas
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="white">
                      {currencyFormatter(feesRecord?.data?.totalArrears || 0)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={
                      (feesRecord?.data?.totalPaid /
                        feesRecord?.data?.totalFees) *
                      100
                    }
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 5,
                      },
                    }}
                  />
                  <Typography variant="caption" color="rgba(255,255,255,0.8)">
                    Due:{" "}
                    {moment(feesRecord?.data?.lastFeePaid?.createdAt)
                      .add(2, "week")
                      .format("LL")}
                  </Typography>
                </Stack>
              </CustomCard>
            </Grid>
          </Grid>
          <Divider />
          {/* <Box style={{ marginBottom: "24px", width: "100%" }}>
            <Typography variant="h4" paragraph>
              Academic Performance
            </Typography>
            <Box
              sx={{
                minWidth: 100,
                // width: "80%",
                height: matches ? 200 : 400,
              }}
            >
              <Line
                data={{
                  labels: analytics?.data?.chartData?.labels,
                  datasets: analytics?.data?.chartData?.datasets,
                }}
                options={chartOptions}
              />
            </Box>
          </Box>
          <Divider /> */}

          <Box sx={{ pt: 4 }}>
            <div style={{ marginBottom: "24px" }}>
              <Typography variant="h4" paragraph>
                Recent News & Events
              </Typography>
              <DashboardSwiper />
            </div>
            <div style={{ paddingBlock: "24px" }}>
              <Typography variant="h4" paragraph>
                Events,Activities & Holidays
              </Typography>
              <CustomEvent />
            </div>
          </Box>
        </Box>

        <Box
          sx={{
            width: { xs: 0, sm: 250, md: 270 },

            // minWidth: { xs: 0, md: 250 },
            display: { xs: "none", md: "block" },
            transition: "all 0.4s ease-in-out",
            position: "sticky",
            top: 0,
            // height:'200svh',
            minHeight: "100svh",
          }}
        >
          <Stack spacing={3} height="100%">
            <CustomCard
              title="Events"
              subtitle="View upcoming events and activities"
              imgSrc={event_ico}
            >
              <Event />
            </CustomCard>
            <CustomCard
              title="Birthday"
              subtitle="View today's birthdays"
              imgSrc={birthday_ico}
            >
              <Birthday />
            </CustomCard>
            <CustomCard
              title="Announcements"
              subtitle="View announcements"
              imgSrc={announcement_ico}
            >
              <Announcement />
            </CustomCard>
          </Stack>
        </Box>
      </Box>

      {/* <CustomParticle /> */}
    </>
  );
};

export default React.memo(Dashboard);
