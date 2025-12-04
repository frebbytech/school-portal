import React, { useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  useMediaQuery,
  useTheme,
  Container,
} from "@mui/material";
import {
  School as SchoolIcon,
  EmojiEvents as AchievementsIcon,
  TrendingUp as TrendIcon,
  Subject as SubjectIcon,
  Person as PersonIcon,
  BarChart as ChartIcon,
  Sort as SortIcon,
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { getAcademicDashboardInfo } from "@/api/ExaminationAPI";
import { TabContext, TabList, TabPanel } from "@mui/lab";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AcademicDashboard = () => {
  const { user } = useAuth();

  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [tabValue, setTabValue] = useState(0);

  const academicRecord = useQuery({
    queryKey: ["academicRecord", user?._id],
    queryFn: () => getAcademicDashboardInfo(user?._id),
    refetchOnWindowFocus: false,
    // retry: 1,
    enabled: !!user?._id,
    initialData: {
      averagePerformanceIndex: 0,
      bestOverallScore: {
        _id: "",
        term: "",
        level: { name: "" },
        scores: [],
        overallScore: 0,
      },
      bestSubjectScore: {
        term: "Not Available",
        level: "Not Available",
        score: 0,
      },
      bestPosition: "1st",
      performanceTrend: { labels: [""], dataset: [0] },
      activeLevel: {
        level: "",
        position: "",
      },
    },
  });

  // Stat cards data
  const statCards = [
    {
      title: "Best Overall Score",
      value: academicRecord.data?.bestOverallScore?.overallScore,
      description: `${academicRecord.data?.bestOverallScore?.term} - ${academicRecord.data?.bestOverallScore?.level?.name}`,
      icon: <SchoolIcon fontSize="large" />,
      color: theme.palette.primary.main,
      bgColor: "rgba(33, 150, 243, 0.1)",
    },
    {
      title: "Best Subject Score",
      value: academicRecord.data?.bestSubjectScore?.score,
      description: `${academicRecord.data?.bestSubjectScore?.term} - ${academicRecord.data?.bestSubjectScore?.level}`,
      subject: academicRecord.data?.bestSubjectScore?.subject,
      icon: <SubjectIcon fontSize="large" />,
      color: theme.palette.success.main,
      bgColor: "rgba(76, 175, 80, 0.1)",
    },
    {
      title: "Best Position",
      value: academicRecord.data?.bestPosition?.position,
      description: `${academicRecord.data?.bestPosition?.term} - ${academicRecord.data?.bestPosition?.level}`,
      icon: <AchievementsIcon fontSize="large" />,
      color: theme.palette.warning.main,
      bgColor: "rgba(255, 152, 0, 0.1)",
    },
  ];

  // Performance trend data
  const performanceTrend = {
    labels: academicRecord.data?.performanceTrend?.labels,
    datasets: [
      {
        label: "Your Performance",
        data: academicRecord.data?.performanceTrend?.datasets,
        borderColor: theme.palette.primary.main,
        backgroundColor: "rgba(33, 150, 243, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: theme.palette.primary.main,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: theme.palette.primary.main,
      },
      {
        label: "Class Average",
        data: [75, 77, 79, 80, 82],
        borderColor: theme.palette.secondary.main,
        backgroundColor: "rgba(156, 39, 176, 0.05)",
        tension: 0.4,
        fill: false,
        borderDash: [5, 5],
        pointBackgroundColor: theme.palette.secondary.main,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        min: 60,
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value) {
            return value + "%";
          },
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    hover: {
      mode: "nearest",
      intersect: true,
    },
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container
      sx={{
        py: 5,
        px: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: theme.palette.primary.dark,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <SchoolIcon fontSize="large" />
          Dashboard
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          fontStyle="italic"
          sx={{ mt: 1 }}
        >
          Track your academic performance and achievements
        </Typography>
      </Box>

      {/* Performance Index (Hero Section) */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 4,
          boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
          background: "linear-gradient(135deg, #009fb7 0%, #003037 100%)",
          color: "white",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Grid container alignItems="center" spacing={4}>
            <Grid
              size={{
                xs: 12,
                md: 4,
              }}
              sx={{ display: "flex", justifyContent: "center" }}
            >
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress
                  variant="determinate"
                  value={academicRecord.data?.averagePerformanceIndex}
                  size={200}
                  thickness={4}
                  sx={{
                    color: "rgba(255, 255, 255, 0.8)",
                    "& .MuiCircularProgress-circle": {
                      strokeLinecap: "round",
                    },
                  }}
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
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{ fontWeight: 700 }}
                  >
                    {academicRecord.data?.averagePerformanceIndex}%
                  </Typography>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9, mt: 1 }}>
                    Overall Performance
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                Outstanding Academic Achievement
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                You&apos;re performing in the top 5% of your class. Your
                consistent improvement in{" "}
                {academicRecord?.data?.activeLevel?.level} shows exceptional
                dedication to your studies.
              </Typography>

              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                      Current Class
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {academicRecord?.data?.activeLevel?.level}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                      Current Position
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {academicRecord?.data?.activeLevel?.position}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                      Attendance
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      96%
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                      Improvement
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#4caf50" }}
                    >
                      +9%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid
            size={{ xs: 12, sm: 6, md: 4 }}
            sx={{ p: 2, border: "1px solid lightgray", borderRadius: 2 }}
            key={index}
          >
            <Box
              sx={{
                height: "100%",
                borderRadius: 3,
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    backgroundColor: card.bgColor,
                    mr: 3,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                    sx={{ mb: 0.5 }}
                  >
                    {card.title}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {card.value}
                  </Typography>
                  {card?.subject && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {card?.subject}
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {card.description}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Performance Trend Chart */}

      <Box
        sx={{
          mb: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          p: 2,
          border: "1px solid lightgray",
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, display: "flex", alignItems: "center" }}
          >
            <TrendIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            Performance Trend
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                borderRadius: 4,
                bgcolor: "rgba(33, 150, 243, 0.1)",
                color: theme.palette.primary.main,
                fontWeight: 500,
              }}
            >
              {academicRecord?.data?.activeLevel?.level}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                p: "4px 12px",
                borderRadius: 4,
                bgcolor: "rgba(0, 0, 0, 0.05)",
                color: "text.secondary",
                fontWeight: 500,
              }}
            >
              All Classes
            </Typography>
          </Box>
        </Box>{" "}
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            p: 0,
          }}
        >
          <Box
            sx={{
              minWidth: 100,
              width: "100%",
              height: 400,
            }}
          >
            <Line data={performanceTrend} options={chartOptions} />
          </Box>
        </Box>
      </Box>

      {/* Detailed Tables */}
      <TabContext
        sx={{
          p: 2,
        }}
        value={tabValue}
      >
        <TabList
          allowScrollButtonsMobile
          scrollButtons
          sx={{ borderBottom: 1, borderColor: "divider" }}
          onChange={handleTabChange}
        >
          <Tab
            label="Top Subject Scores"
            icon={<SubjectIcon />}
            iconPosition="start"
          />
          <Tab
            label="Top Overall Scores"
            icon={<PersonIcon />}
            iconPosition="start"
          />
        </TabList>

        <TabPanel value={0} sx={{ p: 0 }}>
          <TableContainer
            component={Paper}
            sx={{ borderRadius: 2, boxShadow: "none" }}
          >
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0, 0, 0, 0.02)" }}>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <SortIcon sx={{ fontSize: 16, mr: 0.5 }} /> Subject
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Term / Semester
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Score (%)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {academicRecord.data.bestSubjectsScores?.map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(odd)": {
                        bgcolor: "rgba(0, 0, 0, 0.02)",
                      },
                      "&:hover": { bgcolor: "rgba(25, 118, 210, 0.03)" },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: row.student === "You" ? 600 : "normal",
                      }}
                    >
                      {row.subject}
                    </TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.term}</TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: row.student === "You" ? 700 : 600,
                          color:
                            row.score >= 95
                              ? theme.palette.success.main
                              : row.score >= 90
                              ? theme.palette.primary.main
                              : theme.palette.warning.main,
                        }}
                      >
                        {row.score}%
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        <TabPanel value={1} sx={{ p: 0 }}>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              boxShadow: "none",
              overflowX: "auto", // Enable horizontal scrolling
              display: "block", // Needed for proper scrolling behavior
              whiteSpace: "nowrap", // Prevent content wrapping
              width: isTablet ? 300 : "100%",
            }}
          >
            <Table>
              {/* Set minimum width to force scrolling on small screens */}
              <TableHead sx={{ bgcolor: "rgba(0, 0, 0, 0.02)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Term /Semester</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Index (%)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {academicRecord.data?.bestOverallScores?.map((row, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(odd)": {
                        bgcolor: "rgba(0, 0, 0, 0.02)",
                      },
                      "&:hover": { bgcolor: "rgba(25, 118, 210, 0.03)" },
                    }}
                  >
                    <TableCell>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: 700,
                          color:
                            row.position === "1st"
                              ? theme.palette.warning.main
                              : "inherit",
                        }}
                      >
                        {row.level}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          fontWeight: row.name === "You" ? 700 : "normal",
                          color:
                            row.name === "You"
                              ? theme.palette.primary.main
                              : "inherit",
                        }}
                      >
                        {row.term}
                      </Box>
                    </TableCell>
                    <TableCell>{row.overallScore}</TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: 700,
                          color:
                            row.score >= 94
                              ? theme.palette.success.main
                              : row.score >= 90
                              ? theme.palette.primary.main
                              : theme.palette.warning.main,
                        }}
                      >
                        {row.performanceIndex}%
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </TabContext>

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          borderRadius: 3,
          bgcolor: "rgba(25, 118, 210, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: isTablet ? "column" : "row",
          textAlign: "center",
          gap: 1,
        }}
      >
        <ChartIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
        <Typography variant="body2">
          You&apos;re currently ranked 1st in your class with a 94% average.
          Keep up the excellent work!
        </Typography>
      </Box>
    </Container>
  );
};

export default AcademicDashboard;
